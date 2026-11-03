//! Los valores raros que se ven combinando columnas: un Isolation Forest marca las filas fáciles de aislar,
//! y de cada una se dice qué columna se sale más de lo normal y cuántas veces.
//!
//! El Isolation Forest es el algoritmo de scikit-learn (100 árboles, hasta 256 filas por árbol, una columna
//! y un corte al azar en cada paso, puntaje por la longitud media del camino), con una semilla fija: la misma
//! planilla da siempre los mismos valores raros. A propósito distinto de la web, que marca siempre una
//! cantidad fija de filas (entre 8 y 40) aunque la planilla esté limpia:
//! - las columnas van en escala logarítmica (con signo) y centradas en la mediana con el desvío mediano: en
//!   ventas, unos pocos clientes o productos muy grandes son normales, y un promedio y un desvío se deforman
//!   con los mismos valores raros que se buscan;
//! - cada valor se compara con su grupo cuando hay uno que explica la columna (`problems::Found::peers`): el
//!   precio de un producto caro es normal para ese producto; y lo que sale de una cuenta (el subtotal) no se
//!   mira, porque un error ahí ya se ve en la cuenta que no cierra;
//! - una fila es rara solo si es fácil de aislar y además se sale de verdad en alguna columna (puntaje z
//!   robusto de al menos 3,5, el corte de Iglewicz y Hoaglin). Si nada cumple, no hay valores raros.
//!
//! Donde Python toma una muestra al azar para el gráfico, acá se toma repartida parejo.

use crate::charts::{chart, Layout};
use crate::clean::{filled_numbers, Col, Data, Frame, Obj};
use crate::dates::timestamp;
use crate::pynum::{py_round, std};
use crate::sheet::spread;
use rand::seq::index::sample;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use serde_json::{json, Map, Value};

const TREES: usize = 100;
/// Puntaje de aislamiento desde el que una fila es candidata (0,5 es una fila cualquiera; cerca de 1, una que
/// se aísla enseguida).
const SCORE: f64 = 0.62;
/// …y tiene que salirse en alguna columna por al menos esto (puntaje z robusto).
const ROBUST_Z: f64 = 3.5;
/// Cuántas filas raras se marcan como mucho (las más fáciles de aislar).
const MAX_ODD: usize = 40;
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

/// El puntaje de aislamiento de cada fila (`score_samples` cambiado de signo: más alto, más rara).
fn isolation_forest(x: &[Vec<f64>]) -> Vec<f64> {
    let n = x.len();
    let size = n.min(256);
    let max_depth = (size as f64).log2().ceil() as usize;
    let mut rng = ChaCha8Rng::seed_from_u64(SEED);
    let trees: Vec<Node> = (0..TREES).map(|_| grow(x, &sample(&mut rng, n, size).into_vec(), 0, max_depth, &mut rng)).collect();
    let norm = c(size);
    x.iter().map(|v| 2f64.powf(-(trees.iter().map(|t| path(t, v, 0)).sum::<f64>() / TREES as f64) / norm)).collect()
}

/// Escala logarítmica con signo: un valor 10 veces más grande queda a la misma distancia sea chico o grande.
fn signed_log(x: f64) -> f64 {
    x.signum() * x.abs().ln_1p()
}

/// Centro y escala robustos de una columna: la mediana y el desvío mediano (×1,4826, comparable a un desvío
/// estándar); si más de la mitad de los valores son iguales, el desvío medio. `None` si no varía.
fn robust(v: &[f64]) -> Option<(f64, f64)> {
    let mid = crate::clean::median(v.to_vec());
    let mad = 1.4826 * crate::clean::median(v.iter().map(|x| (x - mid).abs()).collect());
    let scale = if mad > 0.0 { mad } else { 1.2533 * v.iter().map(|x| (x - mid).abs()).sum::<f64>() / v.len() as f64 };
    (scale > 0.0).then_some((mid, scale))
}

/// Una columna lista para el modelo: sus valores, cuánto se aparta cada uno (en desvíos robustos), lo normal
/// para cada fila (la mediana de su grupo, o de la columna) y contra qué grupo se comparó.
struct Column {
    name: String,
    values: Vec<f64>,
    z: Vec<f64>,
    normal: Vec<f64>,
    peer: Option<String>,
}

/// Grupos de menos filas que esto se comparan contra toda la columna.
const PEER_MIN: usize = 5;

fn column(f: &Frame, rows: &[usize], name: String, values: Vec<f64>, peers: &[(String, String)]) -> Option<Column> {
    let logs: Vec<f64> = values.iter().map(|x| signed_log(*x)).collect();
    let whole = crate::clean::median(values.clone());
    let peer = peers.iter().find(|(c, _)| *c == name).and_then(|(_, p)| Some((p.clone(), crate::explore::labels(f.col(p)?))));
    let (shift, normal): (Vec<f64>, Vec<f64>) = match &peer {
        Some((_, l)) => {
            let mut by: Vec<Vec<usize>> = vec![Vec::new(); l.names.len()];
            (0..rows.len()).for_each(|r| by[l.of_row[rows[r]] as usize].push(r));
            // Un grupo con muy pocos valores no dice qué es normal para él: esas filas quedan en el centro.
            let mids: Vec<(f64, f64)> = by.iter().map(|g| if g.len() >= PEER_MIN {
                (crate::clean::median(g.iter().map(|&r| logs[r]).collect()), crate::clean::median(g.iter().map(|&r| values[r]).collect()))
            } else {
                (f64::NAN, whole)
            }).collect();
            (0..rows.len()).map(|r| mids[l.of_row[rows[r]] as usize]).unzip()
        }
        None => (vec![0.0; rows.len()], vec![whole; rows.len()]),
    };
    let away: Vec<f64> = logs.iter().zip(&shift).map(|(x, s)| x - s).collect();
    let (mid, scale) = robust(&away.iter().copied().filter(|x| !x.is_nan()).collect::<Vec<_>>())?;
    let z = away.iter().map(|x| if x.is_nan() { 0.0 } else { (x - mid) / scale }).collect();
    Some(Column { name, values, z, normal, peer: peer.map(|(p, _)| p) })
}

/// Cuántas veces lo normal es un valor: "12 veces lo normal" o "la décima parte de lo normal".
fn times(value: f64, normal: f64) -> String {
    let r = value / normal;
    if r >= 1.0 { format!("{} veces lo normal", round2(r)) } else { format!("1/{} de lo normal", round2(1.0 / r)) }
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

/// Un valor de la planilla como texto, como lo muestran los gráficos (un 7.0 es "7"); para comparar y
/// contar valores ("Ver las filas", los más comunes de la vista general).
pub fn cell_text(c: &Col, i: usize) -> String {
    match cell(c, i) {
        Value::String(s) => s,
        Value::Number(n) => n.as_f64().filter(|x| x.fract() == 0.0 && x.abs() < 1e15).map_or_else(|| n.to_string(), |x| format!("{x:.0}")),
        v => v.to_string(),
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
pub fn anomalies(f: &Frame, rows: &[usize], numeric: &[String], target: Option<&str>, date: Option<&str>, types: &[(String, &str)], found: &crate::problems::Found) -> Value {
    if numeric.is_empty() {
        return failed("No hay columnas numéricas para analizar.");
    }
    let n = rows.len();
    if n < 10 {
        return failed("Se requieren al menos 10 registros para detectar anomalías con precisión.");
    }
    // Columnas con vacíos completados con la mediana; solo las que varían; en escala logarítmica, menos lo
    // normal de su grupo si hay uno, y en desvíos robustos.
    let cols: Vec<Column> = numeric.iter()
        .filter(|name| !found.derived.contains(name))
        .filter_map(|name| filled_numbers(f, name, rows).map(|v| (name.clone(), v)))
        .filter(|(_, v)| std(v) > 0.0)
        .filter_map(|(name, v)| column(f, rows, name, v, &found.peers))
        .collect();
    if cols.is_empty() {
        return failed("Las columnas numéricas no tienen varianza para analizar anomalías.");
    }
    let z: Vec<Vec<f64>> = (0..n).map(|r| cols.iter().map(|c| c.z[r]).collect()).collect();
    let scores = isolation_forest(&z);
    let mut candidates: Vec<usize> = (0..n).filter(|&r| scores[r] >= SCORE && z[r].iter().any(|x| x.abs() >= ROBUST_Z)).collect();
    candidates.sort_by(|a, b| scores[*b].total_cmp(&scores[*a]).then(a.cmp(b)));
    candidates.truncate(MAX_ODD);
    candidates.sort_unstable();
    let mut odd = vec![false; n];
    candidates.iter().for_each(|&r| odd[r] = true);
    let odd_rows = candidates;
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
    // Cuánto se aparta: en veces si el valor y lo normal son positivos; si no, en desvíos.
    let how_far = |j: usize, r: usize| {
        let c = &cols[j];
        let (v, normal) = (c.values[r], c.normal[r]);
        let of = c.peer.as_ref().map_or(String::new(), |p| format!(" de su «{p}»"));
        if v > 0.0 && normal > 0.0 { format!("{}{of}", times(v, normal)) } else { format!("{}σ {}", crate::clean::obj_str(&Obj::Num(py_round(z[r][j].abs(), 1))), side(z[r][j])) }
    };
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
        parts.push(format!("Atípico en {}: {} ({})", cols[top].name, value_of(&cols[top].name, r), how_far(top, r)));
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
            let details: Map<String, Value> = sig.iter().map(|&j| (cols[j].name.clone(), json!({
                "z_score": py_round(z[r][j], 2), "direction": side(z[r][j]), "sigma": py_round(z[r][j].abs(), 1), "mediana": py_round(cols[j].normal[r], 2),
            }))).collect();
            m.insert("_anomaly_features".into(), json!(sig.iter().map(|&j| &cols[j].name).collect::<Vec<_>>()));
            m.insert("_top_anomaly_feature".into(), json!(cols[top].name));
            m.insert("_anomaly_reason".into(), json!(format!("{}: {}", cols[top].name, how_far(top, r))));
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
        // Las filas de la planilla, para que `problems::merge` no cuente dos veces.
        "_rows": odd_rows.iter().map(|&r| rows[r]).collect::<Vec<_>>(),
    })
}
