//! Cuánto confiar en MIO Predict, medido con ventas reales que no vio: se le esconde el final de cada serie,
//! se le pide la predicción como en la app y se compara con lo que pasó. Mide cuánto se equivoca (contra
//! repetir lo último), cuántas veces lo real cae dentro de la franja, si se pasa para arriba o para abajo,
//! si la confianza que dice («Alta», «Media», «Precaución») acompaña lo que pasa, y cuántas veces no predice.
//!
//! Las series salen de M5 (ventas de Walmart, `scripts/m5_series.py` arma `m5_series.csv`) y, si están, de
//! Mercado Litoral. No están en el repo: la prueba corre si encuentra `$M5` (o `~/Downloads/m5`) y si no,
//! avisa y pasa. Correla con `--release -- --nocapture` para ver el informe.

use mio_engine::dates::days_from_civil;
use mio_engine::forecaster::{bin_label, run_forecast};
use mio_engine::prophet::Freq;
use rayon::prelude::*;
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::PathBuf;

fn home(var: &str, default: &str) -> Option<PathBuf> {
    std::env::var_os(var).map(PathBuf::from).or_else(|| Some(PathBuf::from(std::env::var_os("HOME")?).join(default)))
}

/// Las series de M5: nombre y filas (día, valor).
fn m5(dir: &PathBuf) -> Vec<(String, Vec<(i64, f64)>)> {
    let mut by: BTreeMap<String, Vec<(i64, f64)>> = BTreeMap::new();
    let mut r = csv::Reader::from_path(dir.join("m5_series.csv")).unwrap();
    for row in r.records().flatten() {
        let d: Vec<i64> = row[1].split('-').map(|x| x.parse().unwrap()).collect();
        by.entry(row[0].to_string()).or_default().push((days_from_civil(d[0], d[1], d[2]), row[2].parse().unwrap()));
    }
    by.into_iter().collect()
}

/// Cómo se prueba cada serie: cuánta historia se le da (en días antes del corte) y cuántos períodos se esconden.
/// Son los tres casos de la app: más de tres años va por meses, más de 90 días por semanas, menos por días.
const WINDOWS: [(&str, Freq, Option<i64>, usize); 3] = [
    ("Mensual", Freq::MonthStart, None, 12),
    ("Semanal", Freq::Week, Some(728), 12),
    ("Diaria", Freq::Day, Some(60), 14),
];

/// Lo que pasó con una serie en una ventana.
struct Run {
    window: &'static str,
    kind: &'static str,
    shown: bool,
    /// Error absoluto sumado sobre lo real sumado (WAPE), del modelo y de repetir lo último.
    wape: f64,
    naive: f64,
    inside: usize,
    points: usize,
    /// Cuánto se pasó (positivo) o quedó corto (negativo), sobre lo real.
    bias: f64,
    confianza: String,
    winner: String,
}

/// Promedio por período, como la app (`aggregate`).
fn by_period(rows: &[(i64, f64)], freq: Freq) -> BTreeMap<i64, f64> {
    let mut sums: BTreeMap<i64, (f64, usize)> = BTreeMap::new();
    for &(d, v) in rows {
        let e = sums.entry(bin_label(d, freq)).or_default();
        e.0 += v;
        e.1 += 1;
    }
    sums.into_iter().map(|(k, (s, c))| (k, s / c as f64)).collect()
}

fn run(rows: &[(i64, f64)], kind: &'static str, (window, freq, keep, hide): (&'static str, Freq, Option<i64>, usize)) -> Option<Run> {
    // Los períodos completos: sin el primero ni el último, que pueden estar cortados.
    let labels: Vec<i64> = by_period(rows, freq).keys().copied().collect();
    if labels.len() < hide + 3 {
        return None;
    }
    let future: Vec<i64> = labels[labels.len() - 1 - hide..labels.len() - 1].to_vec();
    let cut = rows.iter().filter(|r| bin_label(r.0, freq) == future[0]).map(|r| r.0).min()?;
    let from = keep.map_or(i64::MIN, |k| cut - k);
    let history: Vec<(i64, f64)> = rows.iter().copied().filter(|r| r.0 >= from && r.0 < cut).collect();
    let truth = by_period(&rows.iter().copied().filter(|r| r.0 >= cut && future.contains(&bin_label(r.0, freq))).collect::<Vec<_>>(), freq);
    let actual: Vec<f64> = future.iter().map(|l| truth[l]).collect();
    let last = *by_period(&history, freq).values().last()?;

    let days: Vec<f64> = history.iter().map(|r| r.0 as f64).collect();
    let values: Vec<f64> = history.iter().map(|r| r.1).collect();
    let out = run_forecast(&days, &values, "ventas", hide);
    let m = &out["metrics"];
    let real: f64 = actual.iter().map(|a| a.abs()).sum::<f64>().max(1e-9);
    let naive = actual.iter().map(|a| (a - last).abs()).sum::<f64>() / real;
    let empty = Run { window, kind, shown: false, wape: f64::NAN, naive, inside: 0, points: 0, bias: f64::NAN, confianza: String::new(), winner: String::new() };
    let Some(source) = out["chart_data"]["dataset"]["source"].as_array() else {
        return Some(empty);
    };
    assert_eq!(m["frecuencia"], window, "la app tiene que agrupar igual que la prueba");
    let ahead: Vec<&Value> = source.iter().filter(|p| p["historical"].is_null()).take(hide).collect();
    if ahead.len() < hide {
        return Some(empty);
    }
    let num = |p: &Value, k: &str| p[k].as_f64().unwrap();
    let pred: Vec<f64> = ahead.iter().map(|p| num(p, "forecast")).collect();
    let inside = ahead.iter().zip(&actual).filter(|(p, a)| num(p, "lower") <= **a && **a <= num(p, "upper")).count();
    Some(Run {
        window,
        kind,
        shown: true,
        wape: actual.iter().zip(&pred).map(|(a, p)| (a - p).abs()).sum::<f64>() / real,
        naive,
        inside,
        points: hide,
        bias: actual.iter().zip(&pred).map(|(a, p)| p - a).sum::<f64>() / real,
        confianza: m["confianza"].as_str().unwrap_or("").to_string(),
        winner: m["competencia"]["ganador"].as_str().or(m["motor"].as_str()).unwrap_or("").to_string(),
    })
}

fn median(mut v: Vec<f64>) -> f64 {
    if v.is_empty() {
        return f64::NAN;
    }
    v.sort_by(f64::total_cmp);
    v[v.len() / 2]
}

fn report(title: &str, runs: &[&Run]) {
    let shown: Vec<&&Run> = runs.iter().filter(|r| r.shown).collect();
    if runs.is_empty() {
        return;
    }
    let pct = |a: usize, b: usize| a as f64 / b.max(1) as f64 * 100.0;
    let beats = shown.iter().filter(|r| r.wape < r.naive).count();
    let inside: usize = shown.iter().map(|r| r.inside).sum();
    let points: usize = shown.iter().map(|r| r.points).sum();
    eprintln!(
        "{title:<28} {:>4} series · predice {:>3.0} % · error {:>5.1} % (repetir lo último {:>5.1} %) · le gana en {:>3.0} % · dentro de la franja {:>3.0} % · se pasa {:>+5.1} %",
        runs.len(),
        pct(shown.len(), runs.len()),
        median(shown.iter().map(|r| r.wape * 100.0).collect()),
        median(shown.iter().map(|r| r.naive * 100.0).collect()),
        pct(beats, shown.len()),
        pct(inside, points),
        median(shown.iter().map(|r| r.bias * 100.0).collect()),
    );
}

#[test]
fn mio_predict_con_ventas_reales() {
    let Some(dir) = home("M5", "Downloads/m5").filter(|d| d.join("m5_series.csv").exists()) else {
        eprintln!("Sin las series de M5 (scripts/m5_series.py): esta prueba no corrió.");
        return;
    };
    let series = m5(&dir);
    let t = std::time::Instant::now();
    let jobs: Vec<(&Vec<(i64, f64)>, &'static str, usize)> = series.iter().flat_map(|(name, rows)| {
        // Los productos sueltos son `CA_3/FOODS_3_090`; lo demás, sumas de muchos.
        let kind = if name.matches('_').count() >= 3 { "producto" } else { "agregada" };
        (0..WINDOWS.len()).map(move |w| (rows, kind, w))
    }).collect();
    let runs: Vec<Run> = jobs.par_iter().filter_map(|&(rows, kind, w)| run(rows, kind, WINDOWS[w])).collect();
    eprintln!("\n{} predicciones en {:?}\n", runs.len(), t.elapsed());

    for (window, ..) in WINDOWS {
        for kind in ["agregada", "producto"] {
            report(&format!("{window} · {kind}"), &runs.iter().filter(|r| r.window == window && r.kind == kind).collect::<Vec<_>>());
        }
    }
    eprintln!();
    for c in ["Alta", "Media", "Precaución"] {
        report(&format!("confianza {c}"), &runs.iter().filter(|r| r.confianza == c).collect::<Vec<_>>());
    }
    eprintln!();
    let mut winners: BTreeMap<&str, Vec<&Run>> = BTreeMap::new();
    runs.iter().filter(|r| r.shown).for_each(|r| winners.entry(r.winner.as_str()).or_default().push(r));
    for (w, rs) in &winners {
        report(&format!("ganó {w}"), rs);
    }
    // Cuando no predice, ¿le habría ido bien a lo obvio? Si repetir lo último erraba poco, callarse fue perder.
    let quiet: Vec<f64> = runs.iter().filter(|r| !r.shown).map(|r| r.naive * 100.0).collect();
    eprintln!("\nno predijo en {} casos; ahí repetir lo último erraba {:.1} % (mediana)", quiet.len(), median(quiet));
    assert!(runs.iter().any(|r| r.shown), "tiene que predecir algo");
}
