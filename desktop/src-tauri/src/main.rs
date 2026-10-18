//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor con dos comandos. No hay
//! servidor ni puertos: la planilla se lee del disco de la persona y se analiza en su compu. La
//! planilla abierta queda en memoria para no volver a leerla en cada análisis.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use mio_engine::clean::ID;
use mio_engine::sheet::{Sheet, Source};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;

/// La planilla abierta en la ventana.
#[derive(Default)]
struct Open(Mutex<Option<Arc<Sheet>>>);

/// Horizonte del pronóstico, en períodos (el mismo que la web).
const HORIZON: usize = 60;

fn peak_ram_mb() -> f64 {
    #[repr(C)]
    struct Rusage { utime: [i64; 2], stime: [i64; 2], maxrss: i64, rest: [i64; 13] }
    extern "C" { fn getrusage(who: i32, usage: *mut Rusage) -> i32; }
    let mut u: Rusage = unsafe { std::mem::zeroed() };
    unsafe { getrusage(0, &mut u) };
    if cfg!(target_os = "macos") { u.maxrss as f64 / 1_048_576.0 } else { u.maxrss as f64 / 1024.0 }
}

/// Lo que la pantalla necesita para elegir columnas y contar qué se limpió.
fn summary(s: &Sheet, secs: f64) -> Value {
    let r = &s.report;
    let cols: Vec<Value> = s.columns().map(|c| json!({
        "nombre": c.name,
        "tipo": s.kind(&c.name).unwrap_or("texto"),
        "fecha": s.is_date(&c.name),
        "numero": s.numbers(&c.name).is_some(),
    })).collect();
    // El formato decimal solo importa si se pasó texto a número; si no, la planilla ya traía números.
    let formato = match (r.monetary.is_empty() && r.coerced.is_empty(), r.dec_sep) {
        (true, _) => None,
        (false, ',') => Some("coma decimal (1.234,56)"),
        (false, _) => Some("punto decimal (1,234.56)"),
    };
    json!({
        "archivo": s.file,
        "bytes": s.bytes,
        "filas": s.frame.rows(),
        "columnas": cols,
        "fecha_sugerida": s.suggested_date(),
        "valor_sugerido": s.suggested_value(),
        "filas_titulo": match &s.source { Source::Csv(f) => f.skiprows, Source::Excel => 0 },
        "segundos_lectura": secs,
        "limpieza": {
            "filas_vacias": r.rows_dropped,
            "columnas_vacias": r.empty_cols,
            "duplicados": r.duplicates_removed,
            "vacios_disfrazados": r.nulls_detected.values().sum::<usize>(),
            "montos": r.monetary,
            "numeros_en_texto": r.coerced,
            "fechas": r.dates_parsed,
            "completados": r.imputed.values().sum::<usize>(),
            "atipicos": r.outliers.values().sum::<usize>(),
            "formato": formato,
            "ids": s.columns().filter(|c| s.kind(&c.name) == Some(ID)).map(|c| c.name.as_str()).collect::<Vec<_>>(),
        },
    })
}

/// Abre la planilla (CSV o Excel), la limpia y la deja abierta.
#[tauri::command]
async fn leer_planilla(path: String, open: tauri::State<'_, Open>) -> Result<Value, String> {
    let t = Instant::now();
    let sheet = tauri::async_runtime::spawn_blocking(move || Sheet::open(Path::new(&path)))
        .await
        .map_err(|e| e.to_string())??;
    let out = summary(&sheet, t.elapsed().as_secs_f64());
    *open.0.lock().unwrap() = Some(Arc::new(sheet));
    Ok(out)
}

/// Corre el pronóstico (con la guerra de modelos) sobre las columnas elegidas de la planilla abierta.
#[tauri::command]
async fn pronosticar(fecha: String, valor: String, open: tauri::State<'_, Open>) -> Result<Value, String> {
    let sheet = open.0.lock().unwrap().clone().ok_or("Primero elegí una planilla.")?;
    tauri::async_runtime::spawn_blocking(move || {
        let t = Instant::now();
        let resultado = sheet.forecast(&fecha, &valor, HORIZON)?;
        Ok(json!({ "resultado": resultado, "segundos_pronostico": t.elapsed().as_secs_f64(), "ram_pico_mb": peak_ram_mb() }))
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Open::default())
        .invoke_handler(tauri::generate_handler![leer_planilla, pronosticar])
        .run(tauri::generate_context!())
        .expect("no se pudo abrir la ventana de MIO");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// El resumen trae lo que lee la pantalla (`src/pages/EscritorioPage.tsx`).
    #[test]
    fn el_resumen_trae_lo_que_lee_la_pantalla() {
        let dir = std::env::temp_dir().join("mio_desktop_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.csv");
        std::fs::write(&path, "fecha;ventas;id_cliente\n01/01/2024;$ 1.200,50;C1\n02/01/2024;$ 980,00;C2\n03/01/2024;s/d;C3\n").unwrap();
        let info = summary(&Sheet::open(&path).unwrap(), 0.0);
        assert_eq!(info["filas"], 3, "{info}");
        assert_eq!(info["fecha_sugerida"], "fecha");
        assert_eq!(info["valor_sugerido"], "ventas");
        assert_eq!(info["limpieza"]["montos"], json!(["ventas"]));
        assert_eq!(info["limpieza"]["formato"], "coma decimal (1.234,56)");
        assert_eq!(info["columnas"][1], json!({ "nombre": "ventas", "tipo": "numérica", "fecha": false, "numero": true }));
    }
}
