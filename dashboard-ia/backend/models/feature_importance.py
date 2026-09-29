"""
models/feature_importance.py
Importancia de variables con LightGBM + SHAP.
Retorna raw data para renderizar con Chart.js en el frontend.
"""

from __future__ import annotations
from typing import List, Tuple, Optional, Dict, Any
import pandas as pd
import numpy as np

try:
    import lightgbm as lgb
    LGBM_AVAILABLE = True
except ImportError:
    LGBM_AVAILABLE = False

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False


def run_feature_importance(
    df: pd.DataFrame,
    target_col: str,
    feature_cols: List[str],
    categorical_cols: Optional[List[str]] = None,
) -> Tuple[Optional[dict], Optional[dict], dict]:
    """
    Calcula importancia de variables.
    Retorna (chart_importance, chart_shap, metrics)
    """
    if not LGBM_AVAILABLE:
        return None, None, {"error": "LightGBM no está disponible en este entorno."}

    if target_col not in df.columns:
        return None, None, {"error": f"Columna objetivo '{target_col}' no encontrada."}

    available = [c for c in feature_cols if c in df.columns and c != target_col]
    if not available:
        return None, None, {"error": "No hay columnas de variables predictoras disponibles."}

    try:
        df_ml = df[available + [target_col]].copy()
        cat_cols_present = [c for c in (categorical_cols or []) if c in available]
        for col in cat_cols_present:
            df_ml[col] = df_ml[col].astype("category").cat.codes

        df_ml = df_ml.fillna(df_ml.median(numeric_only=True))

        X = df_ml[available]
        y = df_ml[target_col]

        if len(X) < 20:
            return None, None, {"error": "Se requieren al menos 20 registros para encontrar factores clave."}
            
        if y.nunique() <= 1:
            return None, None, {"error": "La variable objetivo es constante. No se pueden buscar factores."}
            
        var = X.var(numeric_only=True)
        valid_cols = var[var > 0].index.tolist()
        if not valid_cols:
            return None, None, {"error": "Las variables predictoras no tienen varianza."}

        # Keep valid features
        available = valid_cols
        X = X[available]

        model = lgb.LGBMRegressor(
            n_estimators=40,
            learning_rate=0.08,
            max_depth=4,
            random_state=42,
            verbose=-1,
            n_jobs=1,
        )
        model.fit(X, y)

        importance_df = pd.DataFrame({
            "feature": available,
            "importance": model.feature_importances_,
        }).sort_values("importance", ascending=True).tail(15)

        source_imp = importance_df[["feature", "importance"]].copy().to_dict(orient="records")
        chart_importance = {
            "chart_id": "feat_importance",
            "metadata": {"title": f"Impacto de Variables en {target_col}", "insight_subtitle": "Importancia Gini (LGBM)", "source_metric": "importance"},
            "layout_directives": {"chart_type": "HorizontalBar", "x_axis_type": "value", "y_axis_type": "category", "is_log_scale": False, "has_time_gaps": False, "high_cardinality": False, "show_confidence_bands": False},
            "dataset": {"dimensions": ["feature", "importance"], "source": source_imp}
        }

        chart_shap = None
        shap_summary = {}

        if SHAP_AVAILABLE:
            try:
                explainer = shap.TreeExplainer(model)
                X_sample = X.sample(min(250, len(X)), random_state=42)
                shap_values = explainer.shap_values(X_sample)
                mean_shap = np.abs(shap_values).mean(axis=0)
                
                # Calcular direccionalidad (positivo/negativo)
                signed_shap = []
                for i, col in enumerate(available):
                    corr = np.corrcoef(X_sample[col], shap_values[:, i])[0, 1]
                    direction = np.sign(corr) if not pd.isna(corr) else 1
                    signed_shap.append(mean_shap[i] * direction)

                shap_df = pd.DataFrame({
                    "feature": available,
                    "shap_importance": signed_shap,
                    "abs_importance": mean_shap
                }).sort_values("abs_importance", ascending=True).tail(15)

                source_shap = shap_df[["feature", "shap_importance"]].copy().to_dict(orient="records")
                chart_shap = {
                    "chart_id": "feat_shap",
                    "metadata": {"title": f"Factores de Atribución (SHAP) en {target_col}", "insight_subtitle": "Direccionalidad del Impacto", "source_metric": "shap_importance"},
                    "layout_directives": {"chart_type": "Tornado", "x_axis_type": "value", "y_axis_type": "category", "is_log_scale": False, "has_time_gaps": False, "high_cardinality": False, "show_confidence_bands": False},
                    "dataset": {"dimensions": ["feature", "shap_importance"], "source": source_shap}
                }
                shap_summary = {feat: round(float(val), 4) for feat, val in zip(available, mean_shap)}
            except Exception:
                pass

        top_features = importance_df.tail(5)[["feature", "importance"]].iloc[::-1].to_dict(orient="records")

        metrics = {
            "top_features": top_features,
            "shap_summary": shap_summary,
            "n_features": len(available),
            "shap_disponible": bool(shap_summary),
        }

        return chart_importance, chart_shap, metrics

    except Exception as e:
        return None, None, {"error": str(e)}
