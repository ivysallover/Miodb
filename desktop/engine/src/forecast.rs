//! La competencia de modelos para la predicción ("guerra de modelos").
//!
//! Reproduce `models/forecast_candidates.py`: cada candidato predice tramos de la serie que se le
//! esconden y gana el que menos se equivoca en promedio, o el promedio de los dos mejores si así se
//! equivoca menos. Lo que un modelo "ya vio" no cuenta.

use std::time::{Duration, Instant};

/// Un candidato: recibe la historia y cuántos pasos predecir.
pub type Predictor<'a> = Box<dyn Fn(&[f64], usize) -> Result<Vec<f64>, String> + 'a>;

/// Nombre que ve la persona para cada candidato.
pub fn name(id: &str) -> &'static str {
    match id {
        "prophet" => "Prophet",
        "holt" => "Holt-Winters amortiguado",
        "theta" => "Theta",
        "ridge" => "Regresión con rezagos",
        "lightgbm" => "LightGBM con rezagos",
        _ => "Modelo",
    }
}

/// Debajo de esto un candidato no compite: con menos historia memoriza en vez de aprender.
pub fn min_train(id: &str) -> usize {
    match id {
        "holt" | "theta" => 8,
        "ridge" => 24,
        "lightgbm" => 60,
        _ => 10,
    }
}

/// Un candidato que tarda más que esto en sus tramos queda afuera.
pub const MAX_SECONDS_PER_CANDIDATE: f64 = 6.0;
/// El segundo "empata" si erra a lo sumo un 10 % más que el primero.
pub const TIE_RATIO: f64 = 1.10;

/// Error porcentual medio, igual que `_mape` en Python.
pub fn mape(actual: &[f64], pred: &[f64]) -> f64 {
    let n = actual.len() as f64;
    actual.iter().zip(pred).map(|(a, p)| ((a - p) / (a.abs() + 1e-4)).abs()).sum::<f64>() / n * 100.0
}

fn mean(v: &[f64]) -> f64 {
    v.iter().sum::<f64>() / v.len() as f64
}

/// Recta de mínimos cuadrados (pendiente, ordenada), como `np.polyfit(x, y, 1)` con x = 0..n.
fn line(y: &[f64]) -> (f64, f64) {
    let n = y.len() as f64;
    let xm = (n - 1.0) / 2.0;
    let ym = mean(y);
    let (mut sxy, mut sxx) = (0.0, 0.0);
    for (i, v) in y.iter().enumerate() {
        let dx = i as f64 - xm;
        sxy += dx * (v - ym);
        sxx += dx * dx;
    }
    let slope = if sxx > 0.0 { sxy / sxx } else { 0.0 };
    (slope, ym - slope * xm)
}

// ---------------------------------------------------------------------------------------------
// Candidatos
// ---------------------------------------------------------------------------------------------

/// Holt-Winters aditivo con tendencia amortiguada; parámetros de una grilla chica que minimiza el
/// error a un paso. Sin temporada si no hay al menos dos temporadas completas.
pub fn holt(y: &[f64], steps: usize, season: usize) -> Vec<f64> {
    let n = y.len();
    let m = if season > 0 && n >= 2 * season { season } else { 0 };
    let gammas: &[f64] = if m > 0 { &[0.05, 0.2, 0.4] } else { &[0.0] };
    // (sse, nivel, tendencia, temporada, phi)
    let mut best: Option<(f64, f64, f64, Vec<f64>, f64)> = None;
    for &a in &[0.1, 0.3, 0.5, 0.8] {
        for &b in &[0.0, 0.05, 0.2] {
            for &phi in &[0.8, 0.9, 0.98] {
                for &g in gammas {
                    let (mut level, mut seas) = if m > 0 {
                        let l = mean(&y[..m]);
                        (l, y[..m].iter().map(|v| v - l).collect::<Vec<f64>>())
                    } else {
                        (y[0], Vec::new())
                    };
                    let mut trend = 0.0;
                    let mut sse = 0.0;
                    let warm = if m > 0 { m } else { 1 };
                    for i in 0..n {
                        let s = if m > 0 { seas[i % m] } else { 0.0 };
                        let pred = level + phi * trend + s;
                        if i >= warm {
                            sse += (y[i] - pred).powi(2);
                        }
                        let prev = level;
                        level = a * (y[i] - s) + (1.0 - a) * (level + phi * trend);
                        trend = b * (level - prev) + (1.0 - b) * phi * trend;
                        if m > 0 {
                            seas[i % m] = g * (y[i] - level) + (1.0 - g) * s;
                        }
                    }
                    if best.as_ref().map_or(true, |bst| sse < bst.0) {
                        best = Some((sse, level, trend, seas, phi));
                    }
                }
            }
        }
    }
    let (_, level, trend, seas, phi) = best.expect("la grilla nunca está vacía");
    let mut out = Vec::with_capacity(steps);
    let mut damp = 0.0;
    for h in 0..steps {
        damp += phi.powi(h as i32 + 1);
        out.push(level + damp * trend + if m > 0 { seas[(n + h) % m] } else { 0.0 });
    }
    out
}

/// Promedio por posición dentro de la temporada, sobre la serie sin su recta (suma cero).
fn seasonal_profile(y: &[f64], m: usize) -> Vec<f64> {
    let (slope, icpt) = line(y);
    let resid: Vec<f64> = y.iter().enumerate().map(|(i, v)| v - (icpt + slope * i as f64)).collect();
    let prof: Vec<f64> = (0..m)
        .map(|i| {
            let vals: Vec<f64> = resid.iter().skip(i).step_by(m).copied().collect();
            mean(&vals)
        })
        .collect();
    let pm = mean(&prof);
    prof.iter().map(|p| p - pm).collect()
}

/// Método Theta: suavizado exponencial simple más la mitad de la pendiente de largo plazo; con dos
/// temporadas completas se le quita la temporada antes y se le devuelve después.
pub fn theta(y: &[f64], steps: usize, season: usize) -> Vec<f64> {
    let n = y.len();
    let m = if season > 0 && n >= 2 * season { season } else { 0 };
    let prof = if m > 0 { seasonal_profile(y, m) } else { Vec::new() };
    let z: Vec<f64> = if m > 0 { y.iter().enumerate().map(|(i, v)| v - prof[i % m]).collect() } else { y.to_vec() };
    let slope = line(&z).0;
    let mut best: Option<(f64, f64, f64)> = None; // (sse, alfa, nivel)
    for &a in &[0.1, 0.2, 0.3, 0.5, 0.7, 0.9] {
        let mut level = z[0];
        let mut sse = 0.0;
        for v in &z[1..] {
            sse += (v - level).powi(2);
            level = a * v + (1.0 - a) * level;
        }
        if best.map_or(true, |b| sse < b.0) {
            best = Some((sse, a, level));
        }
    }
    let (_, a, level) = best.expect("la grilla nunca está vacía");
    (1..=steps)
        .map(|h| {
            let hf = h as f64;
            let mut v = level + 0.5 * slope * (hf - 1.0 + 1.0 / a - (1.0 - a).powi(n as i32) / a);
            if m > 0 {
                v += prof[(n + h - 1) % m];
            }
            v
        })
        .collect()
}

/// Filas de la matriz de rezagos: ventanas de largo k sobre z[..-1]; objetivo z[k..].
fn lag_rows(z: &[f64], k: usize) -> (Vec<Vec<f64>>, Vec<f64>) {
    let x: Vec<Vec<f64>> = (0..z.len() - k).map(|i| z[i..i + k].to_vec()).collect();
    (x, z[k..].to_vec())
}

/// Resuelve A·x = b (A simétrica definida positiva) por Cholesky.
fn solve_spd(a: &[Vec<f64>], b: &[f64]) -> Result<Vec<f64>, String> {
    let n = b.len();
    let mut l = vec![vec![0.0; n]; n];
    for i in 0..n {
        for j in 0..=i {
            let s: f64 = (0..j).map(|p| l[i][p] * l[j][p]).sum();
            if i == j {
                let d = a[i][i] - s;
                if d <= 0.0 {
                    return Err("matriz no definida positiva".into());
                }
                l[i][j] = d.sqrt();
            } else {
                l[i][j] = (a[i][j] - s) / l[j][j];
            }
        }
    }
    let mut w = vec![0.0; n];
    for i in 0..n {
        w[i] = (b[i] - (0..i).map(|p| l[i][p] * w[p]).sum::<f64>()) / l[i][i];
    }
    let mut x = vec![0.0; n];
    for i in (0..n).rev() {
        x[i] = (w[i] - (i + 1..n).map(|p| l[p][i] * x[p]).sum::<f64>()) / l[i][i];
    }
    Ok(x)
}

/// Regresión ridge (alfa = 1, con ordenada sin penalizar), como `sklearn.linear_model.Ridge`.
fn ridge_fit(x: &[Vec<f64>], t: &[f64], alpha: f64) -> Result<(Vec<f64>, f64), String> {
    let k = x[0].len();
    let rows = x.len() as f64;
    let xm: Vec<f64> = (0..k).map(|j| x.iter().map(|r| r[j]).sum::<f64>() / rows).collect();
    let tm = mean(t);
    let mut a = vec![vec![0.0; k]; k];
    let mut b = vec![0.0; k];
    for (r, tv) in x.iter().zip(t) {
        for i in 0..k {
            let ci = r[i] - xm[i];
            b[i] += ci * (tv - tm);
            for j in 0..=i {
                a[i][j] += ci * (r[j] - xm[j]);
            }
        }
    }
    for i in 0..k {
        for j in 0..i {
            a[j][i] = a[i][j];
        }
        a[i][i] += alpha;
    }
    let w = solve_spd(&a, &b)?;
    let icpt = tm - (0..k).map(|i| xm[i] * w[i]).sum::<f64>();
    Ok((w, icpt))
}

/// Regresión lineal sobre los últimos k valores (k = una temporada, o un tercio de la serie).
pub fn ridge(y: &[f64], steps: usize, season: usize) -> Result<Vec<f64>, String> {
    let n = y.len();
    let k = 2.max((if season > 0 { season } else { 4 }).min(n / 3));
    let mu = mean(y);
    let sd0 = (y.iter().map(|v| (v - mu).powi(2)).sum::<f64>() / n as f64).sqrt();
    let sd = if sd0 == 0.0 { 1.0 } else { sd0 };
    let z: Vec<f64> = y.iter().map(|v| (v - mu) / sd).collect();
    if z.len() <= k {
        return Err("serie demasiado corta para los rezagos".into());
    }
    let (x, t) = lag_rows(&z, k);
    let (w, icpt) = ridge_fit(&x, &t, 1.0)?;
    let mut hist = z;
    let mut out = Vec::with_capacity(steps);
    for _ in 0..steps {
        let last = &hist[hist.len() - k..];
        let p = icpt + last.iter().zip(&w).map(|(a, b)| a * b).sum::<f64>();
        out.push(p);
        hist.push(p);
    }
    Ok(out.iter().map(|v| v * sd + mu).collect())
}

// ---------------------------------------------------------------------------------------------
// Competencia
// ---------------------------------------------------------------------------------------------

/// Dónde corta cada tramo escondido: los últimos `hold` puntos, los `hold` anteriores, etc.
pub fn fold_origins(n: usize, hold: usize, max_folds: usize, min_train: usize) -> Vec<usize> {
    let mut out = Vec::new();
    for k in 1..=max_folds {
        match n.checked_sub(k * hold) {
            Some(o) if o >= min_train => out.push(o),
            _ => break,
        }
    }
    out
}

#[derive(Debug, Clone, PartialEq)]
pub struct Entry {
    pub id: String,
    pub nombre: &'static str,
    /// MAPE promedio fuera de muestra, en %.
    pub error: f64,
}

#[derive(Debug, Clone)]
pub struct Competition {
    /// Ordenado de menor a mayor error.
    pub ranking: Vec<Entry>,
    /// Un id, o dos si ganó su promedio.
    pub winner: Vec<String>,
    /// Predicciones de cada candidato (y del promedio ganador, con clave "a+b") en cada tramo.
    pub preds: Vec<(String, Vec<Vec<f64>>)>,
    pub errors: Vec<(String, f64)>,
    pub origins: Vec<usize>,
}

impl Competition {
    pub fn winner_key(&self) -> String {
        self.winner.join("+")
    }
    pub fn error_of(&self, key: &str) -> Option<f64> {
        self.errors.iter().find(|(k, _)| k == key).map(|(_, e)| *e)
    }
    pub fn preds_of(&self, key: &str) -> Option<&Vec<Vec<f64>>> {
        self.preds.iter().find(|(k, _)| k == key).map(|(_, p)| p)
    }
    pub fn winner_error(&self) -> f64 {
        self.error_of(&self.winner_key()).expect("el ganador siempre tiene error")
    }
}

/// Los candidatos propios de este módulo, en el mismo orden que en Python.
pub fn local_candidates(season: usize) -> Vec<(&'static str, Predictor<'static>)> {
    vec![
        ("holt", Box::new(move |tr: &[f64], st: usize| Ok(holt(tr, st, season)))),
        ("theta", Box::new(move |tr: &[f64], st: usize| Ok(theta(tr, st, season)))),
        ("ridge", Box::new(move |tr: &[f64], st: usize| ridge(tr, st, season))),
    ]
}

/// Corre la competencia. `candidates` en orden (el orden desempata errores iguales, como en Python).
pub fn compete(
    y: &[f64],
    hold: usize,
    candidates: Vec<(&'static str, Predictor<'_>)>,
    nonneg: bool,
    max_folds: usize,
    max_seconds: f64,
) -> Option<Competition> {
    let origins = fold_origins(y.len(), hold, max_folds, 10);
    if hold == 0 || origins.is_empty() {
        return None;
    }
    let shortest = *origins.iter().min().unwrap();
    let mut preds: Vec<(String, Vec<Vec<f64>>)> = Vec::new();
    let mut errors: Vec<(String, f64)> = Vec::new();
    'cand: for (id, f) in candidates {
        if shortest < min_train(id) {
            continue;
        }
        let started = Instant::now();
        let mut runs = Vec::with_capacity(origins.len());
        for &o in &origins {
            if started.elapsed() > Duration::from_secs_f64(max_seconds) {
                continue 'cand; // tardó demasiado: queda afuera
            }
            let mut p = match f(&y[..o], hold) {
                Ok(p) => p,
                Err(_) => continue 'cand, // un candidato que falla no frena a los demás
            };
            p.truncate(hold);
            if p.len() != hold || p.iter().any(|v| !v.is_finite()) {
                continue 'cand;
            }
            if nonneg {
                p.iter_mut().for_each(|v| *v = v.max(0.0));
            }
            runs.push(p);
        }
        let err = mean(&origins.iter().zip(&runs).map(|(&o, p)| mape(&y[o..o + hold], p)).collect::<Vec<f64>>());
        preds.push((id.to_string(), runs));
        errors.push((id.to_string(), err));
    }
    if errors.is_empty() {
        return None;
    }
    let mut order: Vec<(String, f64)> = errors.clone();
    order.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap()); // estable, como `sorted` de Python
    let mut winner = vec![order[0].0.clone()];
    if order.len() > 1 && order[1].1 <= TIE_RATIO * order[0].1 {
        let (a, b) = (&order[0].0, &order[1].0);
        let pa = &preds.iter().find(|(k, _)| k == a).unwrap().1;
        let pb = &preds.iter().find(|(k, _)| k == b).unwrap().1;
        let avg: Vec<Vec<f64>> = pa.iter().zip(pb).map(|(x, z)| x.iter().zip(z).map(|(p, q)| (p + q) / 2.0).collect()).collect();
        let avg_err = mean(&origins.iter().zip(&avg).map(|(&o, p)| mape(&y[o..o + hold], p)).collect::<Vec<f64>>());
        if avg_err < order[0].1 {
            let key = format!("{a}+{b}");
            winner = vec![a.clone(), b.clone()];
            preds.push((key.clone(), avg));
            errors.push((key, avg_err));
        }
    }
    let ranking = order.iter().map(|(id, e)| Entry { id: id.clone(), nombre: name(id), error: *e }).collect();
    Some(Competition { ranking, winner, preds, errors, origins })
}

/// Error promedio, en los mismos tramos, de la mejor regla trivial: repetir lo último o el promedio.
pub fn baseline_error(y: &[f64], origins: &[usize], hold: usize) -> f64 {
    let last = mean(&origins.iter().map(|&o| mape(&y[o..o + hold], &vec![y[o - 1]; hold])).collect::<Vec<f64>>());
    let avg = mean(&origins.iter().map(|&o| mape(&y[o..o + hold], &vec![mean(&y[..o]); hold])).collect::<Vec<f64>>());
    last.min(avg)
}

/// Ancho de la banda por paso: el mayor error del ganador en ese paso entre los tramos, acumulado;
/// más allá de lo medido crece con la raíz de la distancia.
pub fn band_margins(y: &[f64], runs: &[Vec<f64>], origins: &[usize], steps: usize) -> Vec<f64> {
    let hold = runs[0].len();
    let mut per_step = vec![0.0f64; hold];
    for (o, p) in origins.iter().zip(runs) {
        for h in 0..hold {
            per_step[h] = per_step[h].max((y[o + h] - p[h]).abs());
        }
    }
    for h in 1..hold {
        per_step[h] = per_step[h].max(per_step[h - 1]);
    }
    (0..steps)
        .map(|h| if h < hold { per_step[h] } else { per_step[hold - 1] * (((h + 1) as f64) / hold as f64).sqrt() })
        .collect()
}
