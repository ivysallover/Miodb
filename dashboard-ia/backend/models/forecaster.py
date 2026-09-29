"""
models/forecaster.py
Forecasting de series temporales usando Prophet o fallback ARIMA/Regresión.
Retorna raw data para renderizar con Chart.js en el frontend.
"""

from __future__ import annotations
from typing import Optional, Tuple, Dict, Any
import pandas as pd
import numpy as np
import traceback

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False


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
        df_prep[value_col] = pd.to_numeric(df_prep[value_col], errors="coerce")
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

            mae = float(round(float(np.mean(np.abs(y_vals - y_fit))), 2))
            rmse = float(round(std_err, 2))
            mape = float(round(float(np.mean(np.abs((y_vals - y_fit) / (np.abs(y_vals) + 1e-4)))) * 100, 2))
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
                "validacion": "In-Sample",
                "frecuencia": "Semanal" if chosen_freq == "W" else "Diaria"
            }

            chart_data = {
                "chart_id": "forecast",
                "metadata": {
                    "title": f"Proyección a {actual_periods} {'semanas' if chosen_freq == 'W' else 'días'}",
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

        # Modelo Prophet con regularización avanzada
        model = Prophet(
            growth=growth_mode,
            yearly_seasonality=bool(span_days >= 365),
            weekly_seasonality=bool(chosen_freq != "W" and n_pts >= 14),
            daily_seasonality=False,
            seasonality_mode="additive",
            changepoint_prior_scale=0.03 if not is_stationary else 0.01,
            interval_width=0.80,
        )
        model.fit(df_agg)

        # Métricas de precisión in-sample con el modelo ajustado (cero consumo de RAM adicional)
        in_sample = model.predict(df_agg)["yhat"].values
        mae = float(np.mean(np.abs(y_vals - in_sample)))
        rmse = float(np.sqrt(np.mean((y_vals - in_sample) ** 2)))
        mape = float(np.mean(np.abs((y_vals - in_sample) / (np.abs(y_vals) + 1e-4))) * 100)
        eval_type = "In-Sample"
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
                forecast.loc[idx, "trend"] = accum
                forecast.loc[idx, "yhat"] = accum + diff_seasonal

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

