//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor. No hay servidor ni puertos: la
//! planilla se lee del disco de la persona y se analiza en su compu. Cada análisis queda guardado
//! (`projects.rs`): abrir de nuevo una planilla que no cambió muestra el resultado sin recalcularlo.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod projects;

use mio_engine::progress::{Progress, Stage};
use mio_engine::sheet::{Sheet, Source};
use projects::{Meta, Projects};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};

/// La planilla abierta en la ventana: su ruta y, si ya se leyó, la planilla (al abrir un proyecto
/// guardado no se lee hasta que se pide otra columna).
#[derive(Default)]
struct Open(Mutex<(Option<String>, Option<Arc<Sheet>>)>);

/// El análisis (con el formato de la web) y lo que sabe la app del archivo.
fn opened(s: &Sheet, analysis: Value, secs: f64) -> Value {
    json!({
        "analisis": analysis,
        "bytes": s.bytes,
        "filas_titulo": match &s.source { Source::Csv(f) => f.skiprows, Source::Excel => 0 },
        "segundos": secs,
    })
}

/// Lo guardado, marcado como tal para que la pantalla lo diga.
fn from_store(mut v: Value) -> Value {
    v["guardado"] = json!(true);
    v
}

/// Lee la planilla (si hace falta) y analiza `column`, en un hilo aparte. Cada etapa se avisa a la
/// ventana con el evento `progreso` ({etapa, avance}).
async fn analyze(app: AppHandle, path: String, sheet: Option<Arc<Sheet>>, column: Option<String>) -> Result<(Arc<Sheet>, Value), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let t = Instant::now();
        let tell = |stage: Stage, done: Option<f64>| {
            let _ = app.emit("progreso", json!({ "etapa": stage.id(), "avance": done }));
        };
        let progress = Progress::new(&tell);
        let sheet = match sheet {
            Some(s) => s,
            None => Arc::new(Sheet::open(Path::new(&path), &progress)?),
        };
        let out = opened(&sheet, sheet.analysis(column.as_deref(), &progress), t.elapsed().as_secs_f64());
        Ok((sheet, out))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Abre una planilla (CSV o Excel): lo guardado si el archivo no cambió; si no, la lee, la analiza y
/// guarda el análisis.
#[tauri::command]
async fn abrir_planilla(app: AppHandle, path: String, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    if let Some(v) = store.cached(&path, None) {
        *open.0.lock().unwrap() = (Some(path), None);
        return Ok(from_store(v));
    }
    let (sheet, out) = analyze(app, path.clone(), None, None).await?;
    store.save(&path, None, &out).map_err(|e| format!("No pude guardar el proyecto: {e}"))?;
    *open.0.lock().unwrap() = (Some(path), Some(sheet));
    Ok(out)
}

/// Analiza otra columna de la planilla abierta (o muestra la guardada).
#[tauri::command]
async fn analizar(app: AppHandle, columna: String, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let (path, sheet) = open.0.lock().unwrap().clone();
    let path = path.ok_or("Primero elegí una planilla.")?;
    if let Some(v) = store.cached(&path, Some(&columna)) {
        return Ok(from_store(v));
    }
    let (sheet, out) = analyze(app, path.clone(), sheet, Some(columna.clone())).await?;
    store.save(&path, Some(&columna), &out).map_err(|e| format!("No pude guardar el proyecto: {e}"))?;
    *open.0.lock().unwrap() = (Some(path), Some(sheet));
    Ok(out)
}

/// Los proyectos guardados, del más reciente al más viejo.
#[tauri::command]
fn proyectos(store: State<'_, Projects>) -> Vec<Meta> {
    store.list()
}

/// Borra un proyecto guardado (la planilla no se toca).
#[tauri::command]
fn borrar_proyecto(id: String, store: State<'_, Projects>) -> Result<(), String> {
    store.remove(&id).map_err(|e| format!("No pude borrar el proyecto: {e}"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Open::default())
        .setup(|app| {
            let dir = app.path().app_data_dir()?.join("proyectos");
            app.manage(Projects::new(dir)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![abrir_planilla, analizar, proyectos, borrar_proyecto])
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
        let s = Sheet::open(&path, &Progress::NONE).unwrap();
        let out = opened(&s, s.analysis(None, &Progress::NONE), 0.5);
        assert_eq!(out["analisis"]["target_col"], "ventas", "{out}");
        assert_eq!(out["analisis"]["filename"], "ventas.csv");
        assert!(out["bytes"].as_u64().unwrap() > 0);
        assert_eq!(out["filas_titulo"], 0);
        assert_eq!(from_store(out)["guardado"], true);
    }
}
