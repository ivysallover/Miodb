//! Lo que la ventana le puede pedir a la app (con los mismos nombres que usa `src/components/escritorio/desktop.ts`).

use crate::analysis::{apply_filter, show, start};
use crate::bases::{Bases, Saved};
use crate::origin::Origin;
use crate::projects::{Meta, Projects, View};
use crate::session::{in_background, logged, parts_of, whole_sheet_view, with_sheet, Current, Open, Pending, Turn};
use crate::{example, google};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use mio_engine::combine::{combine_with, Choices};
use mio_engine::database::{self, Pick};
use mio_engine::explore::{self, Pivot};
use mio_engine::export;
use mio_engine::sheet::first_part;
use serde_json::{json, Value};
use std::path::Path;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_updater::UpdaterExt;

/// Abre una planilla (CSV, Excel, JSON, Parquet o una base SQLite; en un Excel o una base, la hoja o la
/// tabla pedida, o la primera).
#[tauri::command]
pub async fn abrir_planilla(app: AppHandle, path: String, hoja: Option<String>, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let sheet = match hoja {
        Some(h) => Some(h),
        None => first_part(Path::new(&path))?,
    };
    logged("abrir_planilla", start(app, Current::new(Origin::file(path, sheet)), &open, &store).await)
}

fn at_least_two(paths: &[String]) -> Result<(), String> {
    if paths.len() < 2 {
        return Err("Elegí al menos dos planillas para unirlas.".into());
    }
    Ok(())
}

/// Cómo quedarían unidas varias planillas con `union` (lo elegido; sin elegir, lo que sugiere MIO),
/// sin analizarlas: qué pasa con cada una, con qué claves se puede cruzar y cuántas filas y columnas
/// quedan. De cada Excel, la primera hoja.
#[tauri::command]
pub async fn revisar_union(app: AppHandle, paths: Vec<String>, union: Option<Value>) -> Result<Value, String> {
    at_least_two(&paths)?;
    let review = in_background(app, move |app, progress| {
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
    });
    logged("revisar_union", review.await)
}

/// Abre varias planillas juntas, unidas como dice `union` (o como sugiere MIO).
#[tauri::command]
pub async fn abrir_varias(app: AppHandle, paths: Vec<String>, union: Option<Value>, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    at_least_two(&paths)?;
    // Lo elegido al revisar la unión, o `None` si es lo que MIO sugiere (así el proyecto es el mismo).
    let union = union.filter(|v| Choices::from_json(v) != Choices::default());
    logged("abrir_varias", start(app, Current::new(Origin::Files { paths, sheet: None, union }), &open, &store).await)
}

/// Abre lo elegido de una base (`{tabla, esquema}` o `{consulta}`) como una planilla: la primera vez
/// pregunta qué analizar; después, vuelve a consultar y dice qué cambió.
#[tauri::command]
pub async fn abrir_base(app: AppHandle, id: String, eleccion: Value, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    // Lo elegido, siempre escrito igual: es parte de qué proyecto es.
    let pick = Pick::from_json(&eleccion)?.to_json().to_string();
    logged("abrir_base", start(app, Current::new(Origin::Base { id, pick }), &open, &store).await)
}

/// Analiza una columna de la planilla abierta (o muestra la guardada).
#[tauri::command]
pub async fn analizar(app: AppHandle, columna: String, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    let current = open.current()?;
    logged("analizar", show(app, current, columna, &open, &store).await)
}

/// Se queda con las filas que cumplen `condiciones` (sin ninguna, con toda la planilla) y analiza `columna` sobre ellas.
#[tauri::command]
pub async fn filtrar(app: AppHandle, condiciones: Vec<Value>, columna: String, open: State<'_, Open>, store: State<'_, Projects>) -> Result<Value, String> {
    logged("filtrar", apply_filter(app, condiciones, columna, &open, &store).await)
}

/// Cuántas filas se muestran de cada grupo en "Ver las filas".
const SAMPLE_ROWS: usize = 200;

/// Las filas de la planilla abierta donde `columna` vale alguno de `valores` (`Sheet::rows_where`), con
/// la suma de `objetivo`: de dónde sale un hallazgo. Si se abrió de lo guardado, la lee ahora.
#[tauri::command]
pub async fn filas(app: AppHandle, columna: String, valores: Vec<String>, objetivo: String, open: State<'_, Open>) -> Result<Value, String> {
    logged("filas", with_sheet(app, &open, move |sheet| sheet.rows_where(&columna, &valores, &objetivo, SAMPLE_ROWS)).await)
}

/// La vista general de la planilla abierta (`overview.rs`): toda la tabla, antes de elegir qué analizar.
#[tauri::command]
pub async fn vista_general(app: AppHandle, open: State<'_, Open>) -> Result<Value, String> {
    logged("vista_general", whole_sheet_view(app, &open, View::Overview, false).await)
}

/// Lo que se puede elegir de cada columna de la planilla abierta, sin ningún filtro (`explore::fields`).
#[tauri::command]
pub async fn campos(app: AppHandle, open: State<'_, Open>) -> Result<Value, String> {
    logged("campos", whole_sheet_view(app, &open, View::Fields, true).await)
}

/// Una tabla dinámica de lo que se está mirando (`explore::pivot`).
#[tauri::command]
pub async fn tabla_dinamica(app: AppHandle, pedido: Value, open: State<'_, Open>) -> Result<Value, String> {
    let work = async move {
        let request = Pivot::from_json(&pedido)?;
        with_sheet(app, &open, move |sheet| explore::pivot(sheet, &request)).await
    };
    logged("tabla_dinamica", work.await)
}

/// Dos valores de una columna, lado a lado (`explore::compare`), de lo que se está mirando.
#[tauri::command]
pub async fn comparar(app: AppHandle, columna: String, a: String, b: String, objetivo: Option<String>, open: State<'_, Open>) -> Result<Value, String> {
    logged("comparar", with_sheet(app, &open, move |sheet| explore::compare(sheet, &columna, &a, &b, objetivo.as_deref())).await)
}

/// Dónde puede escribir la app lo que le pide la ventana: un archivo con una de las extensiones de lo que
/// exporta, en una carpeta que existe. El lugar lo elige la persona en el diálogo de guardar; esto es por si
/// la ventana pidiera otra cosa (un `.zshrc`, un programa, un archivo de inicio): ahí nunca se escribe.
fn destination(path: &str, allowed: &[&str]) -> Result<(), String> {
    let path = Path::new(path);
    let ext = path.extension().and_then(|e| e.to_str()).map(str::to_lowercase).unwrap_or_default();
    if !path.is_absolute() || !allowed.contains(&ext.as_str()) {
        return Err(format!("Solo se puede guardar como {}.", allowed.iter().map(|e| format!(".{e}")).collect::<Vec<_>>().join(" o ")));
    }
    match path.parent() {
        Some(dir) if dir.is_dir() => Ok(()),
        _ => Err("Esa carpeta no existe.".into()),
    }
}

/// La extensión de lo que se exporta en `formato` ("xlsx" o, si no, CSV).
fn excel(formato: &str) -> bool {
    formato == "xlsx"
}

/// Guarda en `destino` una tabla dinámica, en Excel o CSV.
#[tauri::command]
pub async fn exportar_tabla(app: AppHandle, pedido: Value, formato: String, destino: String, open: State<'_, Open>) -> Result<(), String> {
    let xlsx = excel(&formato);
    let ready = Pivot::from_json(&pedido).and_then(|r| destination(&destino, &[if xlsx { "xlsx" } else { "csv" }]).map(|()| r));
    let work = async move {
        let request = ready?;
        with_sheet(app, &open, move |sheet| export::write_grid(&explore::grid(&explore::pivot(sheet, &request)?), xlsx, Path::new(&destino))).await
    };
    logged("exportar_tabla", work.await)
}

/// Guarda la planilla abierta, ya limpia (y unida, si eran varias), en `destino`: `formato` "csv" o "xlsx".
#[tauri::command]
pub async fn exportar(app: AppHandle, formato: String, destino: String, open: State<'_, Open>) -> Result<(), String> {
    let xlsx = excel(&formato);
    let work = async move {
        destination(&destino, &[if xlsx { "xlsx" } else { "csv" }])?;
        with_sheet(app, &open, move |sheet| {
            let path = Path::new(&destino);
            if xlsx {
                export::write_xlsx(&sheet.frame, path)
            } else {
                export::write_csv(&sheet.frame, path)
            }
        })
        .await
    };
    logged("exportar", work.await)
}

/// Guarda en `destino` un archivo que arma la ventana (la imagen o los datos de un gráfico), en base64.
#[tauri::command]
pub fn guardar_archivo(destino: String, datos: String) -> Result<(), String> {
    let bytes = destination(&destino, &["png", "csv"]).and_then(|()| BASE64.decode(datos).map_err(|_| "El archivo llegó roto; probá de nuevo.".to_string()));
    logged("guardar_archivo", bytes.and_then(|b| std::fs::write(&destino, b).map_err(|e| format!("No pude guardarlo: {e}"))))
}

/// Abre el diálogo de impresión del sistema con lo que muestra la ventana (desde ahí, "Guardar como PDF").
#[tauri::command]
pub fn imprimir(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| format!("No pude abrir la impresión: {e}"))
}

/// Los proyectos guardados, del más reciente al más viejo.
#[tauri::command]
pub async fn proyectos(store: State<'_, Projects>) -> Result<Vec<Meta>, String> {
    Ok(store.list())
}

/// La carpeta donde quedan los proyectos guardados (para mostrarla en Ajustes).
#[tauri::command]
pub fn carpeta_proyectos(store: State<'_, Projects>) -> String {
    store.dir().to_string_lossy().into_owned()
}

/// Cuánto ocupan los proyectos guardados, en bytes (para Ajustes).
#[tauri::command]
pub fn espacio_proyectos(store: State<'_, Projects>) -> u64 {
    store.size()
}

/// Borra un proyecto guardado (la planilla no se toca).
#[tauri::command]
pub fn borrar_proyecto(id: String, store: State<'_, Projects>) -> Result<(), String> {
    store.remove(&id).map_err(|e| format!("No pude borrar el proyecto: {e}"))
}

/// Borra todos los proyectos guardados (las planillas no se tocan).
#[tauri::command]
pub fn borrar_proyectos(store: State<'_, Projects>) -> Result<(), String> {
    store.clear().map_err(|e| format!("No pude borrar los proyectos: {e}"))
}

/// Cancela lo que se esté leyendo, uniendo o analizando: corta en la próxima etapa y no se guarda nada.
#[tauri::command]
pub fn cancelar(turn: State<'_, Turn>) {
    turn.cancel();
}

/// Entra con Google en el navegador de la compu (`google.rs`); devuelve la credencial para entrar a
/// Firebase. `pagina` es la página de ingreso del servidor de desarrollo; sin ella, la sirve la app.
#[tauri::command]
pub async fn ingresar_con_google(app: AppHandle, pagina: Option<String>) -> Result<String, String> {
    logged("ingresar_con_google", google::sign_in(&app, pagina).await)
}

/// Las planillas del ejemplo ("Probar con un ejemplo"), listas para abrir.
#[tauri::command]
pub fn ejemplo(app: AppHandle) -> Result<Vec<String>, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("ejemplo");
    logged("ejemplo", example::write_to(&dir).map_err(|e| format!("No pude preparar el ejemplo: {e}")))
}

/// La carpeta del registro de errores de esta compu (para mostrarla en "Tus datos").
#[tauri::command]
pub fn carpeta_registro(app: AppHandle) -> Result<String, String> {
    app.path().app_log_dir().map(|d| d.to_string_lossy().into_owned()).map_err(|e| e.to_string())
}

/// La versión nueva y qué trae, si hay una publicada (`plugins.updater` en `tauri.conf.json`: la última
/// versión en GitHub, firmada con la clave de MIO; lo que trae sale de `desktop/novedades.md`). Sin
/// conexión o si algo falla, nada: no es para molestar.
#[tauri::command]
pub async fn buscar_actualizacion(app: AppHandle) -> Option<Value> {
    let update = app.updater().ok()?.check().await.ok()??;
    Some(json!({ "version": update.version, "novedades": update.body }))
}

/// Baja la versión nueva, comprueba su firma, la instala y vuelve a abrir la app.
#[tauri::command]
pub async fn actualizar(app: AppHandle) -> Result<(), String> {
    logged("actualizar", install_update(&app).await)?;
    app.restart()
}

async fn install_update(app: &AppHandle) -> Result<(), String> {
    let failed = |e: tauri_plugin_updater::Error| format!("No pude actualizar: {e}");
    let update = app.updater().map_err(failed)?.check().await.map_err(failed)?.ok_or("Ya tenés la última versión.")?;
    update.download_and_install(|_, _| {}, || {}).await.map_err(failed)
}

/// Las conexiones a bases guardadas (sin contraseñas).
#[tauri::command]
pub fn conexiones(bases: State<'_, Bases>) -> Vec<Saved> {
    bases.list()
}

/// Guarda una conexión (nueva, o la misma si trae `id`); la contraseña, si viene, va al llavero.
#[tauri::command]
pub fn guardar_conexion(conexion: Value, contrasena: Option<String>, bases: State<'_, Bases>) -> Result<Saved, String> {
    logged("guardar_conexion", bases.save(&conexion, contrasena))
}

/// Borra una conexión y su contraseña del llavero.
#[tauri::command]
pub fn borrar_conexion(id: String, bases: State<'_, Bases>) -> Result<(), String> {
    bases.remove(&id)
}

/// Prueba lo que está escrito en la pantalla (con la contraseña escrita o, si no, la guardada): la versión
/// del servidor y si la conexión va cifrada.
#[tauri::command]
pub async fn probar_conexion(conexion: Value, contrasena: Option<String>, bases: State<'_, Bases>) -> Result<Value, String> {
    let server = bases.server(&conexion, contrasena)?;
    logged("probar_conexion", database::check(&server).await)
}

/// Las tablas y vistas de una conexión guardada, con cuántas filas tienen más o menos.
#[tauri::command]
pub async fn tablas_de_base(id: String, bases: State<'_, Bases>) -> Result<Value, String> {
    let server = bases.server_of(&bases.get(&id)?)?;
    logged("tablas_de_base", database::tables(&server).await)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// La ventana solo hace escribir lo que exporta, donde hay carpeta: nunca un archivo de la compu.
    #[test]
    fn solo_se_escribe_lo_que_se_exporta() {
        let dir = std::env::temp_dir();
        let at = |name: &str| dir.join(name).to_string_lossy().into_owned();
        assert!(destination(&at("ventas.csv"), &["csv"]).is_ok());
        assert!(destination(&at("Ventas.XLSX"), &["xlsx"]).is_ok());
        assert!(destination(&at(".zshrc"), &["png", "csv"]).is_err());
        assert!(destination(&at("algo.plist"), &["png", "csv"]).is_err());
        assert!(destination(&at("ventas.csv"), &["xlsx"]).is_err());
        assert!(destination("ventas.csv", &["csv"]).is_err(), "sin carpeta no");
        assert!(destination(&dir.join("no-existe-esta-carpeta").join("a.csv").to_string_lossy(), &["csv"]).is_err());
    }
}
