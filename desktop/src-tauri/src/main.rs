//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor con dos comandos. No hay
//! servidor ni puertos: la planilla se lee del disco de la persona y se analiza en su compu.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use mio_engine::clean::{clean, Data, Frame, Obj, Report, DATE, ID, NUMERIC};
use mio_engine::forecaster::run_forecast;
use mio_engine::reader::read_csv;
use serde_json::{json, Value};
use std::time::Instant;

/// Lee y limpia la planilla igual que el motor de la web.
fn read_and_clean(path: &str) -> Result<(usize, mio_engine::reader::Format, Frame, Report, f64), String> {
    let t = Instant::now();
    let raw = std::fs::read(path).map_err(|e| format!("No pude abrir el archivo: {e}"))?;
    let (fmt, table) = read_csv(&raw)?;
    let (frame, report) = clean(&table);
    if frame.rows() == 0 {
        return Err("La planilla no tiene datos: todas las celdas están vacías.".into());
    }
    Ok((raw.len(), fmt, frame, report, t.elapsed().as_secs_f64()))
}

fn numbers(d: &Data) -> Option<Vec<f64>> {
    match d {
        Data::Int(v) => Some(v.iter().map(|x| *x as f64).collect()),
        Data::Float(v) => Some(v.clone()),
        Data::Obj(v) if v.iter().any(|o| matches!(o, Obj::Num(_))) => Some(v.iter().map(|o| match o { Obj::Num(x) => *x, _ => f64::NAN }).collect()),
        _ => None,
    }
}

fn peak_ram_mb() -> f64 {
    #[repr(C)]
    struct Rusage { utime: [i64; 2], stime: [i64; 2], maxrss: i64, rest: [i64; 13] }
    extern "C" { fn getrusage(who: i32, usage: *mut Rusage) -> i32; }
    let mut u: Rusage = unsafe { std::mem::zeroed() };
    unsafe { getrusage(0, &mut u) };
    if cfg!(target_os = "macos") { u.maxrss as f64 / 1_048_576.0 } else { u.maxrss as f64 / 1024.0 }
}

/// Lee y limpia la planilla, y devuelve lo necesario para elegir columnas y contar qué se limpió.
#[tauri::command]
async fn leer_planilla(path: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (bytes, fmt, frame, report, secs) = read_and_clean(&path)?;
        let kind = |n: &str| report.type_of(n).unwrap_or("texto").to_string();
        let cols: Vec<Value> = frame.cols.iter().filter(|c| !c.name.starts_with('_')).map(|c| json!({
            "nombre": c.name,
            "tipo": kind(&c.name),
            "fecha": matches!(c.data, Data::Time(_)),
            "numero": report.type_of(&c.name) == Some(NUMERIC) && numbers(&c.data).is_some(),
        })).collect();
        let fecha = frame.cols.iter().find(|c| report.type_of(&c.name) == Some(DATE)).map(|c| c.name.clone());
        let valor = frame.cols.iter().find(|c| report.type_of(&c.name) == Some(NUMERIC) && numbers(&c.data).is_some()).map(|c| c.name.clone());
        let imputados: usize = report.imputed.values().sum();
        Ok(json!({
            "archivo": std::path::Path::new(&path).file_name().map(|f| f.to_string_lossy().to_string()),
            "mb": bytes as f64 / 1e6,
            "filas": frame.rows(),
            "columnas": cols,
            "fecha_sugerida": fecha,
            "valor_sugerido": valor,
            "codificacion": fmt.encoding,
            "separador": if fmt.sep == b'\t' { "tab".to_string() } else { (fmt.sep as char).to_string() },
            "filas_titulo": fmt.skiprows,
            "segundos_lectura": secs,
            "limpieza": {
                "filas_originales": report.original_rows,
                "filas_vacias": report.rows_dropped,
                "columnas_vacias": report.empty_cols,
                "duplicados": report.duplicates_removed,
                "vacios_disfrazados": report.nulls_detected.values().sum::<usize>(),
                "montos": report.monetary,
                "numeros_en_texto": report.coerced,
                "fechas": report.dates_parsed,
                "completados": imputados,
                "atipicos": report.outliers.values().sum::<usize>(),
                "formato": if report.dec_sep == ',' { "coma decimal (1.234,56)" } else { "punto decimal (1,234.56)" },
                "ids": frame.cols.iter().filter(|c| report.type_of(&c.name) == Some(ID)).map(|c| c.name.clone()).collect::<Vec<_>>(),
            },
        }))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Corre el pronóstico (con la guerra de modelos) sobre las columnas elegidas, ya limpias.
#[tauri::command]
async fn pronosticar(path: String, fecha: String, valor: String) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let t = Instant::now();
        let (_, _, frame, _, _) = read_and_clean(&path)?;
        let dc = frame.col(&fecha).ok_or("No encontré la columna de fecha.")?;
        let vc = frame.col(&valor).ok_or("No encontré la columna de valores.")?;
        let days: Vec<f64> = match &dc.data {
            Data::Time(v) => v.iter().map(|x| x.map_or(f64::NAN, |ns| (ns.div_euclid(86_400_000_000_000)) as f64)).collect(),
            _ => return Err("La columna de fecha no tiene fechas.".into()),
        };
        let values = numbers(&vc.data).ok_or("La columna de valores no es numérica.")?;
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
    fn lee_limpia_y_pronostica_una_planilla() {
        let dir = std::env::temp_dir().join("mio_desktop_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.csv");
        let mut csv = String::from("fecha;ventas;id_cliente;sucursal\n");
        for i in 0..150 {
            let (d, m) = (i % 28 + 1, i / 28 + 1);
            // montos con formato argentino como texto, una fila duplicada y una celda "s/d"
            let monto = if i == 7 { "s/d".to_string() } else { format!("$ {},{:02}", 200 + i * 2 + (i % 7) * 10, i % 100) };
            csv.push_str(&format!("{:02}/{:02}/2024;{};C{:04};{}\n", d, m, monto, 1000 + i, if i % 2 == 0 { "Norte" } else { "Sur" }));
        }
        csv.push_str("01/01/2024;$ 200,00;C1000;Norte\n"); // duplicada exacta de la primera
        std::fs::write(&path, csv).unwrap();
        let p = path.to_string_lossy().to_string();
        let info = tauri::async_runtime::block_on(leer_planilla(p.clone())).unwrap();
        assert_eq!(info["filas"], 150, "{info}");
        assert_eq!(info["fecha_sugerida"], "fecha");
        assert_eq!(info["valor_sugerido"], "ventas");
        assert_eq!(info["limpieza"]["duplicados"], 1);
        assert_eq!(info["limpieza"]["montos"], json!(["ventas"]));
        assert_eq!(info["limpieza"]["ids"], json!(["id_cliente"]));
        let out = tauri::async_runtime::block_on(pronosticar(p, "fecha".into(), "ventas".into())).unwrap();
        let m = &out["resultado"]["metrics"];
        assert!(m["error"].is_null(), "{m}");
        assert!(m["competencia"]["ranking"].as_array().unwrap().len() >= 3);
    }
}
