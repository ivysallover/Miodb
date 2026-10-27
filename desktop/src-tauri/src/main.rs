//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor. No hay servidor ni puertos: la
//! planilla se lee del disco de la persona y se analiza en su compu. Cada análisis queda guardado
//! (`projects.rs`): abrir de nuevo una planilla que no cambió muestra el resultado sin recalcularlo.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod example;
mod google;
mod projects;

use mio_engine::combine::{combine_with, Choices, Part};
use mio_engine::progress::{Progress, Stage};
use mio_engine::reader::excel_sheets;
use mio_engine::sheet::{is_excel, Sheet, Source};
use projects::{Meta, Projects};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};

/// La planilla abierta en la ventana: su ruta (o las de varias planillas unidas), la hoja (en un
/// Excel) y, si ya se leyó, la planilla (al abrir un proyecto guardado no se lee hasta que se pide otra
/// columna).
#[derive(Clone)]
struct Current {
    paths: Vec<String>,
    sheet: Option<String>,
    /// Con varias planillas, cómo unirlas (`combine::Choices`, como lo manda la pantalla); `None` = lo sugerido.
    union: Option<Value>,
    loaded: Option<Arc<Sheet>>,
}

#[derive(Default)]
struct Open(Mutex<Option<Current>>);

/// Planillas leídas tal cual, con lo que pesan juntas.
type Read = Arc<(Vec<Part>, usize)>;

/// Las planillas leídas para unir (y sus rutas): revisar la unión y analizarla no las vuelve a leer.
#[derive(Default)]
struct Pending(Mutex<Option<(Vec<String>, Read)>>);

/// Lo elegido al revisar la unión, o `None` si es lo que MIO sugiere (así el proyecto es el mismo).
fn choices_of(union: Option<Value>) -> Option<Value> {
    union.filter(|v| Choices::from_json(v) != Choices::default())
}

/// Las planillas leídas, de lo ya leído si son las mismas; si no, las lee (avisando el avance).
fn parts_of(paths: &[String], pending: &Pending, progress: &Progress) -> Result<Read, String> {
    if let Some((p, parts)) = pending.0.lock().unwrap().as_ref() {
        if p == paths {
            return Ok(parts.clone());
        }
    }
    let read = Arc::new(Sheet::read_parts(&paths.iter().map(Path::new).collect::<Vec<_>>(), progress)?);
    *pending.0.lock().unwrap() = Some((paths.to_vec(), read.clone()));
    Ok(read)
}

/// El análisis (con el formato de la web) y lo que sabe la app del archivo: su tamaño, las filas de
/// título salteadas, en un Excel sus hojas y la que se leyó, y con varias planillas qué se hizo con
/// cada una (`combinado`).
fn opened(s: &Sheet, analysis: Value, secs: f64) -> Value {
    let (skipped, sheets, sheet, combined) = match &s.source {
        Source::Csv(f) => (f.skiprows, Vec::new(), None, Vec::new()),
        Source::Excel { sheets, sheet } => (0, sheets.clone(), Some(sheet.clone()), Vec::new()),
        Source::Combined(steps) => (0, Vec::new(), None, steps.iter().map(|s| s.json()).collect()),
    };
    json!({ "analisis": analysis, "bytes": s.bytes, "filas_titulo": skipped, "hojas": sheets, "hoja": sheet, "combinado": combined, "segundos": secs })
}

/// Lo guardado, marcado como tal para que la pantalla lo diga.
fn from_store(mut v: Value) -> Value {
    v["guardado"] = json!(true);
    v
}

/// El turno de los trabajos (leer, unir, analizar): cancelar lo avanza, y un trabajo corta en su
/// próxima etapa apenas el turno ya no es el suyo. Así cancelar y empezar otro enseguida no deja al
/// anterior corriendo.
#[derive(Default)]
struct Turn(AtomicU64);

/// Hace `work` avisando cada etapa a la ventana (evento `progreso`: {etapa, avance}) y cortando si la
/// persona cancela (`cancelar`).
fn with_progress<T>(app: &AppHandle, work: impl FnOnce(&Progress) -> Result<T, String>) -> Result<T, String> {
    let turn = &app.state::<Turn>().0;
    let mine = turn.load(Ordering::Relaxed);
    let stopped = || turn.load(Ordering::Relaxed) != mine;
    let tell = |stage: Stage, done: Option<f64>| {
        if !stopped() {
            let _ = app.emit("progreso", json!({ "etapa": stage.id(), "avance": done }));
        }
    };
    work(&Progress::cancellable(&tell, &stopped))
}

/// Lee la planilla (si hace falta) y analiza `column`, en un hilo aparte, avisando el avance.
async fn analyze(app: AppHandle, current: Current, column: Option<String>) -> Result<(Arc<Sheet>, Value), String> {
    tauri::async_runtime::spawn_blocking(move || with_progress(&app, |progress| {
        let pending = app.state::<Pending>();
        let t = Instant::now();
        let sheet = match current.loaded {
            Some(s) => s,
            None => Arc::new(match &current.paths[..] {
                [one] => Sheet::open(Path::new(one), current.sheet.as_deref(), progress)?,
                many => {
                    let read = parts_of(many, &pending, progress)?;
                    let choices = current.union.as_ref().map(Choices::from_json).unwrap_or_default();
                    Sheet::from_parts(read.0.clone(), read.1, &choices, progress)?
                }
            }),
        };
        let out = opened(&sheet, sheet.analysis(column.as_deref(), progress)?, t.elapsed().as_secs_f64());
        Ok((sheet, out))
    }))
    .await
    .map_err(|e| e.to_string())?
}

/// Muestra lo guardado de `column` si la planilla no cambió; si no, la analiza y lo guarda.
async fn show(app: AppHandle, current: Current, column: Option<String>, open: &Open, store: &Projects) -> Result<Value, String> {
    if let Some(v) = store.cached(&current.paths, current.sheet.as_deref(), current.union.as_ref(), column.as_deref()) {
        *open.0.lock().unwrap() = Some(current);
        return Ok(from_store(v));
    }
    let (sheet, out) = analyze(app, current.clone(), column.clone()).await?;
    store.save(&current.paths, current.sheet.as_deref(), current.union.as_ref(), column.as_deref(), &out).map_err(|e| format!("No pude guardar el proyecto: {e}"))?;
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
    show(app, Current { paths: vec![path], sheet, union: None, loaded: None }, None, &open, &store).await
}

/// Cómo quedarían unidas varias planillas con `union` (lo elegido; sin elegir, lo que sugiere MIO),
/// sin analizarlas: qué pasa con cada una, con qué claves se puede cruzar y cuántas filas y columnas
/// quedan. De cada Excel, la primera hoja.
#[tauri::command]
async fn revisar_union(app: AppHandle, paths: Vec<String>, union: Option<Value>) -> Result<Value, String> {
    if paths.len() < 2 {
        return Err("Elegí al menos dos planillas para unirlas.".into());
    }
    tauri::async_runtime::spawn_blocking(move || with_progress(&app, |progress| {
        let read = parts_of(&paths, &app.state::<Pending>(), progress)?;
        let choices = union.as_ref().map(Choices::from_json).unwrap_or_default();
        let c = combine_with(read.0.clone(), &choices);
        Ok(json!({
            "principal": c.main,
            "filas": c.table.rows(),
            "columnas": c.table.names.len(),
            "archivos": c.files.iter().map(|f| f.json()).collect::<Vec<_>>(),
            "pasos": c.steps.iter().map(|s| s.json()).collect::<Vec<_>>(),
        }))
    }))
    .await
    .map_err(|e| e.to_string())?
}

/// Abre varias planillas juntas, unidas como dice `union` (o como sugiere MIO), y las analiza.
#[tauri::command]
async fn abrir_varias(app: AppHandle, paths: Vec<String>, union: Option<Value>, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    if paths.len() < 2 {
        return Err("Elegí al menos dos planillas para unirlas.".into());
    }
    show(app, Current { paths, sheet: None, union: choices_of(union), loaded: None }, None, &open, &store).await
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

/// Entra con Google en el navegador de la compu (`google.rs`); devuelve la credencial para entrar a
/// Firebase. `pagina` es la página de ingreso del servidor de desarrollo; sin ella, la sirve la app.
#[tauri::command]
async fn ingresar_con_google(app: AppHandle, pagina: Option<String>) -> Result<String, String> {
    google::sign_in(&app, pagina).await
}

/// Las planillas del ejemplo ("Probar con un ejemplo"), listas para abrir.
#[tauri::command]
fn ejemplo(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("ejemplo");
    example::write_to(&dir).map_err(|e| format!("No pude preparar el ejemplo: {e}"))
}

/// Cancela lo que se esté leyendo, uniendo o analizando: corta en la próxima etapa y no se guarda nada.
#[tauri::command]
fn cancelar(turn: State<'_, Turn>) {
    turn.0.fetch_add(1, Ordering::Relaxed);
}

/// Cuánto ocupan los proyectos guardados, en bytes (para Ajustes).
#[tauri::command]
fn espacio_proyectos(store: State<'_, Projects>) -> u64 {
    store.size()
}

/// Borra todos los proyectos guardados (las planillas no se tocan).
#[tauri::command]
fn borrar_proyectos(store: State<'_, Projects>) -> Result<(), String> {
    store.clear().map_err(|e| format!("No pude borrar los proyectos: {e}"))
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
        .manage(Pending::default())
        .manage(Turn::default())
        .setup(|app| {
            let dir = app.path().app_data_dir()?.join("proyectos");
            app.manage(Projects::new(dir)?);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![abrir_planilla, revisar_union, abrir_varias, analizar, cancelar, ejemplo, proyectos, borrar_proyecto, carpeta_proyectos, ingresar_con_google, espacio_proyectos, borrar_proyectos])
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
        let out = opened(&s, s.analysis(None, &Progress::NONE).unwrap(), 0.5);
        assert_eq!(out["analisis"]["target_col"], "ventas", "{out}");
        assert_eq!(out["analisis"]["filename"], "ventas.csv");
        assert!(out["bytes"].as_u64().unwrap() > 0);
        assert_eq!(out["filas_titulo"], 0);
        assert_eq!(out["hojas"], json!([]));
        assert_eq!(out["combinado"], json!([]));
        assert_eq!(from_store(out)["guardado"], true);
    }
}
