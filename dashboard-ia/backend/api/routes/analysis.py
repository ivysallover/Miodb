"""
api/routes/analysis.py
Endpoints para analisis de datos: carga simple, carga multiple (auto-join) y perfil rapido.
"""
import asyncio
import re
import uuid
from pathlib import Path
import io
import time
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from core.config import get_settings
from core.logging import logger
from schemas.responses import AnalysisResponseSchema
from services.analysis_pipeline import _analyze_sync, _profile_only

router = APIRouter()
settings = get_settings()

ALLOWED_SUFFIXES = {".csv", ".json", ".xlsx", ".xls"}
UPLOAD_ID_RE = re.compile(r"^[a-f0-9]{32}(?:\.csv|\.json|\.xlsx|\.xls)$")
analysis_semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_ANALYSES)
CHUNK_SIZE = 1024 * 1024  # 1 MB

# ---------------------------------------------------------------------------
# Zero-Disk Retention: Almacenamiento exclusivamente efímero en memoria volátil (RAM)
# Ningún dataset de usuario se guarda en el disco del backend.
# Formato: { upload_id: (bytes_content, original_filename, timestamp) }
# ---------------------------------------------------------------------------
_EPHEMERAL_MEMORY_STORE: Dict[str, Tuple[bytes, str, float]] = {}
_MAX_STORE_ITEMS = 25
_EPHEMERAL_TTL_SECONDS = 900  # 15 minutos en RAM


def _validate_original_filename(value: str) -> Path:
    candidate = Path(value)
    if not value or candidate.name != value or candidate.suffix.lower() not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail="Nombre o formato de archivo no permitido.")
    return candidate


def _cleanup_ephemeral_store() -> int:
    """Elimina del almacenamiento volátil en memoria las cargas que superen el TTL."""
    now = time.time()
    expired = [
        uid for uid, (_, _, ts) in _EPHEMERAL_MEMORY_STORE.items()
        if (now - ts) > _EPHEMERAL_TTL_SECONDS
    ]
    for uid in expired:
        _EPHEMERAL_MEMORY_STORE.pop(uid, None)
    if len(_EPHEMERAL_MEMORY_STORE) > _MAX_STORE_ITEMS:
        sorted_keys = sorted(_EPHEMERAL_MEMORY_STORE.keys(), key=lambda k: _EPHEMERAL_MEMORY_STORE[k][2])
        for k in sorted_keys[: len(_EPHEMERAL_MEMORY_STORE) - _MAX_STORE_ITEMS]:
            _EPHEMERAL_MEMORY_STORE.pop(k, None)
    return len(expired)


async def _save_upload_to_memory(file: UploadFile) -> Tuple[str, str, bytes]:
    """Lee el archivo recibido directamente a memoria RAM. Cero escrituras a disco."""
    _cleanup_ephemeral_store()
    original = _validate_original_filename(file.filename or "")
    upload_id = f"{uuid.uuid4().hex}{original.suffix.lower()}"

    content = await file.read()
    await file.close()

    if len(content) > settings.MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"El archivo supera el maximo de {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
        )

    _EPHEMERAL_MEMORY_STORE[upload_id] = (content, original.name, time.time())
    return upload_id, original.name, content


def _resolve_upload_memory(upload_id: str) -> Tuple[bytes, str]:
    _cleanup_ephemeral_store()
    if not UPLOAD_ID_RE.fullmatch(upload_id):
        raise HTTPException(status_code=400, detail="Identificador de carga invalido.")
    if upload_id not in _EPHEMERAL_MEMORY_STORE:
        raise HTTPException(status_code=404, detail="El archivo ya no esta disponible en el servidor.")
    content, filename, _ = _EPHEMERAL_MEMORY_STORE[upload_id]
    return content, filename


def _resolve_upload(upload_id: str) -> Tuple[bytes, str]:
    """Alias para compatibilidad."""
    return _resolve_upload_memory(upload_id)


@router.delete("/uploads/{upload_id}")
async def delete_upload(upload_id: str):
    """
    Derecho al Olvido / Retención Cero:
    Purga de inmediato el dataset de la memoria volátil del servidor.
    Ningún archivo persiste en disco ni base de datos.
    """
    _EPHEMERAL_MEMORY_STORE.pop(upload_id, None)
    logger.info("Archivo en memoria %s purgado a solicitud del usuario.", upload_id)
    return {
        "status": "ok",
        "message": "Archivo purgado de memoria. Los datos no se almacenan en el backend.",
        "upload_id": upload_id,
    }



# ---------------------------------------------------------------------------
# POST /analyze — single file
# ---------------------------------------------------------------------------

@router.post("/analyze", response_model=AnalysisResponseSchema)
async def analyze(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
    target_col: Optional[str] = Form(None),
    column_roles: Optional[str] = Form(None),  # JSON string: {"col": "role", ...}
):
    """
    Analyze a single file. Accepts either a fresh upload or a previously saved upload_id.
    Optional column_roles overrides the auto-detected column types (JSON string).
    """
    import json as _json

    if file and upload_id:
        raise HTTPException(status_code=400, detail="Envia un archivo o un upload_id, no ambos.")

    if file:
        upload_id, filename, content = await _save_upload_to_memory(file)
    elif upload_id:
        content, filename = _resolve_upload_memory(upload_id)
        if display_name:
            filename = _validate_original_filename(display_name).name
    else:
        raise HTTPException(status_code=400, detail="Debe enviar 'file' o 'upload_id'.")

    parsed_roles: Dict[str, str] = {}
    if column_roles:
        try:
            parsed_roles = _json.loads(column_roles)
        except Exception:
            raise HTTPException(status_code=400, detail="column_roles debe ser un JSON valido.")

    logger.info("== Iniciando analisis de %s ==", filename)
    async with analysis_semaphore:
        result = await run_in_threadpool(
            _analyze_sync, io.BytesIO(content), filename, target_col, parsed_roles
        )
    result["upload_id"] = upload_id
    return result


# ---------------------------------------------------------------------------
# POST /analyze/multi — multiple files with auto-join
# ---------------------------------------------------------------------------

@router.post("/analyze/multi", response_model=AnalysisResponseSchema)
async def analyze_multi(
    files: List[UploadFile] = File(...),
    target_col: Optional[str] = Form(None),
    column_roles: Optional[str] = Form(None),
):
    """
    Analyze multiple related files. The backend auto-detects join keys,
    merges the datasets relationally, and runs the full analysis on the
    consolidated DataFrame.
    """
    import json as _json
    from core.auto_join import detect_and_join
    from services.analysis_pipeline import _analyze_dataframe

    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Envia al menos 2 archivos para el analisis multi-dataset.")
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximo 5 archivos por solicitud.")

    parsed_roles: Dict[str, str] = {}
    if column_roles:
        try:
            parsed_roles = _json.loads(column_roles)
        except Exception:
            raise HTTPException(status_code=400, detail="column_roles debe ser un JSON valido.")

    # Read all files directly to in-memory buffers
    saved: List[tuple[bytes, str]] = []
    for f in files:
        _, fname, content = await _save_upload_to_memory(f)
        saved.append((content, fname))

    async with analysis_semaphore:
        result = await run_in_threadpool(
            _run_multi_analysis, saved, target_col, parsed_roles
        )

    return result


def _run_multi_analysis(
    saved: List[tuple[bytes, str]],
    target_col: Optional[str],
    column_roles: Dict[str, str],
) -> dict:
    """Synchronous multi-file analysis worker."""
    import pandas as pd
    from services.analysis_pipeline import _read_dataframe, _analyze_dataframe
    from core.auto_join import detect_and_join

    dataframes: Dict[str, pd.DataFrame] = {}
    primary_filename = saved[0][1]

    for content, fname in saved:
        try:
            df = _read_dataframe(io.BytesIO(content), fname)
            table_name = Path(fname).stem
            dataframes[table_name] = df
        except Exception as exc:
            logger.warning("No se pudo leer '%s': %s", fname, exc)

    if not dataframes:
        raise HTTPException(status_code=422, detail="No se pudo leer ninguno de los archivos enviados.")

    join_result = detect_and_join(dataframes)
    merged_df = join_result.merged_df

    logger.info(
        "Auto-join completado: %d tablas, %d filas resultado.",
        len(join_result.join_steps) + 1,
        len(merged_df),
    )

    result = _analyze_dataframe(merged_df, primary_filename, target_col, column_roles)
    result["join_summary"] = join_result.schema_summary
    return result


# ---------------------------------------------------------------------------
# POST /profile — fast profile without full ML analysis
# ---------------------------------------------------------------------------

@router.post("/profile")
async def profile_file(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    display_name: Optional[str] = Form(None),
):
    """
    Return a fast column profile of the dataset without running ML models.
    Used by the frontend ColumnRoleSelector before full analysis.
    Returns: { upload_id, profile, preview_rows }
    """
    if file and upload_id:
        raise HTTPException(status_code=400, detail="Envia un archivo o un upload_id, no ambos.")

    if file:
        uid, filename, content = await _save_upload_to_memory(file)
    elif upload_id:
        uid = upload_id
        content, filename = _resolve_upload_memory(uid)
        if display_name:
            filename = _validate_original_filename(display_name).name
    else:
        raise HTTPException(status_code=400, detail="Debe enviar 'file' o 'upload_id'.")

    result = await run_in_threadpool(_profile_only, io.BytesIO(content), filename)
    result["upload_id"] = uid
    result["uploadId"] = uid
    return result
