//! Abrir y analizar: lo guardado si sigue valiendo; si no, leer, analizar, decir qué cambió desde la vez
//! anterior y guardarlo (`projects.rs`). Lo que recibe la pantalla sale de acá.

use crate::projects::Projects;
use crate::session::{in_background, load, prepare, Current, Filtered, Open};
use mio_engine::changes::{self, compare};
use mio_engine::explore::Condition;
use mio_engine::sheet::{Sheet, Source};
use serde_json::{json, Value};
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

/// Lo que sabe la app del archivo: su tamaño, las filas de título salteadas, en un Excel sus hojas y
/// la que se leyó, con varias planillas qué se hizo con cada una (`combinado`) y, de una base, si se
/// cortó en el tope y lo que no se pudo leer (`base`).
fn facts(s: &Sheet) -> Value {
    let (skipped, sheets, sheet, combined) = match &s.source {
        Source::Csv(f) => (f.skiprows, Vec::new(), None, Vec::new()),
        Source::Book { sheets, sheet } => (0, sheets.clone(), Some(sheet.clone()), Vec::new()),
        Source::Typed | Source::Base { .. } => (0, Vec::new(), None, Vec::new()),
        Source::Combined(steps) => (0, Vec::new(), None, steps.iter().map(|s| s.json()).collect()),
    };
    let base = match &s.source {
        Source::Base { truncated, limit, notes } => json!({ "cortada": truncated, "tope": limit, "avisos": notes }),
        _ => Value::Null,
    };
    json!({ "bytes": s.bytes, "filas_titulo": skipped, "hojas": sheets, "hoja": sheet, "combinado": combined, "base": base })
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

/// Lee la planilla (si hace falta) y analiza `column`, en un hilo aparte, avisando el avance.
async fn analyze(app: AppHandle, current: Current, column: String) -> Result<(Arc<Sheet>, Value), String> {
    in_background(app, move |app, progress| {
        let t = Instant::now();
        let sheet = load(app, &current, progress)?;
        let active = current.filter.as_ref().map_or(&sheet, |f| &f.sheet);
        let mut out = opened(active, active.analysis(Some(&column), progress)?, t.elapsed().as_secs_f64());
        if let Some(f) = &current.filter {
            out["filtro"] = json!({ "condiciones": f.conditions, "filas": active.frame.rows(), "filas_total": sheet.frame.rows() });
        }
        Ok((sheet, out))
    })
    .await
}

/// Muestra lo guardado de `column` si la planilla no cambió; si no, la analiza (con lo que cambió desde
/// el análisis anterior de esa columna, si lo hay) y lo guarda. Con un filtro no se guarda nada: el
/// proyecto es la planilla entera.
pub async fn show(app: AppHandle, current: Current, column: String, open: &Open, store: &Projects) -> Result<Value, String> {
    if current.filter.is_some() {
        let (sheet, out) = analyze(app, current.clone(), column).await?;
        open.set(Current { loaded: Some(sheet), ..current });
        return Ok(out);
    }
    if let Some(v) = store.cached(&current.origin, &column) {
        open.set(current.clone());
        prepare(&app, &current);
        return Ok(from_store(v));
    }
    let (sheet, mut out) = analyze(app.clone(), current.clone(), column.clone()).await?;
    if let Some((before, since)) = store.before(&current.origin, &column) {
        out["cambios"] = compare(&before, &out, since);
    }
    // De una base no queda nada en la compu: se guarda solo el resumen para decir qué cambió la próxima vez.
    let kept = if current.origin.is_base() { changes::summary(&out) } else { out.clone() };
    store.save(&current.origin, &column, &kept).map_err(|e| format!("No pude guardar el proyecto: {e}"))?;
    let current = Current { loaded: Some(sheet), ..current };
    open.set(current.clone());
    prepare(&app, &current);
    Ok(out)
}

/// Al abrir: si el proyecto está guardado y ningún archivo cambió, lo último que se miró, sin leer la
/// planilla (`{listo}`). Si se calculó con otra versión de MIO, lo mismo, marcado `desactualizado`: se
/// recalcula cuando la persona lo pide. De una base, antes de consultarla de nuevo se pregunta
/// (`{consultar}`: qué se miró, cuándo y cuántas filas). Si la planilla cambió (el mes nuevo), lo mismo
/// analizado de nuevo, con lo que cambió; si es la primera vez, la lee y la limpia, y la pantalla pregunta
/// qué analizar (`{elegir}`).
pub async fn start(app: AppHandle, current: Current, open: &Open, store: &Projects) -> Result<Value, String> {
    if let Some(v) = store.last(&current.origin) {
        open.set(current.clone());
        prepare(&app, &current);
        return Ok(json!({ "listo": from_store(v) }));
    }
    if let Some(mut v) = store.outdated(&current.origin) {
        // Sin preparar nada en segundo plano: leer la planilla es justo lo que la persona puede no querer ahora.
        open.set(current.clone());
        v["desactualizado"] = json!(true);
        return Ok(json!({ "listo": from_store(v) }));
    }
    if let (true, Some(card)) = (current.origin.is_base(), store.card(&current.origin)) {
        open.set(current.clone());
        return Ok(json!({ "consultar": { "columna": card.analizado, "desde": card.saved_at, "filas": card.filas, "nombre": card.name } }));
    }
    if let Some(column) = store.analyzed(&current.origin) {
        // La pantalla dice por qué vuelve a analizar algo que ya estaba guardado.
        if let Some(why) = store.stale(&current.origin) {
            let _ = app.emit("motivo", why);
        }
        return Ok(json!({ "listo": show(app, current, column, open, store).await? }));
    }
    let reading = current.clone();
    let sheet = in_background(app.clone(), move |app, progress| load(app, &reading, progress)).await?;
    let out = json!({ "elegir": choosing(&sheet) });
    let current = Current { loaded: Some(sheet), ..current };
    open.set(current.clone());
    prepare(&app, &current);
    Ok(out)
}

/// Se queda con las filas que cumplen `conditions` (sin ninguna, con toda la planilla) y analiza `column` sobre ellas.
pub async fn apply_filter(app: AppHandle, conditions: Vec<Value>, column: String, open: &Open, store: &Projects) -> Result<Value, String> {
    let current = open.current()?;
    if conditions.is_empty() {
        return show(app, Current { filter: None, ..current }, column, open, store).await;
    }
    let parsed = conditions.iter().map(Condition::from_json).collect::<Result<Vec<_>, _>>()?;
    let reading = current.clone();
    let (sheet, filtered) = in_background(app.clone(), move |app, progress| {
        let sheet = load(app, &reading, progress)?;
        let filtered = sheet.filtered(&parsed)?;
        Ok((sheet, filtered))
    })
    .await?;
    let filter = Some(Filtered { conditions, sheet: Arc::new(filtered) });
    show(app, Current { loaded: Some(sheet), filter, ..current }, column, open, store).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use mio_engine::progress::Progress;

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
