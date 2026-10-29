//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor. No hay servidor ni puertos: la
//! planilla se lee del disco de la persona y se analiza en su compu. Cada análisis queda guardado
//! (`projects.rs`): abrir de nuevo una planilla que no cambió muestra el resultado sin recalcularlo.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod example;
mod google;
mod projects;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use mio_engine::changes::compare;
use mio_engine::combine::{combine_with, Choices, Part};
use mio_engine::export;
use mio_engine::overview::overview;
use mio_engine::progress::{Progress, Stage, CANCELLED};
use mio_engine::sheet::{parts, Sheet, Source};
use projects::{Meta, Projects};
use serde_json::{json, Value};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_updater::UpdaterExt;

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

/// Lo que sabe la app del archivo: su tamaño, las filas de título salteadas, en un Excel sus hojas y
/// la que se leyó, y con varias planillas qué se hizo con cada una (`combinado`).
fn facts(s: &Sheet) -> Value {
    let (skipped, sheets, sheet, combined) = match &s.source {
        Source::Csv(f) => (f.skiprows, Vec::new(), None, Vec::new()),
        Source::Book { sheets, sheet } => (0, sheets.clone(), Some(sheet.clone()), Vec::new()),
        Source::Typed => (0, Vec::new(), None, Vec::new()),
        Source::Combined(steps) => (0, Vec::new(), None, steps.iter().map(|s| s.json()).collect()),
    };
    json!({ "bytes": s.bytes, "filas_titulo": skipped, "hojas": sheets, "hoja": sheet, "combinado": combined })
}

/// El análisis (con el formato de la web), el total de lo que se analizó (si es numérico, para
/// comparar con la próxima vez: `changes.rs`), lo que tardó y lo que sabe la app del archivo.
fn opened(s: &Sheet, analysis: Value, secs: f64) -> Value {
    let mut out = facts(s);
    out["total"] = json!(analysis["target_col"].as_str().and_then(|t| s.total(t)));
    out["analisis"] = analysis;
    out["segundos"] = json!(secs);
    out
}

/// La planilla leída y limpia, para elegir qué analizar: su nombre, filas, columnas y calidad, lo que
/// se puede analizar (`Sheet::choices`) y lo que sabe la app del archivo.
fn choosing(s: &Sheet) -> Value {
    let mut out = facts(s);
    out["nombre"] = json!(s.file);
    out["filas"] = json!(s.profile.n_rows);
    out["n_columnas"] = json!(s.columns().count());
    out["calidad"] = json!(s.profile.quality_score);
    out["columnas"] = s.choices();
    out
}

/// Lo guardado, marcado como tal para que la pantalla lo diga.
fn from_store(mut v: Value) -> Value {
    v["guardado"] = json!(true);
    v
}

/// Anota en el registro de esta compu (`carpeta_registro`) lo que falló, salvo cancelar, que no es una
/// falla. El registro no sale de la compu: sirve para ver qué pasó.
fn logged<T>(what: &str, r: Result<T, String>) -> Result<T, String> {
    if let Err(e) = &r {
        if e != CANCELLED {
            log::error!("{what}: {e}");
        }
    }
    r
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

/// La planilla abierta, ya leída y limpia (si se abrió de lo guardado, la lee ahora).
fn load(app: &AppHandle, current: &Current, progress: &Progress) -> Result<Arc<Sheet>, String> {
    if let Some(s) = &current.loaded {
        return Ok(s.clone());
    }
    Ok(Arc::new(match &current.paths[..] {
        [one] => Sheet::open(Path::new(one), current.sheet.as_deref(), progress)?,
        many => {
            let read = parts_of(many, &app.state::<Pending>(), progress)?;
            let choices = current.union.as_ref().map(Choices::from_json).unwrap_or_default();
            Sheet::from_parts(read.0.clone(), read.1, &choices, progress)?
        }
    }))
}

/// Hace `work` con la planilla abierta, ya leída y limpia (si se abrió de lo guardado, la lee ahora,
/// avisando el avance), en un hilo aparte; queda leída para lo próximo (otra columna, exportar, las filas).
async fn with_sheet<T: Send + 'static>(app: AppHandle, open: &Open, work: impl FnOnce(&Sheet) -> Result<T, String> + Send + 'static) -> Result<T, String> {
    let current = open.0.lock().unwrap().clone().ok_or("Primero abrí una planilla.")?;
    let reading = current.clone();
    let (sheet, out) = tauri::async_runtime::spawn_blocking(move || {
        with_progress(&app, |progress| {
            let sheet = load(&app, &reading, progress)?;
            let out = work(&sheet)?;
            Ok((sheet, out))
        })
    })
    .await
    .map_err(|e| e.to_string())??;
    *open.0.lock().unwrap() = Some(Current { loaded: Some(sheet), ..current });
    Ok(out)
}

/// Lee la planilla (si hace falta) y analiza `column`, en un hilo aparte, avisando el avance.
async fn analyze(app: AppHandle, current: Current, column: String) -> Result<(Arc<Sheet>, Value), String> {
    tauri::async_runtime::spawn_blocking(move || with_progress(&app, |progress| {
        let t = Instant::now();
        let sheet = load(&app, &current, progress)?;
        let out = opened(&sheet, sheet.analysis(Some(&column), progress)?, t.elapsed().as_secs_f64());
        Ok((sheet, out))
    }))
    .await
    .map_err(|e| e.to_string())?
}

/// Muestra lo guardado de `column` si la planilla no cambió; si no, la analiza (con lo que cambió desde
/// el análisis anterior de esa columna, si lo hay) y lo guarda.
async fn show(app: AppHandle, current: Current, column: String, open: &Open, store: &Projects) -> Result<Value, String> {
    if let Some(v) = store.cached(&current.paths, current.sheet.as_deref(), current.union.as_ref(), &column) {
        *open.0.lock().unwrap() = Some(current);
        return Ok(from_store(v));
    }
    let (sheet, mut out) = analyze(app, current.clone(), column.clone()).await?;
    if let Some((before, since)) = store.before(&current.paths, current.sheet.as_deref(), current.union.as_ref(), &column) {
        out["cambios"] = compare(&before, &out, since);
    }
    store.save(&current.paths, current.sheet.as_deref(), current.union.as_ref(), &column, &out).map_err(|e| format!("No pude guardar el proyecto: {e}"))?;
    *open.0.lock().unwrap() = Some(Current { loaded: Some(sheet), ..current });
    Ok(out)
}

/// Al abrir: si el proyecto está guardado y ningún archivo cambió, lo último que se miró, sin leer la
/// planilla (`{listo}`); si cambió (el mes nuevo), lo mismo analizado de nuevo, con lo que cambió; si
/// es la primera vez, la lee y la limpia, y la pantalla pregunta qué analizar (`{elegir}`).
async fn start(app: AppHandle, current: Current, open: &Open, store: &Projects) -> Result<Value, String> {
    let (paths, sheet, union) = (&current.paths, current.sheet.as_deref(), current.union.as_ref());
    if let Some(v) = store.last(paths, sheet, union) {
        *open.0.lock().unwrap() = Some(current);
        return Ok(json!({ "listo": from_store(v) }));
    }
    if let Some(column) = store.analyzed(paths, sheet, union) {
        return Ok(json!({ "listo": show(app, current, column, open, store).await? }));
    }
    let reading = current.clone();
    let sheet = tauri::async_runtime::spawn_blocking(move || with_progress(&app, |progress| load(&app, &reading, progress)))
        .await
        .map_err(|e| e.to_string())??;
    let out = json!({ "elegir": choosing(&sheet) });
    *open.0.lock().unwrap() = Some(Current { loaded: Some(sheet), ..current });
    Ok(out)
}

/// Abre una planilla (CSV, Excel, JSON, Parquet o una base SQLite; en un Excel o una base, la hoja o la
/// tabla pedida, o la primera).
#[tauri::command]
async fn abrir_planilla(app: AppHandle, path: String, hoja: Option<String>, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let sheet = match hoja {
        Some(h) => Some(h),
        None => parts(Path::new(&path))?.and_then(|p| p.into_iter().next()),
    };
    logged("abrir_planilla", start(app, Current { paths: vec![path], sheet, union: None, loaded: None }, &open, &store).await)
}

/// Cómo quedarían unidas varias planillas con `union` (lo elegido; sin elegir, lo que sugiere MIO),
/// sin analizarlas: qué pasa con cada una, con qué claves se puede cruzar y cuántas filas y columnas
/// quedan. De cada Excel, la primera hoja.
#[tauri::command]
async fn revisar_union(app: AppHandle, paths: Vec<String>, union: Option<Value>) -> Result<Value, String> {
    if paths.len() < 2 {
        return Err("Elegí al menos dos planillas para unirlas.".into());
    }
    let review = tauri::async_runtime::spawn_blocking(move || with_progress(&app, |progress| {
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
    }));
    logged("revisar_union", review.await.map_err(|e| e.to_string())?)
}

/// Abre varias planillas juntas, unidas como dice `union` (o como sugiere MIO).
#[tauri::command]
async fn abrir_varias(app: AppHandle, paths: Vec<String>, union: Option<Value>, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    if paths.len() < 2 {
        return Err("Elegí al menos dos planillas para unirlas.".into());
    }
    logged("abrir_varias", start(app, Current { paths, sheet: None, union: choices_of(union), loaded: None }, &open, &store).await)
}

/// Analiza una columna de la planilla abierta (o muestra la guardada).
#[tauri::command]
async fn analizar(app: AppHandle, columna: String, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let current = open.0.lock().unwrap().clone().ok_or("Primero elegí una planilla.")?;
    logged("analizar", show(app, current, columna, &open, &store).await)
}

/// Cuántas filas se muestran de cada grupo en "Ver las filas".
const SAMPLE_ROWS: usize = 200;

/// Las filas de la planilla abierta donde `columna` vale alguno de `valores` (`Sheet::rows_where`), con
/// la suma de `objetivo`: de dónde sale un hallazgo. Si se abrió de lo guardado, la lee ahora.
#[tauri::command]
async fn filas(app: AppHandle, columna: String, valores: Vec<String>, objetivo: String, open: State<'_, Open>) -> Result<Value, String> {
    logged("filas", rows_of(app, columna, valores, objetivo, &open).await)
}

async fn rows_of(app: AppHandle, columna: String, valores: Vec<String>, objetivo: String, open: &Open) -> Result<Value, String> {
    with_sheet(app, open, move |sheet| sheet.rows_where(&columna, &valores, &objetivo, SAMPLE_ROWS)).await
}

/// La vista general de la planilla abierta (`overview.rs`): toda la tabla, antes de elegir qué analizar.
#[tauri::command]
async fn vista_general(app: AppHandle, open: State<'_, Open>) -> Result<Value, String> {
    logged("vista_general", with_sheet(app, &open, |sheet| Ok(overview(sheet))).await)
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
    logged("ingresar_con_google", google::sign_in(&app, pagina).await)
}

/// Guarda la planilla abierta, ya limpia (y unida, si eran varias), en `destino`: `formato` "csv" o "xlsx".
#[tauri::command]
async fn exportar(app: AppHandle, formato: String, destino: String, open: State<'_, Open>) -> Result<(), String> {
    logged("exportar", export_to(app, formato, destino, &open).await)
}

async fn export_to(app: AppHandle, formato: String, destino: String, open: &Open) -> Result<(), String> {
    with_sheet(app, open, move |sheet| {
        let path = Path::new(&destino);
        match formato.as_str() {
            "xlsx" => export::write_xlsx(&sheet.frame, path),
            _ => export::write_csv(&sheet.frame, path),
        }
    })
    .await
}

/// Guarda en `destino` un archivo que arma la ventana (la imagen o los datos de un gráfico), en base64.
#[tauri::command]
fn guardar_archivo(destino: String, datos: String) -> Result<(), String> {
    let bytes = BASE64.decode(datos).map_err(|_| "El archivo llegó roto; probá de nuevo.".to_string());
    logged("guardar_archivo", bytes.and_then(|b| std::fs::write(&destino, b).map_err(|e| format!("No pude guardarlo: {e}"))))
}

/// Abre el diálogo de impresión del sistema con lo que muestra la ventana (desde ahí, "Guardar como PDF").
#[tauri::command]
fn imprimir(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| format!("No pude abrir la impresión: {e}"))
}

/// Las planillas del ejemplo ("Probar con un ejemplo"), listas para abrir.
#[tauri::command]
fn ejemplo(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("ejemplo");
    logged("ejemplo", example::write_to(&dir).map_err(|e| format!("No pude preparar el ejemplo: {e}")))
}

/// La carpeta del registro de errores de esta compu (para mostrarla en "Tus datos").
#[tauri::command]
fn carpeta_registro(app: AppHandle) -> Result<String, String> {
    app.path().app_log_dir().map(|d| d.to_string_lossy().into_owned()).map_err(|e| e.to_string())
}

/// La versión nueva y qué trae, si hay una publicada (`plugins.updater` en `tauri.conf.json`: la última
/// versión en GitHub, firmada con la clave de MIO; lo que trae sale de `desktop/novedades.md`). Sin
/// conexión o si algo falla, nada: no es para molestar.
#[tauri::command]
async fn buscar_actualizacion(app: AppHandle) -> Option<Value> {
    let update = app.updater().ok()?.check().await.ok()??;
    Some(json!({ "version": update.version, "novedades": update.body }))
}

/// Baja la versión nueva, comprueba su firma, la instala y vuelve a abrir la app.
#[tauri::command]
async fn actualizar(app: AppHandle) -> Result<(), String> {
    logged("actualizar", install_update(&app).await)?;
    app.restart()
}

async fn install_update(app: &AppHandle) -> Result<(), String> {
    let failed = |e: tauri_plugin_updater::Error| format!("No pude actualizar: {e}");
    let update = app.updater().map_err(failed)?.check().await.map_err(failed)?.ok_or("Ya tenés la última versión.")?;
    update.download_and_install(|_, _| {}, || {}).await.map_err(failed)
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
    // Si la app se cae, que quede anotado (y después, lo de siempre: el mensaje en la terminal).
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log::error!("la app se cerró por un error: {info}");
        default(info);
    }));
    tauri::Builder::default()
        // El registro: un archivo en la carpeta de la app (hasta 1 MB; al llenarse, empieza otro y queda
        // el anterior), con las advertencias y los errores, también los de la pantalla.
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(Target::new(TargetKind::LogDir { file_name: Some("registro".into()) }))
                .level(log::LevelFilter::Warn)
                .max_file_size(1_000_000)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
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
        .invoke_handler(tauri::generate_handler![abrir_planilla, revisar_union, abrir_varias, analizar, cancelar, ejemplo, exportar, guardar_archivo, imprimir, proyectos, borrar_proyecto, carpeta_proyectos, ingresar_con_google, espacio_proyectos, borrar_proyectos, carpeta_registro, filas, buscar_actualizacion, actualizar, vista_general])
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
        // Antes del primer análisis, lo que se puede elegir.
        let c = choosing(&s);
        assert_eq!((&c["nombre"], &c["filas"], &c["n_columnas"]), (&json!("ventas.csv"), &json!(3), &json!(3)));
        assert_eq!(c["columnas"][0]["nombre"], "ventas");
    }
}
