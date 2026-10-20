//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor con dos comandos. No hay
//! servidor ni puertos: la planilla se lee del disco de la persona y se analiza en su compu. La
//! planilla abierta queda en memoria para analizar otra columna sin volver a leerla.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use mio_engine::sheet::{Sheet, Source};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// La planilla abierta en la ventana.
#[derive(Default)]
struct Open(Mutex<Option<Arc<Sheet>>>);

/// El análisis (con el formato de la web) y lo que sabe la app del archivo.
fn opened(s: &Sheet, analysis: Value, secs: f64) -> Value {
    json!({
        "analisis": analysis,
        "bytes": s.bytes,
        "filas_titulo": match &s.source { Source::Csv(f) => f.skiprows, Source::Excel => 0 },
        "segundos": secs,
    })
}

/// Abre la planilla (CSV o Excel), la limpia, la analiza y la deja abierta.
#[tauri::command]
async fn abrir_planilla(path: String, open: tauri::State<'_, Open>) -> Result<Value, String> {
    let t = Instant::now();
    let (sheet, analysis) = tauri::async_runtime::spawn_blocking(move || {
        Sheet::open(Path::new(&path)).map(|s| {
            let a = s.analysis(None);
            (s, a)
        })
    })
    .await
    .map_err(|e| e.to_string())??;
    let out = opened(&sheet, analysis, t.elapsed().as_secs_f64());
    *open.0.lock().unwrap() = Some(Arc::new(sheet));
    Ok(out)
}

/// Analiza otra columna de la planilla abierta.
#[tauri::command]
async fn analizar(columna: String, open: tauri::State<'_, Open>) -> Result<Value, String> {
    let sheet = open.0.lock().unwrap().clone().ok_or("Primero elegí una planilla.")?;
    let t = Instant::now();
    let (sheet, analysis) = tauri::async_runtime::spawn_blocking(move || {
        let a = sheet.analysis(Some(&columna));
        (sheet, a)
    })
    .await
    .map_err(|e| e.to_string())?;
    Ok(opened(&sheet, analysis, t.elapsed().as_secs_f64()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Open::default())
        .invoke_handler(tauri::generate_handler![abrir_planilla, analizar])
        .run(tauri::generate_context!())
        .expect("no se pudo abrir la ventana de MIO");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Lo que recibe la pantalla (`src/pages/EscritorioPage.tsx`): el análisis y los datos del archivo.
    #[test]
    fn la_pantalla_recibe_el_analisis_y_el_archivo() {
        let dir = std::env::temp_dir().join("mio_desktop_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.csv");
        std::fs::write(&path, "fecha;ventas;sucursal\n01/01/2024;$ 1.200,50;Norte\n02/01/2024;$ 980,00;Sur\n03/01/2024;s/d;Norte\n").unwrap();
        let s = Sheet::open(&path).unwrap();
        let out = opened(&s, s.analysis(None), 0.5);
        assert_eq!(out["analisis"]["target_col"], "ventas", "{out}");
        assert_eq!(out["analisis"]["filename"], "ventas.csv");
        assert!(out["bytes"].as_u64().unwrap() > 0);
        assert_eq!(out["filas_titulo"], 0);
    }
}
