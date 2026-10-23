//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor. No hay servidor ni puertos: la
//! planilla se lee del disco de la persona y se analiza en su compu. Cada análisis queda guardado
//! (`projects.rs`): abrir de nuevo una planilla que no cambió muestra el resultado sin recalcularlo.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod google;
mod projects;

use mio_engine::progress::{Progress, Stage};
use mio_engine::reader::excel_sheets;
use mio_engine::sheet::{is_excel, Sheet, Source};
use projects::{Meta, Projects};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};

/// La planilla abierta en la ventana: su ruta, la hoja (en un Excel) y, si ya se leyó, la planilla
/// (al abrir un proyecto guardado no se lee hasta que se pide otra columna).
#[derive(Clone)]
struct Current {
    path: String,
    sheet: Option<String>,
    loaded: Option<Arc<Sheet>>,
}

#[derive(Default)]
struct Open(Mutex<Option<Current>>);

/// El análisis (con el formato de la web) y lo que sabe la app del archivo: su tamaño, las filas de
/// título salteadas y, en un Excel, sus hojas y la que se leyó.
fn opened(s: &Sheet, analysis: Value, secs: f64) -> Value {
    let (skipped, sheets, sheet) = match &s.source {
        Source::Csv(f) => (f.skiprows, Vec::new(), None),
        Source::Excel { sheets, sheet } => (0, sheets.clone(), Some(sheet.clone())),
    };
    json!({ "analisis": analysis, "bytes": s.bytes, "filas_titulo": skipped, "hojas": sheets, "hoja": sheet, "segundos": secs })
}

/// Lo guardado, marcado como tal para que la pantalla lo diga.
fn from_store(mut v: Value) -> Value {
    v["guardado"] = json!(true);
    v
}

/// Lee la planilla (si hace falta) y analiza `column`, en un hilo aparte. Cada etapa se avisa a la
/// ventana con el evento `progreso` ({etapa, avance}).
async fn analyze(app: AppHandle, current: Current, column: Option<String>) -> Result<(Arc<Sheet>, Value), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let t = Instant::now();
        let tell = |stage: Stage, done: Option<f64>| {
            let _ = app.emit("progreso", json!({ "etapa": stage.id(), "avance": done }));
        };
        let progress = Progress::new(&tell);
        let sheet = match current.loaded {
            Some(s) => s,
            None => Arc::new(Sheet::open(Path::new(&current.path), current.sheet.as_deref(), &progress)?),
        };
        let out = opened(&sheet, sheet.analysis(column.as_deref(), &progress), t.elapsed().as_secs_f64());
        Ok((sheet, out))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Muestra lo guardado de `column` si la planilla no cambió; si no, la analiza y lo guarda.
async fn show(app: AppHandle, current: Current, column: Option<String>, open: &Open, store: &Projects) -> Result<Value, String> {
    if let Some(v) = store.cached(&current.path, current.sheet.as_deref(), column.as_deref()) {
        *open.0.lock().unwrap() = Some(current);
        return Ok(from_store(v));
    }
    let (sheet, out) = analyze(app, current.clone(), column.clone()).await?;
    store.save(&current.path, current.sheet.as_deref(), column.as_deref(), &out).map_err(|e| format!("No pude guardar el proyecto: {e}"))?;
    *open.0.lock().unwrap() = Some(Current { loaded: Some(sheet), ..current });
    Ok(out)
}

/// Abre una planilla (CSV o Excel; en un Excel, la hoja pedida o la primera).
#[tauri::command]
async fn abrir_planilla(app: AppHandle, path: String, hoja: Option<String>, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let sheet = match hoja {
        Some(h) => Some(h),
        None if is_excel(Path::new(&path)) => excel_sheets(Path::new(&path))?.into_iter().next(),
        None => None,
    };
    show(app, Current { path, sheet, loaded: None }, None, &open, &store).await
}

/// Analiza otra columna de la planilla abierta (o muestra la guardada).
#[tauri::command]
async fn analizar(app: AppHandle, columna: String, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let current = open.0.lock().unwrap().clone().ok_or("Primero elegí una planilla.")?;
    show(app, current, Some(columna), &open, &store).await
}

/// Los proyectos guardados, del más reciente al más viejo.
#[tauri::command]
fn proyectos(store: State<'_, Projects>) -> Vec<Meta> {
    store.list()
}

/// La carpeta donde quedan los proyectos guardados (para mostrarla en Ajustes).
#[tauri::command]
fn carpeta_proyectos(store: State<'_, Projects>) -> String {
    store.dir().to_string_lossy().into_owned()
}

/// Si esta app puede entrar con Google (`google.rs`).
#[tauri::command]
fn google_disponible() -> bool {
    google::available()
}

/// Entra con Google en el navegador de la compu; devuelve el permiso para entrar a Firebase.
#[tauri::command]
async fn ingresar_con_google(app: AppHandle) -> Result<String, String> {
    google::sign_in(&app).await
}

/// Borra un proyecto guardado (la planilla no se toca).
#[tauri::command]
fn borrar_proyecto(id: String, store: State<'_, Projects>) -> Result<(), String> {
    store.remove(&id).map_err(|e| format!("No pude borrar el proyecto: {e}"))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Open::default())
        .setup(|app| {
            let dir = app.path().app_data_dir()?.join("proyectos");
            app.manage(Projects::new(dir)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![abrir_planilla, analizar, proyectos, borrar_proyecto, carpeta_proyectos, google_disponible, ingresar_con_google])
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
        let s = Sheet::open(&path, None, &Progress::NONE).unwrap();
        let out = opened(&s, s.analysis(None, &Progress::NONE), 0.5);
        assert_eq!(out["analisis"]["target_col"], "ventas", "{out}");
        assert_eq!(out["analisis"]["filename"], "ventas.csv");
        assert!(out["bytes"].as_u64().unwrap() > 0);
        assert_eq!(out["filas_titulo"], 0);
        assert_eq!(out["hojas"], json!([]));
        assert_eq!(from_store(out)["guardado"], true);
    }
}
