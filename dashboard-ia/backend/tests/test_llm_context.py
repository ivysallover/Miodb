"""
Hacia Gemini van resultados, nunca filas de la planilla (core/llm_context.py): el chat no manda los
registros de los valores raros, ni los normales de muestra.
"""
from fastapi.testclient import TestClient

import api.routes.chat as chat
from core.llm_context import anomaly_summary
from main import app

ROWS = [
    {"cliente": "Distribuidora Pérez SA", "monto": 987654.32, "_is_anomaly": True, "_top_anomaly_feature": "monto"},
    {"cliente": "Kiosco Lo de Tito", "monto": 12.5, "_is_anomaly": True, "_top_anomaly_feature": "monto"},
    {"cliente": "Ferretería Norte", "monto": 4400.0, "_is_anomaly": True, "_top_anomaly_feature": "cantidad"},
]
METRICS = {"n_anomalias": 3, "pct_anomalias": 1.5, "anomalias_detalle": ["2024-02-25 | Atípico en monto: 987654.32"],
           "anomaly_records": ROWS, "sample_records": [{"cliente": "Almacén Sur", "monto": 300.0}]}


def test_the_summary_has_counts_and_columns_but_no_rows():
    s = anomaly_summary(METRICS)
    assert s == {"n_anomalias": 3, "pct_anomalias": 1.5, "columnas_con_valores_raros": {"monto": 2, "cantidad": 1}}


def test_the_chat_never_sends_rows_to_gemini(monkeypatch):
    sent = []

    class Spy:
        def __init__(self, *_):
            pass

        def generate_content(self, prompt):
            sent.append(prompt)
            return type("R", (), {"text": "ok"})()

    monkeypatch.setattr(chat, "GEMINI_AVAILABLE", True)
    monkeypatch.setattr(chat.genai, "configure", lambda **_: None, raising=False)
    monkeypatch.setattr(chat.genai, "GenerativeModel", Spy, raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "clave-de-prueba")
    context = {"filename": "ventas.csv", "target_col": "monto", "anomalies": {"metrics": METRICS}}
    response = TestClient(app).post("/api/v1/chat", json={"message": "¿Qué raro ves?", "context": context})
    assert response.status_code == 200, response.text
    prompt = sent[0]
    assert '"n_anomalias": 3' in prompt
    for leaked in ["Distribuidora Pérez", "Kiosco Lo de Tito", "987654", "Almacén Sur", "2024-02-25"]:
        assert leaked not in prompt, leaked
