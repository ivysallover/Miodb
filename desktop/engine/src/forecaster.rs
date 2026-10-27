//! El pronóstico completo: de las filas de la planilla a la proyección que ve la persona.
//!
//! Reproduce `run_forecast` de `models/forecaster.py`: agrupa por día, semana o mes según cuánto
//! tiempo cubre la planilla, exige que haya una serie de verdad, corre la guerra de modelos, aplica el
//! árbitro y arma el gráfico y las métricas con las mismas claves.
//!
//! Una diferencia, a propósito: cuando gana Prophet, Python dibuja la franja de Prophet, que sale de
//! 1.000 simulaciones al azar y cambia en cada corrida; acá la franja sale, como para los demás
//! ganadores, de cuánto se equivocó el modelo en los tramos escondidos.

use crate::charts::{chart, Layout};
use crate::dates::{month_start, week_end, ymd};
use crate::forecast::{self, band_margins, baseline_error, compete, local_candidates, Competition};
use crate::prophet::{self, Config, Freq};
use crate::pynum::{py_clamp, py_round};
use serde_json::{json, Value};

pub const MIN_COVERAGE: f64 = 0.70;
pub const BASELINE_SLACK: f64 = 1.25;
const NO_MEJORA: &str = "La estimación no mejora a repetir el último valor al probarla con datos escondidos, así que no se muestra.";

/// Un número como lo escribe Python dentro de un texto (`f"{x}"`): 5.0 → "5.0", 12.3 → "12.3".
fn py_str(x: f64) -> String {
    if x.fract() == 0.0 && x.abs() < 1e16 { format!("{:.1}", x) } else { format!("{}", x) }
}

fn round_half_even(x: f64) -> f64 {
    let r = x.round();
    if (x - x.trunc()).abs() == 0.5 && r % 2.0 != 0.0 { r - x.signum() } else { r }
}

/// Cuántos de los últimos puntos se esconden para medir la precisión (0 = la serie es muy corta).
pub fn holdout_size(n_pts: usize, horizon: usize) -> usize {
    let h = horizon.min(3.max(n_pts / 5));
    if n_pts >= h + 10 { h } else { 0 }
}

/// (mae, rmse, mape en %).
pub fn scores(actual: &[f64], pred: &[f64]) -> (f64, f64, f64) {
    let n = actual.len() as f64;
    let mae = actual.iter().zip(pred).map(|(a, p)| (a - p).abs()).sum::<f64>() / n;
    let rmse = (actual.iter().zip(pred).map(|(a, p)| (a - p).powi(2)).sum::<f64>() / n).sqrt();
    (mae, rmse, forecast::mape(actual, pred))
}

fn worse_than_baseline(train: &[f64], test: &[f64], model_mape: f64) -> bool {
    let last = forecast::mape(test, &vec![*train.last().unwrap(); test.len()]);
    let mean = forecast::mape(test, &vec![train.iter().sum::<f64>() / train.len() as f64; test.len()]);
    model_mape > BASELINE_SLACK * last.min(mean) + 0.5
}


/// La etiqueta del período de cada día, como `pd.Grouper(freq=...)`: el mismo día, el domingo que
/// cierra su semana, o el primer día del mes.
fn bin_label(day: i64, freq: Freq) -> i64 {
    match freq {
        Freq::Day => day,
        Freq::Week => week_end(day),
        Freq::MonthStart => month_start(day),
    }
}



fn next_label(label: i64, freq: Freq) -> i64 {
    prophet::future_days(label as f64, freq, 1)[0] as i64
}

/// Promedio por período, solo los períodos con datos (como `groupby(...).mean().dropna()`), y la
/// cantidad de períodos de punta a punta y cuántos tienen registros.
fn aggregate(rows: &[(i64, f64)], freq: Freq) -> (Vec<f64>, Vec<f64>, usize, usize) {
    let mut sums: std::collections::BTreeMap<i64, (f64, usize)> = std::collections::BTreeMap::new();
    for &(d, v) in rows {
        let e = sums.entry(bin_label(d, freq)).or_insert((0.0, 0));
        e.0 += v;
        e.1 += 1;
    }
    let first = *sums.keys().next().unwrap();
    let last = *sums.keys().last().unwrap();
    let mut total = 0;
    let mut cur = first;
    while cur <= last {
        total += 1;
        cur = next_label(cur, freq);
    }
    let with_data = sums.len();
    let (days, ys) = sums.into_iter().map(|(k, (s, c))| (k as f64, s / c as f64)).unzip();
    (days, ys, total, with_data)
}

fn freq_name(f: Freq) -> &'static str {
    match f {
        Freq::MonthStart => "Mensual",
        Freq::Week => "Semanal",
        Freq::Day => "Diaria",
    }
}
fn unit(f: Freq) -> &'static str {
    match f {
        Freq::MonthStart => "meses",
        Freq::Week => "semanas",
        Freq::Day => "días",
    }
}


fn error(msg: &str) -> Value {
    json!({ "chart_data": null, "metrics": { "error": msg } })
}

/// El pronóstico para una columna: `days` son las fechas de cada fila en días desde 1970-01-01 (sin
/// hora) y `values` el valor de esa fila (`NaN` si está vacío). `periods` = 60 deja elegir el horizonte.
pub fn run_forecast(days: &[f64], values: &[f64], value_name: &str, periods: usize) -> Value {
    let rows: Vec<(i64, f64)> = days.iter().zip(values)
        .filter(|(d, v)| d.is_finite() && v.is_finite())
        .map(|(d, v)| (d.floor() as i64, *v))
        .collect();
    if rows.len() < 5 {
        return error("Se requieren al menos 5 registros válidos con fecha y valor numérico.");
    }
    let min_d = rows.iter().map(|r| r.0).min().unwrap();
    let max_d = rows.iter().map(|r| r.0).max().unwrap();
    let span_days = max_d - min_d;
    let n_distinct = rows.iter().map(|r| r.0).collect::<std::collections::BTreeSet<_>>().len();

    let (mut freq, default_horizon) = if span_days > 1095 {
        (Freq::MonthStart, 12)
    } else if span_days > 90 || n_distinct > 90 {
        (Freq::Week, 12)
    } else if span_days > 30 {
        (Freq::Day, 14)
    } else {
        (Freq::Day, 5.max(10.min((span_days.max(7) as f64 * 0.35) as usize)))
    };
    let mut periods_out = if periods == 60 { default_horizon } else { periods.min(6.max((span_days.max(10) as f64 * 0.35) as usize)) };

    let (mut ds, mut y, mut total_bins, mut bins_with_data) = aggregate(&rows, freq);
    if y.len() < 5 && freq != Freq::Day {
        freq = Freq::Day;
        periods_out = 30.min(7.max((span_days / 4) as usize));
        let agg = aggregate(&rows, freq);
        ds = agg.0;
        y = agg.1;
        total_bins = agg.2;
        bins_with_data = agg.3;
    }
    if y.len() < 5 {
        return error("Insuficientes observaciones agregadas por fecha (mínimo 5).");
    }
    if freq != Freq::Day {
        let coverage = bins_with_data as f64 / total_bins as f64;
        if coverage < MIN_COVERAGE {
            let missing = round_half_even((1.0 - coverage) * 100.0) as i64;
            return error(&format!(
                "Hay períodos sin registros: faltan datos en el {missing} % de los {total_bins} períodos, así que no forman una serie para proyectar."
            ));
        }
    }

    // Tendencia y estabilidad, como en Python.
    let n = y.len();
    let xm = (n as f64 - 1.0) / 2.0;
    let ym = y.iter().sum::<f64>() / n as f64;
    let (mut sxy, mut sxx) = (0.0, 0.0);
    for (i, v) in y.iter().enumerate() {
        sxy += (i as f64 - xm) * (v - ym);
        sxx += (i as f64 - xm).powi(2);
    }
    let slope = sxy / sxx;
    let intercept = ym - slope * xm;
    let ss_tot: f64 = y.iter().map(|v| (v - ym).powi(2)).sum();
    let ss_res: f64 = y.iter().enumerate().map(|(i, v)| (v - (intercept + slope * i as f64)).powi(2)).sum();
    let r2 = 1.0 - ss_res / (ss_tot + 1e-8);
    let total_pct_change = (slope * n as f64) / (ym.abs() + 1e-5) * 100.0;
    let is_stationary = r2 < 0.04 || total_pct_change.abs() < 3.5;
    let is_positive = y.iter().cloned().fold(f64::INFINITY, f64::min) >= 0.0;

    let cfg = Config {
        linear: !is_stationary,
        yearly: span_days >= 365,
        // Estación semanal solo con datos diarios (con semanas o meses no hay ciclo semanal que ver).
        weekly: freq == Freq::Day && n >= 14,
        changepoint_prior_scale: if is_stationary { 0.01 } else { 0.03 },
    };
    let season = match freq { Freq::Week => 52, Freq::MonthStart => 12, Freq::Day => 7 };
    let ctx = Ctx { ds: &ds, y: &y, freq, periods: periods_out, is_positive, is_stationary, r2, value_name };

    // La guerra de modelos.
    let hold = holdout_size(n, periods_out);
    if hold > 0 {
        let mut cands = local_candidates(season);
        cands.push(("prophet", Box::new(prophet::candidate(ds.clone(), freq, cfg))));
        if let Some(comp) = compete(&y, hold, cands, is_positive, 3, forecast::MAX_SECONDS_PER_CANDIDATE) {
            let win_err = comp.winner_error();
            let base_err = baseline_error(&y, &comp.origins, hold);
            let competencia = json!({
                "ranking": comp.ranking.iter().map(|e| json!({"id": e.id, "nombre": e.nombre, "error": py_round(e.error, 2)})).collect::<Vec<_>>(),
                "ganador": comp.winner.iter().map(|c| forecast::name(c)).collect::<Vec<_>>().join(" + "),
                "promedio_de_dos": comp.winner.len() > 1,
                "error_ganador": py_round(win_err, 2),
                "error_regla_simple": py_round(base_err, 2),
                "tramos": comp.origins.len(),
                "puntos_por_tramo": hold,
            });
            if win_err > BASELINE_SLACK * base_err + 0.5 {
                return json!({ "chart_data": null, "metrics": { "error": NO_MEJORA, "competencia": competencia } });
            }
            return ctx.competition_result(&comp, hold, cfg, season, competencia);
        }
    }

    // Sin competencia (serie muy corta): Prophet solo, como en Python.
    ctx.prophet_alone(hold, cfg)
}

struct Ctx<'a> {
    ds: &'a [f64],
    y: &'a [f64],
    freq: Freq,
    periods: usize,
    is_positive: bool,
    is_stationary: bool,
    r2: f64,
    value_name: &'a str,
}

impl Ctx<'_> {
    fn competition_result(&self, comp: &Competition, hold: usize, cfg: Config, season: usize, competencia: Value) -> Value {
        let key = comp.winner_key();
        let runs = comp.preds_of(&key).unwrap();
        let folds: Vec<(f64, f64, f64)> = comp.origins.iter().zip(runs).map(|(&o, p)| scores(&self.y[o..o + hold], p)).collect();
        let m3 = |i: usize| folds.iter().map(|f| [f.0, f.1, f.2][i]).sum::<f64>() / folds.len() as f64;
        let (mae, rmse, mape) = (m3(0), m3(1), m3(2));

        let mut futures: Vec<Vec<f64>> = Vec::new();
        for c in &comp.winner {
            futures.push(match c.as_str() {
                "prophet" => prophet::candidate(self.ds.to_vec(), self.freq, cfg)(self.y, self.periods).unwrap_or_default(),
                "holt" => forecast::holt(self.y, self.periods, season),
                "theta" => forecast::theta(self.y, self.periods, season),
                "ridge" => forecast::ridge(self.y, self.periods, season).unwrap_or_default(),
                "lightgbm" => forecast::lightgbm(self.y, self.periods, season).unwrap_or_default(),
                _ => Vec::new(),
            });
        }
        if futures.iter().any(|f| f.len() != self.periods) {
            return error("Error matemático al calcular la proyección. Revise si hay valores atípicos extremos.");
        }
        let mut fut: Vec<f64> = (0..self.periods).map(|h| futures.iter().map(|f| f[h]).sum::<f64>() / futures.len() as f64).collect();
        let margin = band_margins(self.y, runs, &comp.origins, self.periods);
        let mut lower: Vec<f64> = fut.iter().zip(&margin).map(|(v, m)| v - m).collect();
        let mut upper: Vec<f64> = fut.iter().zip(&margin).map(|(v, m)| v + m).collect();
        if self.is_positive {
            for v in fut.iter_mut().chain(lower.iter_mut()).chain(upper.iter_mut()) {
                *v = v.max(0.0);
            }
        }
        let prophet_alone = comp.winner == ["prophet"];
        let ganador = competencia["ganador"].as_str().unwrap().to_string();
        let (motor, subtitle_tail) = if prophet_alone {
            (
                format!("Prophet ({})", if self.is_stationary { "Estacionario" } else { "Tendencia" }),
                format!(" ({})", if self.is_stationary { "estable/estacionaria" } else { "crecimiento/contracción" }),
            )
        } else {
            (ganador.clone(), format!(" · ganó {ganador}"))
        };
        self.result(fut, lower, upper, (mae, rmse, mape), "Fuera de muestra", motor, subtitle_tail, Some(competencia))
    }

    fn prophet_alone(&self, hold: usize, cfg: Config) -> Value {
        let n = self.y.len();
        let mut sc: Option<(f64, f64, f64)> = None;
        let mut eval = "In-Sample";
        if hold > 0 {
            let n_train = n - hold;
            if let Ok(p) = prophet::candidate(self.ds.to_vec(), self.freq, cfg)(&self.y[..n_train], hold) {
                let p: Vec<f64> = if self.is_positive { p.iter().map(|v| v.max(0.0)).collect() } else { p };
                let s = scores(&self.y[n_train..], &p);
                if worse_than_baseline(&self.y[..n_train], &self.y[n_train..], s.2) {
                    return error(NO_MEJORA);
                }
                sc = Some(s);
                eval = "Fuera de muestra";
            }
        }
        let fit = match prophet::fit(self.ds, self.y, cfg) {
            Ok(f) => f,
            Err(_) => return error("Error matemático al calcular la proyección. Revise si hay valores atípicos extremos."),
        };
        let sc = sc.unwrap_or_else(|| scores(self.y, &fit.predict(self.ds).0));
        let fut_raw = prophet::candidate(self.ds.to_vec(), self.freq, cfg)(self.y, self.periods).unwrap_or_default();
        // Sin tramos escondidos no hay errores medidos para la franja: se usa el ruido que estimó el
        // modelo (≈ 80 % de los puntos dentro).
        let half = 1.2816 * fit.sigma_obs * fit.y_scale;
        let mut fut = fut_raw;
        let mut lower: Vec<f64> = fut.iter().map(|v| v - half).collect();
        let mut upper: Vec<f64> = fut.iter().map(|v| v + half).collect();
        if self.is_positive {
            for v in fut.iter_mut().chain(lower.iter_mut()).chain(upper.iter_mut()) {
                *v = v.max(0.0);
            }
        }
        let motor = format!("Prophet ({})", if self.is_stationary { "Estacionario" } else { "Tendencia" });
        let tail = format!(" ({})", if self.is_stationary { "estable/estacionaria" } else { "crecimiento/contracción" });
        self.result(fut, lower, upper, sc, eval, motor, tail, None)
    }

    #[allow(clippy::too_many_arguments)]
    fn result(&self, fut: Vec<f64>, lower: Vec<f64>, upper: Vec<f64>, sc: (f64, f64, f64), eval: &str, motor: String,
              subtitle_tail: String, competencia: Option<Value>) -> Value {
        let n = self.y.len();
        let (mae, rmse, mape) = sc;
        let last = self.y[n - 1];
        let future = prophet::future_days(self.ds[n - 1], self.freq, self.periods);
        let mut source = Vec::with_capacity(n + self.periods);
        for i in 0..n {
            let joint = i == n - 1;
            let r = py_round(self.y[i], 2);
            source.push(json!({
                "date": ymd(self.ds[i] as i64), "historical": r,
                "forecast": if joint { json!(r) } else { Value::Null },
                "lower": if joint { json!(r) } else { Value::Null },
                "upper": if joint { json!(r) } else { Value::Null },
                "band_width": if joint { json!(0.0) } else { Value::Null },
            }));
        }
        for h in 0..self.periods {
            let (lo, up) = (py_round(lower[h], 2), py_round(upper[h], 2));
            source.push(json!({
                "date": ymd(future[h] as i64), "historical": null, "forecast": py_round(fut[h], 2),
                "lower": lo, "upper": up, "band_width": py_round((up - lo).max(0.0), 2),
            }));
        }
        let precision_pct = py_clamp(py_round(100.0 - mape, 1), 0.0, 100.0);
        let confianza = if precision_pct < 70.0 || n < 15 { "Precaución" } else if precision_pct < 85.0 || n < 30 { "Media" } else { "Alta" };
        let end = fut[self.periods - 1];
        let trend_pct = py_round((end - last) / last.abs().max(1.0) * 100.0, 1);
        let mut metrics = json!({
            "ultimo_valor_real": py_round(last, 2),
            "valor_final_forecast": py_round(end, 2),
            "tendencia_pct": trend_pct,
            "periodos": self.periods,
            "motor": motor,
            "mae": py_round(mae, 2),
            "rmse": py_round(rmse, 2),
            "mape": py_round(mape, 2),
            "precision_pct": precision_pct,
            "r2": py_round(py_clamp(self.r2, -1.0, 1.0), 2),
            "confianza": confianza,
            "validacion": eval,
            "frecuencia": freq_name(self.freq),
        });
        if let Some(c) = competencia {
            metrics["competencia"] = c;
        }
        json!({
            "chart_data": chart(
                "forecast",
                &format!("Proyección a {} {}", self.periods, unit(self.freq)),
                &format!("Tendencia estimada del {}%{}", py_str(trend_pct), subtitle_tail),
                self.value_name,
                Layout { bands: true, ..Layout::new("FanChart", "time", "value") },
                &["date", "historical", "forecast", "lower", "upper", "band_width"],
                source,
            ),
            "metrics": metrics,
        })
    }
}
