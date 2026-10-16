"""
Salidas de referencia de `run_forecast` (motor de Python) para comparar contra `forecaster.rs`.

Planillas armadas para pasar por cada camino: días, semanas y meses; filas sueltas y muy pocas filas
(se rechazan); series cortas sin tramos escondidos; series estables (Prophet plano); celdas vacías.
Guarda las filas tal como entran (fecha en días desde 1970-01-01, valor) y la respuesta de Python.

    python desktop/engine/tests/golden/make_golden_forecaster.py
"""
import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "dashboard-ia" / "backend"))
logging.getLogger("cmdstanpy").disabled = True

from models.forecaster import run_forecast  # noqa: E402


def planillas():
    rng = np.random.default_rng(11)
    out = []
    days = pd.date_range("2024-01-01", periods=200, freq="D")
    rows = []
    for i, d in enumerate(days):
        for _ in range(rng.integers(1, 5)):
            rows.append((d, 300 + 0.8 * i + 40 * np.sin(2 * np.pi * i / 7) + rng.normal(0, 25)))
    out.append(("transacciones_200_dias", rows))
    out.append(("diaria_60", [(d, 120 + 1.2 * i + rng.normal(0, 6)) for i, d in enumerate(pd.date_range("2024-02-01", periods=60))]))
    out.append(("cuatro_anios", [(d, 900 + 0.15 * i + 120 * np.sin(2 * np.pi * i / 365.25) + rng.normal(0, 50))
                                  for i, d in enumerate(pd.date_range("2020-01-01", periods=1460))]))
    loose = pd.to_datetime("2021-01-01") + pd.to_timedelta(rng.choice(1100, 40, replace=False), unit="D")
    out.append(("filas_sueltas", [(d, float(rng.normal(100, 20))) for d in loose]))
    out.append(("corta_12", [(d, 50 + i + rng.normal(0, 2)) for i, d in enumerate(pd.date_range("2024-06-01", periods=12))]))
    out.append(("veinte_dias", [(d, 80 + 0.5 * i + rng.normal(0, 3)) for i, d in enumerate(pd.date_range("2024-07-01", periods=20))]))
    out.append(("estable_120", [(d, 100 + 8 * np.sin(2 * np.pi * i / 7) + rng.normal(0, 3)) for i, d in enumerate(pd.date_range("2024-01-01", periods=120))]))
    out.append(("cuatro_filas", [(d, 10.0 + i) for i, d in enumerate(pd.date_range("2024-01-01", periods=4))]))
    vals = 500 + np.cumsum(rng.normal(0, 30, 150))
    out.append(("paseo_aleatorio", [(d, v) for d, v in zip(pd.date_range("2023-01-01", periods=150), vals)]))
    with_gaps = [(d, (np.nan if i % 9 == 0 else 200 + 2 * i + rng.normal(0, 10))) for i, d in enumerate(pd.date_range("2024-03-01", periods=80))]
    out.append(("con_celdas_vacias", with_gaps))
    return out


def main():
    cases = []
    for name, rows in planillas():
        df = pd.DataFrame(rows, columns=["fecha", "ventas"])
        _, chart, metrics = run_forecast(df, "fecha", "ventas", periods=60)
        day = ((pd.to_datetime(df["fecha"]) - pd.Timestamp("1970-01-01")) / pd.Timedelta(days=1)).tolist()
        cases.append({"name": name, "days": day, "values": [None if pd.isna(v) else float(v) for v in df["ventas"]],
                      "chart_data": chart, "metrics": metrics})
        print(f"{name:<24} {metrics.get('motor') or metrics.get('error', '')[:60]}")
    out = Path(__file__).with_name("forecaster.json")
    out.write_text(json.dumps({"origen": "run_forecast de models/forecaster.py", "casos": cases}, indent=1, default=float))
    print(f"{len(cases)} planillas -> {out}")


if __name__ == "__main__":
    main()
