//! Lo que se sale de lo normal mirando TODAS las filas (el modelo de `anomalies.rs` mira una muestra):
//! negativos y ceros sueltos en una columna que casi nunca los tiene, y valores muchas veces más grandes o
//! más chicos que lo normal, comparados con los de su grupo cuando hay uno que los explica (el precio de
//! un producto contra los demás precios de ese producto). Con planillas chicas no corre: pocas filas no
//! alcanzan para saber qué es normal.

use crate::anomalies::cell;
use crate::clean::{median, CATEGORICAL, NUMERIC};
use crate::explore::{labels, Labels};
use crate::sheet::{spread, Sheet};
use serde_json::{json, Map, Value};
use std::collections::BTreeSet;

/// Desde cuántas filas se busca.
const MIN_ROWS: usize = 500;
/// Un negativo o un cero es raro si no llega a esta parte de la columna.
const RARE: f64 = 0.02;
/// Veces de diferencia con lo normal a partir de las que un valor es raro, como mínimo…
const FAR: f64 = 20.0;
/// …o estas veces lo que varía la columna normalmente (en escala logarítmica).
const FAR_SPREADS: f64 = 8.0;
/// Para elegir el grupo: cuántas filas se miran y cuántas columnas se prueban.
const PEER_SAMPLE: usize = 20_000;
const PEER_CANDIDATES: usize = 30;
/// Un grupo sirve si tiene al menos estos valores, y si baja la variación a menos de esta parte.
const PEER_MIN: usize = 5;
const PEER_GAIN: f64 = 0.7;
/// Cuántas filas se miran para saber qué es típico de una columna.
const STATS_SAMPLE: usize = 50_000;
/// Cuántos ejemplos de filas van a la pantalla.
const MAX_RECORDS: usize = 150;

/// Un problema encontrado: en qué columna, qué es, en qué filas y cómo se dice.
pub struct Problem {
    pub column: String,
    pub kind: &'static str,
    pub rows: Vec<usize>,
    pub text: String,
}

/// La variación típica de valores positivos alrededor de su mediana, en escala logarítmica.
fn spread_of(logs: &[f64]) -> (f64, f64) {
    let mid = median(logs.to_vec());
    (mid, median(logs.iter().map(|x| (x - mid).abs()).collect()))
}

/// El grupo que mejor explica una columna: el que más baja su variación, si la baja de verdad.
fn best_peers(s: &Sheet, values: &[f64], own: &str, groups: &[(String, Labels)]) -> Option<usize> {
    let rows = spread((0..values.len()).filter(|&i| values[i] > 0.0 && !s.report.was_filled(own, i)).collect(), PEER_SAMPLE);
    let logs: Vec<f64> = rows.iter().map(|&i| values[i].ln()).collect();
    let (_, overall) = spread_of(&logs);
    if overall == 0.0 {
        return None;
    }
    let mut best: Option<(f64, usize)> = None;
    for (at, (name, l)) in groups.iter().enumerate().filter(|(_, (n, _))| n != own) {
        let mut by_group: Vec<Vec<f64>> = vec![Vec::new(); l.names.len()];
        for (&i, &x) in rows.iter().zip(&logs) {
            if !s.report.was_filled(name, i) {
                by_group[l.of_row[i] as usize].push(x);
            }
        }
        let mut devs = Vec::with_capacity(rows.len());
        let mut grouped = 0;
        for g in by_group.iter().filter(|g| g.len() >= PEER_MIN) {
            let mid = median(g.clone());
            grouped += g.len();
            devs.extend(g.iter().map(|x| (x - mid).abs()));
        }
        // Tienen que caer en un grupo real la mayoría de las filas (y no ser uno solo).
        if grouped * 2 < rows.len() || l.names.len() < 2 {
            continue;
        }
        let within = median(devs);
        if best.as_ref().map_or(true, |(b, _)| within < *b) {
            best = Some((within, at));
        }
    }
    best.filter(|(within, _)| *within < PEER_GAIN * overall).map(|(_, at)| at)
}

/// Las filas con valores muchas veces lejos de su grupo (o de la columna, si no hay grupo).
fn far_rows(s: &Sheet, values: &[f64], own: &str, all_groups: &[(String, Labels)]) -> (Vec<usize>, Option<String>) {
    // Lo que completó la limpieza no se compara ni sirve de comparación.
    let positive = |i: usize| values[i] > 0.0 && !s.report.was_filled(own, i);
    // Lo típico (la mediana y cuánto se aparta) sale de una muestra fija: con un millón de filas, ordenarlas
    // todas por cada columna no cambia el resultado y tarda mucho.
    let sample = spread((0..values.len()).filter(|&i| positive(i)).collect(), STATS_SAMPLE);
    if sample.is_empty() {
        return (Vec::new(), None);
    }
    let (global_mid, _) = spread_of(&sample.iter().map(|&i| values[i].ln()).collect::<Vec<_>>());
    let chosen = best_peers(s, values, own, all_groups).map(|at| &all_groups[at]);
    let peers = chosen.map(|(name, _)| name.clone());
    let groups = chosen.map(|(_, l)| l);
    let peer_filled = |i: usize| peers.as_ref().is_some_and(|p| s.report.was_filled(p, i));
    let mid_of_group: Vec<f64> = groups.map_or(Vec::new(), |l| {
        let mut by: Vec<Vec<f64>> = vec![Vec::new(); l.names.len()];
        for i in (0..values.len()).filter(|&i| positive(i) && !peer_filled(i)) {
            by[l.of_row[i] as usize].push(values[i].ln());
        }
        by.into_iter().map(|g| if g.len() >= PEER_MIN { median(g) } else { global_mid }).collect()
    });
    let mid = |i: usize| groups.map_or(global_mid, |l| mid_of_group[l.of_row[i] as usize]);
    let devs: Vec<f64> = sample.iter().copied().filter(|&i| !peer_filled(i)).map(|i| (values[i].ln() - mid(i)).abs()).collect();
    let limit = FAR.ln().max(FAR_SPREADS * median(devs));
    let rows = (0..values.len()).filter(|&i| positive(i) && !peer_filled(i) && (values[i].ln() - mid(i)).abs() >= limit).collect();
    (rows, peers)
}

/// Lo que se sale de lo normal, de la columna con más filas raras a la que menos.
pub fn find(s: &Sheet) -> Vec<Problem> {
    let n = s.frame.rows();
    if n < MIN_ROWS {
        return Vec::new();
    }
    let count = |k: usize| k.to_string();
    let mut out = Vec::new();
    // Las columnas candidatas a grupo, una sola vez: se prueban contra cada número.
    let groups: Vec<(String, Labels)> = s.profile.of_kind(CATEGORICAL).into_iter().take(PEER_CANDIDATES).filter_map(|n| {
        let l = labels(s.frame.col(&n)?);
        Some((n, l))
    }).collect();
    for name in s.profile.of_kind(NUMERIC) {
        let Some(values) = s.frame.col(&name).and_then(|c| c.numbers()).map(|v| v.into_owned()) else { continue };
        let negative: Vec<usize> = (0..n).filter(|&i| values[i] < 0.0).collect();
        if !negative.is_empty() && (negative.len() as f64) < RARE * n as f64 {
            out.push(Problem { text: format!("«{name}» tiene {} valores negativos, y casi nunca los tiene.", count(negative.len())), column: name.clone(), kind: "negativo", rows: negative });
        }
        let zero: Vec<usize> = (0..n).filter(|&i| values[i] == 0.0).collect();
        if !zero.is_empty() && (zero.len() as f64) < RARE * n as f64 {
            out.push(Problem { text: format!("«{name}» está en cero en {} filas, y casi nunca lo está.", count(zero.len())), column: name.clone(), kind: "cero", rows: zero });
        }
        let (far, peers) = far_rows(s, &values, &name, &groups);
        if !far.is_empty() && (far.len() as f64) < RARE * n as f64 {
            let against = peers.map_or_else(|| "el resto de la columna".to_string(), |p| format!("los demás de su «{p}»"));
            out.push(Problem { text: format!("«{name}» tiene {} valores a más de {FAR:.0} veces de lo normal, comparados con {against}.", count(far.len())), column: name.clone(), kind: "lejos", rows: far });
        }
    }
    out.sort_by(|a, b| b.rows.len().cmp(&a.rows.len()));
    out
}

/// Una fila para la tabla de valores raros, con el mismo formato que las del modelo.
fn record(s: &Sheet, table: &[String], row: usize, problem: &Problem) -> Value {
    let mut m: Map<String, Value> = table.iter().filter_map(|c| Some((c.clone(), cell(s.frame.col(c)?, row)))).collect();
    m.insert("_is_anomaly".into(), json!(true));
    m.insert("_anomaly_features".into(), json!([problem.column]));
    m.insert("_top_anomaly_feature".into(), json!(problem.column));
    m.insert("_anomaly_reason".into(), json!(problem.text));
    m.insert("_anomaly_details".into(), json!({}));
    Value::Object(m)
}

/// Suma lo encontrado en toda la planilla a lo que encontró el modelo: las cuentas pasan a ser de todas las
/// filas (sin contar dos veces una fila) y sus ejemplos van primero, de a uno por problema.
pub fn merge(s: &Sheet, odd: &mut Value, problems: &[Problem]) {
    let model_rows: Vec<usize> = odd["_rows"].as_array().map_or(Vec::new(), |a| a.iter().filter_map(|x| x.as_u64().map(|x| x as usize)).collect());
    if let Some(o) = odd.as_object_mut() {
        o.remove("_rows");
    }
    if problems.is_empty() {
        return;
    }
    let mut every: BTreeSet<usize> = model_rows.into_iter().collect();
    problems.iter().for_each(|p| every.extend(p.rows.iter().copied()));
    let table: Vec<String> = s.columns().map(|c| c.name.clone()).collect();
    let mut records: Vec<Value> = Vec::new();
    let mut seen = BTreeSet::new();
    for turn in 0.. {
        let mut any = false;
        for p in problems {
            if let Some(&row) = p.rows.get(turn) {
                any = true;
                if records.len() < MAX_RECORDS && seen.insert(row) {
                    records.push(record(s, &table, row, p));
                }
            }
        }
        if !any || records.len() >= MAX_RECORDS {
            break;
        }
    }
    let m = &mut odd["metrics"];
    if !m.is_object() {
        *m = json!({});
    }
    if let Some(before) = m["anomaly_records"].as_array() {
        records.extend(before.iter().cloned());
    }
    let mut details: Vec<Value> = problems.iter().map(|p| json!(p.text)).collect();
    if let Some(before) = m["anomalias_detalle"].as_array() {
        details.extend(before.iter().cloned());
    }
    m["n_anomalias"] = json!(every.len());
    m["pct_anomalias"] = json!((every.len() as f64 / s.frame.rows() as f64 * 10_000.0).round() / 100.0);
    m["anomaly_records"] = json!(records);
    m["anomalias_detalle"] = json!(details);
    m["table_columns"] = json!(table);
    m["problemas"] = json!(problems.iter().map(|p| json!({ "columna": p.column, "tipo": p.kind, "filas": p.rows.len(), "texto": p.text })).collect::<Vec<_>>());
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Progress;

    /// Precios parecidos por producto (un producto caro y uno barato), con un precio ×100, un cero y una
    /// cantidad negativa: los encuentra sin marcar los precios altos que son normales de su producto.
    #[test]
    fn encuentra_lo_raro_comparando_con_su_grupo() {
        let dir = std::env::temp_dir().join("mio_problemas_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("v.csv");
        let mut csv = String::from("pedido,producto,precio,cantidad\n");
        for i in 0..1000 {
            let (p, base) = if i % 2 == 0 { ("Barato", 100.0) } else { ("Caro", 9000.0) };
            let price = match i {
                500 => base * 100.0,
                600 => 0.0,
                _ => base * (1.0 + (i % 7) as f64 * 0.03),
            };
            csv.push_str(&format!("P{i},{p},{price},{}\n", if i == 700 { -3 } else { 1 + i % 40 }));
        }
        std::fs::write(&path, csv).unwrap();
        let s = Sheet::open(&path, None, &Progress::NONE).unwrap();
        let p = find(&s);
        let of = |column: &str, kind: &str| p.iter().find(|x| x.column == column && x.kind == kind).map(|x| x.rows.clone());
        assert_eq!(of("precio", "lejos").unwrap(), vec![500], "{:?}", p.iter().map(|x| &x.text).collect::<Vec<_>>());
        assert_eq!(of("precio", "cero").unwrap(), vec![600]);
        assert_eq!(of("cantidad", "negativo").unwrap(), vec![700]);
        assert!(p.iter().find(|x| x.kind == "lejos").unwrap().text.contains("producto"));

        let a = s.analysis(None, &Progress::NONE).unwrap();
        let m = &a["anomalies"]["metrics"];
        assert!(m["n_anomalias"].as_u64().unwrap() >= 3);
        assert!(m["anomaly_records"][0]["_anomaly_reason"].is_string());
        assert!(a["anomalies"]["_rows"].is_null(), "lo interno no llega a la pantalla");
    }
}
