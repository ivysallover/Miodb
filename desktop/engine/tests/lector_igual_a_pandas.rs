//! El lector en Rust contra cómo lee el motor de Python los archivos de `tests/golden/csv/`
//! (`detect_csv_format` + pandas) y `tests/golden/xlsx/` (`read_excel_table`), generados por
//! `tests/golden/make_golden_reader.py`.

use mio_engine::reader::{read_csv, read_excel, Column, Table};
use serde_json::Value;

mod common;
use common::iso;

fn as_values(c: &Column) -> Vec<Value> {
    match c {
        Column::Int(v) => v.iter().map(|x| Value::from(*x)).collect(),
        Column::Float(v) => v.iter().map(|x| {
            if x.is_nan() { Value::Null } else if x.is_infinite() { Value::from(if *x > 0.0 { "inf" } else { "-inf" }) } else { Value::from(*x) }
        }).collect(),
        Column::Bool(v) => v.iter().map(|x| x.map_or(Value::Null, Value::from)).collect(),
        Column::Text(v) => v.iter().map(|x| x.as_ref().map_or(Value::Null, |s| Value::from(s.clone()))).collect(),
        Column::Time(v) => v.iter().map(|x| x.map_or(Value::Null, |t| Value::from(iso(t)))).collect(),
    }
}

#[test]
fn el_lector_lee_como_pandas() {
    let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden");
    let doc: Value = serde_json::from_str(&std::fs::read_to_string(format!("{dir}/reader.json")).unwrap()).unwrap();
    let mut checked = 0;
    for c in doc["casos"].as_array().unwrap() {
        let file = c["file"].as_str().unwrap();
        let table: Table = if c["excel"] == true {
            read_excel(&std::fs::read(format!("{dir}/xlsx/{file}")).unwrap()).unwrap_or_else(|e| panic!("{file}: {e}"))
        } else {
            let (fmt, table) = read_csv(&std::fs::read(format!("{dir}/csv/{file}")).unwrap()).unwrap_or_else(|e| panic!("{file}: {e}"));
            assert_eq!(fmt.sep as char, c["sep"].as_str().unwrap().chars().next().unwrap(), "{file}: separador");
            assert_eq!(fmt.skiprows as u64, c["skiprows"].as_u64().unwrap(), "{file}: filas salteadas");
            assert_eq!(fmt.encoding, c["encoding"].as_str().unwrap(), "{file}: codificación");
            table
        };
        let cols = c["columns"].as_array().unwrap();
        assert_eq!(table.names, cols.iter().map(|x| x["name"].as_str().unwrap().to_string()).collect::<Vec<_>>(), "{file}: nombres");
        assert_eq!(table.rows() as u64, c["rows"].as_u64().unwrap(), "{file}: filas");
        for (got, want) in table.columns.iter().zip(cols) {
            let name = want["name"].as_str().unwrap();
            assert_eq!(got.dtype(), want["dtype"].as_str().unwrap(), "{file}/{name}: tipo");
            let (g, w) = (as_values(got), want["values"].as_array().unwrap().clone());
            for (i, (a, b)) in g.iter().zip(&w).enumerate() {
                let same = match (a.as_f64(), b.as_f64(), a.as_str()) {
                    (Some(x), Some(y), _) => (x - y).abs() <= 1e-12 * y.abs().max(1.0),
                    // Columna mixta de Excel: pandas deja los números como números dentro del texto
                    // (el paso 1 de la limpieza los iguala; lo compara `limpieza_igual_a_python.rs`).
                    (None, Some(y), Some(s)) if c["excel"] == true => s.parse::<f64>() == Ok(y),
                    _ => a == b,
                };
                assert!(same, "{file}/{name}[{i}]: Rust {a} vs pandas {b}");
            }
            assert_eq!(g.len(), w.len(), "{file}/{name}: largo");
        }
        checked += 1;
    }
    assert_eq!(checked, 30);
}
