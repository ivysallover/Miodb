//! Lo abierto en la ventana: de dónde sale (`Origin`), la planilla ya leída y el filtro, y cómo se lee
//! (de a una, avisando el avance, cortando si se cancela), en un hilo aparte para no trabar la ventana.

use crate::bases::Bases;
use crate::origin::Origin;
use crate::projects::{Projects, View};
use mio_engine::combine::{Choices, Part};
use mio_engine::database::{self, Pick};
use mio_engine::progress::{Progress, Stage, CANCELLED};
use mio_engine::sheet::Sheet;
use serde_json::{json, Value};
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::{AppHandle, Emitter, Manager};

/// Lo abierto: de dónde sale y, si ya se leyó, la planilla (al abrir un proyecto guardado no se lee hasta
/// que se pide otra columna).
#[derive(Clone)]
pub struct Current {
    pub origin: Origin,
    pub loaded: Option<Arc<Sheet>>,
    /// Si se está mirando solo una parte: lo que todo lo demás (análisis, vista general, exportar) usa.
    pub filter: Option<Filtered>,
}

/// Las filas que quedaron con un filtro, y las condiciones como las mandó la pantalla.
#[derive(Clone)]
pub struct Filtered {
    pub conditions: Vec<Value>,
    pub sheet: Arc<Sheet>,
}

impl Current {
    pub fn new(origin: Origin) -> Current {
        Current { origin, loaded: None, filter: None }
    }
}

#[derive(Default)]
pub struct Open(Mutex<Option<Current>>);

/// El candado de un estado de la app. Si un trabajo se cortó con el candado tomado, se sigue con lo que
/// había: lo que guardan (qué planilla está abierta) vale igual, y trabarse dejaría la app sin poder abrir nada.
fn held<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

impl Open {
    pub fn get(&self) -> MutexGuard<'_, Option<Current>> {
        held(&self.0)
    }

    /// Lo abierto, o el pedido de abrir algo primero.
    pub fn current(&self) -> Result<Current, String> {
        self.get().clone().ok_or_else(|| "Primero abrí una planilla.".into())
    }

    pub fn set(&self, current: Current) {
        *self.get() = Some(current);
    }
}

/// De a una: si otra pantalla pide la planilla mientras se está leyendo, espera y usa la misma.
#[derive(Default)]
pub struct Reading(Mutex<()>);

/// Planillas leídas tal cual, con lo que pesan juntas.
pub type Read = Arc<(Vec<Part>, usize)>;

/// Las planillas leídas para unir (y sus rutas): revisar la unión y analizarla no las vuelve a leer.
#[derive(Default)]
pub struct Pending(Mutex<Option<(Vec<String>, Read)>>);

/// Las planillas leídas, de lo ya leído si son las mismas; si no, las lee (avisando el avance).
pub fn parts_of(paths: &[String], pending: &Pending, progress: &Progress) -> Result<Read, String> {
    if let Some((p, parts)) = held(&pending.0).as_ref() {
        if p == paths {
            return Ok(parts.clone());
        }
    }
    let read = Arc::new(Sheet::read_parts(&paths.iter().map(Path::new).collect::<Vec<_>>(), progress)?);
    *held(&pending.0) = Some((paths.to_vec(), read.clone()));
    Ok(read)
}

/// Anota en el registro de esta compu (`carpeta_registro`) lo que falló, salvo cancelar, que no es una
/// falla. El registro no sale de la compu: sirve para ver qué pasó.
pub fn logged<T>(what: &str, r: Result<T, String>) -> Result<T, String> {
    if let Err(e) = &r {
        if e != CANCELLED {
            log::error!("{what}: {e}");
        }
    }
    r
}

/// Un trabajo que se cortó por un error adentro de MIO: queda en el registro y la pantalla lo dice en palabras.
pub fn crashed(e: tauri::Error) -> String {
    log::error!("un trabajo se cortó: {e}");
    "Algo falló adentro de MIO con estos datos. Quedó anotado en el registro (Ajustes → Tus datos): si se repite, mandanos ese archivo.".into()
}

/// El turno de los trabajos (leer, unir, analizar): cancelar lo avanza, y un trabajo corta en su
/// próxima etapa apenas el turno ya no es el suyo. Así cancelar y empezar otro enseguida no deja al
/// anterior corriendo.
#[derive(Default)]
pub struct Turn(AtomicU64);

impl Turn {
    pub fn cancel(&self) {
        self.0.fetch_add(1, Ordering::Relaxed);
    }
}

/// Hace `work` avisando cada etapa a la ventana (evento `progreso`: {etapa, avance}) y cortando si la
/// persona cancela (`cancelar`).
pub fn with_progress<T>(app: &AppHandle, work: impl FnOnce(&Progress) -> Result<T, String>) -> Result<T, String> {
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

/// Hace `work` en un hilo aparte, avisando el avance; si se cae adentro, lo dice en palabras.
pub async fn in_background<T: Send + 'static>(app: AppHandle, work: impl FnOnce(&AppHandle, &Progress) -> Result<T, String> + Send + 'static) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(move || with_progress(&app, |progress| work(&app, progress))).await.map_err(crashed)?
}

/// La planilla abierta, ya leída y limpia (si se abrió de lo guardado, la lee ahora).
pub fn load(app: &AppHandle, current: &Current, progress: &Progress) -> Result<Arc<Sheet>, String> {
    if let Some(s) = &current.loaded {
        return Ok(s.clone());
    }
    let reading = app.state::<Reading>();
    let _one_at_a_time = held(&reading.0);
    let open = app.state::<Open>();
    if let Some(s) = open.get().as_ref().filter(|c| c.origin == current.origin).and_then(|c| c.loaded.clone()) {
        return Ok(s);
    }
    let sheet = Arc::new(match &current.origin {
        Origin::Base { id, pick } => from_base(app, id, pick, progress)?,
        Origin::Files { paths, sheet, union } => match &paths[..] {
            [one] => Sheet::open(Path::new(one), sheet.as_deref(), progress)?,
            many => {
                let read = parts_of(many, &app.state::<Pending>(), progress)?;
                let choices = union.as_ref().map(Choices::from_json).unwrap_or_default();
                Sheet::from_parts(read.0.clone(), read.1, &choices, progress)?
            }
        },
    });
    remember(&open, current, sheet.clone());
    Ok(sheet)
}

/// Consulta lo elegido (`pick`) de la conexión `id` y lo deja como una planilla.
fn from_base(app: &AppHandle, id: &str, pick: &str, progress: &Progress) -> Result<Sheet, String> {
    let bases = app.state::<Bases>();
    let saved = bases.get(id)?;
    let pick = Pick::from_json(&serde_json::from_str(pick).unwrap_or_default())?;
    let server = bases.server_of(&saved)?;
    let read = tauri::async_runtime::block_on(database::read(&server, &pick, saved.tope, progress))?;
    Sheet::from_base(format!("{} · {}", saved.nombre, pick.label()), read, saved.tope, progress)
}

/// Deja anotada la planilla leída, si lo abierto sigue siendo lo mismo (mientras se trabajaba pudo
/// abrirse otra o cambiar el filtro, que no hay que pisar).
pub fn remember(open: &Open, read: &Current, sheet: Arc<Sheet>) {
    if let Some(c) = open.get().as_mut().filter(|c| c.origin == read.origin) {
        c.loaded = Some(sheet);
    }
}

/// Hace `work` con lo que se está mirando (la planilla o lo que quedó del filtro), ya leído y limpio (si
/// se abrió de lo guardado, la lee ahora, avisando el avance), en un hilo aparte; queda leída para lo
/// próximo (otra columna, exportar, las filas).
pub async fn with_sheet<T: Send + 'static>(app: AppHandle, open: &Open, work: impl FnOnce(&Sheet) -> Result<T, String> + Send + 'static) -> Result<T, String> {
    let current = open.current()?;
    let reading = current.clone();
    let (sheet, out) = in_background(app, move |app, progress| {
        let sheet = load(app, &reading, progress)?;
        let out = work(reading.filter.as_ref().map_or(&sheet, |f| &f.sheet))?;
        Ok((sheet, out))
    })
    .await?;
    remember(open, &current, sheet);
    Ok(out)
}

/// Hasta este tamaño la planilla se deja leída en segundo plano al abrirla: es un momento y Tabla dinámica y
/// Comparar quedan al instante. Más grande, se lee recién cuando hace falta.
const READ_AHEAD_BYTES: u64 = 50_000_000;

/// Deja listo en segundo plano lo que piden las otras pantallas: lo de toda la planilla, una sola vez (queda
/// guardado con el proyecto y abrirlo de nuevo no vuelve a calcular nada) y, si es chica, la planilla leída.
/// Si mientras tanto se abre otra, corta.
pub fn prepare(app: &AppHandle, current: &Current) {
    if current.filter.is_some() {
        return;
    }
    let store = app.state::<Projects>();
    let saved = store.view(&current.origin, View::Overview).is_some() && store.view(&current.origin, View::Fields).is_some();
    if saved && current.loaded.is_none() && current.origin.bytes() > READ_AHEAD_BYTES {
        return;
    }
    let (app, current) = (app.clone(), current.clone());
    tauri::async_runtime::spawn_blocking(move || {
        let open = app.state::<Open>();
        let stopped = || !open.get().as_ref().is_some_and(|c| c.origin == current.origin);
        let quiet = |_: Stage, _: Option<f64>| ();
        if let Ok(sheet) = load(&app, &current, &Progress::cancellable(&quiet, &stopped)) {
            if !saved {
                keep_view(&app, &current, View::Fields, sheet.fields());
                keep_view(&app, &current, View::Overview, sheet.overview());
            }
        }
    });
}

/// Guarda lo calculado de toda la planilla; si no se puede, solo se calculará de nuevo.
fn keep_view(app: &AppHandle, current: &Current, which: View, value: &Value) {
    // De una base no se guarda nada (y abrirla consulta siempre: lo guardado no se usaría).
    if current.origin.is_base() {
        return;
    }
    if let Err(e) = app.state::<Projects>().save_view(&current.origin, which, value) {
        log::warn!("no pude guardar lo de toda la planilla: {e}");
    }
}

/// Lo de toda la planilla: lo guardado si sigue valiendo (sin leerla); si no, lo calcula y lo guarda. Con un
/// filtro, siempre de lo que quedó (`whole` pide lo de la planilla entera, aunque haya filtro).
pub async fn whole_sheet_view(app: AppHandle, open: &Open, which: View, whole: bool) -> Result<Value, String> {
    let current = open.current()?;
    let unfiltered = whole || current.filter.is_none();
    if unfiltered {
        if let Some(v) = app.state::<Projects>().view(&current.origin, which) {
            return Ok(v);
        }
    }
    let reading = if whole { Current { filter: None, ..current.clone() } } else { current.clone() };
    let (sheet, out) = in_background(app.clone(), move |app, progress| {
        let sheet = load(app, &reading, progress)?;
        let active = reading.filter.as_ref().map_or(&sheet, |f| &f.sheet);
        let out = match which {
            View::Overview => active.overview().clone(),
            View::Fields => active.fields().clone(),
        };
        Ok((sheet, out))
    })
    .await?;
    remember(open, &current, sheet);
    if unfiltered {
        keep_view(&app, &current, which, &out);
    }
    Ok(out)
}
