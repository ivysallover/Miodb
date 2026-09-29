"""
insights/narrator.py
Generación de narrativa ejecutiva con Gemini API o fallback heurístico.
"""

from __future__ import annotations
import os
from typing import Optional, Dict, Any
import pandas as pd
from core.config import get_settings
from core.pii_sanitizer import sanitize_pii

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


def _init_gemini() -> Optional[object]:
    if not GEMINI_AVAILABLE:
        return None

    settings = get_settings()
    api_key = os.getenv("GEMINI_API_KEY", "").strip() or settings.GEMINI_API_KEY
    if not api_key or api_key == "tu_api_key_aqui":
        return None

    try:
        genai.configure(api_key=api_key)
        for m_name in ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"]:
            try:
                return genai.GenerativeModel(m_name)
            except Exception:
                continue
        return genai.GenerativeModel("gemini-3.6-flash")
    except Exception:
        return None


def _generate_with_gemini(model, context: dict) -> str:
    clean_context = sanitize_pii(context)
    prompt = f"""
Eres un analista de negocios y consultor de datos senior. Analiza los datos calculados de este archivo y genera un informe ejecutivo de alto valor para toma de decisiones.

DATOS:
Archivo: {clean_context.get('filename')}
Filas: {clean_context.get('n_rows')} | Columnas: {clean_context.get('n_cols')}
Variable Analizada: {clean_context.get('target_col')}
KPIs: {clean_context.get('kpis')}
Factores de mayor impacto (ML): {clean_context.get('top_features')}
Anomalías: {clean_context.get('n_anomalias')} detectadas ({clean_context.get('pct_anomalias')}%)
Proyección: {clean_context.get('forecast')}
Segmentación: {clean_context.get('segmentacion')}

ESTRUCTURA REQUERIDA (en Markdown):
1. **Resumen Ejecutivo** (Visión general clara y concisa)
2. **Análisis de Resultados Clave** (Patrones y métricas más relevantes)
3. **Factores Determinantes** (Qué variables están impulsando el resultado según el modelo)
4. **Hallazgos y Anomalías** (Alertas a tener en cuenta)
5. **Recomendaciones Estratégicas** (3-4 acciones concretas que el equipo debería tomar)

Usa un tono profesional, orientado al negocio y fácil de entender sin tecnicismos matemáticos. NO uses ningún emoji en tu respuesta. Mantén un formato sobrio.
"""
    response = model.generate_content(prompt)
    return response.text


def _generate_heuristic(context: dict) -> str:
    target = context.get("target_col", "la variable")
    kpis = context.get("kpis", {})
    top_features = context.get("top_features", [])
    anomalias = context.get("n_anomalias", 0)
    pct_anom = context.get("pct_anomalias", 0)
    forecast = context.get("forecast", {})
    segmentacion = context.get("segmentacion", {})

    lines = [
        "## Resumen Ejecutivo",
        f"Se analizaron exitosamente **{context.get('n_rows', 0):,} registros** enfocados en la variable **{target}**.",
        "",
        "## Indicadores Clave",
    ]

    for k, v in list(kpis.items())[:4]:
        lines.append(f"- **{k}**: {v}")

    if forecast and "tendencia_pct" in forecast:
        trend = forecast["tendencia_pct"]
        dir_t = "crecimiento" if trend > 0 else "reducción"
        lines.extend([
            "",
            "## Proyección",
            f"- La tendencia proyectada indica un **{dir_t} del {abs(trend):.1f}%** para los próximos {forecast.get('periodos', 60)} períodos.",
        ])

    if top_features:
        lines.extend([
            "",
            "## Factores Determinantes (Machine Learning)",
            f"Las variables con mayor peso predictivo sobre {target} son:",
        ])
        for f in top_features[:3]:
            lines.append(f"- **{f.get('feature')}** (Importancia relativa alta)")

    if anomalias > 0:
        lines.extend([
            "",
            "## Alertas",
            f"- Se detectaron **{anomalias} registros anómalos** ({pct_anom}% de la muestra) que presentan desvíos significativos respecto a la norma.",
        ])
    else:
        lines.extend([
            "",
            "## Alertas",
            "- No se detectaron anomalías severas; el comportamiento de los datos es homogéneo.",
        ])

    lines.extend([
        "",
        "## Recomendaciones",
        "1. Priorizar la optimización de los factores determinantes identificados por el modelo.",
        "2. Monitorear los casos señalados como anomalías para detectar oportunidades o errores de registro.",
        "3. Realizar re-evaluaciones periódicas para calibrar las proyecciones.",
    ])

    return "\n".join(lines)


def generate_narrative(
    df: pd.DataFrame,
    profile,
    target_col: str,
    kpis: dict,
    anomaly_metrics: dict,
    forecast_metrics: dict,
    segmentation_metrics: dict,
    feature_metrics: dict,
    filename: str = "dataset",
) -> dict:
    context = {
        "filename": filename,
        "n_rows": profile.n_rows,
        "n_cols": profile.n_cols,
        "target_col": target_col,
        "kpis": kpis,
        "top_features": feature_metrics.get("top_features", []),
        "n_anomalias": anomaly_metrics.get("n_anomalias", 0),
        "pct_anomalias": anomaly_metrics.get("pct_anomalias", 0),
        "segmentacion": segmentation_metrics,
        "forecast": forecast_metrics,
    }

    model = _init_gemini()
    if model:
        try:
            text = _generate_with_gemini(model, context)
            return {"text": text, "source": "gemini"}
        except Exception:
            pass

    text = _generate_heuristic(context)
    return {"text": text, "source": "heuristic"}
