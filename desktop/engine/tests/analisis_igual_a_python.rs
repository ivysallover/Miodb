//! El análisis en Rust (`Sheet::analysis`: perfil, qué se analiza, números clave, gráficos y lo que
//! informa la limpieza) contra el del motor de Python, con las planillas de
//! `tests/golden/make_golden_analysis.py`. El pronóstico se compara en `pronostico_igual_a_python.rs`.
//!
//! Se dejan afuera las dos partes que en Python salen al azar: los puntos del gráfico de relación
//! cuando hay más de 300 (y la recta, que sale de esos puntos) y los valores raros de una caja cuando
//! hay más de 25.

use mio_engine::sheet::Sheet;
use serde_json::Value;

/// La primera diferencia entre `got` y `want` (None = iguales), con el camino hasta ella.
fn diff(got: &Value, want: &Value, path: &str) -> Option<String> {
    match (got, want) {
        (Value::Object(g), Value::Object(w)) => {
            let mut keys: Vec<&String> = g.keys().chain(w.keys()).collect();
            keys.sort();
            keys.dedup();
            keys.into_iter().find_map(|k| diff(g.get(k).unwrap_or(&Value::Null), w.get(k).unwrap_or(&Value::Null), &format!("{path}.{k}")))
        }
        (Value::Array(g), Value::Array(w)) => {
            if g.len() != w.len() {
                return Some(format!("{path}: {} elementos en Rust, {} en Python", g.len(), w.len()));
            }
            g.iter().zip(w).enumerate().find_map(|(i, (a, b))| diff(a, b, &format!("{path}[{i}]")))
        }
        (a, b) => match (a.as_f64(), b.as_f64()) {
            (Some(x), Some(y)) if (x - y).abs() <= 1e-9 * y.abs().max(1.0) => None,
            _ if a == b => None,
            _ => Some(format!("{path}: Rust {a} vs Python {b}")),
        },
    }
}

/// Saca de los dos lados lo que Python elige al azar.
fn without_random(chart: &mut Value, other: &mut Value) {
    if chart["chart_id"] == "scatter_corr" && other["dataset"]["source"].as_array().map_or(false, |s| s.len() == 300) {
        for c in [&mut *chart, &mut *other] {
            c["dataset"]["source"] = Value::Null;
            for k in ["slope", "intercept", "min_x", "max_x"] {
                c["layout_directives"]["trendline"][k] = Value::Null;
            }
        }
    }
    if chart["layout_directives"]["chart_type"] == "BoxPlot" {
        let n = chart["dataset"]["source"].as_array().map_or(0, |s| s.len());
        for i in 0..n {
            if other["dataset"]["source"][i]["outliers"].as_array().map_or(false, |o| o.len() == 25) {
                chart["dataset"]["source"][i]["outliers"] = Value::Null;
                other["dataset"]["source"][i]["outliers"] = Value::Null;
            }
        }
    }
}

#[test]
fn el_analisis_da_lo_mismo_que_en_python() {
    let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden");
    let doc: Value = serde_json::from_str(&std::fs::read_to_string(format!("{dir}/analysis.json")).unwrap()).unwrap();
    let casos = doc["casos"].as_array().unwrap();
    let mut fails = Vec::new();
    for c in casos {
        let file = c["file"].as_str().unwrap();
        let sheet = match Sheet::open(std::path::Path::new(&format!("{dir}/{file}"))) {
            Ok(s) => s,
            Err(e) => {
                fails.push(format!("{file} -> Rust no la pudo abrir: {e}"));
                continue;
            }
        };
        let mut got = sheet.analysis(None);
        let mut want = c.clone();
        for key in ["file", "forecast", "filename"] {
            got.as_object_mut().unwrap().remove(key);
            want.as_object_mut().unwrap().remove(key);
        }
        if let (Some(g), Some(w)) = (got["charts"].as_array_mut(), want["charts"].as_array_mut()) {
            for (a, b) in g.iter_mut().zip(w.iter_mut()) {
                without_random(a, b);
            }
        }
        if let Some(d) = diff(&got, &want, "") {
            fails.push(format!("{file} -> {d}"));
        }
    }
    assert!(fails.is_empty(), "{} de {} planillas difieren:\n{}", fails.len(), casos.len(), fails.join("\n"));
    assert_eq!(casos.len(), 48);
}
