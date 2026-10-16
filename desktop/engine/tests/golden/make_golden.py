"""
Salidas de referencia del motor de Python para comparar contra el de Rust.

Corre la competencia de `dashboard-ia/backend/models/forecast_candidates.py` sobre series fijas y
guarda, por candidato, lo que predijo en cada tramo escondido y su proyección final, más el ranking y
el ganador. Uso (desde la raíz del repo, con el entorno del backend):

    python desktop/engine/tests/golden/make_golden.py
"""
import json
import sys
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "dashboard-ia" / "backend"))

import models.forecast_candidates as fc  # noqa: E402
from models.forecaster import _holdout_size  # noqa: E402

# Por ahora el motor de Rust tiene estos tres; LightGBM y Prophet se suman con su propia comparación.
PORTED = ["holt", "theta", "ridge"]
fc.LOCAL = {k: v for k, v in fc.LOCAL.items() if k in PORTED}


def series():
    rng = np.random.default_rng(42)
    out = {}
    t = np.arange(120)
    out["diaria_120"] = (200 + 1.5 * t + 30 * np.sin(2 * np.pi * t / 7) + rng.normal(0, 8, 120), 7)
    t = np.arange(53)
    out["mensual_53"] = (900 + 4 * t + 150 * np.sin(2 * np.pi * t / 12) + rng.normal(0, 40, 53), 12)
    t = np.arange(129)
    out["semanal_129"] = (5000 + 6 * t + 400 * np.sin(2 * np.pi * t / 52) + rng.normal(0, 120, 129), 52)
    out["paseo_aleatorio_200"] = (1000 + np.cumsum(rng.normal(0, 40, 200)), 7)
    out["semanal_corta_26"] = (np.array([48743, 45399, 50287, 47427, 48885, 58226, 56577, 47799, 52355, 65755, 61375, 53044, 52981,
                                         57778, 51187, 53496, 55307, 56750, 49082, 51849, 53368, 62325, 61138, 59239, 58698, 61959], dtype=float), 52)
    return out


def main():
    cases = []
    for name, (y, season) in series().items():
        y = np.asarray(y, dtype=float)
        hold = _holdout_size(len(y), 12)
        nonneg = bool(y.min() >= 0)
        origins = fc.fold_origins(len(y), hold)
        per = {}
        for cid in PORTED:
            fn = fc.LOCAL[cid]
            runs = [np.asarray(fn(y[:o], hold, season), dtype=float)[:hold].tolist() for o in origins]
            per[cid] = {"folds": runs, "final": np.asarray(fn(y, 12, season), dtype=float).tolist()}
        comp = fc.compete(y, hold, season, nonneg=nonneg)
        cases.append({
            "name": name, "y": y.tolist(), "season": season, "hold": hold, "nonneg": nonneg, "origins": origins,
            "candidates": per,
            "ranking": [{"id": r["id"], "error": float(comp["errors"][r["id"]])} for r in comp["ranking"]],
            "winner": comp["winner"],
            "winner_error": float(fc.winner_error(comp)),
            "baseline_error": float(fc.baseline_error(y, comp["origins"], hold)),
            "band": fc.band_margins(y, comp["preds"]["+".join(comp["winner"])], comp["origins"], 12).tolist(),
        })
    out = Path(__file__).with_name("competencia.json")
    out.write_text(json.dumps({"origen": "dashboard-ia/backend/models/forecast_candidates.py", "casos": cases}, indent=1))
    print(f"{len(cases)} series -> {out}")


if __name__ == "__main__":
    main()
