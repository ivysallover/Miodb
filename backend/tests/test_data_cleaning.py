"""
tests/test_data_cleaning.py
Suite exhaustiva de pruebas unitarias para el nuevo pipeline modular de limpieza y perfilado de datos.
"""

import pytest
import pandas as pd
import numpy as np
from decimal import Decimal

from services.data_cleaning import (
    DataCleaningPipeline,
    CleaningConfig,
    LocaleEnum,
    PrecisionMode,
    OutlierPolicy,
    OutlierMethod,
    OutlierAction,
)
from core.data_cleaner import clean_dataframe as legacy_clean_dataframe


def test_default_config_never_drops_rows():
    """
    Principio 'Do No Harm':
    La configuración por defecto NUNCA elimina filas válidas de negocio,
    incluso si tienen valores atípicos (solo las flagea en _is_outlier).
    """
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5],
        "cliente": ["Alfa", "Beta", "Gamma", "Delta", "Epsilon"],
        "ventas": [100.0, 105.0, 110.0, 95.0, 9999999.0],  # Outlier obvio
    })
    
    pipeline = DataCleaningPipeline(CleaningConfig())
    df_clean, report = pipeline.run(df)

    assert len(df_clean) == 5, "No se debió eliminar ninguna fila en configuración por default."
    assert "_is_outlier" in df_clean.columns, "Debe existir la columna de auditoría _is_outlier."
    assert df_clean["_is_outlier"].iloc[-1] == True, "La fila extrema debe ser flageada como outlier."


def test_outlier_bounds_with_nulls_present():
    """
    Verifica que el cálculo de cuantiles para Tukey no explote ni se contamine
    cuando hay valores NaN presentes en la columna.
    """
    df = pd.DataFrame({
        "valores": [10.0, np.nan, 12.0, 11.0, np.nan, 10.5, 11.5, 95.0, np.nan]
    })
    
    config = CleaningConfig(
        outlier_policy=OutlierPolicy(method=OutlierMethod.TUKEY_IQR, action=OutlierAction.FLAG)
    )
    pipeline = DataCleaningPipeline(config)
    df_clean, report = pipeline.run(df)

    assert "_is_outlier" in df_clean.columns
    # 95.0 es outlier
    outlier_count = report.outliers_flagged.get("valores", 0)
    assert outlier_count >= 1, "Debe detectar al menos un outlier a pesar de los NaNs."


def test_us_vs_latam_monetary_locale():
    """
    Verifica que el pipeline distinga y sanitice correctamente:
    - Formato US ($1,200.50 con coma de miles y punto decimal).
    - Formato Latam ($1.200,50 con punto de miles y coma decimal).
    """
    # 1. Dataset en formato US
    df_us = pd.DataFrame({
        "monto": ["$1,200.50", "$2,350.00", "$980.25", "$5,000.75"],
        "fecha": ["12/31/2023", "01/15/2024", "02/20/2024", "03/10/2024"],
    })
    res_us = DataCleaningPipeline(CleaningConfig(locale=LocaleEnum.EN_US)).run(df_us)
    assert res_us.df["monto"].iloc[0] == pytest.approx(1200.50, abs=0.01)
    assert str(res_us.df["fecha"].iloc[0].date()) == "2023-12-31"

    # 2. Dataset en formato Latam / AR
    df_latam = pd.DataFrame({
        "monto": ["$ 1.200,50", "$ 2.350,00", "$ 980,25", "$ 5.000,75"],
        "fecha": ["31/12/2023", "15/01/2024", "20/02/2024", "10/03/2024"],
    })
    res_latam = DataCleaningPipeline(CleaningConfig(locale=LocaleEnum.ES_AR)).run(df_latam)
    assert res_latam.df["monto"].iloc[0] == pytest.approx(1200.50, abs=0.01)
    assert str(res_latam.df["fecha"].iloc[0].date()) == "2023-12-31"


def test_financial_precision_no_float32_loss():
    """
    Verifica que montos monetarios millonarios con centavos no sufran truncamiento
    por downcast a float32, preservando exactitud contable (tolerancia 0.01).
    """
    large_amounts = [
        "14,532,890.45",
        "28,120,400.33",
        "9,450,123.12",
        "102,300,999.88"
    ]
    expected_sum = 14532890.45 + 28120400.33 + 9450123.12 + 102300999.88

    df = pd.DataFrame({
        "facturacion": large_amounts,
        "sensor_continuo": [1.12345, 2.65432, 3.98765, 4.11111]  # Este sí puede downcastear
    })

    pipeline = DataCleaningPipeline(CleaningConfig(locale=LocaleEnum.EN_US, enable_downcast=True))
    df_clean, report = pipeline.run(df)

    actual_sum = float(df_clean["facturacion"].sum())
    assert actual_sum == pytest.approx(expected_sum, abs=0.01), \
        f"El downcast no debió degradar la precisión monetaria. Esperado: {expected_sum}, Obtenido: {actual_sum}"
    assert df_clean["facturacion"].dtype == np.float64, "Las columnas monetarias deben quedar en float64."


def test_financial_precision_decimal_mode_exact():
    """
    Verifica que en modo DECIMAL la suma sea exactamente igual centavo a centavo (==),
    sin usar tolerancia alguna (pytest.approx), validando que no haya ningún error de redondeo.
    """
    large_amounts = [
        "14,532,890.45",
        "28,120,400.33",
        "9,450,123.12",
        "102,300,999.88"
    ]
    expected_exact = Decimal("14532890.45") + Decimal("28120400.33") + Decimal("9450123.12") + Decimal("102300999.88")
    assert expected_exact == Decimal("154404413.78")

    df = pd.DataFrame({
        "facturacion": large_amounts,
    })

    pipeline = DataCleaningPipeline(CleaningConfig(locale=LocaleEnum.EN_US, precision_mode=PrecisionMode.DECIMAL))
    df_clean, report = pipeline.run(df)

    assert isinstance(df_clean["facturacion"].iloc[0], Decimal), "La columna debe contener instancias reales de Decimal."
    actual_exact_sum = sum(df_clean["facturacion"])
    # Comparación estricta con == (cero tolerancia, sin approx)
    assert actual_exact_sum == expected_exact, f"Error en modo DECIMAL: esperado {expected_exact}, obtenido {actual_exact_sum}"



def test_disguised_null_tokens_and_extra_null_tokens():
    """
    Verifica que strings que representan nulos ('N/A', '-', 'None', 's/d') y tokens
    personalizados ('CUSTOM_VOID') se reconozcan como NaN real antes de filtrar y profilar.
    """
    df = pd.DataFrame({
        "id": [1, 2, 3, 4, 5, 6, 7],
        "categoria": ["Electro", "N/A", "Hogar", "-", "None", "CUSTOM_VOID", "s/d"],
        "precio": ["100", "null", "250", " ", "?", "300", "#N/A"]
    })

    config = CleaningConfig(extra_null_tokens=["CUSTOM_VOID"])
    pipeline = DataCleaningPipeline(config)
    df_clean, report = pipeline.run(df)

    # Como la columna 'id' mantiene viva cada fila, ninguna es 100% vacía
    assert len(df_clean) == 7
    assert report.nulls_imputed.get("categoria", 0) > 0, "Debió imputar los nulos normalizados en categoria."
    assert report.nulls_imputed.get("precio", 0) > 0, "Debió imputar los nulos normalizados en precio."


def test_temporal_no_blind_forward_fill():
    """
    Verifica que si un dataset no está explícitamente ordenado de forma temporal monótona,
    NO se aplique forward-fill ciego inventando fechas según la fila anterior.
    """
    df_desordenado = pd.DataFrame({
        "id": [1, 2, 3, 4],
        "fecha": ["2024-05-01", None, "2023-01-01", "2024-12-01"],
        "venta": [100, 200, 300, 400]
    })

    pipeline = DataCleaningPipeline(CleaningConfig())
    df_clean, report = pipeline.run(df_desordenado)

    # La fila 1 (segunda fila) no debió ser ffilled con la fecha de la fila 0 porque la serie no es monótona
    assert pd.isna(df_clean["fecha"].iloc[1]), "No se debe hacer forward-fill ciego en tablas no monótonas."


def test_legacy_wrapper_contract():
    """
    Garantiza que core.data_cleaner.clean_dataframe mantenga 100% retrocompatibilidad
    con callers legacy: retorna una tupla (DataFrame, CleaningReport) con todos los atributos esperados.
    """
    df = pd.DataFrame({
        "col1": [1, 2, 2, 3],
        "col2": ["A", "B", "B", "C"]
    })

    res_df, report = legacy_clean_dataframe(df)

    assert isinstance(res_df, pd.DataFrame)
    assert hasattr(report, "original_rows")
    assert hasattr(report, "final_rows")
    assert hasattr(report, "duplicates_removed")
    assert hasattr(report, "actions")
    assert hasattr(report, "nulls_imputed")
    assert report.duplicates_removed == 1


def test_outlier_cap_and_drop_policies():
    """
    Verifica el comportamiento de las políticas activas de outliers (CAP y DROP).
    """
    # Usamos valores distintos para que el paso de deduplicación no los descarte
    df_base = pd.DataFrame({
        "id": [1, 2, 3, 4, 5, 6, 7],
        "val": [10.0, 10.2, 9.8, 10.1, 10.05, 9.9, 500.0]  # 500 es outlier extremo
    })

    # 1. Política CAP (Winsorize)
    config_cap = CleaningConfig(
        outlier_policy=OutlierPolicy(action=OutlierAction.CAP, iqr_multiplier=1.5)
    )
    df_cap, _ = DataCleaningPipeline(config_cap).run(df_base)
    assert df_cap["val"].max() < 500.0, "El valor extremo debió ser acotado por Winsorization."
    assert len(df_cap) == 7, "CAP no debe eliminar filas."

    # 2. Política DROP (Solo bajo opt-in)
    config_drop = CleaningConfig(
        outlier_policy=OutlierPolicy(action=OutlierAction.DROP, iqr_multiplier=1.5)
    )
    df_drop, _ = DataCleaningPipeline(config_drop).run(df_base)
    assert len(df_drop) == 6, "DROP debe haber eliminado la fila con outlier extremo."
    assert 500.0 not in df_drop["val"].values


def test_export_cleaned_dataset_endpoint():
    """
    Verifica que el endpoint /api/v1/export/cleaned-dataset retorne:
    1. CSV con UTF-8 BOM y datos sanitizados.
    2. XLSX con la hoja de datos y la hoja de auditoría.
    """
    import io
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    csv_content = b"fecha,ventas,categoria\n2024-01-01,$1.200,Electro\n2024-01-02,N/A,Hogar\n2024-01-03,$2.400,Electro\n"

    # 1. Exportar CSV
    res_csv = client.post(
        "/api/v1/export/cleaned-dataset",
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
        data={"export_format": "csv", "locale": "es-AR"}
    )
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "attachment; filename=limpio_test.csv" in res_csv.headers["content-disposition"]
    # Verificar que el CSV descargado tenga los nulos imputados y el monto sanitizado
    df_downloaded = pd.read_csv(io.BytesIO(res_csv.content))
    assert df_downloaded["ventas"].iloc[0] == pytest.approx(1200.0, abs=0.01)

    # 2. Exportar XLSX
    res_xlsx = client.post(
        "/api/v1/export/cleaned-dataset",
        files={"file": ("test.csv", io.BytesIO(csv_content), "text/csv")},
        data={"export_format": "xlsx", "locale": "es-AR"}
    )
    assert res_xlsx.status_code == 200
    assert "spreadsheetml" in res_xlsx.headers["content-type"]
    assert "attachment; filename=limpio_test.xlsx" in res_xlsx.headers["content-disposition"]
    
    # Verificar que el Excel tenga las dos hojas (Datos_Limpios y Bitacora_Auditoria)
    excel_file = pd.ExcelFile(io.BytesIO(res_xlsx.content))
    assert "Datos_Limpios" in excel_file.sheet_names
    assert "Bitacora_Auditoria" in excel_file.sheet_names

