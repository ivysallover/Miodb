//! El motor no cambia sin querer: la limpieza y el análisis de cada planilla de `tests/golden/` (las de
//! `csv/`, `csv_analisis/`, `csv_limpieza/` y `xlsx/`: fechas mezcladas, montos con formato, encabezados
//! raros, grupos sembrados, valores raros, series diarias, semanales y mensuales) tienen que dar lo mismo
//! que la foto guardada en `tests/fotos/`.
//!
//! El motor de escritorio es la referencia (antes se comparaba contra el de Python, que quedó solo para la
//! web). Cuando un cambio es a propósito, se sacan las fotos de nuevo y se revisa la diferencia en git:
//!
//! ```sh
//! MIO_FOTOS=1 cargo test --test fotos
//! git diff tests/fotos
//! ```

use mio_engine::clean::{clean_with, Data, Obj};
use mio_engine::progress::Progress;
use mio_engine::reader::{read_csv, read_excel};
use mio_engine::sheet::Sheet;
use serde_json::{json, Value};
use std::path::{Path, PathBuf};

mod common;
use common::iso;

const FOLDERS: [&str; 4] = ["csv", "csv_analisis", "csv_limpieza", "xlsx"];

fn values(d: &Data) -> Vec<Value> {
    let f = |x: f64| if x.is_nan() { Value::Null } else if x.is_infinite() { Value::from(if x > 0.0 { "inf" } else { "-inf" }) } else { Value::from(x) };
    match d {
        Data::Int(v) => v.iter().map(|x| Value::from(*x)).collect(),
        Data::Float(v) => v.iter().map(|x| f(*x)).collect(),
        Data::Bool(v) => v.iter().map(|x| Value::from(*x)).collect(),
        Data::Time(v) => v.iter().map(|x| x.map_or(Value::Null, |t| Value::from(iso(t)))).collect(),
        Data::Obj(v) => v
            .iter()
            .map(|o| match o {
                Obj::Null => Value::Null,
                Obj::Str(s) => Value::from(s.clone()),
                Obj::Bool(b) => Value::from(*b),
                Obj::Num(x) => f(*x),
            })
            .collect(),
    }
}

/// La tabla limpia (filas que quedaron, columnas con su tipo y valores) o por qué no se pudo leer.
fn cleaning(path: &Path) -> Value {
    let read = if path.extension().is_some_and(|e| e == "xlsx") { read_excel(path, None).map(|b| b.table) } else { read_csv(path, &Progress::NONE).map(|r| r.1) };
    let table = match read {
        Ok(t) => t,
        Err(e) => return json!({ "error": e }),
    };
    let (frame, _) = clean_with(table, &mut |_, _| {});
    json!({
        "filas": frame.index,
        "columnas": frame.cols.iter().map(|c| json!({ "nombre": c.name, "tipo": c.dtype, "valores": values(&c.data) })).collect::<Vec<_>>(),
    })
}

/// El análisis entero (con lo que informa la limpieza) o por qué no se pudo.
fn analysis(path: &Path) -> Value {
    match Sheet::open(path, None, &Progress::NONE).and_then(|s| s.analysis(None, &Progress::NONE)) {
        Ok(a) => a,
        Err(e) => json!({ "error": e }),
    }
}

/// La primera diferencia entre `got` y `want` (None = iguales), con el camino hasta ella. Los números,
/// con una tolerancia mínima (el último decimal puede cambiar de una compu a otra).
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
                return Some(format!("{path}: {} elementos, la foto tiene {}", g.len(), w.len()));
            }
            g.iter().zip(w).enumerate().find_map(|(i, (a, b))| diff(a, b, &format!("{path}[{i}]")))
        }
        (a, b) => match (a.as_f64(), b.as_f64()) {
            (Some(x), Some(y)) if (x - y).abs() <= 1e-9 * y.abs().max(1.0) => None,
            _ if a == b => None,
            _ => Some(format!("{path}: ahora {a}, la foto tiene {b}")),
        },
    }
}

/// Las planillas de prueba, en orden.
fn cases(golden: &Path) -> Vec<String> {
    let mut out: Vec<String> = FOLDERS
        .iter()
        .flat_map(|d| std::fs::read_dir(golden.join(d)).unwrap().flatten().map(move |e| format!("{d}/{}", e.file_name().to_string_lossy())))
        .filter(|f| !f.contains(" 2.")) // las copias de iCloud
        .collect();
    out.sort();
    out
}

#[test]
fn el_motor_da_lo_mismo_que_la_foto() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests");
    let (golden, fotos) = (root.join("golden"), root.join("fotos"));
    let update = std::env::var_os("MIO_FOTOS").is_some();
    let cases = cases(&golden);
    let mut fails = Vec::new();
    for file in &cases {
        let path = golden.join(file);
        let got = json!({ "limpieza": cleaning(&path), "analisis": analysis(&path) });
        let photo = fotos.join(format!("{file}.json"));
        if update {
            std::fs::create_dir_all(photo.parent().unwrap()).unwrap();
            std::fs::write(&photo, serde_json::to_string_pretty(&got).unwrap() + "\n").unwrap();
            continue;
        }
        match std::fs::read_to_string(&photo).ok().and_then(|s| serde_json::from_str::<Value>(&s).ok()) {
            None => fails.push(format!("{file}: no tiene foto (sacala con MIO_FOTOS=1)")),
            Some(want) => fails.extend(diff(&got, &want, "").map(|d| format!("{file} -> {d}"))),
        }
    }
    assert!(fails.is_empty(), "{} de {} planillas cambiaron (si es a propósito: MIO_FOTOS=1 cargo test --test fotos):\n{}", fails.len(), cases.len(), fails.join("\n"));
    assert_eq!(cases.len(), 51, "planillas de prueba");
}
