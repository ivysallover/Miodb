"""
Pronóstico: el motor tiene que devolver una proyección (con Prophet o con el respaldo analítico) y la
precisión que informa tiene que medirse sobre datos que el modelo no vio, o decir que no pudo.
"""
import numpy as np
import pandas as pd
import pytest

import models.forecaster as forecaster
from models.forecaster import _holdout_size, _scores, run_forecast


def _series(n: int, seed: int = 7) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    t = np.arange(n)
    y = 1000 + 2.0 * t + 120 * np.sin(2 * np.pi * t / 7) + rng.normal(0, 25, n)
    return pd.DataFrame({"fecha": pd.date_range("2024-01-01", periods=n, freq="D"), "ventas": y})


@pytest.fixture(params=[True, False], ids=["prophet", "analitico"])
def engine(request, monkeypatch):
    if request.param and not forecaster.PROPHET_AVAILABLE:
        pytest.skip("Prophet no está instalado en este entorno")
    monkeypatch.setattr(forecaster, "PROPHET_AVAILABLE", request.param)
    return request.param


def test_holdout_size_keeps_enough_history():
    assert _holdout_size(12, 5) == 0  # muy corta: no se esconde nada
    assert _holdout_size(27, 12) == 5
    assert _holdout_size(60, 12) == 12
    for n in range(5, 400):
        h = _holdout_size(n, 14)
        assert h == 0 or (n - h >= 10 and 3 <= h <= 14)


def test_scores_match_the_old_formula():
    y = np.array([100.0, 200.0, 300.0])
    p = np.array([110.0, 180.0, 330.0])
    mae, rmse, mape = _scores(y, p)
    assert mae == pytest.approx(20.0)
    assert rmse == pytest.approx(np.sqrt((100 + 400 + 900) / 3))
    assert mape == pytest.approx(np.mean([10 / 100, 20 / 200, 30 / 300]) * 100, rel=1e-3)


def test_forecast_is_out_of_sample_and_complete(engine):
    _, chart, m = run_forecast(_series(120), "fecha", "ventas", periods=60)
    assert chart is not None, m
    assert "error" not in m
    assert m["validacion"] == "Fuera de muestra"
    assert 0 <= m["precision_pct"] <= 100
    assert m["precision_pct"] == pytest.approx(100 - m["mape"], abs=0.1)
    src = chart["dataset"]["source"]
    assert sum(1 for r in src if r["forecast"] is not None) == m["periodos"] + 1
    assert all(r["lower"] <= r["forecast"] <= r["upper"] for r in src if r["forecast"] is not None)


def test_short_series_says_it_is_in_sample(engine):
    _, chart, m = run_forecast(_series(12), "fecha", "ventas", periods=60)
    assert chart is not None, m
    assert m["validacion"] == "In-Sample"


def test_too_few_points_is_a_clear_error(engine):
    _, chart, m = run_forecast(_series(3), "fecha", "ventas", periods=60)
    assert chart is None
    assert "error" in m
