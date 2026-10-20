"""
El análisis del motor de Python (como `analysis_pipeline`): limpieza, perfil, qué columna se analiza,
números clave, gráficos automáticos (`auto_charts`), qué lo mueve (`run_feature_importance`), valores
raros (`run_anomaly_detection`) y lo que informa la limpieza, para comparar contra `Sheet::analysis` de Rust. Todas las planillas tienen 250
filas o menos: con más, Python sortea las filas que usa SHAP. Usa las planillas de `golden/csv/`, `golden/xlsx/`,
`golden/csv_limpieza/` y tres de ventas que escribe acá (`golden/csv_analisis/`: por semana, por mes
y por día, con grupos, varias numéricas y una relación entre columnas, y una con una sola correlación
moderada, entre 0,3 y 0,4, que decide qué columnas entran al mapa de correlaciones, y una con cuatro
valores raros sembrados, que los dos motores tienen que marcar). El pronóstico
se compara aparte (`make_golden_forecaster.py`).

    desktop/.venv-referencia/bin/python desktop/engine/tests/golden/make_golden_analysis.py
"""
import io
import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "dashboard-ia" / "backend"))
logging.disable(logging.CRITICAL)
from core.chart_generator import auto_charts  # noqa: E402
from core.data_cleaner import clean_dataframe  # noqa: E402
from core.data_profiler import profile_dataframe  # noqa: E402
from models.anomaly_detector import run_anomaly_detection  # noqa: E402
from models.feature_importance import run_feature_importance  # noqa: E402
from services.analysis_pipeline import NumpyEncoder, _resolve_target, detect_csv_format, format_number, read_excel_table  # noqa: E402

HERE = Path(__file__).parent
ANALISIS = HERE / "csv_analisis"


def sales(n: int, days_apart: float, seed: int) -> pd.DataFrame:
    """Ventas sintéticas: fecha, sucursal, rubro, canal, cantidad, precio, total (precio × cantidad) y costo."""
    rng = np.random.default_rng(seed)
    fechas = pd.Timestamp("2022-01-03") + pd.to_timedelta(np.floor(np.arange(n) * days_apart), unit="D")
    cantidad = rng.integers(1, 12, n)
    precio = np.round(rng.lognormal(8, 0.6, n), 2)
    return pd.DataFrame({
        "fecha": fechas.strftime("%d/%m/%Y"),
        "sucursal": rng.choice(["Centro", "Norte", "Sur", "Oeste"], n),
        "rubro": rng.choice(["Almacén", "Bebidas", "Limpieza", "Lácteos", "Panadería", "Verdulería"], n),
        "canal": rng.choice(["Local", "Online"], n, p=[0.7, 0.3]),
        "cantidad": cantidad,
        "precio_unitario": precio,
        "total_venta": np.round(precio * cantidad, 2),
        "costo": np.round(precio * cantidad * rng.uniform(0.5, 0.8, n), 2),
    })


SALES = {"ventas_semanales.csv": (250, 1.0, 1), "ventas_mensuales.csv": (240, 6.3, 2), "ventas_diarias.csv": (120, 0.33, 3)}


def planted() -> pd.DataFrame:
    """Ventas normales (246) y cuatro registros que no encajan: montos y cantidades absurdos."""
    df = sales(246, 1.0, 4)
    odd = df.iloc[[30, 90, 150, 210]].copy()
    odd["cantidad"] = [95, 3, 120, 2]
    odd["total_venta"] = [2_500_000.0, 1_900_000.0, 3_100_000.0, 2_200_000.0]
    return pd.concat([df, odd]).sort_values("fecha", kind="stable").reset_index(drop=True)


def moderate() -> pd.DataFrame:
    """Cuatro numéricas: a y b con correlación 0,34; el resto, sin relación (menos de 0,25)."""
    rng = np.random.default_rng(10)
    a = rng.normal(0, 1, 60)
    b = 0.37 * a + rng.normal(0, 0.93, 60)
    return pd.DataFrame({"a": a, "b": b, "c": rng.normal(0, 1, 60), "d": rng.normal(0, 1, 60)}).round(4)


def read(path: Path) -> pd.DataFrame:
    data = path.read_bytes()
    if path.suffix == ".xlsx":
        return read_excel_table(io.BytesIO(data))
    enc, sep, skip = detect_csv_format(io.BytesIO(data))
    return pd.read_csv(io.BytesIO(data), encoding=enc, sep=sep, skiprows=skip, engine="c", on_bad_lines="skip")


def analysis(df_raw: pd.DataFrame) -> dict:
    df, report = clean_dataframe(df_raw)
    profile = profile_dataframe(df, duplicate_rows=0)
    target = _resolve_target(None, profile, df)
    kpis = {"Registros": f"{profile.n_rows:,}", "Columnas": profile.n_cols}
    if target in profile.numeric_columns:
        s = df[target].dropna()
        kpis.update(Total=format_number(float(s.sum())), Promedio=format_number(float(s.mean())),
                    Maximo=format_number(float(s.max())), Minimo=format_number(float(s.min())))
    fi = {"chart_importance": None, "chart_shap": None, "metrics": {}}
    if target in profile.numeric_columns:
        feats = [c for c in profile.numeric_columns if c != target]
        imp, shap, metrics = run_feature_importance(df, target, feats, categorical_cols=profile.categorical_columns)
        fi = {"chart_importance": imp, "chart_shap": shap, "metrics": metrics}
    _, a_chart, a_metrics = run_anomaly_detection(
        df, numeric_cols=profile.numeric_columns, target_col=target if target in profile.numeric_columns else None,
        date_col=profile.date_columns[0] if profile.date_columns else None,
        column_types={c.name: c.inferred_type for c in profile.columns},
    )
    return {
        "anomalies": {"chart_data": a_chart, "metrics": a_metrics},
        "feature_importance": fi,
        "target_col": target,
        "profile": {"n_rows": profile.n_rows, "n_cols": profile.n_cols, "quality_score": profile.quality_score,
                    "quality_label": profile.quality_label, "numeric_columns": profile.numeric_columns,
                    "date_columns": profile.date_columns, "categorical_columns": profile.categorical_columns,
                    "suggested_targets": profile.suggested_targets},
        "cleaning_report": {"actions": report.actions, "duplicates_removed": report.duplicates_removed, "nulls_imputed": report.nulls_imputed},
        "kpis": kpis,
        "charts": auto_charts(df, profile, target),
    }


def main():
    ANALISIS.mkdir(exist_ok=True)
    for name, (n, apart, seed) in SALES.items():
        sales(n, apart, seed).to_csv(ANALISIS / name, index=False)
    moderate().to_csv(ANALISIS / "correlacion_moderada.csv", index=False)
    planted().to_csv(ANALISIS / "valores_raros.csv", index=False)
    cases = []
    for folder in ("csv", "xlsx", "csv_limpieza", "csv_analisis"):
        for path in sorted((HERE / folder).iterdir()):
            try:
                df_raw = read(path)
            except Exception:
                continue
            if df_raw.empty:
                continue
            try:
                a = analysis(df_raw)
            except Exception as ex:  # noqa: BLE001
                print(f"{folder}/{path.name:<32} ERROR {type(ex).__name__}: {ex}")
                continue
            cases.append({"file": f"{folder}/{path.name}", **json.loads(json.dumps(a, cls=NumpyEncoder))})
            print(f"{folder + '/' + path.name:<40} target={a['target_col']!s:<14} gráficos={[c['chart_id'] for c in a['charts']]}")
    out = HERE / "analysis.json"
    out.write_text(json.dumps({"origen": f"analysis_pipeline sin modelos (pandas {pd.__version__})", "casos": cases}, indent=1, ensure_ascii=False))
    print(f"{len(cases)} planillas -> {out}")


if __name__ == "__main__":
    main()
