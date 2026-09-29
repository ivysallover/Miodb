import csv
import io
import json
import math
import time
import os
import gc
from collections import defaultdict, Counter
import pandas as pd
import numpy as np
import chardet
from typing import Optional, Dict, Any
from pathlib import Path
from fastapi import HTTPException, Response
from concurrent.futures import ThreadPoolExecutor

from core.data_cleaner import clean_dataframe
from core.data_profiler import profile_dataframe
from core.chart_generator import auto_charts
from models.forecaster import run_forecast
from models.feature_importance import run_feature_importance
from models.anomaly_detector import run_anomaly_detection
from models.segmentation import run_clustering
from core.logging import logger

from decimal import Decimal

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if hasattr(obj, 'model_dump') and callable(getattr(obj, 'model_dump')):
            return obj.model_dump()
        if hasattr(obj, 'dict') and callable(getattr(obj, 'dict')):
            return obj.dict()
        if hasattr(obj, '__dict__') and not isinstance(obj, type):
            return vars(obj)
        if isinstance(obj, Decimal):
            return str(obj)
        if isinstance(obj, (pd.Series, pd.Index, np.ndarray)):
            return obj.tolist()
        if isinstance(obj, (float, np.floating)):
            if math.isnan(obj) or math.isinf(obj) or pd.isna(obj):
                return None
            return float(obj)
        if isinstance(obj, (int, np.integer)):
            return int(obj)
        if isinstance(obj, (bool, np.bool_)):
            return bool(obj)
        if isinstance(obj, pd.Timestamp):
            return obj.isoformat()
        if isinstance(obj, (np.datetime64, np.timedelta64)):
            return str(obj)
        return super(NumpyEncoder, self).default(obj)

def clean_json_nans(obj):
    if hasattr(obj, "model_dump") and callable(getattr(obj, "model_dump")):
        try:
            obj = obj.model_dump()
        except:
            pass
    elif hasattr(obj, "dict") and callable(getattr(obj, "dict")):
        try:
            obj = obj.dict()
        except:
            pass
    if isinstance(obj, dict):
        return {k: clean_json_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json_nans(i) for i in obj]
    elif isinstance(obj, Decimal):
        return str(obj)
    elif isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    return obj

def format_number(n, prefix=""):
    if isinstance(n, float):
        if abs(n) >= 1_000_000:
            return f"{prefix}{n/1_000_000:.1f}M"
        if abs(n) >= 1_000:
            return f"{prefix}{n/1_000:.1f}K"
        return f"{prefix}{n:,.2f}"
    if isinstance(n, int):
        if abs(n) >= 1_000_000:
            return f"{prefix}{n/1_000_000:.1f}M"
        if abs(n) >= 1_000:
            return f"{prefix}{n/1_000:.1f}K"
        return f"{prefix}{n}"
    return str(n)

def detect_csv_format(file_input: Any):
    enc = 'utf-8'
    sep = ','
    skiprows = 0
    try:
        if isinstance(file_input, (str, Path)) and os.path.exists(file_input):
            with open(file_input, 'rb') as f:
                raw = f.read(100000)
        elif isinstance(file_input, bytes):
            raw = file_input[:100000]
        elif isinstance(file_input, io.BytesIO):
            pos = file_input.tell()
            file_input.seek(0)
            raw = file_input.read(100000)
            file_input.seek(pos)
        else:
            raw = b""

        res = chardet.detect(raw)
        if res and res['encoding']:
            enc = res['encoding']

        sample_text = raw.decode(enc, errors='ignore')
        lines = [line for line in sample_text.splitlines()[:15] if line.strip()]
        if lines:
            header = lines[0]
            counts = {
                ',': header.count(','),
                ';': header.count(';'),
                '\t': header.count('\t'),
                '|': header.count('|')
            }
            best_sep = max(counts, key=counts.get)
            sep = best_sep if counts[best_sep] > 0 else ','

            # Detección inteligente de bloques resumen / multi-headers (común en datasets de Kaggle)
            if len(lines) >= 4:
                try:
                    reader = list(csv.reader(lines[:10], delimiter=sep))
                    lengths = [len(r) for r in reader if len(r) > 1]
                    if len(lengths) >= 4:
                        from collections import Counter
                        counts_len = Counter(lengths[1:])
                        dominant_len, dominant_count = counts_len.most_common(1)[0]
                        if lengths[0] != dominant_len and dominant_count >= 3:
                            for idx, r_len in enumerate(lengths):
                                if r_len == dominant_len:
                                    skiprows = idx
                                    break
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Error detectando encoding/delimitador, usando defaults: {e}")
    return enc, sep, skiprows

def _parse_json_intelligent(file_input: Any):
    try:
        if isinstance(file_input, (str, Path)) and os.path.exists(file_input):
            with open(file_input, 'r', encoding='utf-8') as f:
                data = json.load(f)
        elif isinstance(file_input, bytes):
            data = json.loads(file_input.decode('utf-8', errors='ignore'))
        elif isinstance(file_input, io.BytesIO):
            pos = file_input.tell()
            file_input.seek(0)
            data = json.loads(file_input.read().decode('utf-8', errors='ignore'))
            file_input.seek(pos)
        else:
            return pd.DataFrame()
            
        if isinstance(data, list):
            df = pd.json_normalize(data)
            return df
        elif isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                    return pd.json_normalize(v)
            return pd.json_normalize([data])
        else:
            return pd.DataFrame([data])
    except Exception as e:
        logger.error(f"Error parsing JSON: {e}")
        return pd.DataFrame()

def _analyze_streaming_csv(file_input: Any, filename: str, target_col: Optional[str], enc: str, sep: str, skiprows: int = 0):
    logger.info(f"[Modo Streaming] Archivo grande detectado ({filename}). Activando procesamiento en bloques.")
    t_start = time.time()
    
    if isinstance(file_input, bytes):
        raw_bytes = file_input
    elif isinstance(file_input, io.BytesIO):
        pos = file_input.tell()
        file_input.seek(0)
        raw_bytes = file_input.read()
        file_input.seek(pos)
    else:
        raw_bytes = None

    # 1. Preview chunk para inferir estructura y tipos
    stream1 = io.BytesIO(raw_bytes) if raw_bytes is not None else file_input
    if isinstance(stream1, io.BytesIO): stream1.seek(0)
    try:
        df_preview = pd.read_csv(stream1, encoding=enc, sep=sep, skiprows=skiprows, nrows=2500, engine='c', on_bad_lines='skip')
    except Exception:
        if isinstance(stream1, io.BytesIO): stream1.seek(0)
        df_preview = pd.read_csv(stream1, encoding=enc, sep=None, skiprows=skiprows, nrows=2500, engine='python')
        
    df_clean_preview, preview_report = clean_dataframe(df_preview)
    preview_profile = profile_dataframe(df_clean_preview, duplicate_rows=0)
    
    # 2. Determinar columna objetivo
    active_target = None
    if target_col:
        target_clean = str(target_col).strip().lower()
        for col in preview_profile.numeric_columns:
            if str(col).strip().lower() == target_clean:
                active_target = col
                break
        if not active_target:
            for col in df_clean_preview.columns:
                if str(col).strip().lower() == target_clean:
                    active_target = col
                    break
                    
    if not active_target:
        if preview_profile.suggested_targets:
            active_target = preview_profile.suggested_targets[0]
        elif preview_profile.numeric_columns:
            active_target = preview_profile.numeric_columns[0]
        else:
            active_target = df_clean_preview.columns[0]
            
    # 3. Estimar tamaño y fracción de muestreo uniforme para ML (objetivo: ~10.000 filas para alta fidelidad y mínimo consumo de RAM)
    if raw_bytes is not None:
        file_size = len(raw_bytes)
    elif isinstance(file_input, (str, Path)) and os.path.exists(file_input):
        file_size = os.path.getsize(file_input)
    else:
        file_size = 1000000

    avg_row_bytes = max(20.0, len(df_preview.to_csv(index=False).encode('utf-8')) / max(1, len(df_preview)))
    est_total_rows = max(len(df_preview), int(file_size / avg_row_bytes))
    sample_frac = min(1.0, 15000.0 / max(10000.0, float(est_total_rows)))
    
    # 4. Acumuladores de agregación global (100% de los datos)
    total_rows = 0
    col_sums: Dict[str, float] = defaultdict(float)
    col_mins: Dict[str, float] = {}
    col_maxs: Dict[str, float] = {}
    col_counts: Dict[str, int] = defaultdict(int)
    cat_freqs: Dict[str, Counter] = defaultdict(Counter)
    
    samples = []
    CHUNK_SIZE = 40000
    
    stream2 = io.BytesIO(raw_bytes) if raw_bytes is not None else file_input
    if isinstance(stream2, io.BytesIO): stream2.seek(0)
    for chunk in pd.read_csv(stream2, encoding=enc, sep=sep, skiprows=skiprows, chunksize=CHUNK_SIZE, engine='c', on_bad_lines='skip'):
        # Downcast numérico en el chunk para mínimo consumo de RAM
        for c in chunk.columns:
            if pd.api.types.is_float_dtype(chunk[c]):
                chunk[c] = pd.to_numeric(chunk[c], downcast='float')
            elif pd.api.types.is_integer_dtype(chunk[c]):
                chunk[c] = pd.to_numeric(chunk[c], downcast='integer')
                
        chunk_len = len(chunk)
        total_rows += chunk_len
        
        # Acumular numéricas exactas sobre el 100% de los datos
        for col in preview_profile.numeric_columns:
            if col in chunk.columns:
                s = chunk[col].dropna()
                if not s.empty:
                    col_sums[col] += float(s.sum())
                    col_counts[col] += len(s)
                    cmin = float(s.min())
                    cmax = float(s.max())
                    col_mins[col] = min(col_mins.get(col, cmin), cmin)
                    col_maxs[col] = max(col_maxs.get(col, cmax), cmax)
                    
        # Acumular frecuencias de categorías principales sobre el 100% de los datos
        for col in preview_profile.categorical_columns[:3]:
            if col in chunk.columns:
                vc = chunk[col].value_counts().head(20).to_dict()
                cat_freqs[col].update(vc)
                
        # Muestreo uniforme de alta fidelidad
        if sample_frac < 1.0:
            samples.append(chunk.sample(frac=sample_frac, random_state=42))
        else:
            samples.append(chunk)
            
    # Consolidar muestra de ML calibrada a 10.000 filas
    if samples:
        df_clean = pd.concat(samples, ignore_index=True)
        if len(df_clean) > 10000:
            df_ml = df_clean.sample(10000, random_state=42)
        else:
            df_ml = df_clean
    else:
        df_clean = df_clean_preview
        df_ml = df_clean_preview
        
    del samples
    gc.collect()
    
    # 5. KPIs exactos con 100% de los datos
    kpis = {
        "Registros": f"{total_rows:,}",
        "Columnas": preview_profile.n_cols,
    }
    if active_target in col_sums and col_counts.get(active_target, 0) > 0:
        kpis["Total"] = format_number(col_sums[active_target])
        kpis["Promedio"] = format_number(col_sums[active_target] / col_counts[active_target])
        kpis["Máximo"] = format_number(col_maxs.get(active_target, 0))
        kpis["Mínimo"] = format_number(col_mins.get(active_target, 0))
    elif preview_profile.numeric_columns and preview_profile.numeric_columns[0] in col_sums:
        fallback_col = preview_profile.numeric_columns[0]
        kpis["Total"] = format_number(col_sums[fallback_col])
        kpis["Promedio"] = format_number(col_sums[fallback_col] / max(col_counts[fallback_col], 1))
        kpis["Máximo"] = format_number(col_maxs.get(fallback_col, 0))
        kpis["Mínimo"] = format_number(col_mins.get(fallback_col, 0))
        
    # Actualizar total de filas en el profile
    profile = preview_profile
    profile.n_rows = total_rows
    
    # Gráficos sobre muestra de alta fidelidad
    charts = auto_charts(df_clean, profile, active_target)
    
    # Inyectar las frecuencias globales del 100% de los datos en los gráficos de categorías
    for chart in charts:
        c_title = (chart.get("title") or "").lower()
        for cat_col, freqs in cat_freqs.items():
            if cat_col.lower() in c_title and chart.get("chart_data"):
                cd = chart["chart_data"]
                if cd.get("type") in ("bar_horizontal", "doughnut", "bar"):
                    top_items = freqs.most_common(10)
                    cd["labels"] = [k for k, _ in top_items]
                    if cd.get("datasets") and len(cd["datasets"]) > 0:
                        cd["datasets"][0]["data"] = [v for _, v in top_items]
                        
    # 6. Modelos de ML ejecutados de manera secuencial para proteger los 512 MB de RAM en Render
    forecast_res = {"chart_data": None, "metrics": {}}
    feature_res = {"chart_importance": None, "chart_shap": None, "metrics": {}}
    anomaly_res = {"chart_data": None, "metrics": {}}
    seg_res = {"scatter_data": None, "radar_data": None, "metrics": {}}

    # 6.1 Forecast
    if profile.date_columns and active_target in profile.numeric_columns:
        try:
            _, f_fig, f_metrics = run_forecast(df_clean, date_col=profile.date_columns[0], value_col=active_target, periods=60)
            forecast_res = {"chart_data": f_fig, "metrics": f_metrics}
        except Exception as e:
            forecast_res["metrics"] = {"error": str(e)}
    gc.collect()

    # 6.2 Feature Importance
    if active_target in profile.numeric_columns:
        feats = [c for c in profile.numeric_columns if c != active_target]
        try:
            fi_fig, shap_fig, fi_metrics = run_feature_importance(df_ml, active_target, feats, categorical_cols=profile.categorical_columns)
            feature_res = {"chart_importance": fi_fig, "chart_shap": shap_fig, "metrics": fi_metrics}
        except Exception as e:
            feature_res["metrics"] = {"error": str(e)}
    gc.collect()

    # 6.3 Anomalías
    try:
        col_types_map = {c.name: c.inferred_type for c in profile.columns}
        _, a_fig, a_metrics = run_anomaly_detection(
            df_ml, numeric_cols=profile.numeric_columns, 
            target_col=active_target if active_target in profile.numeric_columns else None, 
            date_col=profile.date_columns[0] if profile.date_columns else None,
            column_types=col_types_map,
        )
        anomaly_res = {"chart_data": a_fig, "metrics": a_metrics}
    except Exception as e:
        anomaly_res["metrics"] = {"error": str(e)}
    gc.collect()

    # 6.4 Segmentación
    if len(profile.numeric_columns) >= 2:
        label_c = profile.categorical_columns[0] if profile.categorical_columns else None
        try:
            _, s_dist, s_prof, s_metrics = run_clustering(
                df_ml, numeric_cols=profile.numeric_columns[:6], label_col=label_c, target_col=active_target
            )
            seg_res = {"scatter_data": s_dist, "radar_data": s_prof, "metrics": s_metrics}
        except Exception as e:
            seg_res["metrics"] = {"error": str(e)}
    gc.collect()

    narrative_res = {
        "text": "Generando informe avanzado con IA...",
        "source": "pending"
    }

    cleaning_actions = preview_report.actions
    cleaning_actions.append(f"[Streaming] Procesamiento activado: {total_rows:,} registros consolidados al 100% de exactitud.")

    final_response = {
        "filename": filename,
        "target_col": active_target,
        "profile": {
            "n_rows": total_rows,
            "n_cols": profile.n_cols,
            "quality_score": profile.quality_score,
            "quality_label": profile.quality_label,
            "numeric_columns": profile.numeric_columns,
            "date_columns": profile.date_columns,
            "categorical_columns": profile.categorical_columns,
            "suggested_targets": profile.suggested_targets,
        },
        "cleaning_report": {
            "actions": cleaning_actions,
            "duplicates_removed": preview_report.duplicates_removed,
            "nulls_imputed": preview_report.nulls_imputed,
        },
        "kpis": kpis,
        "charts": charts,
        "forecast": forecast_res,
        "segmentation": seg_res,
        "anomalies": anomaly_res,
        "feature_importance": feature_res,
        "narrative": narrative_res,
    }
    
    json_str = json.dumps(final_response, cls=NumpyEncoder)
    result_dict = json.loads(json_str)
    
    del df_clean, df_ml, df_preview, df_clean_preview
    gc.collect()
    
    logger.info(f"[Modo Streaming] Finalizado análisis de {total_rows:,} filas en {time.time()-t_start:.2f}s")
    return result_dict

def _analyze_sync(file_input: Any, filename: str, target_col: Optional[str], column_roles: Optional[Dict[str, str]] = None):
    try:
        fname_lower = (filename or (str(file_input) if isinstance(file_input, (str, Path)) else "")).lower()
        t_read = time.time()
        df_raw = None

        if isinstance(file_input, bytes):
            stream = io.BytesIO(file_input)
            byte_len = len(file_input)
        elif isinstance(file_input, io.BytesIO):
            pos = file_input.tell()
            file_input.seek(0)
            raw = file_input.read()
            file_input.seek(pos)
            stream = io.BytesIO(raw)
            byte_len = len(raw)
        else:
            stream = file_input
            byte_len = os.path.getsize(file_input) if isinstance(file_input, (str, Path)) and os.path.exists(file_input) else 0

        if fname_lower.endswith(".json"):
            df_raw = _parse_json_intelligent(file_input)
        elif fname_lower.endswith(".csv") or not fname_lower.endswith((".xlsx", ".xls")):
            enc, sep, skiprows = detect_csv_format(file_input)
            # Archivos grandes (>15MB) se procesan automáticamente en modo streaming por bloques
            if byte_len > 15 * 1024 * 1024:
                return _analyze_streaming_csv(file_input, filename, target_col, enc, sep, skiprows=skiprows)
            if isinstance(stream, io.BytesIO): stream.seek(0)
            try:
                df_raw = pd.read_csv(stream, encoding=enc, sep=sep, skiprows=skiprows, engine='c', on_bad_lines='skip')
            except Exception as e:
                logger.warning(f"Fallo lectura rapida C-engine con sep='{sep}': {e}. Probando engine='python'")
                if isinstance(stream, io.BytesIO): stream.seek(0)
                try:
                    df_raw = pd.read_csv(stream, encoding=enc, sep=None, skiprows=skiprows, engine='python', on_bad_lines='skip')
                except Exception:
                    if isinstance(stream, io.BytesIO): stream.seek(0)
                    try:
                        df_raw = pd.read_csv(stream, encoding="latin1", sep=None, skiprows=skiprows, engine="python", on_bad_lines='skip')
                    except Exception:
                        if isinstance(stream, io.BytesIO): stream.seek(0)
                        df_raw = pd.read_csv(stream, encoding=enc, sep=sep, engine='c', on_bad_lines='skip')
        else:
            if isinstance(stream, io.BytesIO): stream.seek(0)
            df_raw = pd.read_excel(stream)

        if df_raw is None or df_raw.empty:
            raise HTTPException(status_code=400, detail="El archivo subido está vacío o no es tabular.")

        logger.info(f"[Etapa 1] Archivo leído ({len(df_raw)} filas) en {time.time()-t_read:.2f}s")
        
        t_clean = time.time()
        df_clean, cleaning_report = clean_dataframe(df_raw)

        t_prof = time.time()
        profile = profile_dataframe(df_clean, duplicate_rows=0)

        # Apply column_roles overrides from Data Profiling selector
        # Roles: "numeric" | "categorical" | "date" | "identifier"
        if column_roles:
            _apply_column_roles(df_clean, profile, column_roles)

        if len(df_clean) > 10000:
            df_ml = df_clean.sample(10000, random_state=42)
        else:
            df_ml = df_clean

        active_target = _resolve_target(target_col, profile, df_clean)

        kpis = {
            "Registros": f"{profile.n_rows:,}",
            "Columnas": profile.n_cols,
        }
        if active_target in profile.numeric_columns:
            series = df_clean[active_target].dropna()
            kpis["Total"] = format_number(float(series.sum()))
            kpis["Promedio"] = format_number(float(series.mean()))
            kpis["Maximo"] = format_number(float(series.max()))
            kpis["Minimo"] = format_number(float(series.min()))

        charts = auto_charts(df_clean, profile, active_target)

        forecast_res: Dict[str, Any] = {"chart_data": None, "metrics": {}}
        feature_res: Dict[str, Any] = {"chart_importance": None, "chart_shap": None, "metrics": {}}
        anomaly_res: Dict[str, Any] = {"chart_data": None, "metrics": {}}
        seg_res: Dict[str, Any] = {"scatter_data": None, "radar_data": None, "metrics": {}}

        if profile.date_columns and active_target in profile.numeric_columns:
            try:
                _, f_fig, f_metrics = run_forecast(df_clean, date_col=profile.date_columns[0], value_col=active_target, periods=60)
                forecast_res = {"chart_data": f_fig, "metrics": f_metrics}
            except Exception as e:
                forecast_res["metrics"] = {"error": str(e)}
        gc.collect()

        if active_target in profile.numeric_columns:
            feats = [c for c in profile.numeric_columns if c != active_target]
            try:
                fi_fig, shap_fig, fi_metrics = run_feature_importance(df_ml, active_target, feats, categorical_cols=profile.categorical_columns)
                feature_res = {"chart_importance": fi_fig, "chart_shap": shap_fig, "metrics": fi_metrics}
            except Exception as e:
                feature_res["metrics"] = {"error": str(e)}
        gc.collect()

        try:
            col_types_map = {c.name: c.inferred_type for c in profile.columns}
            _, a_fig, a_metrics = run_anomaly_detection(
                df_ml, numeric_cols=profile.numeric_columns,
                target_col=active_target if active_target in profile.numeric_columns else None,
                date_col=profile.date_columns[0] if profile.date_columns else None,
                column_types=col_types_map,
            )
            anomaly_res = {"chart_data": a_fig, "metrics": a_metrics}
        except Exception as e:
            anomaly_res["metrics"] = {"error": str(e)}
        gc.collect()

        if len(profile.numeric_columns) >= 2:
            label_c = profile.categorical_columns[0] if profile.categorical_columns else None
            try:
                _, s_scatter, s_prof, s_metrics = run_clustering(
                    df_ml, numeric_cols=profile.numeric_columns[:6], label_col=label_c, target_col=active_target
                )
                seg_res = {"scatter_data": s_scatter, "radar_data": s_prof, "metrics": s_metrics}
            except Exception as e:
                seg_res["metrics"] = {"error": str(e)}
        gc.collect()

        narrative_res = {"text": "Generando informe avanzado con IA...", "source": "pending"}

        final_response = {
            "filename": filename,
            "target_col": active_target,
            "profile": {
                "n_rows": profile.n_rows,
                "n_cols": profile.n_cols,
                "quality_score": profile.quality_score,
                "quality_label": profile.quality_label,
                "numeric_columns": profile.numeric_columns,
                "date_columns": profile.date_columns,
                "categorical_columns": profile.categorical_columns,
                "suggested_targets": profile.suggested_targets,
            },
            "cleaning_report": {
                "actions": cleaning_report.actions,
                "duplicates_removed": cleaning_report.duplicates_removed,
                "nulls_imputed": cleaning_report.nulls_imputed,
            },
            "kpis": kpis,
            "charts": charts,
            "forecast": forecast_res,
            "segmentation": seg_res,
            "anomalies": anomaly_res,
            "feature_importance": feature_res,
            "narrative": narrative_res,
        }

        json_str = json.dumps(final_response, cls=NumpyEncoder)
        return json.loads(json_str)

    except HTTPException:
        raise
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Error durante el procesamiento: {str(ex)}")


# ---------------------------------------------------------------------------
# Shared helper functions (also used by multi-file and profile endpoints)
# ---------------------------------------------------------------------------

def _resolve_target(target_col: Optional[str], profile, df: pd.DataFrame) -> str:
    """Resolve the active target column from user input or auto-suggestion."""
    if target_col:
        tc_lower = str(target_col).strip().lower()
        for col in profile.numeric_columns:
            if str(col).strip().lower() == tc_lower:
                return col
        for col in df.columns:
            if str(col).strip().lower() == tc_lower:
                return col
    if profile.suggested_targets:
        return profile.suggested_targets[0]
    if profile.numeric_columns:
        return profile.numeric_columns[0]
    return df.columns[0]


def _apply_column_roles(df: pd.DataFrame, profile, column_roles: Dict[str, str]) -> None:
    """
    Apply user-specified column roles to the profile, mutating it in place.
    Roles: 'numeric' | 'categorical' | 'date' | 'identifier'
    Columns marked 'identifier' are removed from all analysis lists.
    """
    from core.data_profiler import (
        COLUMN_TYPE_NUMERIC, COLUMN_TYPE_CATEGORICAL, COLUMN_TYPE_DATE, COLUMN_TYPE_ID
    )

    for col, role in column_roles.items():
        if col not in df.columns:
            continue
        role = role.lower()

        # Remove from all lists first
        for lst in [profile.numeric_columns, profile.date_columns, profile.categorical_columns, profile.suggested_targets]:
            if col in lst:
                lst.remove(col)

        if role in ("identifier", "id", "ignore"):
            pass  # Column excluded from all analysis
        elif role == "numeric" and col not in profile.numeric_columns:
            profile.numeric_columns.append(col)
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            except Exception:
                pass
        elif role == "categorical" and col not in profile.categorical_columns:
            profile.categorical_columns.append(col)
            df[col] = df[col].astype(str)
        elif role == "date" and col not in profile.date_columns:
            profile.date_columns.append(col)
            try:
                df[col] = pd.to_datetime(df[col], errors="coerce")
            except Exception:
                pass


def _read_dataframe(file_input: Any, filename: str = "") -> pd.DataFrame:
    """Read any supported file format into a DataFrame directly from memory or path."""
    fname_lower = (filename or (str(file_input) if isinstance(file_input, (str, Path)) else "")).lower()

    if isinstance(file_input, bytes):
        stream = io.BytesIO(file_input)
    elif isinstance(file_input, io.BytesIO):
        stream = file_input
        stream.seek(0)
    else:
        stream = file_input

    if fname_lower.endswith(".json"):
        return _parse_json_intelligent(file_input)
    elif fname_lower.endswith((".xlsx", ".xls")):
        if isinstance(stream, io.BytesIO): stream.seek(0)
        return pd.read_excel(stream)
    else:
        enc, sep, skiprows = detect_csv_format(file_input)
        if isinstance(stream, io.BytesIO): stream.seek(0)
        try:
            return pd.read_csv(stream, encoding=enc, sep=sep, skiprows=skiprows, engine="c", on_bad_lines="skip")
        except Exception:
            if isinstance(stream, io.BytesIO): stream.seek(0)
            return pd.read_csv(stream, encoding="latin1", sep=None, skiprows=skiprows, engine="python", on_bad_lines="skip")


def _analyze_dataframe(
    df_raw: pd.DataFrame,
    filename: str,
    target_col: Optional[str] = None,
    column_roles: Optional[Dict[str, str]] = None,
) -> dict:
    """
    Run the full analysis pipeline on a pre-loaded DataFrame.
    Used by multi-file analysis endpoint.
    """
    if df_raw is None or df_raw.empty:
        raise HTTPException(status_code=400, detail="El DataFrame esta vacio.")

    df_clean, cleaning_report = clean_dataframe(df_raw)
    profile = profile_dataframe(df_clean, duplicate_rows=0)

    if column_roles:
        _apply_column_roles(df_clean, profile, column_roles)

    df_ml = df_clean.sample(10000, random_state=42) if len(df_clean) > 10000 else df_clean
    active_target = _resolve_target(target_col, profile, df_clean)

    kpis = {"Registros": f"{profile.n_rows:,}", "Columnas": profile.n_cols}
    if active_target in profile.numeric_columns:
        series = df_clean[active_target].dropna()
        kpis["Total"] = format_number(float(series.sum()))
        kpis["Promedio"] = format_number(float(series.mean()))

    charts = auto_charts(df_clean, profile, active_target)

    forecast_res: Dict[str, Any] = {"chart_data": None, "metrics": {}}
    feature_res: Dict[str, Any] = {"chart_importance": None, "chart_shap": None, "metrics": {}}
    anomaly_res: Dict[str, Any] = {"chart_data": None, "metrics": {}}
    seg_res: Dict[str, Any] = {"scatter_data": None, "radar_data": None, "metrics": {}}

    if profile.date_columns and active_target in profile.numeric_columns:
        try:
            _, f_fig, f_metrics = run_forecast(df_clean, date_col=profile.date_columns[0], value_col=active_target, periods=60)
            forecast_res = {"chart_data": f_fig, "metrics": f_metrics}
        except Exception as e:
            forecast_res["metrics"] = {"error": str(e)}
    gc.collect()

    if active_target in profile.numeric_columns:
        feats = [c for c in profile.numeric_columns if c != active_target]
        try:
            fi_fig, shap_fig, fi_metrics = run_feature_importance(df_ml, active_target, feats, categorical_cols=profile.categorical_columns)
            feature_res = {"chart_importance": fi_fig, "chart_shap": shap_fig, "metrics": fi_metrics}
        except Exception as e:
            feature_res["metrics"] = {"error": str(e)}
    gc.collect()

    try:
        col_types_map = {c.name: c.inferred_type for c in profile.columns}
        _, a_fig, a_metrics = run_anomaly_detection(
            df_ml,
            numeric_cols=profile.numeric_columns,
            target_col=active_target if active_target in profile.numeric_columns else None,
            date_col=profile.date_columns[0] if profile.date_columns else None,
            column_types=col_types_map,
        )
        anomaly_res = {"chart_data": a_fig, "metrics": a_metrics}
    except Exception as e:
        anomaly_res["metrics"] = {"error": str(e)}
    gc.collect()

    if len(profile.numeric_columns) >= 2:
        label_c = profile.categorical_columns[0] if profile.categorical_columns else None
        try:
            _, s_scatter, s_prof, s_metrics = run_clustering(df_ml, numeric_cols=profile.numeric_columns[:6], label_col=label_c, target_col=active_target)
            seg_res = {"scatter_data": s_scatter, "radar_data": s_prof, "metrics": s_metrics}
        except Exception as e:
            seg_res["metrics"] = {"error": str(e)}
    gc.collect()

    final_response = {
        "filename": filename,
        "target_col": active_target,
        "profile": {"n_rows": profile.n_rows, "n_cols": profile.n_cols, "quality_score": profile.quality_score, "quality_label": profile.quality_label, "numeric_columns": profile.numeric_columns, "date_columns": profile.date_columns, "categorical_columns": profile.categorical_columns, "suggested_targets": profile.suggested_targets},
        "cleaning_report": {"actions": cleaning_report.actions, "duplicates_removed": cleaning_report.duplicates_removed, "nulls_imputed": cleaning_report.nulls_imputed},
        "kpis": kpis, "charts": charts, "forecast": forecast_res, "segmentation": seg_res, "anomalies": anomaly_res, "feature_importance": feature_res,
        "narrative": {"text": "Generando informe avanzado con IA...", "source": "pending"},
    }

    json_str = json.dumps(final_response, cls=NumpyEncoder)
    return json.loads(json_str)


def _profile_only(file_input: Any, filename: str) -> dict:
    """
    Fast profile-only analysis: reads up to 1000 preview rows and returns column metadata.
    Does NOT run ML models. Used by the /profile endpoint.
    """
    try:
        fname_lower = (filename or (str(file_input) if isinstance(file_input, (str, Path)) else "")).lower()
        if isinstance(file_input, bytes):
            stream = io.BytesIO(file_input)
            raw_bytes = file_input
        elif isinstance(file_input, io.BytesIO):
            pos = file_input.tell()
            file_input.seek(0)
            raw_bytes = file_input.read()
            file_input.seek(pos)
            stream = io.BytesIO(raw_bytes)
        else:
            stream = file_input
            raw_bytes = None

        if fname_lower.endswith(".json"):
            df_preview = _parse_json_intelligent(file_input).head(1000)
            n_rows_est = len(df_preview)
        elif fname_lower.endswith((".xlsx", ".xls")):
            if isinstance(stream, io.BytesIO): stream.seek(0)
            df_preview = pd.read_excel(stream, nrows=1000)
            n_rows_est = len(df_preview)
        else:
            enc, sep, skiprows = detect_csv_format(file_input)
            if isinstance(stream, io.BytesIO): stream.seek(0)
            try:
                df_preview = pd.read_csv(stream, encoding=enc, sep=sep, skiprows=skiprows, nrows=1000, engine="c", on_bad_lines="skip")
            except Exception:
                if isinstance(stream, io.BytesIO): stream.seek(0)
                df_preview = pd.read_csv(stream, encoding="latin1", sep=None, skiprows=skiprows, nrows=1000, engine="python", on_bad_lines="skip")
            
            # Fast line count estimate from size
            try:
                if raw_bytes is not None:
                    file_size = len(raw_bytes)
                    sample_bytes = raw_bytes[:65536]
                elif isinstance(file_input, (str, Path)) and os.path.exists(file_input):
                    file_size = os.path.getsize(file_input)
                    with open(file_input, "rb") as f:
                        sample_bytes = f.read(65536)
                else:
                    file_size = 0
                    sample_bytes = b""

                lines_in_sample = sample_bytes.count(b"\n")
                if lines_in_sample > 0 and len(sample_bytes) > 0:
                    n_rows_est = int((file_size / len(sample_bytes)) * lines_in_sample)
                else:
                    n_rows_est = len(df_preview)
            except Exception:
                n_rows_est = len(df_preview)

        df_clean, _ = clean_dataframe(df_preview)
        profile = profile_dataframe(df_clean, duplicate_rows=0)

        # Build column detail list for the ColumnRoleSelector
        columns_detail = []
        for col_prof in profile.columns:
            sample_vals = [str(v) for v in (df_clean[col_prof.name].dropna().head(3).tolist() if col_prof.name in df_clean.columns else [])]
            columns_detail.append({
                "name": col_prof.name,
                "inferred_type": col_prof.inferred_type,
                "n_unique": col_prof.n_unique,
                "null_pct": round(col_prof.null_pct, 1),
                "sample_values": sample_vals,
                "suggested_role": _inferred_type_to_role(col_prof.inferred_type),
            })

        preview_records = df_clean.head(5).to_dict(orient="records")
        # Sanitize preview records
        clean_preview = []
        for rec in preview_records:
            clean_rec = {}
            for k, v in rec.items():
                if isinstance(v, float) and (pd.isna(v) or v != v):
                    clean_rec[k] = None
                elif hasattr(v, "item"):
                    clean_rec[k] = v.item()
                else:
                    clean_rec[k] = v
            clean_preview.append(clean_rec)

        result = {
            "filename": filename,
            "n_rows_estimated": max(len(df_preview), n_rows_est),
            "n_cols": profile.n_cols,
            "quality_score": profile.quality_score,
            "quality_label": profile.quality_label,
            "suggested_targets": profile.suggested_targets,
            "columns": columns_detail,
            "preview_rows": clean_preview,
        }
        return json.loads(json.dumps(result, cls=NumpyEncoder))
    except Exception as ex:
        logger.error(f"Error during profiling of {filename}: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error durante el profiling: {str(ex)}")


def _inferred_type_to_role(inferred_type: str) -> str:
    """Map data_profiler inferred type to a frontend-friendly role string."""
    mapping = {
        "numerica": "numeric",
        "categorica": "categorical",
        "fecha": "date",
        "identificador": "identifier",
        "texto": "categorical",
    }
    return mapping.get(inferred_type.lower(), "categorical")

