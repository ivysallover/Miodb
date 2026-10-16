"""
Pronóstico: el motor tiene que devolver una proyección (con Prophet o con el respaldo analítico) y la
precisión que informa tiene que medirse sobre datos que el modelo no vio, o decir que no pudo.
"""
import numpy as np
import pandas as pd
import pytest

import models.forecaster as forecaster
from models.forecaster import _holdout_size, _scores, _worse_than_baseline, run_forecast


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


def test_loose_rows_are_not_a_series(engine):
    """Una exportación de pocas filas sueltas (un tercio de los meses vacíos) no se proyecta."""
    rng = np.random.default_rng(3)
    months = pd.date_range("2023-01-01", periods=41, freq="MS")
    kept = [m for i, m in enumerate(months) if i % 3 != 0]  # 27 of 41 months have rows
    rows = [m + pd.Timedelta(days=int(d)) for m in kept for d in rng.integers(0, 27, size=int(rng.integers(1, 3)))]
    df = pd.DataFrame({"fecha": rows, "ventas": rng.normal(30000, 9000, len(rows))})
    _, chart, m = run_forecast(df, "fecha", "ventas", periods=60)
    assert chart is None
    assert "períodos sin registros" in m["error"]


def test_business_days_only_is_still_a_series(engine):
    """Una planilla diaria sin fines de semana sí es una serie: no se la confunde con datos sueltos."""
    days = pd.bdate_range("2025-01-01", periods=70)
    t = np.arange(len(days))
    df = pd.DataFrame({"fecha": days, "ventas": 1000 + 3 * t + np.random.default_rng(5).normal(0, 20, len(t))})
    _, chart, m = run_forecast(df, "fecha", "ventas", periods=60)
    assert chart is not None, m


def test_a_model_worse_than_repeating_the_last_value_is_not_shown():
    train = np.array([100.0, 102.0, 98.0, 101.0, 99.0, 100.0])
    test = np.array([100.0, 101.0, 99.0])
    assert _worse_than_baseline(train, test, model_mape=40.0) is True
    assert _worse_than_baseline(train, test, model_mape=1.0) is False
    # when every rule is almost perfect, tenths of a point do not decide
    flat = np.full(8, 500.0)
    assert _worse_than_baseline(flat, np.full(3, 500.0), model_mape=0.3) is False


def test_monthly_series_have_no_weekly_season(monkeypatch):
    # Con un punto por mes no hay ciclo semanal: pedírselo a Prophet lo hacía tardar más de 10 s.
    built = []
    real = forecaster.Prophet

    def spy(**kw):
        built.append(kw)
        return real(**kw)

    monkeypatch.setattr(forecaster, "Prophet", spy)
    rng = np.random.default_rng(3)
    t = np.arange(1460)
    df = pd.DataFrame({"fecha": pd.date_range("2020-01-01", periods=1460), "ventas": 900 + 0.15 * t + rng.normal(0, 50, 1460)})
    _, chart, m = run_forecast(df, "fecha", "ventas", periods=60)
    assert m.get("frecuencia") == "Mensual" or "error" in m
    assert built and all(kw["weekly_seasonality"] is False for kw in built)
