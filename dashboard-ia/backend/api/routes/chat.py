"""
routers/chat.py
Endpoint para interactuar con la API de Gemini (Chat con el dataset).
Soporta modificaciones de gráficos compatibles con Apache ECharts (ChartSchema).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import os
import json
import re

from schemas.responses import BaseSchema, ChartSchema, ChartMetadataSchema, LayoutDirectivesSchema, DatasetSchema
from core.config import get_settings
from core.pii_sanitizer import sanitize_pii, sanitize_text

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

router = APIRouter()

class ChatRequest(BaseSchema):
    message: str
    context: Dict[str, Any]
    charts: Optional[List[Dict[str, Any]]] = None

def _normalize_chart_data(raw_chart: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normaliza el chart_data devuelto por el LLM hacia el estándar ChartSchema de ECharts.
    """
    # Si ya tiene el formato moderno ECharts
    if "dataset" in raw_chart and "layoutDirectives" in raw_chart:
        return raw_chart
    if "dataset" in raw_chart and "layout_directives" in raw_chart:
        return raw_chart

    # Si viene en formato legacy (labels + datasets de Chart.js)
    labels = raw_chart.get("labels", [])
    datasets = raw_chart.get("datasets", [])
    title = raw_chart.get("title", "Gráfico Personalizado")
    chart_type_legacy = str(raw_chart.get("type", "bar")).lower()

    chart_type_map = {
        "bar": "HorizontalBar",
        "bar_horizontal": "HorizontalBar",
        "horizontalbar": "HorizontalBar",
        "doughnut": "Donut",
        "donut": "Donut",
        "pie": "Donut",
        "line_area": "LineChart",
        "line": "LineChart",
        "linechart": "LineChart",
        "scatter": "Scatter",
    }
    target_type = chart_type_map.get(chart_type_legacy, "HorizontalBar")

    source = []
    if datasets and len(datasets) > 0:
        first_ds = datasets[0]
        data_vals = first_ds.get("data", [])
        for i, val in enumerate(data_vals):
            lbl = labels[i] if i < len(labels) else f"Item {i+1}"
            source.append({"categoria": str(lbl), "valor": val})
    else:
        for i, lbl in enumerate(labels):
            source.append({"categoria": str(lbl), "valor": 0})

    return {
        "chartId": "ai_override",
        "metadata": {
            "title": title,
            "insightSubtitle": "Generado por Asistente IA",
            "sourceMetric": "valor"
        },
        "layoutDirectives": {
            "chartType": target_type,
            "xAxisType": "value" if target_type == "HorizontalBar" else "category",
            "yAxisType": "category" if target_type == "HorizontalBar" else "value",
            "isLogScale": False,
            "hasTimeGaps": False,
            "highCardinality": False,
            "showConfidenceBands": False
        },
        "dataset": {
            "dimensions": ["categoria", "valor"],
            "source": source
        }
    }

@router.post("/chat")
async def chat_with_data(request: ChatRequest):
    if not GEMINI_AVAILABLE:
        raise HTTPException(status_code=500, detail="Librería google-generativeai no instalada.")

    settings = get_settings()
    api_key = os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(status_code=500, detail="Falta GEMINI_API_KEY en las variables de entorno.")

    try:
        genai.configure(api_key=api_key)
        model = None
        for m_name in ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"]:
            try:
                model = genai.GenerativeModel(m_name)
                break
            except Exception:
                continue
        if not model:
            model = genai.GenerativeModel("gemini-3.6-flash")

        ctx = request.context
        
        # Resumen estructurado del contexto
        profile_data = ctx.get("profile", {})
        summary_ctx = {
            "filename": ctx.get("filename", "Dataset"),
            "target": ctx.get("target_col") or ctx.get("targetCol"),
            "kpis": ctx.get("kpis", {}),
            "profile": {
                "rows": profile_data.get("n_rows") or profile_data.get("nRows"),
                "cols": profile_data.get("n_cols") or profile_data.get("nCols"),
                "numeric": profile_data.get("numeric_columns") or profile_data.get("numericColumns"),
                "categorical": profile_data.get("categorical_columns") or profile_data.get("categoricalColumns"),
            }
        }
        
        if "anomalies" in ctx:
            summary_ctx["anomalies"] = ctx["anomalies"].get("metrics", ctx["anomalies"])
            
        if "forecast" in ctx:
            summary_ctx["forecast"] = ctx["forecast"].get("metrics", ctx["forecast"])
            
        if "feature_importance" in ctx or "featureImportance" in ctx:
            fi = ctx.get("feature_importance") or ctx.get("featureImportance", {})
            summary_ctx["features"] = fi.get("metrics", fi)

        # Resumen de gráficos actuales de la UI
        charts_info = ""
        if request.charts:
            charts_summary = []
            for i, c in enumerate(request.charts):
                meta = c.get("metadata", {})
                directives = c.get("layoutDirectives") or c.get("layout_directives", {})
                title = meta.get("title") or c.get("title", f"Gráfico {i+1}")
                ctype = directives.get("chartType") or directives.get("chart_type") or c.get("type", "Gráfico")
                charts_summary.append({"index": i, "title": title, "type": ctype})
            charts_info = f"\nGRÁFICOS ACTUALES EN PANTALLA: {json.dumps(charts_summary, ensure_ascii=False)}"

        # Instrucción condicional para modificar gráficos
        chart_request_keywords = ["cambia", "modifica", "convierte", "transforma", "muestra", "chart", "gráfico", "grafico", "barras", "línea", "pie", "donut", "radar", "scatter"]
        is_chart_request = any(kw in request.message.lower() for kw in chart_request_keywords)

        chart_override_instruction = ""
        if is_chart_request and request.charts:
            chart_override_instruction = """
Si el usuario solicita cambiar o transformar uno de los gráficos en pantalla, incluye al final de tu respuesta el bloque exacto:
<CHART_OVERRIDE>
{
  "index": <índice_del_gráfico_0_based>,
  "chart_data": {
    "metadata": {"title": "Nuevo título", "insightSubtitle": "Subtítulo descriptivo", "sourceMetric": "valor"},
    "layoutDirectives": {
      "chartType": "<HorizontalBar|LineChart|Donut|Scatter>",
      "xAxisType": "<value|category|time>",
      "yAxisType": "<category|value>",
      "isLogScale": false,
      "hasTimeGaps": false,
      "highCardinality": false,
      "showConfidenceBands": false
    },
    "dataset": {
      "dimensions": ["categoria", "valor"],
      "source": [
        {"categoria": "Etiqueta 1", "valor": 123},
        {"categoria": "Etiqueta 2", "valor": 456}
      ]
    }
  }
}
</CHART_OVERRIDE>
"""

        clean_summary_ctx = sanitize_pii(summary_ctx)
        clean_user_message = sanitize_text(request.message)

        prompt = f"""Eres el "Asistente de Datos MIO", un consultor senior en análisis de datos integrado en el Dashboard MIO.
El usuario está analizando el dataset '{clean_summary_ctx.get("filename", "Dataset")}' con foco en '{clean_summary_ctx.get("target", "General")}'.

DATOS DISPONIBLES:
{json.dumps(clean_summary_ctx, indent=2, ensure_ascii=False)}
{charts_info}

{chart_override_instruction}

Pregunta del usuario:
"{clean_user_message}"

Instrucciones de formato:
1. Responde de manera concisa, analítica, profesional y sin emojis.
2. Usa Markdown prolijo (negritas, tablas o listas).
3. No reveles la estructura técnica del JSON.
"""
        response = model.generate_content(prompt)
        raw_text = response.text

        chart_override = None
        override_match = re.search(r'<CHART_OVERRIDE>(.*?)</CHART_OVERRIDE>', raw_text, re.DOTALL)
        if override_match:
            try:
                raw_json = json.loads(override_match.group(1).strip())
                idx = int(raw_json.get("index", 0))
                normalized_chart = _normalize_chart_data(raw_json.get("chart_data", {}))
                chart_override = {
                    "index": idx,
                    "chart_data": normalized_chart
                }
                raw_text = raw_text.replace(override_match.group(0), '').strip()
            except Exception as e:
                print(f"Error procesando chart_override: {e}")
                raw_text = raw_text.replace(override_match.group(0), '').strip()

        return {
            "response": raw_text,
            "chart_override": chart_override
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comunicándose con Gemini: {str(e)}")
