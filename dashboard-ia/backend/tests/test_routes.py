import io
import pytest
import pandas as pd
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_analyze_numeric():
    df = pd.DataFrame({
        "fecha": pd.date_range("2024-01-01", periods=30),
        "ventas": [100 + i * 2 for i in range(30)],
        "categoria": ["A", "B", "C"] * 10
    })
    csv_bytes = df.to_csv(index=False).encode("utf-8")
    files = {"file": ("test_sales.csv", io.BytesIO(csv_bytes), "text/csv")}
    data = {"target_col": "ventas"}
    
    response = client.post("/api/v1/analyze", files=files, data=data)
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "test_sales.csv"
    assert "profile" in body
    assert "kpis" in body
    assert "charts" in body

def test_narrative_endpoint():
    payload = {
        "profile": {"nRows": 150, "nCols": 4},
        "kpis": {"Ingresos": "$10,000", "Conversión": "4.2%"},
        "anomalies": {"nAnomalias": 2, "pctAnomalias": 1.3},
        "forecast": {"tendenciaPct": 12.5, "periodos": 30},
        "segmentation": {"k": 3},
        "featureImportance": {"topFeatures": [{"feature": "gasto_marketing", "importance": 0.45}]},
        "targetCol": "ventas",
        "filename": "ventas_mensuales.csv"
    }
    response = client.post("/api/v1/narrative", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "source" in data
    # Ensure no emojis in the generated narrative
    for emoji in ["📈", "🎯", "⚠️", "🚀", "⭐"]:
        assert emoji not in data["text"]

def test_analyze_existing_upload():
    df = pd.DataFrame({"ventas": [10, 20, 30], "categoria": ["A", "B", "A"]})
    files = {"file": ("test_sales.csv", io.BytesIO(df.to_csv(index=False).encode("utf-8")), "text/csv")}
    upload_response = client.post("/api/v1/analyze", files=files, data={"target_col": "ventas"})
    upload_id = upload_response.json()["uploadId"]

    data = {"upload_id": upload_id, "display_name": "test_sales.csv", "target_col": "ventas"}
    response = client.post("/api/v1/analyze", data=data)
    assert response.status_code == 200
    body = response.json()
    assert body["filename"] == "test_sales.csv"
    assert "profile" in body


def test_rejects_path_traversal_filename():
    files = {"file": ("../../outside.csv", io.BytesIO(b"ventas\n10\n"), "text/csv")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 400


def test_rejects_invalid_upload_id():
    response = client.post("/api/v1/analyze", data={"upload_id": "../../outside.csv"})
    assert response.status_code == 400


def test_analyze_endpoint_anomaly_records_serializable():
    """
    Test de regresión end-to-end contra el endpoint /api/v1/analyze:
    1. Envía un dataset real con fecha, montos, categorías, IDs y outliers extremos.
    2. Valida que retorne HTTP 200 (sin fallar por 'numpy boolean subtract' en _box_stats/chart_generator).
    3. Valida que 'profile.numeric_columns' NO contenga columnas booleanas internas como '_is_outlier'.
    4. Valida que los registros de 'anomaly_records' y 'sample_records' tengan fechas serializadas como str
       (y NUNCA como diccionarios vacíos '{}').
    5. Valida que 'column_roles' categorice 'id_cliente' como 'identificador' y 'monto' como 'numérica'.
    """
    csv_data = (
        "id_cliente,fecha,monto,categoria\n"
        "10001,2024-01-01,100.50,A\n"
        "10002,2024-01-02,105.20,A\n"
        "10003,2024-01-03,98.10,B\n"
        "10004,2024-01-04,102.30,B\n"
        "10005,2024-01-05,99.90,A\n"
        "10006,2024-01-06,101.40,A\n"
        "10007,2024-01-07,95000.00,A\n"
        "10008,2024-01-08,103.10,B\n"
        "10009,2024-01-09,97.80,A\n"
        "10010,2024-01-10,104.50,B\n"
        "10011,2024-01-11,101.10,A\n"
        "10012,2024-12-01,-85000.00,B\n"
    )

    files = {"file": ("test_anomalies_e2e.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    response = client.post("/api/v1/analyze", files=files, data={"target_col": "monto"})
    assert response.status_code == 200, f"Error {response.status_code}: {response.text}"

    body = response.json()
    profile = body.get("profile", {})
    numeric_cols = profile.get("numericColumns", [])
    assert "_is_outlier" not in numeric_cols, "Columna booleana interna no debe clasificarse como numérica"
    assert "_is_anomaly" not in numeric_cols

    anom_metrics = body.get("anomalies", {}).get("metrics", {})
    assert anom_metrics.get("nAnomalias", 0) > 0, "Debe detectar al menos 1 anomalía extrema"
    
    anomaly_records = anom_metrics.get("anomalyRecords", [])
    sample_records = anom_metrics.get("sampleRecords", [])
    assert len(anomaly_records) > 0, "anomalyRecords debe contener las filas anómalas"
    assert len(sample_records) > 0, "sampleRecords debe contener las muestras normales"

    # Verificar que las fechas sean strings y no diccionarios vacíos
    first_anom = anomaly_records[0]
    assert first_anom.get("_is_anomaly") is True
    assert isinstance(first_anom.get("fecha"), str), "Timestamp debe serializarse como string legible"
    assert not isinstance(first_anom.get("fecha"), dict), "Timestamp no debe serializarse como diccionario vacío"

    first_sample = sample_records[0]
    assert first_sample.get("_is_anomaly") is False
    assert isinstance(first_sample.get("fecha"), str)
    assert not isinstance(first_sample.get("fecha"), dict)

    # Verificar que columnRoles mapee semánticamente las columnas
    roles = anom_metrics.get("columnRoles", {})
    assert roles.get("id_cliente") == "identificador", "id_cliente debe tener rol de identificador"
    assert roles.get("monto") == "numérica"
    assert roles.get("fecha") == "fecha"


def test_zero_disk_retention_policy():
    """
    Verifica que el pipeline cumpla con la directiva de CERO almacenamiento en disco:
    1. Sube un archivo a /analyze y /profile.
    2. Comprueba que NO exista directorio 'uploads' en disco ni archivos persistidos.
    3. Comprueba que el archivo resida solo en memoria efímera y pueda ser purgado con DELETE.
    """
    import os
    from pathlib import Path
    from api.routes.analysis import _EPHEMERAL_MEMORY_STORE

    uploads_dir = Path("uploads")
    assert not uploads_dir.exists(), "El directorio 'uploads' no debe existir en disco."

    test_csv = b"col_a,col_b\n1,10\n2,20\n3,30\n"
    files = {"file": ("zero_disk_test.csv", io.BytesIO(test_csv), "text/csv")}
    
    # 1. Test /profile en memoria
    prof_resp = client.post("/api/v1/profile", files=files)
    assert prof_resp.status_code == 200
    uid = prof_resp.json()["uploadId"]
    assert uid in _EPHEMERAL_MEMORY_STORE, "El archivo debe almacenarse temporalmente en memoria RAM"
    assert not uploads_dir.exists(), "No se debe haber creado directorio 'uploads' en disco"

    # 2. Test /analyze usando el uploadId desde la memoria
    ana_resp = client.post("/api/v1/analyze", data={"upload_id": uid, "display_name": "zero_disk_test.csv"})
    assert ana_resp.status_code == 200
    assert not uploads_dir.exists()

    # 3. Test DELETE /uploads/{upload_id} purga de RAM
    del_resp = client.delete(f"/api/v1/uploads/{uid}")
    assert del_resp.status_code == 200
    assert uid not in _EPHEMERAL_MEMORY_STORE, "El upload debe ser purgado inmediatamente de RAM"



