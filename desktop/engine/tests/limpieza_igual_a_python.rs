//! La limpieza en Rust contra la de Python, con las fotos de `tests/golden/make_golden_cleaning.py`
//! (44 planillas: las del lector, CSV y Excel, y las de `golden/csv_limpieza/`). Se compara el resultado final y,
//! si difiere, se indica el primer paso donde la tabla se separa.

use mio_engine::clean::{clean_with, Data, Frame, Obj};
use mio_engine::progress::Progress;
use mio_engine::reader::{read_csv, read_excel};
use serde_json::Value;

mod common;
use common::iso;

fn values(d: &Data) -> Vec<Value> {
    let f = |x: f64| if x.is_nan() { Value::Null } else if x.is_infinite() { Value::from(if x > 0.0 { "inf" } else { "-inf" }) } else { Value::from(x) };
    match d {
        Data::Int(v) => v.iter().map(|x| Value::from(*x)).collect(),
        Data::Float(v) => v.iter().map(|x| f(*x)).collect(),
        Data::Bool(v) => v.iter().map(|x| Value::from(*x)).collect(),
        Data::Time(v) => v.iter().map(|x| x.map_or(Value::Null, |t| Value::from(iso(t)))).collect(),
        Data::Obj(v) => v.iter().map(|o| match o {
            Obj::Null => Value::Null,
            Obj::Str(s) => Value::from(s.clone()),
            Obj::Bool(b) => Value::from(*b),
            Obj::Num(x) => f(*x),
        }).collect(),
    }
}

/// Qué difiere entre la tabla de Rust y la foto de Python (None = igual).
fn diff(frame: &Frame, want: &Value) -> Option<String> {
    let idx: Vec<u64> = want["index"].as_array().unwrap().iter().map(|v| v.as_u64().unwrap()).collect();
    if frame.index.iter().map(|i| *i as u64).collect::<Vec<_>>() != idx {
        return Some(format!("filas: Rust {:?} vs Python {:?}", frame.index, idx));
    }
    let cols = want["columns"].as_array().unwrap();
    let names: Vec<&str> = cols.iter().map(|c| c["name"].as_str().unwrap()).collect();
    let got_names: Vec<&str> = frame.cols.iter().map(|c| c.name.as_str()).collect();
    if names != got_names {
        return Some(format!("columnas: Rust {got_names:?} vs Python {names:?}"));
    }
    for (c, w) in frame.cols.iter().zip(cols) {
        if c.dtype != w["dtype"].as_str().unwrap() {
            return Some(format!("{}: tipo Rust {} vs Python {}", c.name, c.dtype, w["dtype"]));
        }
        for (i, (a, b)) in values(&c.data).iter().zip(w["values"].as_array().unwrap()).enumerate() {
            let same = match (a.as_f64(), b.as_f64()) {
                (Some(x), Some(y)) => (x - y).abs() <= 1e-9 * y.abs().max(1.0),
                _ => a == b,
            };
            if !same {
                return Some(format!("{}[{i}]: Rust {a} vs Python {b}", c.name));
            }
        }
    }
    None
}

#[test]
fn la_limpieza_da_lo_mismo_que_en_python() {
    let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden");
    let doc: Value = serde_json::from_str(&std::fs::read_to_string(format!("{dir}/cleaning.json")).unwrap()).unwrap();
    let mut fails = Vec::new();
    let casos = doc["casos"].as_array().unwrap();
    for c in casos {
        let file = c["file"].as_str().unwrap();
        let path = format!("{dir}/{file}");
        let path = std::path::Path::new(&path);
        let table = if file.ends_with(".xlsx") { read_excel(path).unwrap() } else { read_csv(path, &Progress::NONE).unwrap().1 };
        let steps = &c["steps"];
        let mut first: Option<String> = None;
        let (frame, report) = clean_with(table, &mut |name, f| {
            if first.is_none() {
                if let Some(t) = steps.get(name).and_then(|s| s.get("tabla")) {
                    if let Some(d) = diff(f, t) {
                        first = Some(format!("paso {name}: {d}"));
                    }
                }
            }
        });
        if let Some(d) = first {
            fails.push(format!("{file} -> {d}"));
            continue;
        }
        let _ = frame;
        // Lo que informa la limpieza aparte de la tabla.
        if let Some(t) = steps.get("9_tipos") {
            for (col, kind) in t["tipos"].as_object().unwrap() {
                if report.type_of(col) != kind.as_str() {
                    fails.push(format!("{file} -> tipo de {col}: Rust {:?} vs Python {kind}", report.type_of(col)));
                }
            }
        }
        // Conteos y listas que informa la limpieza.
        let counts = |v: &Value| -> Vec<(String, u64)> {
            let mut c: Vec<(String, u64)> = v.as_object().map(|o| o.iter().map(|(k, n)| (k.clone(), n.as_u64().unwrap())).collect()).unwrap_or_default();
            c.sort(); // los conteos por columna, sin importar el orden
            c
        };
        let mine = |m: &std::collections::BTreeMap<String, usize>| -> Vec<(String, u64)> { m.iter().map(|(k, n)| (k.clone(), *n as u64)).collect() };
        let names = |v: &Value| -> Vec<String> { v.as_array().map(|a| a.iter().map(|x| x.as_str().unwrap().to_string()).collect()).unwrap_or_default() };
        let checks: Vec<(&str, bool)> = vec![
            ("vacíos disfrazados", steps.get("1_nulos").is_none_or(|s| counts(&s["nulos_detectados"]) == mine(&report.nulls_detected))),
            ("duplicados", steps.get("5_duplicados").is_none_or(|s| s["duplicados"].as_u64() == Some(report.duplicates_removed as u64))),
            ("montos", steps.get("6_montos").is_none_or(|s| names(&s["monetarias"]) == report.monetary)),
            ("números", steps.get("7_numeros").is_none_or(|s| names(&s["convertidas"]) == report.coerced)),
            ("fechas", steps.get("8_fechas").is_none_or(|s| names(&s["fechas"]) == report.dates_parsed)),
            ("fechas ambiguas", steps.get("8_fechas").is_none_or(|s| counts(&s["ambiguas"]) == mine(&report.ambiguous_dates))),
            ("atípicos", steps.get("10_atipicos").is_none_or(|s| counts(&s["atipicos"]) == mine(&report.outliers))),
            ("imputados", steps.get("11_imputacion").is_none_or(|s| counts(&s["imputados"]) == mine(&report.imputed))),
        ];
        for (what, ok) in checks {
            if !ok {
                fails.push(format!("{file} -> {what} distintos"));
            }
        }
        if let Some(l) = steps.get("3_locale") {
            if report.locale != l["locale"].as_str().unwrap() || report.dayfirst != l["dayfirst"].as_bool().unwrap() {
                fails.push(format!("{file} -> locale Rust {} {} vs Python {l}", report.locale, report.dayfirst));
            }
        }
    }
    assert!(fails.is_empty(), "{} de {} planillas difieren:\n{}", fails.len(), casos.len(), fails.join("\n"));
}
