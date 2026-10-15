"""
models/forecaster.py
Pronóstico de series temporales: varios modelos compiten (ver models/forecast_candidates.py) y se
muestra el que menos se equivocó sobre tramos que se le escondieron; si la competencia no puede correr,
Prophet solo o un respaldo analítico, como antes.
Retorna raw data para renderizar con Chart.js en el frontend.
"""

from __future__ import annotations
from typing import Optional, Tuple, Dict, Any
import pandas as pd
import numpy as np
import traceback

from models.forecast_candidates import NAMES, band_margins, baseline_error, compete, winner_error

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False


def _holdout_size(n_pts: int, horizon: int) -> int:
    """
    Cuántos de los últimos puntos se esconden para medir la precisión sobre datos que el modelo no vio.
    0 = la serie es demasiado corta para esconder nada sin dejar al modelo sin historia.
    """
    h = min(horizon, max(3, n_pts // 5))
    return h if (n_pts - h) >= 10 else 0


def _scores(y_true: np.ndarray, y_pred: np.ndarray) -> Tuple[float, float, float]:
    """(mae, rmse, mape en %) con las mismas fórmulas que usaba la medición in-sample."""
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    mape = float(np.mean(np.abs((y_true - y_pred) / (np.abs(y_true) + 1e-4))) * 100)
    return mae, rmse, mape


# Una proyección solo se muestra si hay una serie de verdad detrás y le gana a lo más simple.
MIN_COVERAGE = 0.70
BASELINE_SLACK = 1.25


def _worse_than_baseline(train: np.ndarray, test: np.ndarray, model_mape: float) -> bool:
    """
    True si el modelo, sobre los puntos escondidos, erra claramente más que la mejor de dos reglas
    triviales: repetir el último valor o repetir el promedio. En ese caso la "predicción" no aporta
    nada y mostrarla sería inventar certeza. El margen absoluto evita decidir por décimas cuando
    todas las reglas aciertan casi perfecto.
    """
    last = _scores(test, np.full(len(test), float(train[-1])))[2]
    mean = _scores(test, np.full(len(test), float(np.mean(train))))[2]
    return model_mape > BASELINE_SLACK * min(last, mean) + 0.5


def _damped_holdout(forecast_cv: pd.DataFrame, n_train: int, hold: int) -> np.ndarray:
    """
    Predicción de los `hold` puntos escondidos, tratada igual que la proyección que se le muestra al
    usuario: con tendencia lineal, la pendiente futura se amortigua (0.92 por paso).
    """
    yhat = forecast_cv["yhat"].astype(float).values.copy()
    if "trend" in forecast_cv.columns:
        last_trend = float(forecast_cv["trend"].iloc[n_train - 1])
        final_trend = float(forecast_cv["trend"].iloc[n_train + hold - 1])
        delta = (final_trend - last_trend) / max(hold, 1)
        accum = last_trend
        for i in range(hold):
            idx = n_train + i
            accum += delta * (0.92 ** (i + 1))
            seasonal = float(forecast_cv["yhat"].iloc[idx] - forecast_cv["trend"].iloc[idx])
            yhat[idx] = accum + seasonal
    return yhat[n_train:n_train + hold]


def run_forecast(
    df: pd.DataFrame,
    date_col: str,
    value_col: str,
    periods: int = 60,
    freq: str = "D",
) -> Tuple[Optional[pd.DataFrame], Optional[dict], dict]:
    """
    Ejecuta forecast de serie temporal optimizado con Prophet o fallback analítico.
    Detecta automáticamente estacionalidad, estacionariedad y horizon óptimo.
    Retorna (df_forecast, chart_data, metrics)
    """
    try:
        df_prep = df[[date_col, value_col]].copy()
        df_prep["ds"] = pd.to_datetime(df_prep[date_col], errors="coerce").dt.normalize()
        # Un infinito (una división por cero en la planilla) rompe a cualquier modelo: cuenta como vacío.
        df_prep[value_col] = pd.to_numeric(df_prep[value_col], errors="coerce").replace([np.inf, -np.inf], np.nan)
        df_prep = df_prep.dropna(subset=["ds", value_col])

        if len(df_prep) < 5:
            return None, None, {"error": "Se requieren al menos 5 registros válidos con fecha y valor numérico."}

        min_d = df_prep["ds"].min()
        max_d = df_prep["ds"].max()
        span_days = int((max_d - min_d).days)
        n_distinct_dates = df_prep["ds"].nunique()

        # Selección adaptativa de frecuencia y horizonte de proyección
        # Para series temporales de más de 90 días, la agregación semanal elimina el ruido diario
        # ("código de barras / electrocardiograma ilegible") y produce una curva limpia y ejecutiva.
        if span_days > 1095:
            chosen_freq = "MS"
            default_horizon = 12  # 12 meses
        elif span_days > 90 or n_distinct_dates > 90:
            chosen_freq = "W"
            default_horizon = 12  # 12 semanas (~3 meses)
        elif span_days > 30:
            chosen_freq = "D"
            default_horizon = 14  # 14 días
        else:
            chosen_freq = "D"
            default_horizon = max(5, min(10, int(max(span_days, 7) * 0.35)))

        # Respetar periods si el usuario lo especificó diferente a 60 por defecto
        actual_periods = default_horizon if periods == 60 else min(periods, max(6, int(max(span_days, 10) * 0.35)))

        # Agregación regular
        df_agg = df_prep.groupby(pd.Grouper(key="ds", freq=chosen_freq))[value_col].mean().dropna().reset_index()
        df_agg.columns = ["ds", "y"]
        df_agg = df_agg.sort_values("ds").reset_index(drop=True)

        if len(df_agg) < 5 and chosen_freq in ("W", "MS"):
            # Fallback a diario si el agrupamiento dejó muy pocos puntos
            chosen_freq = "D"
            actual_periods = min(30, max(7, span_days // 4))
            df_agg = df_prep.groupby(pd.Grouper(key="ds", freq="D"))[value_col].mean().dropna().reset_index()
            df_agg.columns = ["ds", "y"]
            df_agg = df_agg.sort_values("ds").reset_index(drop=True)

        if len(df_agg) < 5:
            return None, None, {"error": "Insuficientes observaciones agregadas por fecha (mínimo 5)."}

        # Serie de verdad: en semanas o meses, casi todos los períodos tienen que tener registros. Una
        # exportación de pocas filas sueltas (p. ej. solo las filas marcadas como atípicas) no es una serie,
        # y sus promedios por período son ruido. (Diario no se mide: faltan fines de semana a propósito.)
        if chosen_freq in ("W", "MS"):
            bins = df_prep.groupby(pd.Grouper(key="ds", freq=chosen_freq)).size()
            coverage = float((bins > 0).mean()) if len(bins) else 0.0
            if coverage < MIN_COVERAGE:
                missing = int(round((1.0 - coverage) * 100))
                return None, None, {
                    "error": f"Hay períodos sin registros: faltan datos en el {missing} % de los {len(bins)} períodos, "
                             "así que no forman una serie para proyectar."
                }

        y_vals = df_agg["y"].values
        n_pts = len(y_vals)

        # Análisis estadístico de tendencia y variabilidad
        x_idx = np.arange(n_pts)
        slope, intercept = np.polyfit(x_idx, y_vals, 1)
        y_fit = intercept + slope * x_idx
        ss_tot = float(np.sum((y_vals - np.mean(y_vals)) ** 2))
        ss_res = float(np.sum((y_vals - y_fit) ** 2))
        r2 = float(1.0 - (ss_res / (ss_tot + 1e-8)))
        mean_y = float(np.mean(y_vals))
        total_pct_change = float(((slope * n_pts) / (abs(mean_y) + 1e-5)) * 100.0)

        # Criterio riguroso de estacionariedad:
        # Si la variación total sobre todo el histórico es < 3.5% o R² < 0.04,
        # la serie oscila alrededor de una media constante.
        is_stationary = bool(r2 < 0.04 or abs(total_pct_change) < 3.5)
        growth_mode = "flat" if is_stationary else "linear"
        is_positive = bool(y_vals.min() >= 0)

        # Modelo Prophet con regularización avanzada
        def build_prophet() -> "Prophet":
            return Prophet(
                growth=growth_mode,
                yearly_seasonality=bool(span_days >= 365),
                weekly_seasonality=bool(chosen_freq != "W" and n_pts >= 14),
                daily_seasonality=False,
                seasonality_mode="additive",
                changepoint_prior_scale=0.03 if not is_stationary else 0.01,
                interval_width=0.80,
            )

        def prophet_predict(train: np.ndarray, steps: int) -> np.ndarray:
            """Prophet como candidato: se ajusta con los primeros len(train) puntos y predice `steps`."""
            k = len(train)
            m_ = build_prophet()
            m_.fit(df_agg.iloc[:k])
            if k + steps <= n_pts:
                fc = m_.predict(df_agg.iloc[:k + steps][["ds"]])
            else:
                fc = m_.predict(m_.make_future_dataframe(periods=steps, freq=chosen_freq))
            if growth_mode == "linear":
                return _damped_holdout(fc, k, steps)
            return fc["yhat"].astype(float).values[k:k + steps]

        # Competencia: cada candidato predice tramos escondidos de la serie y gana el que menos se
        # equivoca en promedio. Si algo falla acá, se sigue como antes (Prophet solo o el respaldo).
        season = {"W": 52, "MS": 12, "D": 7}.get(chosen_freq, 0)
        comp = None
        competencia = None
        comp_scores = None
        hold_c = _holdout_size(n_pts, actual_periods)
        if hold_c:
            try:
                comp = compete(
                    y_vals, hold_c, season,
                    extra={"prophet": prophet_predict} if PROPHET_AVAILABLE else None,
                    nonneg=is_positive,
                )
            except Exception:
                print(f"La competencia de modelos no pudo correr, se sigue con un solo modelo:\n{traceback.format_exc()}")
                comp = None
        if comp is not None:
            win_key = "+".join(comp["winner"])
            win_err = winner_error(comp)
            base_err = baseline_error(y_vals, comp["origins"], hold_c)
            competencia = {
                "ranking": comp["ranking"],
                "ganador": " + ".join(NAMES[c] for c in comp["winner"]),
                "promedio_de_dos": len(comp["winner"]) > 1,
                "error_ganador": round(win_err, 2),
                "error_regla_simple": round(base_err, 2),
                "tramos": len(comp["origins"]),
                "puntos_por_tramo": hold_c,
            }
            if win_err > BASELINE_SLACK * base_err + 0.5:
                return None, None, {
                    "error": "La estimación no mejora a repetir el último valor al probarla con datos escondidos, así que no se muestra.",
                    "competencia": competencia,
                }
            runs = comp["preds"][win_key]
            fold_scores = [_scores(y_vals[o:o + hold_c], p) for o, p in zip(comp["origins"], runs)]
            comp_scores = tuple(float(np.mean([f[i] for f in fold_scores])) for i in range(3))
            if comp["winner"] != ["prophet"]:
                return _competition_result(
                    df_agg, y_vals, comp, win_key, comp_scores, competencia, chosen_freq, actual_periods,
                    season, is_positive, r2, value_col, prophet_predict,
                )
            # Ganó Prophet solo: sigue por su camino de siempre, con la precisión medida en la competencia.

        if not PROPHET_AVAILABLE:
            # Fallback analítico con regularización
            future_dates = pd.date_range(start=df_agg["ds"].iloc[-1], periods=actual_periods + 1, freq=chosen_freq)[1:]
            last_val = float(y_vals[-1])
            
            if is_stationary:
                y_future = np.full(actual_periods, mean_y)
            else:
                x_future = np.arange(n_pts, n_pts + actual_periods)
                # Aplicar amortiguamiento de tendencia
                damped_slope = slope * (0.92 ** np.arange(1, actual_periods + 1))
                y_future = last_val + np.cumsum(damped_slope)

            std_err = float(np.std(y_vals - y_fit))
            margin = 1.96 * std_err

            dates = df_agg["ds"].dt.strftime('%Y-%m-%d').tolist() + future_dates.strftime('%Y-%m-%d').tolist()
            reals = [float(round(v, 2)) for v in y_vals] + [None] * actual_periods
            fores = [None] * (n_pts - 1) + [round(last_val, 2)] + [float(round(v, 2)) for v in y_future]
            ups = [None] * (n_pts - 1) + [round(last_val, 2)] + [float(round(v + margin, 2)) for v in y_future]
            downs = [None] * (n_pts - 1) + [round(last_val, 2)] + [float(round(max(0, v - margin) if is_positive else v - margin, 2)) for v in y_future]

            source = []
            for i in range(len(dates)):
                b_w = round(max(0.0, ups[i] - downs[i]), 2) if (ups[i] is not None and downs[i] is not None) else None
                source.append({
                    "date": dates[i],
                    "historical": reals[i],
                    "forecast": fores[i],
                    "lower": downs[i],
                    "upper": ups[i],
                    "band_width": b_w
                })

            # Precisión sobre los últimos puntos, escondidos al ajuste (no sobre lo que el modelo ya vio).
            hold = _holdout_size(n_pts, actual_periods)
            eval_type = "In-Sample"
            mae, rmse, mape = _scores(y_vals, y_fit)
            if hold:
                n_train = n_pts - hold
                train = y_vals[:n_train]
                if is_stationary:
                    pred_hold = np.full(hold, float(np.mean(train)))
                else:
                    s_tr, _ = np.polyfit(np.arange(n_train), train, 1)
                    pred_hold = float(train[-1]) + np.cumsum(s_tr * (0.92 ** np.arange(1, hold + 1)))
                if is_positive:
                    pred_hold = np.maximum(pred_hold, 0.0)
                mae, rmse, mape = _scores(y_vals[n_train:], pred_hold)
                eval_type = "Fuera de muestra"
                if _worse_than_baseline(train, y_vals[n_train:], mape):
                    return None, None, {"error": "La estimación no mejora a repetir el último valor al probarla con datos escondidos, así que no se muestra."}
            mae = float(round(mae, 2))
            rmse = float(round(rmse, 2))
            mape = float(round(mape, 2))
            precision_pct = float(max(0.0, min(100.0, round(100.0 - mape, 1))))

            metrics = {
                "ultimo_valor_real": round(last_val, 2),
                "valor_final_forecast": round(float(y_future[-1]), 2),
                "tendencia_pct": round(float(((y_future[-1] - last_val) / max(abs(last_val), 1)) * 100), 1),
                "periodos": actual_periods,
                "motor": "Modelo Analítico",
                "mae": mae,
                "rmse": rmse,
                "mape": mape,
                "precision_pct": precision_pct,
                "r2": round(max(-1.0, min(1.0, r2)), 2),
                "confianza": "Media",
                "validacion": eval_type,
                "frecuencia": "Mensual" if chosen_freq in ("MS", "M") else ("Semanal" if chosen_freq == "W" else "Diaria")
            }

            chart_data = {
                "chart_id": "forecast",
                "metadata": {
                    "title": f"Proyección a {actual_periods} {'meses' if chosen_freq in ('MS', 'M') else ('semanas' if chosen_freq == 'W' else 'días')}",
                    "insight_subtitle": f"Tendencia estimada del {metrics['tendencia_pct']}%",
                    "source_metric": value_col
                },
                "layout_directives": {
                    "chart_type": "FanChart",
                    "x_axis_type": "time",
                    "y_axis_type": "value",
                    "is_log_scale": False,
                    "has_time_gaps": False,
                    "high_cardinality": False,
                    "show_confidence_bands": True
                },
                "dataset": {
                    "dimensions": ["date", "historical", "forecast", "lower", "upper", "band_width"],
                    "source": source
                }
            }
            return None, chart_data, metrics

        # Precisión fuera de muestra: se esconden los últimos puntos, se ajusta con el resto y se
        # compara con lo que pasó. Un modelo puede copiar muy bien lo que ya vio (in-sample) y aun así
        # predecir mal; ese número sería engañoso. Si la serie es muy corta, o si esta evaluación
        # falla, se cae a in-sample y la métrica lo dice en `validacion`.
        mae = rmse = mape = None
        eval_type = "In-Sample"
        no_better = False
        hold = 0 if comp_scores else _holdout_size(n_pts, actual_periods)
        if comp_scores:
            mae, rmse, mape = comp_scores
            eval_type = "Fuera de muestra"
        if hold:
            try:
                n_train = n_pts - hold
                model_cv = build_prophet()
                model_cv.fit(df_agg.iloc[:n_train])
                fc_cv = model_cv.predict(df_agg[["ds"]])
                pred_hold = _damped_holdout(fc_cv, n_train, hold) if growth_mode == "linear" else fc_cv["yhat"].astype(float).values[n_train:]
                if is_positive:
                    pred_hold = np.maximum(pred_hold, 0.0)
                mae, rmse, mape = _scores(y_vals[n_train:], pred_hold)
                eval_type = "Fuera de muestra"
                no_better = _worse_than_baseline(y_vals[:n_train], y_vals[n_train:], mape)
                del model_cv, fc_cv
            except Exception:
                print(f"Validación fuera de muestra no disponible, se usa in-sample:\n{traceback.format_exc()}")
                mae = rmse = mape = None
                eval_type = "In-Sample"
                no_better = False

        if no_better:
            return None, None, {"error": "La estimación no mejora a repetir el último valor al probarla con datos escondidos, así que no se muestra."}

        model = build_prophet()
        model.fit(df_agg)

        if mape is None:
            in_sample = model.predict(df_agg)["yhat"].values
            mae, rmse, mape = _scores(y_vals, in_sample)
        precision_pct = float(max(0.0, min(100.0, round(100.0 - mape, 1))))

        # Generar proyección futura
        future = model.make_future_dataframe(periods=actual_periods, freq=chosen_freq)
        forecast = model.predict(future)

        # Si el modelo tiene tendencia lineal, amortiguar la pendiente futura para evitar caídas irreales
        if growth_mode == "linear":
            hist_len = len(df_agg)
            last_trend = float(forecast["trend"].iloc[hist_len - 1])
            final_raw_trend = float(forecast["trend"].iloc[-1])
            delta_per_step = (final_raw_trend - last_trend) / max(actual_periods, 1)
            
            accum = last_trend
            for i in range(actual_periods):
                idx = hist_len + i
                damped_delta = delta_per_step * (0.92 ** (i + 1))
                accum += damped_delta
                diff_seasonal = forecast.loc[idx, "yhat"] - forecast.loc[idx, "trend"]
                old_yhat = float(forecast.loc[idx, "yhat"])
                forecast.loc[idx, "trend"] = accum
                forecast.loc[idx, "yhat"] = accum + diff_seasonal
                # La banda se mueve con la línea (mismo ancho): si no, la proyección amortiguada
                # puede quedar fuera de su propio rango.
                shift = float(forecast.loc[idx, "yhat"]) - old_yhat
                forecast.loc[idx, "yhat_lower"] = forecast.loc[idx, "yhat_lower"] + shift
                forecast.loc[idx, "yhat_upper"] = forecast.loc[idx, "yhat_upper"] + shift

        # Acotar piso no negativo
        if is_positive:
            forecast["yhat"] = forecast["yhat"].clip(lower=0)
            forecast["yhat_lower"] = forecast["yhat_lower"].clip(lower=0)
            forecast["yhat_upper"] = forecast["yhat_upper"].clip(lower=0)

        last_actual = float(y_vals[-1])
        end_forecast = float(forecast["yhat"].iloc[-1])
        trend_pct = round(((end_forecast - last_actual) / max(abs(last_actual), 1)) * 100, 1)

        confianza = "Alta"
        if precision_pct < 70 or n_pts < 15:
            confianza = "Precaución"
        elif precision_pct < 85 or n_pts < 30:
            confianza = "Media"

        metrics = {
            "ultimo_valor_real": round(last_actual, 2),
            "valor_final_forecast": round(end_forecast, 2),
            "tendencia_pct": trend_pct,
            "periodos": actual_periods,
            "motor": f"Prophet ({'Estacionario' if is_stationary else 'Tendencia'})",
            "mae": float(round(mae, 2)),
            "rmse": float(round(rmse, 2)),
            "mape": float(round(mape, 2)),
            "precision_pct": precision_pct,
            "r2": float(round(max(-1.0, min(1.0, r2)), 2)),
            "confianza": confianza,
            "validacion": eval_type,
            "frecuencia": "Mensual" if chosen_freq in ("MS", "M") else ("Semanal" if chosen_freq == "W" else "Diaria")
        }
        if competencia:
            metrics["competencia"] = competencia

        merged = pd.merge(forecast, df_agg, on="ds", how="left")
        
        # Vincular punto de empalme histórico con la proyección para una transición suave
        hist_end_idx = len(df_agg) - 1
        if hist_end_idx < len(merged):
            merged.loc[hist_end_idx, "yhat"] = merged.loc[hist_end_idx, "y"]
            merged.loc[hist_end_idx, "yhat_lower"] = merged.loc[hist_end_idx, "y"]
            merged.loc[hist_end_idx, "yhat_upper"] = merged.loc[hist_end_idx, "y"]

        source = []
        for i in range(len(merged)):
            row_d = merged.iloc[i]
            d_str = row_d["ds"].strftime("%Y-%m-%d")
            real_v = float(round(row_d["y"], 2)) if not pd.isna(row_d["y"]) else None
            # Solo mostrar forecast a partir del último punto real
            is_forecast_point = i >= hist_end_idx
            pred_v = float(round(row_d["yhat"], 2)) if is_forecast_point and not pd.isna(row_d["yhat"]) else None
            low_v = float(round(row_d["yhat_lower"], 2)) if is_forecast_point and not pd.isna(row_d["yhat_lower"]) else None
            up_v = float(round(row_d["yhat_upper"], 2)) if is_forecast_point and not pd.isna(row_d["yhat_upper"]) else None
            b_w = round(max(0.0, up_v - low_v), 2) if (up_v is not None and low_v is not None) else None

            source.append({
                "date": d_str,
                "historical": real_v,
                "forecast": pred_v,
                "lower": low_v,
                "upper": up_v,
                "band_width": b_w
            })

        chart_data = {
            "chart_id": "forecast",
            "metadata": {
                "title": f"Proyección a {actual_periods} {'meses' if chosen_freq in ('MS', 'M') else ('semanas' if chosen_freq == 'W' else 'días')}",
                "insight_subtitle": f"Tendencia estimada del {trend_pct}% ({'estable/estacionaria' if is_stationary else 'crecimiento/contracción'})",
                "source_metric": value_col
            },
            "layout_directives": {
                "chart_type": "FanChart",
                "x_axis_type": "time",
                "y_axis_type": "value",
                "is_log_scale": False,
                "has_time_gaps": False,
                "high_cardinality": False,
                "show_confidence_bands": True
            },
            "dataset": {
                "dimensions": ["date", "historical", "forecast", "lower", "upper", "band_width"],
                "source": source
            }
        }

        return forecast, chart_data, metrics

    except Exception as e:
        print(f"Error en Prophet:\n{traceback.format_exc()}")
        return None, None, {"error": "Error matemático al calcular la proyección. Revise si hay valores atípicos extremos."}



def _competition_result(df_agg, y_vals, comp, win_key, scores, competencia, chosen_freq, periods,
                        season, is_positive, r2, value_col, prophet_predict):
    """
    Proyección cuando ganó un candidato distinto de Prophet solo (o el promedio de dos). La banda sale
    de cuánto se equivocó el ganador en los tramos escondidos, con el mismo método para todos.
    """
    from models.forecast_candidates import LOCAL

    n_pts = len(y_vals)
    futures = []
    for cid in comp["winner"]:
        if cid == "prophet":
            futures.append(np.asarray(prophet_predict(y_vals, periods), dtype=float))
        else:
            futures.append(np.asarray(LOCAL[cid](y_vals, periods, season), dtype=float))
    y_future = np.mean(futures, axis=0)
    margin = band_margins(y_vals, comp["preds"][win_key], comp["origins"], periods)
    lower = y_future - margin
    upper = y_future + margin
    if is_positive:
        y_future = np.maximum(y_future, 0.0)
        lower = np.maximum(lower, 0.0)
        upper = np.maximum(upper, 0.0)

    future_dates = pd.date_range(start=df_agg["ds"].iloc[-1], periods=periods + 1, freq=chosen_freq)[1:]
    last_val = float(y_vals[-1])
    dates = df_agg["ds"].dt.strftime('%Y-%m-%d').tolist() + future_dates.strftime('%Y-%m-%d').tolist()
    reals = [float(round(v, 2)) for v in y_vals] + [None] * periods
    joint = [None] * (n_pts - 1) + [round(last_val, 2)]
    fores = joint + [float(round(v, 2)) for v in y_future]
    ups = joint + [float(round(v, 2)) for v in upper]
    downs = joint + [float(round(v, 2)) for v in lower]
    source = []
    for i in range(len(dates)):
        b_w = round(max(0.0, ups[i] - downs[i]), 2) if (ups[i] is not None and downs[i] is not None) else None
        source.append({"date": dates[i], "historical": reals[i], "forecast": fores[i], "lower": downs[i], "upper": ups[i], "band_width": b_w})

    mae, rmse, mape = scores
    precision_pct = float(max(0.0, min(100.0, round(100.0 - mape, 1))))
    confianza = "Alta"
    if precision_pct < 70 or n_pts < 15:
        confianza = "Precaución"
    elif precision_pct < 85 or n_pts < 30:
        confianza = "Media"
    end_forecast = float(y_future[-1])
    trend_pct = round(((end_forecast - last_val) / max(abs(last_val), 1)) * 100, 1)
    unit = 'meses' if chosen_freq in ('MS', 'M') else ('semanas' if chosen_freq == 'W' else 'días')
    metrics = {
        "ultimo_valor_real": round(last_val, 2),
        "valor_final_forecast": round(end_forecast, 2),
        "tendencia_pct": trend_pct,
        "periodos": periods,
        "motor": competencia["ganador"],
        "mae": float(round(mae, 2)),
        "rmse": float(round(rmse, 2)),
        "mape": float(round(mape, 2)),
        "precision_pct": precision_pct,
        "r2": float(round(max(-1.0, min(1.0, r2)), 2)),
        "confianza": confianza,
        "validacion": "Fuera de muestra",
        "frecuencia": "Mensual" if chosen_freq in ("MS", "M") else ("Semanal" if chosen_freq == "W" else "Diaria"),
        "competencia": competencia,
    }
    chart_data = {
        "chart_id": "forecast",
        "metadata": {
            "title": f"Proyección a {periods} {unit}",
            "insight_subtitle": f"Tendencia estimada del {trend_pct}% · ganó {competencia['ganador']}",
            "source_metric": value_col,
        },
        "layout_directives": {
            "chart_type": "FanChart", "x_axis_type": "time", "y_axis_type": "value", "is_log_scale": False,
            "has_time_gaps": False, "high_cardinality": False, "show_confidence_bands": True,
        },
        "dataset": {"dimensions": ["date", "historical", "forecast", "lower", "upper", "band_width"], "source": source},
    }
    return None, chart_data, metrics
