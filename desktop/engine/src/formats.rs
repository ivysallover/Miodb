//! Los formatos además de CSV y Excel: JSON (o JSON Lines), SQLite y Parquet. Cada uno se lee con la
//! librería estándar de su formato (`serde_json`, `rusqlite`, `parquet`) y termina en la misma
//! `reader::Table`, así la limpieza, el perfil, los gráficos y los modelos no cambian. Una base SQLite
//! tiene tablas como un Excel tiene hojas: se lee la pedida o la primera.

use crate::dates::DAY_NS;
use crate::dict::Dict;
use crate::reader::{Column, Table};
use serde_json::{Map, Value};
use std::path::Path;

pub const JSON_EXTENSIONS: [&str; 3] = ["json", "jsonl", "ndjson"];
pub const SQLITE_EXTENSIONS: [&str; 4] = ["sqlite", "sqlite3", "db", "db3"];
pub const PARQUET_EXTENSIONS: [&str; 2] = ["parquet", "pq"];

/// Un valor tal como viene del archivo, antes de decidir el tipo de su columna.
enum Cell {
    Null,
    Int(i64),
    Float(f64),
    Bool(bool),
    Text(String),
    /// Nanosegundos desde 1970.
    Time(i64),
}

impl Cell {
    /// El valor como texto, para una columna que mezcla tipos.
    fn text(self) -> Option<String> {
        match self {
            Cell::Null => None,
            Cell::Int(i) => Some(i.to_string()),
            Cell::Float(f) => Some(f.to_string()),
            Cell::Bool(b) => Some(if b { "True" } else { "False" }.into()),
            Cell::Text(s) => Some(s),
            Cell::Time(ns) => Some(crate::dates::timestamp(ns)),
        }
    }
}

/// El tipo de una columna como lo deja pandas: enteros sin vacíos → int64; números (o enteros con
/// vacíos) → float64; solo verdadero/falso → bool; solo fechas → fechas; todo vacío → float64 vacío;
/// lo demás, texto.
fn column(cells: Vec<Cell>) -> Column {
    let (mut ints, mut floats, mut bools, mut times, mut nulls) = (0, 0, 0, 0, 0);
    for c in &cells {
        match c {
            Cell::Null => nulls += 1,
            Cell::Int(_) => ints += 1,
            Cell::Float(_) => floats += 1,
            Cell::Bool(_) => bools += 1,
            Cell::Time(_) => times += 1,
            Cell::Text(_) => {}
        }
    }
    let n = cells.len();
    let as_float = |c: Cell| match c {
        Cell::Int(i) => i as f64,
        Cell::Float(f) => f,
        _ => f64::NAN,
    };
    if ints == n {
        Column::Int(cells.into_iter().map(|c| if let Cell::Int(i) = c { i } else { 0 }).collect())
    } else if ints + floats + nulls == n {
        Column::Float(cells.into_iter().map(as_float).collect())
    } else if bools + nulls == n {
        Column::Bool(cells.into_iter().map(|c| if let Cell::Bool(b) = c { Some(b) } else { None }).collect())
    } else if times + nulls == n {
        Column::Time(cells.into_iter().map(|c| if let Cell::Time(t) = c { Some(t) } else { None }).collect())
    } else {
        Column::Text(Dict::build(cells.into_iter().map(Cell::text), |s| s.clone()))
    }
}

/// Arma la tabla con los nombres y las filas (cada fila, un valor por nombre; lo que falta, vacío).
fn table(names: Vec<String>, rows: Vec<Vec<Cell>>) -> Result<Table, String> {
    if names.is_empty() || rows.is_empty() {
        return Err("El archivo no tiene datos.".into());
    }
    let mut columns: Vec<Vec<Cell>> = names.iter().map(|_| Vec::with_capacity(rows.len())).collect();
    for row in rows {
        let mut row = row.into_iter();
        for col in &mut columns {
            col.push(row.next().unwrap_or(Cell::Null));
        }
    }
    Ok(Table { names, columns: columns.into_iter().map(column).collect(), index: None })
}

// ── JSON ─────────────────────────────────────────────────────────────────────────────────────

fn json_cell(v: Value) -> Cell {
    match v {
        Value::Null => Cell::Null,
        Value::Bool(b) => Cell::Bool(b),
        Value::Number(n) => n.as_i64().map_or_else(|| Cell::Float(n.as_f64().unwrap_or(f64::NAN)), Cell::Int),
        Value::String(s) => Cell::Text(s),
        // Una lista dentro de un registro queda como texto.
        v => Cell::Text(v.to_string()),
    }
}

/// Un registro con lo anidado aplanado: `{"cliente": {"nombre": "Ana"}}` → `cliente.nombre`.
fn flatten(prefix: &str, obj: Map<String, Value>, out: &mut Vec<(String, Value)>) {
    for (k, v) in obj {
        let key = if prefix.is_empty() { k } else { format!("{prefix}.{k}") };
        match v {
            Value::Object(inner) => flatten(&key, inner, out),
            v => out.push((key, v)),
        }
    }
}

/// Los registros de un JSON: una lista de objetos, un objeto con una sola lista de objetos adentro (lo
/// que devuelven muchas APIs: `{"ventas": [...]}`) o JSON Lines (un objeto por línea).
fn json_records(text: &str) -> Result<Vec<Map<String, Value>>, String> {
    let objects = |list: Vec<Value>| list.into_iter().map(|v| match v { Value::Object(o) => Ok(o), _ => Err("La lista del JSON tiene que ser de registros ({...}).".to_string()) }).collect();
    match serde_json::from_str::<Value>(text) {
        Ok(Value::Array(list)) => objects(list),
        Ok(Value::Object(obj)) => {
            let mut lists = obj.into_iter().filter_map(|(_, v)| match v { Value::Array(l) if l.iter().all(Value::is_object) && !l.is_empty() => Some(l), _ => None });
            match (lists.next(), lists.next()) {
                (Some(list), None) => objects(list),
                _ => Err("No encontré en el JSON una lista de registros para analizar.".into()),
            }
        }
        Ok(_) => Err("El JSON no tiene registros para analizar.".into()),
        // JSON Lines: un objeto por línea.
        Err(_) => text
            .lines()
            .filter(|l| !l.trim().is_empty())
            .enumerate()
            .map(|(i, l)| match serde_json::from_str::<Value>(l) {
                Ok(Value::Object(o)) => Ok(o),
                _ => Err(format!("No pude leer el JSON (línea {}).", i + 1)),
            })
            .collect(),
    }
}

pub fn read_json(path: &Path) -> Result<Table, String> {
    let text = std::fs::read_to_string(path).map_err(|e| format!("No pude abrir el JSON: {e}"))?;
    let mut names: Vec<String> = Vec::new();
    let mut seen = rustc_hash::FxHashMap::default();
    let records: Vec<Vec<(String, Value)>> = json_records(text.trim_start_matches('\u{feff}'))?
        .into_iter()
        .map(|o| {
            let mut flat = Vec::new();
            flatten("", o, &mut flat);
            flat
        })
        .collect();
    for (k, _) in records.iter().flatten() {
        if !seen.contains_key(k) {
            seen.insert(k.clone(), names.len());
            names.push(k.clone());
        }
    }
    let rows = records
        .into_iter()
        .map(|r| {
            let mut row: Vec<Cell> = names.iter().map(|_| Cell::Null).collect();
            for (k, v) in r {
                row[seen[&k]] = json_cell(v);
            }
            row
        })
        .collect();
    table(names, rows)
}

// ── SQLite ───────────────────────────────────────────────────────────────────────────────────

/// Las tablas y vistas de una base SQLite, en el orden en que se crearon.
pub fn sqlite_tables(path: &Path) -> Result<Vec<String>, String> {
    let db = open_sqlite(path)?;
    let mut q = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY rowid").map_err(sql_error)?;
    let names = q.query_map([], |r| r.get::<_, String>(0)).map_err(sql_error)?.collect::<Result<Vec<_>, _>>().map_err(sql_error)?;
    if names.is_empty() {
        return Err("La base no tiene tablas.".into());
    }
    Ok(names)
}

fn open_sqlite(path: &Path) -> Result<rusqlite::Connection, String> {
    // Solo lectura: MIO nunca escribe en la base.
    rusqlite::Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX).map_err(sql_error)
}

fn sql_error(e: rusqlite::Error) -> String {
    format!("No pude leer la base SQLite: {e}")
}

/// Una tabla (o vista) de una base SQLite, entera.
pub fn read_sqlite(path: &Path, name: &str) -> Result<Table, String> {
    use rusqlite::types::ValueRef;
    let db = open_sqlite(path)?;
    let mut q = db.prepare(&format!("SELECT * FROM \"{}\"", name.replace('"', "\"\""))).map_err(sql_error)?;
    let names: Vec<String> = q.column_names().map(str::to_string).collect();
    let width = names.len();
    let rows = q
        .query_map([], |r| {
            (0..width)
                .map(|i| {
                    Ok(match r.get_ref(i)? {
                        ValueRef::Null => Cell::Null,
                        ValueRef::Integer(v) => Cell::Int(v),
                        ValueRef::Real(v) => Cell::Float(v),
                        ValueRef::Text(t) => Cell::Text(String::from_utf8_lossy(t).into_owned()),
                        ValueRef::Blob(_) => Cell::Text("(binario)".into()),
                    })
                })
                .collect::<Result<Vec<Cell>, rusqlite::Error>>()
        })
        .map_err(sql_error)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(sql_error)?;
    table(names, rows)
}

// ── Parquet ──────────────────────────────────────────────────────────────────────────────────

/// Un decimal de Parquet (entero en bytes, big-endian con signo, y su escala) como número.
fn decimal(d: &parquet::data_type::Decimal) -> f64 {
    let bytes = d.data();
    let mut v: i128 = if bytes.first().is_some_and(|b| b & 0x80 != 0) { -1 } else { 0 };
    for b in bytes {
        v = (v << 8) | *b as i128;
    }
    v as f64 / 10f64.powi(d.scale())
}

fn parquet_cell(f: parquet::record::Field) -> Cell {
    use parquet::record::Field as F;
    match f {
        F::Null => Cell::Null,
        F::Bool(b) => Cell::Bool(b),
        F::Byte(v) => Cell::Int(v.into()),
        F::Short(v) => Cell::Int(v.into()),
        F::Int(v) => Cell::Int(v.into()),
        F::Long(v) => Cell::Int(v),
        F::UByte(v) => Cell::Int(v.into()),
        F::UShort(v) => Cell::Int(v.into()),
        F::UInt(v) => Cell::Int(v.into()),
        F::ULong(v) => i64::try_from(v).map_or(Cell::Float(v as f64), Cell::Int),
        F::Float16(v) => Cell::Float(v.into()),
        F::Float(v) => Cell::Float(v.into()),
        F::Double(v) => Cell::Float(v),
        F::Decimal(d) => Cell::Float(decimal(&d)),
        F::Str(s) => Cell::Text(s),
        F::Date(days) => Cell::Time(i64::from(days) * DAY_NS),
        F::TimestampMillis(ms) => Cell::Time(ms * 1_000_000),
        F::TimestampMicros(us) => Cell::Time(us * 1_000),
        // Horas sueltas, bytes, listas y grupos anidados: como texto.
        f => Cell::Text(f.to_string()),
    }
}

pub fn read_parquet(path: &Path) -> Result<Table, String> {
    use parquet::file::reader::{FileReader, SerializedFileReader};
    let error = |e: parquet::errors::ParquetError| format!("No pude leer el Parquet: {e}");
    let file = std::fs::File::open(path).map_err(|e| format!("No pude abrir el Parquet: {e}"))?;
    let reader = SerializedFileReader::new(file).map_err(error)?;
    let names: Vec<String> = reader.metadata().file_metadata().schema_descr().root_schema().get_fields().iter().map(|f| f.name().to_string()).collect();
    let rows = reader
        .get_row_iter(None)
        .map_err(error)?
        .map(|row| row.map(|r| r.into_columns().into_iter().map(|(_, f)| parquet_cell(f)).collect()))
        .collect::<Result<Vec<Vec<Cell>>, _>>()
        .map_err(error)?;
    table(names, rows)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ints(t: &Table, i: usize) -> Vec<i64> {
        match &t.columns[i] {
            Column::Int(v) => v.clone(),
            c => panic!("se esperaba int64 y es {}", c.dtype()),
        }
    }

    /// Lo que devuelve una API: los registros dentro de un objeto, con un cliente anidado y un vacío.
    #[test]
    fn json_de_una_api_aplana_lo_anidado() {
        let dir = std::env::temp_dir().join("mio_formats_json");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.json");
        std::fs::write(&path, r#"{"ventas": [{"id": 1, "monto": 10.5, "cliente": {"nombre": "Ana"}, "pagado": true}, {"id": 2, "monto": null, "cliente": {"nombre": "Beto"}, "pagado": false}]}"#).unwrap();
        let t = read_json(&path).unwrap();
        assert_eq!(t.names, ["id", "monto", "cliente.nombre", "pagado"]);
        assert_eq!(ints(&t, 0), [1, 2]);
        assert_eq!(t.columns.iter().map(Column::dtype).collect::<Vec<_>>(), ["int64", "float64", "object", "bool"]);
        // JSON Lines: un registro por línea; el que no trae una columna, vacío ahí.
        std::fs::write(&path, "{\"a\": 1, \"b\": \"x\"}\n{\"a\": 2}\n").unwrap();
        let t = read_json(&path).unwrap();
        assert_eq!((t.rows(), t.columns[1].dtype()), (2, "object"));
        std::fs::write(&path, "[1, 2]").unwrap();
        assert!(read_json(&path).is_err());
    }

    /// Una base de un sistema de caja: dos tablas, se lee la pedida, sin escribir nada.
    #[test]
    fn sqlite_lee_la_tabla_pedida() {
        let path = std::env::temp_dir().join("mio_formats_caja.sqlite");
        let _ = std::fs::remove_file(&path);
        let db = rusqlite::Connection::open(&path).unwrap();
        db.execute_batch("CREATE TABLE ventas (fecha TEXT, monto REAL, unidades INTEGER); INSERT INTO ventas VALUES ('2025-01-02', 100.5, 3), ('2025-01-03', NULL, 4); CREATE TABLE productos (nombre TEXT);").unwrap();
        drop(db);
        assert_eq!(sqlite_tables(&path).unwrap(), ["ventas", "productos"]);
        let t = read_sqlite(&path, "ventas").unwrap();
        assert_eq!(t.names, ["fecha", "monto", "unidades"]);
        assert_eq!(t.columns.iter().map(Column::dtype).collect::<Vec<_>>(), ["object", "float64", "int64"]);
        assert!(read_sqlite(&path, "productos").is_err_and(|e| e.contains("no tiene datos")));
    }

    #[test]
    fn un_decimal_de_parquet_es_un_numero() {
        let d = parquet::data_type::Decimal::from_bytes(parquet::data_type::ByteArray::from(vec![0xff, 0x85]), 6, 2);
        assert_eq!(decimal(&d), -1.23);
    }
}
