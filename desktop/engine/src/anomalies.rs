//! Los valores raros, como `models/anomaly_detector.py`: un Isolation Forest sobre las columnas
//! numéricas estandarizadas marca los registros más fáciles de aislar (entre 8 y 40, según el
//! tamaño), y de cada uno se dice qué columna se sale más de lo normal y cuánto.
//!
//! El Isolation Forest es el algoritmo de scikit-learn (40 árboles, hasta 256 filas por árbol, una
//! columna y un corte al azar en cada paso, puntaje por la longitud media del camino), con una semilla
//! fija: la misma planilla da siempre los mismos valores raros. No da exactamente los mismos que la
//! web porque el azar de scikit-learn es otro; se compara la cantidad y la coincidencia. Donde Python
//! toma una muestra al azar para el gráfico, acá se toma repartida parejo.

use crate::charts::{chart, Layout};
use crate::clean::{filled_numbers, Col, Data, Frame, Obj};
use crate::dates::timestamp;
use crate::pynum::{mean, py_round, std};
use crate::sheet::spread;
use rand::seq::index::sample;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde_json::{json, Map, Value};

const TREES: usize = 40;
const TITLE: &str = "Detección de Anomalías";
const SEED: u64 = 42;

/// Longitud media de un camino sin éxito en un árbol binario de `n` elementos (`_average_path_length`).
fn c(n: usize) -> f64 {
    match n {
        0 | 1 => 0.0,
        2 => 1.0,
        _ => 2.0 * ((n as f64 - 1.0).ln() + std::f64::consts::EULER_GAMMA) - 2.0 * (n as f64 - 1.0) / n as f64,
    }
}

enum Node {
    Leaf { size: usize },
    Split { feature: usize, threshold: f64, left: Box<Node>, right: Box<Node> },
}

/// Un árbol de aislamiento: corta por una columna al azar (de las que no son constantes en ese
/// grupo) en un punto al azar entre su mínimo y su máximo, hasta aislar o llegar a la profundidad.
fn grow(x: &[Vec<f64>], rows: &[usize], depth: usize, max_depth: usize, rng: &mut ChaCha8Rng) -> Node {
    if depth >= max_depth || rows.len() <= 1 {
        return Node::Leaf { size: rows.len() };
    }
    let k = x[0].len();
    let mut features: Vec<usize> = (0..k).collect();
    while !features.is_empty() {
        let feature = features.swap_remove(rng.gen_range(0..features.len()));
        let (lo, hi) = rows.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), &r| (a.min(x[r][feature]), b.max(x[r][feature])));
        if hi > lo {
            let threshold = rng.gen_range(lo..hi);
            let (l, r): (Vec<usize>, Vec<usize>) = rows.iter().partition(|&&i| x[i][feature] <= threshold);
            return Node::Split {
                feature,
                threshold,
                left: Box::new(grow(x, &l, depth + 1, max_depth, rng)),
                right: Box::new(grow(x, &r, depth + 1, max_depth, rng)),
            };
        }
    }
    Node::Leaf { size: rows.len() }
}

fn path(node: &Node, v: &[f64], depth: usize) -> f64 {
    match node {
        Node::Leaf { size } => depth as f64 + c(*size),
        Node::Split { feature, threshold, left, right } => path(if v[*feature] <= *threshold { left } else { right }, v, depth + 1),
    }
}

/// Qué filas son raras (`fit_predict == -1`): el puntaje de cada una y el corte en el percentil
/// `contamination` de los puntajes.
fn isolation_forest(x: &[Vec<f64>], contamination: f64) -> Vec<bool> {
    let n = x.len();
    let size = n.min(256);
    let max_depth = (size as f64).log2().ceil() as usize;
    let mut rng = ChaCha8Rng::seed_from_u64(SEED);
    let trees: Vec<Node> = (0..TREES).map(|_| grow(x, &sample(&mut rng, n, size).into_vec(), 0, max_depth, &mut rng)).collect();
    let norm = c(size);
    let scores: Vec<f64> = x.iter().map(|v| -(2f64.powf(-(trees.iter().map(|t| path(t, v, 0)).sum::<f64>() / TREES as f64) / norm))).collect();
    let mut sorted = scores.clone();
    let offset = crate::clean::quantile(&mut sorted, contamination);
    scores.iter().map(|s| s < &offset).collect()
}

/// Un valor de la planilla como lo escribe el motor de la web en la tabla de registros (`_safe_val`).
pub(crate) fn cell(c: &Col, i: usize) -> Value {
    let num = |x: f64| if x.is_nan() { Value::Null } else { json!(x) };
    match &c.data {
        Data::Int(v) => json!(v[i]),
        Data::Float(v) => num(v[i]),
        Data::Bool(v) => json!(v[i]),
        Data::Time(v) => v[i].map_or(Value::Null, |ns| json!(timestamp(ns))),
        Data::Obj(d) => match d.get(i) {
            Obj::Null => Value::Null,
            Obj::Str(s) => json!(s),
            Obj::Bool(b) => json!(b),
            Obj::Num(x) => num(*x),
        },
    }
}

/// `f"{round(x, 2)}"` de Python.
fn round2(x: f64) -> String {
    crate::clean::obj_str(&Obj::Num(py_round(x, 2)))
}

fn failed(msg: &str) -> Value {
    json!({ "chart_data": null, "metrics": { "error": msg } })
}

/// `run_anomaly_detection` sobre las filas `rows` de la planilla: el gráfico y las métricas.
pub fn anomalies(f: &Frame, rows: &[usize], numeric: &[String], target: Option<&str>, date: Option<&str>, types: &[(String, &str)]) -> Value {
    if numeric.is_empty() {
        return failed("No hay columnas numéricas para analizar.");
    }
    let n = rows.len();
    if n < 10 {
        return failed("Se requieren al menos 10 registros para detectar anomalías con precisión.");
    }
    // Columnas con vacíos completados con la mediana; solo las que varían; estandarizadas (z).
    let cols: Vec<(String, Vec<f64>)> = numeric.iter()
        .filter_map(|name| filled_numbers(f, name, rows).map(|v| (name.clone(), v)))
        .filter(|(_, v)| std(v) > 0.0)
        .collect();
    if cols.is_empty() {
        return failed("Las columnas numéricas no tienen varianza para analizar anomalías.");
    }
    let means: Vec<f64> = cols.iter().map(|(_, v)| mean(v)).collect();
    let sds: Vec<f64> = cols.iter().zip(&means).map(|((_, v), m)| (v.iter().map(|x| (x - m).powi(2)).sum::<f64>() / n as f64).sqrt()).collect();
    let z: Vec<Vec<f64>> = (0..n).map(|r| cols.iter().enumerate().map(|(j, (_, v))| (v[r] - means[j]) / sds[j]).collect()).collect();
    let target_anomalies = 40.min(8.max(n / 200));
    let contamination = (target_anomalies as f64 / n as f64).clamp(0.001, 0.015);
    let odd = isolation_forest(&z, contamination);
    let odd_rows: Vec<usize> = (0..n).filter(|&r| odd[r]).collect();
    let normal_rows: Vec<usize> = (0..n).filter(|&r| !odd[r]).collect();

    // El gráfico: sobre la fecha si hay, si no las dos primeras numéricas.
    let col = |name: &str| f.col(name).expect("columna de la planilla");
    let chart = match (target, date) {
        (Some(t), Some(d)) => {
            let ok = |r: &usize| !cell(col(d), rows[*r]).is_null() && !cell(col(t), rows[*r]).is_null();
            let mut plot: Vec<usize> = spread(normal_rows.iter().copied().filter(ok).collect(), 800);
            plot.extend(spread(odd_rows.iter().copied().filter(ok).collect(), 50));
            let time = |r: &usize| match &col(d).data { Data::Time(v) => v[rows[*r]].unwrap_or(i64::MIN), _ => i64::MIN };
            plot.sort_by_key(time);
            let source: Vec<Value> = plot.iter().map(|&r| json!({ d: cell(col(d), rows[r]), t: cell(col(t), rows[r]), "_anomaly": if odd[r] { -1 } else { 1 } })).collect();
            Some(chart("anom_time", TITLE, &format!("Valores atípicos detectados sobre la serie temporal de {t}"), t, Layout::new("Scatter", "time", "value"), &[d, t, "_anomaly"], source))
        }
        _ if numeric.len() >= 2 => {
            let (xc, yc) = (&numeric[0], &numeric[1]);
            let mut plot = spread(normal_rows.clone(), 1000);
            plot.extend(spread(odd_rows.clone(), 50));
            let source: Vec<Value> = plot.iter().map(|&r| json!({ xc.as_str(): cell(col(xc), rows[r]), yc.as_str(): cell(col(yc), rows[r]), "_anomaly": if odd[r] { -1 } else { 1 } })).collect();
            Some(chart("anom_scatter", TITLE, &format!("Dispersión {xc} vs {yc}"), yc, Layout::new("Scatter", "value", "value"), &[xc, yc, "_anomaly"], source))
        }
        _ => None,
    };

    // La columna que más se sale en cada registro raro (|z| de mayor a menor).
    let ranked = |r: usize| {
        let mut order: Vec<usize> = (0..cols.len()).collect();
        order.sort_by(|a, b| z[r][*b].abs().total_cmp(&z[r][*a].abs()));
        order
    };
    let side = |v: f64| if v > 0.0 { "alto" } else { "bajo" };
    let value_of = |name: &str, r: usize| match cell(col(name), rows[r]) {
        Value::Number(x) => round2(x.as_f64().unwrap()),
        other => other.as_str().map_or(other.to_string(), str::to_string),
    };
    let descriptions: Vec<String> = odd_rows.iter().take(10).map(|&r| {
        let mut parts = Vec::new();
        if let Some(Value::String(s)) = date.map(|d| cell(col(d), rows[r])) {
            parts.push(s.chars().take(10).collect::<String>());
        }
        let top = ranked(r)[0];
        let zt = z[r][top];
        parts.push(format!("Atípico en {}: {} ({:.1}σ {})", cols[top].0, value_of(&cols[top].0, r), zt.abs(), side(zt)));
        parts.join(" | ")
    }).collect();

    let table: Vec<String> = f.cols.iter().filter(|c| !c.name.starts_with('_')).map(|c| c.name.clone()).collect();
    let record = |r: usize, is_odd: bool| -> Value {
        let mut m: Map<String, Value> = table.iter().map(|c| (c.clone(), cell(col(c), rows[r]))).collect();
        m.insert("_is_anomaly".into(), json!(is_odd));
        if is_odd {
            let order = ranked(r);
            let top = order[0];
            let mut sig: Vec<usize> = order.iter().copied().filter(|&j| z[r][j].abs() >= 1.8).take(3).collect();
            if sig.is_empty() {
                sig = vec![top];
            }
            let details: Map<String, Value> = sig.iter().map(|&j| (cols[j].0.clone(), json!({
                "z_score": py_round(z[r][j], 2), "direction": side(z[r][j]), "sigma": py_round(z[r][j].abs(), 1), "mean": py_round(means[j], 2),
            }))).collect();
            m.insert("_anomaly_features".into(), json!(sig.iter().map(|&j| &cols[j].0).collect::<Vec<_>>()));
            m.insert("_top_anomaly_feature".into(), json!(cols[top].0));
            m.insert("_anomaly_reason".into(), json!(format!("{}: {}σ ({})", cols[top].0, crate::clean::obj_str(&Obj::Num(py_round(z[r][top].abs(), 1))), side(z[r][top]))));
            m.insert("_anomaly_details".into(), Value::Object(details));
        } else {
            m.insert("_anomaly_features".into(), json!([]));
            m.insert("_top_anomaly_feature".into(), Value::Null);
            m.insert("_anomaly_reason".into(), Value::Null);
            m.insert("_anomaly_details".into(), json!({}));
        }
        Value::Object(m)
    };
    let roles: Map<String, Value> = table.iter().map(|c| (c.clone(), json!(types.iter().find(|(n, _)| n == c).map_or("categórica", |(_, t)| *t)))).collect();
    json!({
        "chart_data": chart,
        "metrics": {
            "n_anomalias": odd_rows.len(),
            "pct_anomalias": py_round(odd_rows.len() as f64 / n as f64 * 100.0, 2),
            "anomalias_detalle": descriptions,
            "anomaly_records": odd_rows.iter().take(150).map(|&r| record(r, true)).collect::<Vec<_>>(),
            "sample_records": normal_rows.iter().take(150).map(|&r| record(r, false)).collect::<Vec<_>>(),
            "table_columns": table,
            "column_roles": roles,
        },
    })
}
