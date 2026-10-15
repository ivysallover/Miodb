"""
Competencia de modelos: varios candidatos predicen tramos escondidos de la serie y gana el que menos
se equivoca. El ganador tiene que salir de esa medición, y la página tiene que poder mostrarla.
"""
import time
import warnings

import numpy as np
import pandas as pd
import pytest

import models.forecast_candidates as fc
import models.forecaster as forecaster
from models.forecaster import run_forecast


def _daily(n, seed=5, trend=1.5, week=30.0, noise=8.0):
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    y = 200 + trend * t + week * np.sin(2 * np.pi * t / 7) + rng.normal(0, noise, n)
    return pd.DataFrame({"fecha": pd.date_range("2024-01-01", periods=n, freq="D"), "ventas": y})


@pytest.mark.parametrize("cid", list(fc.LOCAL))
def test_each_candidate_returns_finite_steps(cid):
    y = _daily(120)["ventas"].values
    out = fc.LOCAL[cid](y, 14, 7)
    assert out.shape == (14,)
    assert np.all(np.isfinite(out))


def test_candidates_follow_a_clear_pattern():
    t = np.arange(140)
    y = 500 + 2 * t + 60 * np.sin(2 * np.pi * t / 7)
    for cid in ("holt", "theta", "ridge"):
        pred = fc.LOCAL[cid](y[:126], 14, 7)
        err = np.mean(np.abs(pred - y[126:]) / y[126:]) * 100
        assert err < 5, (cid, err)


def test_folds_hide_the_end_of_the_series():
    assert fc.fold_origins(100, 10) == [90, 80, 70]
    assert fc.fold_origins(30, 10) == [20, 10]
    assert fc.fold_origins(15, 10) == []


def test_short_series_keep_heavy_candidates_out():
    y = _daily(40)["ventas"].values
    res = fc.compete(y, 7, 7)
    ids = {r["id"] for r in res["ranking"]}
    assert "lightgbm" not in ids  # memoriza con tan poca historia
    assert {"holt", "theta"} <= ids


def test_winner_is_the_lowest_error_and_ranking_is_sorted():
    y = _daily(150)["ventas"].values
    res = fc.compete(y, 14, 7)
    errs = [r["error"] for r in res["ranking"]]
    assert errs == sorted(errs)
    assert fc.winner_error(res) <= errs[0] + 1e-9


def test_a_failing_candidate_does_not_stop_the_competition():
    def broken(train, steps):
        raise RuntimeError("boom")

    y = _daily(120)["ventas"].values
    res = fc.compete(y, 14, 7, extra={"prophet": broken})
    assert res is not None
    assert "prophet" not in {r["id"] for r in res["ranking"]}


def test_forecast_reports_the_competition(monkeypatch):
    monkeypatch.setattr(forecaster, "PROPHET_AVAILABLE", False)
    _, chart, m = run_forecast(_daily(120), "fecha", "ventas", periods=60)
    assert chart is not None, m
    comp = m["competencia"]
    assert len(comp["ranking"]) >= 2
    assert comp["tramos"] >= 2
    assert m["motor"] == comp["ganador"] or m["motor"].startswith("Prophet")
    assert m["mape"] == pytest.approx(comp["error_ganador"], abs=0.05)
    assert m["validacion"] == "Fuera de muestra"
    src = chart["dataset"]["source"]
    assert all(r["lower"] <= r["forecast"] <= r["upper"] for r in src if r["forecast"] is not None)
    assert sum(1 for r in src if r["forecast"] is not None) == m["periodos"] + 1


def test_noise_that_no_model_beats_is_not_shown(monkeypatch):
    monkeypatch.setattr(forecaster, "PROPHET_AVAILABLE", False)
    rng = np.random.default_rng(11)
    # Paseo aleatorio: lo mejor es repetir el último valor; ningún modelo debería ganarle con holgura.
    y = 1000 + np.cumsum(rng.normal(0, 40, 200))
    y[-30:] += np.linspace(0, 400, 30) * rng.choice([-1, 1])
    df = pd.DataFrame({"fecha": pd.date_range("2024-01-01", periods=200, freq="D"), "ventas": y})
    _, chart, m = run_forecast(df, "fecha", "ventas", periods=60)
    if chart is None:
        assert "no mejora a repetir" in m["error"]
        assert "competencia" in m
    else:
        comp = m["competencia"]
        assert comp["error_ganador"] <= forecaster.BASELINE_SLACK * comp["error_regla_simple"] + 0.5


def test_competition_is_cheap(monkeypatch):
    monkeypatch.setattr(forecaster, "PROPHET_AVAILABLE", False)
    t0 = time.time()
    run_forecast(_daily(900), "fecha", "ventas", periods=60)  # semanal, ~129 puntos
    assert time.time() - t0 < 5


def test_lightgbm_does_not_flood_the_log():
    y = _daily(200)["ventas"].values
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        fc.lightgbm(y, 14, 7)
    assert not caught
