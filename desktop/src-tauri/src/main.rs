//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor con dos comandos. No hay
//! servidor ni puertos: la planilla se lee del disco de la persona y se analiza en su compu.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use mio_engine::forecaster::run_forecast;
use mio_engine::reader::{read_csv, Column, Table};
use serde_json::{json, Value};
use std::time::Instant;

fn days_from_civil(y: i64, m: i64, d: i64) -> Option<f64> {
    if !(1..=12).contains(&m) || !(1..=31).contains(&d) {
        return None;
    }
    let y2 = if m <= 2 { y - 1 } else { y };
    let era = if y2 >= 0 { y2 } else { y2 - 399 } / 400;
    let yoe = y2 - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    Some((era * 146_097 + doe - 719_468) as f64)
}

/// Lector de fechas provisorio (AAAA-MM-DD con o sin hora, AAAA/MM/DD y DD/MM/AAAA), hasta que el
/// paso de fechas de la limpieza esté en Rust.
fn parse_date(s: &str) -> Option<f64> {
    let date = s.trim().split([' ', 'T']).next()?;
    let parts: Vec<&str> = date.split(['-', '/']).collect();
    if parts.len() != 3 {
        return None;
    }
    let n: Vec<i64> = parts.iter().map(|p| p.parse::<i64>().ok()).collect::<Option<_>>()?;
    if parts[0].len() == 4 {
        days_from_civil(n[0], n[1], n[2])
    } else if parts[2].len() == 4 {
        days_from_civil(n[2], n[1], n[0])
    } else {
        None
    }
}

fn looks_like_dates(c: &Column) -> bool {
    match c {
        Column::Text(v) => {
            let present: Vec<&String> = v.iter().flatten().collect();
            !present.is_empty() && present.iter().filter(|s| parse_date(s).is_some()).count() * 10 >= present.len() * 9
        }
        _ => false,
    }
}

fn is_numeric(c: &Column) -> bool {
    matches!(c, Column::Int(_) | Column::Float(_))
}

fn read(path: &str) -> Result<(usize, mio_engine::reader::Format, Table, f64), String> {
    let t = Instant::now();
    let raw = std::fs::read(path).map_err(|e| format!("No pude abrir el archivo: {e}"))?;
    let (fmt, table) = read_csv(&raw)?;
    Ok((raw.len(), fmt, table, t.elapsed().as_secs_f64()))
}

fn peak_ram_mb() -> f64 {
    #[repr(C)]
    struct Rusage { utime: [i64; 2], stime: [i64; 2], maxrss: i64, rest: [i64; 13] }
    extern "C" { fn getrusage(who: i32, usage: *mut Rusage) -> i32; }
    let mut u: Rusage = unsafe { std::mem::zeroed() };
    unsafe { getrusage(0, &mut u) };
    if cfg!(target_os = "macos") { u.maxrss as f64 / 1_048_576.0 } else { u.maxrss as f64 / 1024.0 }
}

/// Lee la planilla y devuelve lo necesario para elegir columnas.
#[tauri::command]
async fn leer_planilla(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (bytes, fmt, table, secs) = read(&path)?;
        let cols: Vec<Value> = table.names.iter().zip(&table.columns).map(|(n, c)| json!({
            "nombre": n,
            "tipo": c.dtype(),
            "fecha": looks_like_dates(c),
            "numero": is_numeric(c),
        })).collect();
        let fecha = table.columns.iter().position(looks_like_dates).map(|i| table.names[i].clone());
        let valor = table.columns.iter().enumerate().position(|(i, c)| {
            let n = table.names[i].to_lowercase();
            is_numeric(c) && !n.contains("id") && !n.contains("codigo") && !n.contains("código")
        }).map(|i| table.names[i].clone());
        Ok(json!({
            "archivo": std::path::Path::new(&path).file_name().map(|f| f.to_string_lossy().to_string()),
            "mb": bytes as f64 / 1e6,
            "filas": table.rows(),
            "columnas": cols,
            "fecha_sugerida": fecha,
            "valor_sugerido": valor,
            "codificacion": fmt.encoding,
            "separador": if fmt.sep == b'\t' { "tab".to_string() } else { (fmt.sep as char).to_string() },
            "filas_titulo": fmt.skiprows,
            "segundos_lectura": secs,
        }))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Corre el pronóstico (con la guerra de modelos) sobre las columnas elegidas.
#[tauri::command]
async fn pronosticar(path: String, fecha: String, valor: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let t = Instant::now();
        let (_, _, table, _) = read(&path)?;
        let di = table.names.iter().position(|n| *n == fecha).ok_or("No encontré la columna de fecha.")?;
        let vi = table.names.iter().position(|n| *n == valor).ok_or("No encontré la columna de valores.")?;
        let days: Vec<f64> = match &table.columns[di] {
            Column::Text(v) => v.iter().map(|s| s.as_deref().and_then(parse_date).unwrap_or(f64::NAN)).collect(),
            _ => return Err("La columna de fecha no tiene fechas.".into()),
        };
        let values: Vec<f64> = match &table.columns[vi] {
            Column::Int(v) => v.iter().map(|x| *x as f64).collect(),
            Column::Float(v) => v.clone(),
            _ => return Err("La columna de valores no es numérica.".into()),
        };
        let t_fc = Instant::now();
        let out = run_forecast(&days, &values, &valor, 60);
        Ok(json!({
            "resultado": out,
            "segundos_pronostico": t_fc.elapsed().as_secs_f64(),
            "segundos_total": t.elapsed().as_secs_f64(),
            "ram_pico_mb": peak_ram_mb(),
        }))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![leer_planilla, pronosticar])
        .run(tauri::generate_context!())
        .expect("no se pudo abrir la ventana de MIO");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lee_y_pronostica_una_planilla() {
        let dir = std::env::temp_dir().join("mio_desktop_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.csv");
        let mut csv = String::from("fecha,ventas,id_cliente\n");
        for i in 0..150 {
            let (d, m) = (i % 28 + 1, i / 28 + 1);
            csv.push_str(&format!("{:02}/{:02}/2024,{},{}\n", d, m, 200 + i * 2 + (i % 7) * 10, 1000 + i));
        }
        std::fs::write(&path, csv).unwrap();
        let p = path.to_string_lossy().to_string();
        let info = tauri::async_runtime::block_on(leer_planilla(p.clone())).unwrap();
        assert_eq!(info["filas"], 150);
        assert_eq!(info["fecha_sugerida"], "fecha");
        assert_eq!(info["valor_sugerido"], "ventas"); // no elige el id
        let out = tauri::async_runtime::block_on(pronosticar(p, "fecha".into(), "ventas".into())).unwrap();
        let m = &out["resultado"]["metrics"];
        assert!(m["error"].is_null(), "{m}");
        assert!(m["competencia"]["ranking"].as_array().unwrap().len() >= 3);
        assert!(out["ram_pico_mb"].as_f64().unwrap() > 0.0);
    }

    #[test]
    fn fechas_provisorias() {
        assert_eq!(parse_date("1970-01-02"), Some(1.0));
        assert_eq!(parse_date("02/01/1970"), Some(1.0));
        assert_eq!(parse_date("1970-01-02 10:30"), Some(1.0));
        assert_eq!(parse_date("31/02/2024x"), None);
        assert_eq!(parse_date("hola"), None);
    }
}
