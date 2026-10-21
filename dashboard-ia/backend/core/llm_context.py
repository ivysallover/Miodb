"""
core/llm_context.py
Lo que sale hacia un modelo de lenguaje (Gemini) sobre una planilla: resultados, nunca filas.

Los valores raros traen los registros completos (`anomaly_records`, `sample_records`) para la tabla
de la pantalla; hacia afuera solo va cuántos son, qué parte de la planilla y en qué columnas se
salen de lo normal.
"""

from __future__ import annotations

from collections import Counter
from typing import Any, Dict


def anomaly_summary(metrics: Dict[str, Any]) -> Dict[str, Any]:
    """Los valores raros resumidos: cantidad, porcentaje y cuántos registros se salen en cada columna."""
    if not isinstance(metrics, dict) or metrics.get("error"):
        return {"error": metrics.get("error")} if isinstance(metrics, dict) else {}
    records = metrics.get("anomaly_records") or metrics.get("anomalyRecords") or []
    by_column = Counter(r.get("_top_anomaly_feature") for r in records if isinstance(r, dict) and r.get("_top_anomaly_feature"))
    return {
        "n_anomalias": metrics.get("n_anomalias", metrics.get("nAnomalias", len(records))),
        "pct_anomalias": metrics.get("pct_anomalias", metrics.get("pctAnomalias")),
        "columnas_con_valores_raros": dict(by_column.most_common()),
    }
