"""
Salidas de referencia del Prophet real (1.3.0) para comparar contra el Prophet escrito en Rust.

Usa la misma configuración que `models/forecaster.py` (tendencia lineal o plana, estaciones según la
frecuencia, `changepoint_prior_scale` 0.03 / 0.01) y guarda, por serie: las fechas, los parámetros
que encontró Prophet, su tendencia y su predicción en la historia, y lo que predice en cada tramo
escondido (crudo y amortiguado, como lo usa la competencia). Uso, con el entorno del backend:

    python desktop/engine/tests/golden/make_golden_prophet.py
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

from prophet import Prophet  # noqa: E402
from models.forecaster import _damped_holdout, _holdout_size  # noqa: E402


def build(cfg):
    return Prophet(
        growth=cfg["growth"], yearly_seasonality=cfg["yearly"], weekly_seasonality=cfg["weekly"],
        daily_seasonality=False, seasonality_mode="additive",
        changepoint_prior_scale=cfg["cps"], interval_width=0.80,
    )


def series():
    rng = np.random.default_rng(7)
    out = []
    t = np.arange(120)
    out.append(("diaria_120", pd.date_range("2024-01-01", periods=120, freq="D"),
                200 + 1.5 * t + 30 * np.sin(2 * np.pi * t / 7) + rng.normal(0, 8, 120),
                {"growth": "linear", "yearly": False, "weekly": True, "cps": 0.03}, "D"))
    t = np.arange(129)
    out.append(("semanal_129", pd.date_range("2022-01-02", periods=129, freq="W"),
                5000 + 6 * t + 400 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 120, 129),
                {"growth": "linear", "yearly": True, "weekly": False, "cps": 0.03}, "W"))
    t = np.arange(53)
    out.append(("mensual_53", pd.date_range("2020-01-01", periods=53, freq="MS"),
                900 + 4 * t + 150 * np.sin(2 * np.pi * t / 12) + rng.normal(0, 40, 53),
                {"growth": "linear", "yearly": True, "weekly": False, "cps": 0.03}, "MS"))
    out.append(("plana_diaria_90", pd.date_range("2024-03-01", periods=90, freq="D"),
                100 + 12 * np.sin(2 * np.pi * np.arange(90) / 7) + rng.normal(0, 4, 90),
                {"growth": "flat", "yearly": False, "weekly": True, "cps": 0.01}, "D"))
    t = np.arange(70)
    out.append(("quiebre_diaria_70", pd.date_range("2024-05-01", periods=70, freq="D"),
                np.where(t < 40, 300 + 2 * t, 380 - 3 * (t - 40)) + rng.normal(0, 5, 70),
                {"growth": "linear", "yearly": False, "weekly": True, "cps": 0.03}, "D"))
    return out


def days(idx):
    return ((pd.DatetimeIndex(idx) - pd.Timestamp("1970-01-01")) / pd.Timedelta(days=1)).tolist()


def main():
    cases = []
    for name, ds, y, cfg, freq in series():
        df = pd.DataFrame({"ds": ds, "y": np.asarray(y, dtype=float)})
        n = len(df)
        hold = _holdout_size(n, 12)
        m = build(cfg).fit(df)
        hist = m.predict(df[["ds"]])
        p = m.params
        fit = {
            "k": float(p["k"][0][0]), "m": float(p["m"][0][0]), "sigma_obs": float(p["sigma_obs"][0][0]),
            "delta": p["delta"][0].tolist(), "beta": p["beta"][0].tolist(),
            "y_scale": float(m.y_scale), "changepoints_t": m.changepoints_t.tolist(),
            "trend": hist["trend"].tolist(), "yhat": hist["yhat"].tolist(),
        }
        future = m.make_future_dataframe(periods=12, freq=freq)
        fc_full = m.predict(future)
        final_damped = (_damped_holdout(fc_full, n, 12) if cfg["growth"] == "linear" else fc_full["yhat"].values[n:]).tolist()
        folds = []
        for k in range(1, 4):
            o = n - k * hold
            if o < 10:
                break
            mk = build(cfg).fit(df.iloc[:o])
            fc = mk.predict(df.iloc[:o + hold][["ds"]])
            raw = fc["yhat"].values[o:o + hold].tolist()
            damped = (_damped_holdout(fc, o, hold) if cfg["growth"] == "linear" else fc["yhat"].values[o:o + hold]).tolist()
            folds.append({"origin": o, "raw": raw, "damped": damped})
        cases.append({
            "name": name, "freq": freq, "config": cfg, "ds_days": days(ds), "y": df["y"].tolist(), "hold": hold,
            "fit": fit, "future_days": days(future["ds"].values[n:]), "final_raw": fc_full["yhat"].values[n:].tolist(),
            "final_damped": final_damped, "folds": folds,
        })
        print(name, "k", round(fit["k"], 4), "sigma", round(fit["sigma_obs"], 4), "cambios", len(fit["delta"]), "estaciones", len(fit["beta"]))
    out = Path(__file__).with_name("prophet.json")
    out.write_text(json.dumps({"origen": "prophet 1.3.0 con la configuración de models/forecaster.py", "casos": cases}, indent=1))
    print(f"{len(cases)} series -> {out}")


if __name__ == "__main__":
    main()
