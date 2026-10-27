//! Prophet escrito en Rust (el de Python usa Stan, que no existe en Rust).
//!
//! Es el mismo modelo que `prophet 1.3.0` con la configuración de MIO (aditivo, tendencia lineal o
//! plana): predicción = tendencia + estaciones, con
//! - la serie dividida por su mayor valor absoluto y el tiempo llevado a 0..1;
//! - la tendencia como recta que puede quebrarse en hasta 25 puntos del primer 80 % de la historia;
//! - estaciones de Fourier: anual (período 365,25 días, orden 10) y semanal (7 días, orden 3);
//! - las mismas "preferencias" (priors) que el modelo de Stan: k, m ~ normal(0, 5); quiebres ~
//!   Laplace(0, τ); estaciones ~ normal(0, 10); ruido ~ semi-normal(0, 0,5).
//!
//! Prophet busca el punto más probable (MAP) con L-BFGS. Acá se busca el mismo punto de forma exacta:
//! con el ruido fijo, el problema es una regresión con penalización ridge + lasso (convexa) que se
//! resuelve por descenso por coordenadas; después se actualiza el ruido con su fórmula cerrada, y se
//! repite hasta que no cambia.

use crate::dates::next_month_start;

/// Configuración que usa MIO (ver `build_prophet` en `models/forecaster.py`).
#[derive(Debug, Clone, Copy)]
pub struct Config {
    /// Tendencia lineal con quiebres (true) o plana (false).
    pub linear: bool,
    pub yearly: bool,
    pub weekly: bool,
    /// `changepoint_prior_scale` (τ): 0,03 con tendencia, 0,01 si la serie es estable.
    pub changepoint_prior_scale: f64,
}

#[derive(Debug, Clone)]
pub struct Fit {
    pub cfg: Config,
    pub y_scale: f64,
    pub start: f64,
    pub t_scale: f64,
    pub changepoints_t: Vec<f64>,
    pub k: f64,
    pub m: f64,
    pub delta: Vec<f64>,
    pub beta: Vec<f64>,
    pub sigma_obs: f64,
}

const YEARLY: (f64, usize) = (365.25, 10);
const WEEKLY: (f64, usize) = (7.0, 3);

/// Redondeo "al par" como `np.round`.
fn round_half_even(x: f64) -> f64 {
    let r = x.round();
    if (x - x.trunc()).abs() == 0.5 && r % 2.0 != 0.0 {
        r - x.signum()
    } else {
        r
    }
}

fn fourier(day: f64, cfg: &Config) -> Vec<f64> {
    let mut f = Vec::new();
    for (on, (period, order)) in [(cfg.yearly, YEARLY), (cfg.weekly, WEEKLY)] {
        if !on {
            continue;
        }
        let x = day * std::f64::consts::PI * 2.0;
        for i in 0..order {
            let c = x * (i + 1) as f64 / period;
            f.push(c.sin());
            f.push(c.cos());
        }
    }
    f
}

/// Dónde puede quebrarse la tendencia, como `set_changepoints` de Prophet.
fn changepoints(t: &[f64]) -> Vec<f64> {
    let hist = (t.len() as f64 * 0.8).floor() as usize;
    let n_cp = 25.min(hist.saturating_sub(1));
    if n_cp == 0 {
        return Vec::new();
    }
    let mut cps: Vec<f64> = (1..=n_cp)
        .map(|i| {
            let pos = (hist - 1) as f64 * i as f64 / n_cp as f64;
            t[round_half_even(pos) as usize]
        })
        .collect();
    cps.sort_by(|a, b| a.partial_cmp(b).unwrap());
    cps
}

impl Fit {
    /// Columnas del modelo para un punto: [k, m, quiebres..., estaciones...] (las de tendencia solo si es lineal).
    fn row(&self, day: f64) -> Vec<f64> {
        let t = (day - self.start) / self.t_scale;
        let mut r = Vec::new();
        if self.cfg.linear {
            r.push(t);
        }
        r.push(1.0);
        if self.cfg.linear {
            r.extend(self.changepoints_t.iter().map(|s| if t >= *s { t - s } else { 0.0 }));
        }
        r.extend(fourier(day, &self.cfg));
        r
    }

    /// (predicción, tendencia) en las fechas dadas (días desde 1970-01-01), en la escala original.
    pub fn predict(&self, days: &[f64]) -> (Vec<f64>, Vec<f64>) {
        let mut yhat = Vec::with_capacity(days.len());
        let mut trend = Vec::with_capacity(days.len());
        for &d in days {
            let t = (d - self.start) / self.t_scale;
            let mut tr = self.m;
            if self.cfg.linear {
                tr += self.k * t;
                for (s, dl) in self.changepoints_t.iter().zip(&self.delta) {
                    if t >= *s {
                        tr += dl * (t - s);
                    }
                }
            }
            let seas: f64 = fourier(d, &self.cfg).iter().zip(&self.beta).map(|(f, b)| f * b).sum();
            trend.push(tr * self.y_scale);
            yhat.push((tr + seas) * self.y_scale);
        }
        (yhat, trend)
    }
}

/// Ajusta el modelo a la historia (`days` en días desde 1970-01-01, ordenados).
pub fn fit(days: &[f64], y: &[f64], cfg: Config) -> Result<Fit, String> {
    let n = y.len();
    if n < 2 || days.len() != n {
        return Err("hacen falta al menos dos puntos con fecha".into());
    }
    let y_scale = {
        let mx = y.iter().fold(0.0f64, |a, v| a.max(v.abs()));
        if mx == 0.0 { 1.0 } else { mx }
    };
    let ys: Vec<f64> = y.iter().map(|v| v / y_scale).collect();
    let start = days[0];
    let t_scale = days[n - 1] - start;
    if t_scale <= 0.0 {
        return Err("las fechas no avanzan".into());
    }
    let t: Vec<f64> = days.iter().map(|d| (d - start) / t_scale).collect();
    let cps = if cfg.linear { changepoints(&t) } else { Vec::new() };
    let mut model = Fit { cfg, y_scale, start, t_scale, changepoints_t: cps, k: 0.0, m: 0.0, delta: Vec::new(), beta: Vec::new(), sigma_obs: 1.0 };

    // Columnas y su penalización: (ridge: 1/varianza del prior, lasso: 1/τ).
    let x: Vec<Vec<f64>> = days.iter().map(|d| model.row(*d)).collect();
    let p = x[0].len();
    let n_cp = model.changepoints_t.len();
    let n_trend = if cfg.linear { 2 + n_cp } else { 1 };
    let mut ridge = vec![0.0; p];
    let mut lasso = vec![0.0; p];
    if cfg.linear {
        ridge[0] = 1.0 / 25.0; // k
        ridge[1] = 1.0 / 25.0; // m
        lasso[2..2 + n_cp].fill(1.0 / cfg.changepoint_prior_scale);
    } else {
        ridge[0] = 1.0 / 25.0; // m
    }
    ridge[n_trend..].fill(1.0 / 100.0); // estaciones: normal(0, 10)
    // Columnas por separado (acceso rápido) y su norma.
    let cols: Vec<Vec<f64>> = (0..p).map(|j| x.iter().map(|r| r[j]).collect()).collect();
    let sq: Vec<f64> = cols.iter().map(|c| c.iter().map(|v| v * v).sum()).collect();

    // Arranque como el de Prophet: recta por el primer y el último punto (o el promedio si es plana).
    let mut theta = vec![0.0; p];
    if cfg.linear {
        theta[0] = (ys[n - 1] - ys[0]) / (t[n - 1] - t[0]);
        theta[1] = ys[0] - theta[0] * t[0];
    } else {
        theta[0] = ys.iter().sum::<f64>() / n as f64;
    }
    let mut resid: Vec<f64> = (0..n).map(|i| ys[i] - (0..p).map(|j| x[i][j] * theta[j]).sum::<f64>()).collect();
    let mut sigma2 = {
        let s: f64 = resid.iter().map(|r| r * r).sum();
        (s / n as f64).max(1e-12)
    };

    for _outer in 0..500 {
        // Coeficientes con el ruido fijo: descenso por coordenadas hasta que no se mueven.
        for _sweep in 0..20_000 {
            let mut max_move = 0.0f64;
            for j in 0..p {
                let old = theta[j];
                let rho: f64 = cols[j].iter().zip(&resid).map(|(c, r)| c * (r + c * old)).sum::<f64>() / sigma2;
                let a = sq[j] / sigma2 + ridge[j];
                if a == 0.0 {
                    continue;
                }
                let new = if lasso[j] > 0.0 {
                    let s = rho.abs() - lasso[j];
                    if s > 0.0 { rho.signum() * s / a } else { 0.0 }
                } else {
                    rho / a
                };
                if new != old {
                    let d = new - old;
                    for (r, c) in resid.iter_mut().zip(&cols[j]) {
                        *r -= c * d;
                    }
                    theta[j] = new;
                    max_move = max_move.max(d.abs());
                }
            }
            if max_move < 1e-10 {
                break;
            }
        }
        // Ruido: máximo de n·log σ + S/(2σ²) + 2σ² → 4u² + n·u − S = 0 con u = σ².
        let s: f64 = resid.iter().map(|r| r * r).sum();
        let nf = n as f64;
        let new_sigma2 = (-nf + (nf * nf + 16.0 * s).sqrt()) / 8.0;
        let done = (new_sigma2 - sigma2).abs() <= 1e-14 * sigma2.max(1e-300);
        sigma2 = new_sigma2.max(1e-300);
        if done {
            break;
        }
    }

    if cfg.linear {
        model.k = theta[0];
        model.m = theta[1];
        model.delta = theta[2..2 + n_cp].to_vec();
    } else {
        model.m = theta[0];
    }
    model.beta = theta[n_trend..].to_vec();
    model.sigma_obs = sigma2.sqrt();
    Ok(model)
}

impl Fit {
    /// La función que optimiza Prophet: menos el logaritmo de la probabilidad a posteriori (sin
    /// constantes). Menor es mejor; sirve para comprobar que el ajuste llegó al óptimo.
    pub fn neg_log_posterior(&self, days: &[f64], y: &[f64]) -> f64 {
        let (yh, _) = self.predict(days);
        let s2 = self.sigma_obs * self.sigma_obs;
        let sse: f64 = y.iter().zip(&yh).map(|(a, b)| ((a - b) / self.y_scale).powi(2)).sum();
        y.len() as f64 * self.sigma_obs.ln() + sse / (2.0 * s2) + self.k * self.k / 50.0 + self.m * self.m / 50.0
            + self.delta.iter().map(|d| d.abs()).sum::<f64>() / self.cfg.changepoint_prior_scale
            + self.beta.iter().map(|b| b * b).sum::<f64>() / 200.0
            + s2 / 0.5
    }
}

/// Frecuencia de la serie agregada, como la elige `run_forecast`.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Freq {
    Day,
    Week,
    MonthStart,
}



/// Las `steps` fechas siguientes a `last` (días desde 1970-01-01), como `make_future_dataframe`.
pub fn future_days(last: f64, freq: Freq, steps: usize) -> Vec<f64> {
    let mut out = Vec::with_capacity(steps);
    let mut cur = last.round() as i64;
    for _ in 0..steps {
        cur = match freq {
            Freq::Day => cur + 1,
            Freq::Week => cur + 7,
            Freq::MonthStart => next_month_start(cur),
        };
        out.push(cur as f64);
    }
    out
}

/// Prophet como candidato de la competencia (como `prophet_predict` en `models/forecaster.py`):
/// se ajusta con los primeros `train.len()` puntos y predice `steps`, en las fechas reales si están
/// en la historia y en las siguientes según la frecuencia si no; con tendencia lineal, amortiguado.
pub fn candidate(days: Vec<f64>, freq: Freq, cfg: Config) -> impl Fn(&[f64], usize) -> Result<Vec<f64>, String> {
    move |train: &[f64], steps: usize| {
        let k = train.len();
        let f = fit(&days[..k], train, cfg)?;
        let mut when: Vec<f64> = days[..k].to_vec();
        if k + steps <= days.len() {
            when.extend_from_slice(&days[k..k + steps]);
        } else {
            when.extend(future_days(days[k - 1], freq, steps));
        }
        let (yhat, trend) = f.predict(&when);
        Ok(if cfg.linear { damped(&yhat, &trend, k, steps) } else { yhat[k..k + steps].to_vec() })
    }
}

/// La amortiguación de MIO sobre la proyección (`_damped_holdout`): la pendiente futura se frena
/// 0,92 por paso y la estación se mantiene. `trend`/`yhat` cubren historia + futuro.
pub fn damped(yhat: &[f64], trend: &[f64], n_train: usize, steps: usize) -> Vec<f64> {
    let last = trend[n_train - 1];
    let delta = (trend[n_train + steps - 1] - last) / steps.max(1) as f64;
    let mut accum = last;
    (0..steps)
        .map(|i| {
            let idx = n_train + i;
            accum += delta * 0.92f64.powi(i as i32 + 1);
            accum + (yhat[idx] - trend[idx])
        })
        .collect()
}
