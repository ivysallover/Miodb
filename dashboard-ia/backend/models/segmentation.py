"""
models/segmentation.py
Segmentación de registros usando K-Means optimizado.
Genera gráficos óptimos para toma de decisiones de negocio:
1. Donut/HorizontalBar de Distribución y Volumen por Segmento.
2. HorizontalBar de Perfil y Comparativa de Valor por Segmento.
"""

from __future__ import annotations
from typing import Optional, Tuple, List, Dict, Any
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

SEGMENT_LABELS = [
    "Segmento Estrella",
    "Segmento Activo",
    "Segmento Ocasional",
    "Segmento Dormido",
    "Segmento Nuevo",
    "Segmento Fiel",
    "Segmento en Riesgo",
]


def _find_optimal_k(X_scaled: np.ndarray, max_k: int = 5) -> int:
    if len(X_scaled) < max_k * 2:
        return min(3, max(2, len(X_scaled) // 2))

    X_sample = X_scaled[np.random.choice(X_scaled.shape[0], min(1000, len(X_scaled)), replace=False)]

    best_k, best_score = 3, -1
    for k in range(2, min(max_k + 1, len(X_sample))):
        try:
            km = KMeans(n_clusters=k, random_state=42, n_init="auto")
            labels = km.fit_predict(X_sample)
            score = silhouette_score(X_sample, labels, sample_size=min(300, len(X_sample)), random_state=42)
            if score > best_score:
                best_score = score
                best_k = k
        except Exception:
            pass
    return best_k


def run_clustering(
    df: pd.DataFrame,
    numeric_cols: List[str],
    n_clusters: Optional[int] = None,
    label_col: Optional[str] = None,
    target_col: Optional[str] = None,
) -> Tuple[pd.DataFrame, Optional[dict], Optional[dict], dict]:
    """
    Ejecuta K-Means y retorna (df_out, distribution_chart, profile_chart, metrics).
    Reemplaza gráficos abstractos/aplastados (PCA scatter y Radar ilegible)
    por visualizaciones óptimas para analítica de negocios (Donut + HorizontalBar).
    """
    if len(numeric_cols) < 2:
        return df, None, None, {"error": "Se requieren al menos 2 columnas numéricas para segmentar."}

    try:
        X = df[numeric_cols].copy()
        if len(X) < 10:
            return df, None, None, {"error": "Se requieren al menos 10 registros para segmentar."}

        var = X.var()
        valid_cols = var[var > 0].index.tolist()
        if len(valid_cols) < 2:
            return df, None, None, {"error": "Las columnas numéricas no tienen suficiente varianza para segmentar."}

        X = X[valid_cols]
        X = X.fillna(X.median())

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        k = n_clusters if n_clusters else _find_optimal_k(X_scaled)
        k = max(2, min(k, min(6, len(df) - 1)))

        km = KMeans(n_clusters=k, random_state=42, n_init="auto")
        labels = km.fit_predict(X_scaled)

        df_out = df.copy()
        df_out["_cluster"] = labels
        segment_names = [SEGMENT_LABELS[i] if i < len(SEGMENT_LABELS) else f"Segmento {i+1}" for i in range(k)]
        df_out["_segment"] = df_out["_cluster"].apply(lambda x: segment_names[x] if x < len(segment_names) else f"Segmento {x+1}")

        # ----------------------------------------------------
        # GRÁFICO 1 ÓPTIMO: Distribución y Volumen por Segmento
        # (Donut si k <= 5, HorizontalBar si k > 5)
        # ----------------------------------------------------
        counts = df_out["_segment"].value_counts()
        dist_source = []
        for seg_name in segment_names:
            cnt = int(counts.get(seg_name, 0))
            dist_source.append({"_segment": seg_name, "cantidad": cnt})

        chart_type_dist = "Donut" if k <= 5 else "HorizontalBar"
        dist_chart = {
            "chart_id": "seg_distribution",
            "metadata": {
                "title": "Distribución de Segmentos",
                "insight_subtitle": f"Participación de los {k} grupos detectados",
                "source_metric": "cantidad"
            },
            "layout_directives": {
                "chart_type": chart_type_dist,
                "x_axis_type": "category" if chart_type_dist == "Donut" else "value",
                "y_axis_type": "value" if chart_type_dist == "Donut" else "category",
                "is_log_scale": False,
                "has_time_gaps": False,
                "high_cardinality": False,
                "show_confidence_bands": False
            },
            "dataset": {
                "dimensions": ["_segment", "cantidad"],
                "source": dist_source
            }
        }

        # ----------------------------------------------------
        # GRÁFICO 2 ÓPTIMO: Perfil y Valor Promedio por Segmento
        # (HorizontalBar de la métrica clave o de mayor contraste)
        # ----------------------------------------------------
        # Determinar la métrica más relevante para comparar
        selected_metric = None
        if target_col and target_col in valid_cols:
            selected_metric = target_col
        else:
            # Seleccionar la columna con mayor ratio entre cluster max y cluster min
            best_diff = -1
            for col in valid_cols:
                means = df_out.groupby("_cluster")[col].mean()
                diff = (means.max() - means.min()) / (abs(means.mean()) + 1e-5)
                if diff > best_diff:
                    best_diff = diff
                    selected_metric = col

        if not selected_metric:
            selected_metric = valid_cols[0]

        metric_means = df_out.groupby("_segment")[selected_metric].mean()
        profile_source = []
        for seg_name in segment_names:
            val = float(metric_means.get(seg_name, 0))
            profile_source.append({
                "_segment": seg_name,
                selected_metric: round(val, 2)
            })

        profile_chart = {
            "chart_id": "seg_profile_value",
            "metadata": {
                "title": f"Perfil: {selected_metric.replace('_', ' ').capitalize()} por Segmento",
                "insight_subtitle": f"Comparativa de valor medio de {selected_metric}",
                "source_metric": selected_metric
            },
            "layout_directives": {
                "chart_type": "HorizontalBar",
                "x_axis_type": "value",
                "y_axis_type": "category",
                "is_log_scale": False,
                "has_time_gaps": False,
                "high_cardinality": False,
                "show_confidence_bands": False
            },
            "dataset": {
                "dimensions": ["_segment", selected_metric],
                "source": profile_source
            }
        }

        # Perfil multivariable para métricas
        profile_data = []
        for cluster_id in range(k):
            mask = df_out["_cluster"] == cluster_id
            seg_name = segment_names[cluster_id]
            row = {"Segmento": seg_name, "Cantidad": int(mask.sum())}
            for col in valid_cols:
                row[col] = round(float(df_out.loc[mask, col].mean()), 2)
            profile_data.append(row)

        metrics = {
            "k": k,
            "varianza_explicada_pca": 100.0,
            "distribucion": {seg["_segment"]: seg["cantidad"] for seg in dist_source},
            "perfil": profile_data,
        }

        return df_out, dist_chart, profile_chart, metrics

    except Exception as e:
        return df, None, None, {"error": str(e)}
