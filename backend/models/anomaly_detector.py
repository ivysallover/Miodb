"""
models/anomaly_detector.py
Deteccion de anomalias con Isolation Forest para Web API.
Retorna raw data y metricas.
"""

from __future__ import annotations
from typing import List, Tuple, Optional, Dict, Any
from decimal import Decimal
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


def run_anomaly_detection(
    df: pd.DataFrame,
    numeric_cols: List[str],
    target_col: Optional[str] = None,
    date_col: Optional[str] = None,
    contamination: float = 0.01,
    column_types: Optional[Dict[str, str]] = None,
) -> Tuple[pd.DataFrame, Optional[dict], dict]:
    """
    Detecta anomalias usando Isolation Forest.
    Retorna (df_out, chart_data, metrics)
    """
    if not numeric_cols:
        return df, None, {"error": "No hay columnas numéricas para analizar."}

    try:
        if len(df) < 10:
            return df, None, {"error": "Se requieren al menos 10 registros para detectar anomalías con precisión."}

        X = df[numeric_cols].copy().fillna(df[numeric_cols].median())
        var = X.var()
        valid_cols = var[var > 0].index.tolist()
        if not valid_cols:
            return df, None, {"error": "Las columnas numéricas no tienen varianza para analizar anomalías."}
            
        X = X[valid_cols]
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        # Calibración conservadora de anomalías:
        # Las anomalías de negocio deben ser valores verdaderamente atípicos (~0.5% - 1.0%),
        # nunca una cuarta parte del dataset. Cappeamos entre 8 y 40 anomalías genuinas.
        n_samples = len(X_scaled)
        target_anomalies = min(40, max(8, int(n_samples * 0.005)))
        dynamic_contamination = max(0.001, min(0.015, target_anomalies / n_samples))
        
        iso = IsolationForest(
            n_estimators=40,
            max_samples=min(256, n_samples),
            contamination=dynamic_contamination,
            random_state=42,
            n_jobs=1,
        )
        labels = iso.fit_predict(X_scaled)

        df_out = df.copy()
        df_out["_is_anomaly"] = labels == -1
        n_anomalies = int((labels == -1).sum())
        anomaly_rows = df_out[df_out["_is_anomaly"]].copy()

        chart_data = None
        if target_col and target_col in df_out.columns and date_col and date_col in df_out.columns:
            df_plot = df_out.copy()
            df_plot[date_col] = pd.to_datetime(df_plot[date_col], errors="coerce")
            
            # Remove NaNs in target or date
            df_plot = df_plot.dropna(subset=[date_col, target_col])

            normal_df = df_plot[~df_plot["_is_anomaly"]]
            anomaly_df = df_plot[df_plot["_is_anomaly"]]

            # Downsample normal points for frontend performance & visual clarity
            if len(normal_df) > 800:
                normal_df = normal_df.sample(800, random_state=42)
                
            # Limit anomalies to prevent noise
            if len(anomaly_df) > 50:
                anomaly_df = anomaly_df.sample(50, random_state=42)

            # CRÍTICO: Concatenar y ordenar cronológicamente de forma estricta por fecha
            df_plot = pd.concat([normal_df, anomaly_df]).sort_values(by=date_col)
            df_plot["_anomaly"] = df_plot["_is_anomaly"].map({True: -1, False: 1})
            df_plot[date_col] = df_plot[date_col].dt.strftime('%Y-%m-%d %H:%M:%S')
            
            source = df_plot[[date_col, target_col, "_anomaly"]].copy().to_dict(orient="records")
            
            chart_data = {
                "chart_id": "anom_time",
                "metadata": {
                    "title": "Detección de Anomalías", 
                    "insight_subtitle": f"Valores atípicos detectados sobre la serie temporal de {target_col}", 
                    "source_metric": target_col
                },
                "layout_directives": {
                    "chart_type": "Scatter", 
                    "x_axis_type": "time", 
                    "y_axis_type": "value", 
                    "is_log_scale": False, 
                    "has_time_gaps": False, 
                    "high_cardinality": False, 
                    "show_confidence_bands": False
                },
                "dataset": {"dimensions": [date_col, target_col, "_anomaly"], "source": source}
            }

        elif len(numeric_cols) >= 2:
            x_col = numeric_cols[0]
            y_col = numeric_cols[1]
            
            # Split anomalies and normal
            df_anomalies = df_out[df_out["_is_anomaly"]]
            df_normal = df_out[~df_out["_is_anomaly"]]
            
            if len(df_normal) > 1000:
                df_normal = df_normal.sample(1000, random_state=42)
            if len(df_anomalies) > 50:
                df_anomalies = df_anomalies.sample(50, random_state=42)

            def to_list_clean(series):
                return [x if not pd.isna(x) else None for x in series]

            df_plot = pd.concat([df_normal, df_anomalies])
            df_plot["_anomaly"] = df_plot["_is_anomaly"].map({True: -1, False: 1})
            
            source = df_plot[[x_col, y_col, "_anomaly"]].copy().to_dict(orient="records")
            
            chart_data = {
                "chart_id": "anom_scatter",
                "metadata": {"title": "Detección de Anomalías", "insight_subtitle": f"Dispersión {x_col} vs {y_col}", "source_metric": y_col},
                "layout_directives": {"chart_type": "Scatter", "x_axis_type": "value", "y_axis_type": "value", "is_log_scale": False, "has_time_gaps": False, "high_cardinality": False, "show_confidence_bands": False},
                "dataset": {"dimensions": [x_col, y_col, "_anomaly"], "source": source}
            }

        anomaly_descriptions = []
        if not anomaly_rows.empty:
            for _, row in anomaly_rows.head(10).iterrows():
                desc_parts = []
                if date_col and date_col in row:
                    desc_parts.append(str(row[date_col])[:10])
                for col in numeric_cols[:3]:
                    if col in row:
                        val = row[col]
                        try:
                            val_str = f"{round(float(val), 2)}"
                        except (ValueError, TypeError):
                            val_str = str(val)
                        desc_parts.append(f"{col}: {val_str}")
                anomaly_descriptions.append(" | ".join(desc_parts))

        # Extraer registros estructurados para la tabla interactiva del frontend
        clean_cols = [c for c in df_out.columns if not c.startswith("_")]

        column_roles = {}
        for c in clean_cols:
            if column_types and c in column_types:
                column_roles[c] = column_types[c]
            else:
                # Heurística fallback
                c_lower = c.lower()
                if any(kw in c_lower for kw in ["id", "cod", "codigo", "código", "key", "uuid", "dni", "cuit", "cuil"]):
                    column_roles[c] = "identificador"
                elif c in numeric_cols:
                    column_roles[c] = "numérica"
                elif date_col and c == date_col:
                    column_roles[c] = "fecha"
                else:
                    column_roles[c] = "categórica"
        
        def _safe_val(v):
            if isinstance(v, Decimal):
                return str(v)
            if pd.isna(v):
                return None
            if isinstance(v, (pd.Timestamp, np.datetime64)) or hasattr(v, "isoformat"):
                return str(v)
            if isinstance(v, (np.integer, int)):
                return int(v)
            if isinstance(v, (np.floating, float)):
                return float(v)
            return v

        anomaly_records = []
        if not anomaly_rows.empty:
            for _, r in anomaly_rows.head(150).iterrows():
                row_dict = {c: _safe_val(r[c]) for c in clean_cols}
                row_dict["_is_anomaly"] = True
                anomaly_records.append(row_dict)

        sample_records = []
        normal_rows = df_out[~df_out["_is_anomaly"]]
        if not normal_rows.empty:
            for _, r in normal_rows.head(150).iterrows():
                row_dict = {c: _safe_val(r[c]) for c in clean_cols}
                row_dict["_is_anomaly"] = False
                sample_records.append(row_dict)

        metrics = {
            "n_anomalias": n_anomalies,
            "pct_anomalias": round(n_anomalies / max(len(df), 1) * 100, 2),
            "anomalias_detalle": anomaly_descriptions,
            "anomaly_records": anomaly_records,
            "sample_records": sample_records,
            "table_columns": clean_cols,
            "column_roles": column_roles,
        }

        return df_out, chart_data, metrics

    except Exception as e:
        return df, None, {"error": str(e)}
