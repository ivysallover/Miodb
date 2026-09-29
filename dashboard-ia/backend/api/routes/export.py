"""
routers/export.py
Endpoint para exportación de reportes PDF y PPTX ejecutivos con gráficos.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from typing import Any, Dict, List, Optional
from pathlib import Path
from schemas.responses import BaseSchema, ChartImageSchema

from reports.pdf_generator import generate_pdf_report
from reports.pptx_generator import generate_pptx_report

router = APIRouter()


class ExportPDFRequest(BaseSchema):
    filename: str
    target_col: str
    kpis: Dict[str, Any]
    narrative_text: str
    profile: Dict[str, Any]
    anomaly_metrics: Optional[Dict[str, Any]] = {}
    forecast_metrics: Optional[Dict[str, Any]] = {}
    segmentation_metrics: Optional[Dict[str, Any]] = {}
    chart_images: Optional[List[ChartImageSchema]] = []


@router.post("/export/pdf")
def export_pdf(req: ExportPDFRequest):
    chart_images_dicts = [img.model_dump() for img in req.chart_images] if req.chart_images else []
    
    pdf_bytes = generate_pdf_report(
        filename=req.filename,
        target_col=req.target_col,
        kpis=req.kpis,
        narrative_text=req.narrative_text,
        profile=req.profile,
        anomaly_metrics=req.anomaly_metrics or {},
        forecast_metrics=req.forecast_metrics or {},
        segmentation_metrics=req.segmentation_metrics or {},
        chart_images=chart_images_dicts,
    )

    if not pdf_bytes:
        raise HTTPException(status_code=500, detail="No se pudo generar el documento PDF.")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=informe_{req.filename}.pdf"}
    )


@router.post("/export/pptx")
def export_pptx(req: ExportPDFRequest):
    chart_images_dicts = [img.model_dump() for img in req.chart_images] if req.chart_images else []

    pptx_bytes = generate_pptx_report(
        filename=req.filename,
        target_col=req.target_col,
        kpis=req.kpis,
        narrative_text=req.narrative_text,
        profile=req.profile,
        anomaly_metrics=req.anomaly_metrics or {},
        forecast_metrics=req.forecast_metrics or {},
        segmentation_metrics=req.segmentation_metrics or {},
        chart_images=chart_images_dicts,
    )

    if not pptx_bytes:
        raise HTTPException(status_code=500, detail="No se pudo generar el documento PPTX.")

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": f"attachment; filename=presentacion_{req.filename}.pptx"}
    )


@router.post("/export/cleaned-dataset")
async def export_cleaned_dataset(
    file: Optional[UploadFile] = File(None),
    upload_id: Optional[str] = Form(None),
    export_format: str = Form("csv"),  # "csv" o "xlsx"
    locale: str = Form("auto"),
    outlier_action: str = Form("flag"),  # "flag", "cap", "drop"
    precision_mode: str = Form("float64"),
):
    """
    Exporta el dataset 100% limpio y enriquecido por el nuevo pipeline modular.
    Soporta descarga en CSV (con UTF-8-BOM para Excel sin caracteres rotos) o XLSX
    con hoja dedicada de bitácora de auditoría.
    """
    import io
    import pandas as pd
    from services.data_cleaning import (
        DataCleaningPipeline,
        CleaningConfig,
        LocaleEnum,
        PrecisionMode,
        OutlierPolicy,
        OutlierAction,
        OutlierMethod,
    )
    from api.routes.analysis import _resolve_upload_memory

    df_raw = None
    clean_filename = "dataset"

    if file:
        clean_filename = Path(file.filename or "dataset").stem
        content = await file.read()
        fname_lower = (file.filename or "").lower()
        if fname_lower.endswith(".csv") or not fname_lower.endswith((".xlsx", ".xls", ".json")):
            try:
                df_raw = pd.read_csv(io.BytesIO(content), encoding="utf-8", sep=None, engine="python", on_bad_lines="skip")
            except Exception:
                df_raw = pd.read_csv(io.BytesIO(content), encoding="latin1", sep=None, engine="python", on_bad_lines="skip")
        elif fname_lower.endswith((".xlsx", ".xls")):
            df_raw = pd.read_excel(io.BytesIO(content))
        elif fname_lower.endswith(".json"):
            import json
            data = json.loads(content.decode("utf-8"))
            df_raw = pd.json_normalize(data)
    elif upload_id:
        content, orig_fname = _resolve_upload_memory(upload_id)
        clean_filename = Path(orig_fname).stem
        fname_lower = orig_fname.lower()
        if fname_lower.endswith(".csv") or not fname_lower.endswith((".xlsx", ".xls", ".json")):
            try:
                df_raw = pd.read_csv(io.BytesIO(content), encoding="utf-8", sep=None, engine="python", on_bad_lines="skip")
            except Exception:
                df_raw = pd.read_csv(io.BytesIO(content), encoding="latin1", sep=None, engine="python", on_bad_lines="skip")
        elif fname_lower.endswith((".xlsx", ".xls")):
            df_raw = pd.read_excel(io.BytesIO(content))
        elif fname_lower.endswith(".json"):
            import json
            data = json.loads(content.decode("utf-8"))
            df_raw = pd.json_normalize(data)
    else:
        raise HTTPException(status_code=400, detail="Debe enviar 'file' o 'upload_id'.")

    if df_raw is None or df_raw.empty:
        raise HTTPException(status_code=400, detail="El dataset está vacío o no es tabular.")

    # Mapeo de enums para la configuración
    loc_enum = LocaleEnum.AUTO
    if locale.lower() in ("es-ar", "es_ar", "latam"):
        loc_enum = LocaleEnum.ES_AR
    elif locale.lower() in ("en-us", "en_us", "us"):
        loc_enum = LocaleEnum.EN_US

    out_act = OutlierAction.FLAG
    if outlier_action.lower() == "cap":
        out_act = OutlierAction.CAP
    elif outlier_action.lower() == "drop":
        out_act = OutlierAction.DROP

    prec_mode = PrecisionMode.FLOAT64
    if precision_mode.lower() == "decimal":
        prec_mode = PrecisionMode.DECIMAL

    config = CleaningConfig(
        locale=loc_enum,
        precision_mode=prec_mode,
        outlier_policy=OutlierPolicy(method=OutlierMethod.TUKEY_IQR, action=out_act),
        enable_deduplication=True,
        enable_imputation=True,
        enable_downcast=True,
    )

    pipeline = DataCleaningPipeline(config=config)
    res = pipeline.run(df_raw)
    df_clean, report = res.df, res.report

    fmt = export_format.lower().strip()
    if fmt == "xlsx":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df_clean.to_excel(writer, index=False, sheet_name="Datos_Limpios")
            # Hoja de bitácora de auditoría
            audit_rows = [{"Paso": i + 1, "Accion_Registrada": a} for i, a in enumerate(report.actions)]
            pd.DataFrame(audit_rows).to_excel(writer, index=False, sheet_name="Bitacora_Auditoria")
        buf.seek(0)
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=limpio_{clean_filename}.xlsx"},
        )
    else:
        # Default: CSV con UTF-8 BOM para que Excel no rompa acentos
        csv_bytes = df_clean.to_csv(index=False, encoding="utf-8-sig").encode("utf-8-sig")
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=limpio_{clean_filename}.csv"},
        )
