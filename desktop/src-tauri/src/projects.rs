//! Proyectos guardados: cada planilla analizada queda en la carpeta de datos de la app (un archivo
//! por planilla, con el análisis de cada columna que se miró), así abrirla de nuevo muestra el
//! análisis sin volver a calcularlo. Si el archivo cambió (otro tamaño u otra fecha de modificación),
//! lo guardado no vale y se analiza de nuevo.

use rustc_hash::FxHasher;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// La clave del análisis con la columna que sugiere MIO (la primera vez que se abre).
const SUGGESTED: &str = "";

/// Lo que se muestra de un proyecto en la lista.
#[derive(Serialize, Deserialize, Clone)]
pub struct Meta {
    pub id: String,
    pub path: String,
    pub name: String,
    pub bytes: u64,
    /// Fecha de modificación del archivo cuando se analizó (segundos desde 1970).
    pub modified: u64,
    pub saved_at: u64,
    pub filas: u64,
    pub columnas: u64,
    pub calidad: i64,
    /// La última columna analizada.
    pub analizado: String,
}

#[derive(Serialize, Deserialize)]
struct Saved {
    meta: Meta,
    /// Lo que devolvió el análisis, por columna analizada (`SUGGESTED` = la que sugirió MIO).
    analyses: Map<String, Value>,
}

pub struct Projects {
    dir: PathBuf,
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs())
}

/// Tamaño y fecha de modificación del archivo, para saber si cambió.
fn stamp(path: &str) -> Option<(u64, u64)> {
    let m = std::fs::metadata(path).ok()?;
    let modified = m.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs();
    Some((m.len(), modified))
}

fn id_of(path: &str) -> String {
    let mut h = FxHasher::default();
    path.hash(&mut h);
    format!("{:016x}", h.finish())
}

impl Projects {
    pub fn new(dir: PathBuf) -> std::io::Result<Projects> {
        std::fs::create_dir_all(&dir)?;
        Ok(Projects { dir })
    }

    fn file(&self, id: &str) -> PathBuf {
        self.dir.join(format!("{id}.json"))
    }

    fn load(&self, id: &str) -> Option<Saved> {
        serde_json::from_slice(&std::fs::read(self.file(id)).ok()?).ok()
    }

    /// Los proyectos, del más reciente al más viejo.
    pub fn list(&self) -> Vec<Meta> {
        let mut out: Vec<Meta> = std::fs::read_dir(&self.dir)
            .into_iter()
            .flatten()
            .flatten()
            .filter_map(|e| e.path().file_stem().and_then(|s| self.load(&s.to_string_lossy())).map(|s| s.meta))
            .collect();
        out.sort_by(|a, b| b.saved_at.cmp(&a.saved_at));
        out
    }

    /// El análisis guardado de `column` (`None` = la sugerida), si el archivo no cambió desde entonces.
    pub fn cached(&self, path: &str, column: Option<&str>) -> Option<Value> {
        let saved = self.load(&id_of(path))?;
        let (bytes, modified) = stamp(path)?;
        if (saved.meta.bytes, saved.meta.modified) != (bytes, modified) {
            return None;
        }
        saved.analyses.get(column.unwrap_or(SUGGESTED)).cloned()
    }

    /// Guarda el análisis de `column` (`None` = la sugerida). Si el archivo cambió, lo anterior se descarta.
    pub fn save(&self, path: &str, column: Option<&str>, opened: &Value) -> std::io::Result<()> {
        let id = id_of(path);
        let (bytes, modified) = stamp(path).unwrap_or_default();
        let mut analyses = self.load(&id).filter(|s| (s.meta.bytes, s.meta.modified) == (bytes, modified)).map(|s| s.analyses).unwrap_or_default();
        let a = &opened["analisis"];
        let target = a["target_col"].as_str().unwrap_or_default().to_string();
        analyses.insert(column.unwrap_or(SUGGESTED).to_string(), opened.clone());
        analyses.insert(target.clone(), opened.clone());
        let meta = Meta {
            id: id.clone(),
            path: path.to_string(),
            name: Path::new(path).file_name().map_or_else(|| path.to_string(), |f| f.to_string_lossy().into_owned()),
            bytes,
            modified,
            saved_at: now(),
            filas: a["profile"]["n_rows"].as_u64().unwrap_or(0),
            columnas: a["profile"]["n_cols"].as_u64().unwrap_or(0),
            calidad: a["profile"]["quality_score"].as_i64().unwrap_or(0),
            analizado: target,
        };
        // Se escribe aparte y se reemplaza de una vez: un corte a mitad de camino no deja un archivo roto.
        let tmp = self.dir.join(format!("{id}.tmp"));
        std::fs::write(&tmp, serde_json::to_vec(&Saved { meta, analyses })?)?;
        std::fs::rename(tmp, self.file(&id))
    }

    pub fn remove(&self, id: &str) -> std::io::Result<()> {
        std::fs::remove_file(self.file(id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn guarda_y_vuelve_a_calcular_solo_si_el_archivo_cambia() {
        let dir = std::env::temp_dir().join("mio_proyectos_test");
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir.join("proyectos")).unwrap();
        let sheet = dir.join("ventas.csv");
        std::fs::write(&sheet, "a,b\n1,2\n").unwrap();
        let path = sheet.to_string_lossy().to_string();
        let opened = json!({ "analisis": { "target_col": "b", "profile": { "n_rows": 1, "n_cols": 2, "quality_score": 60 } } });
        store.save(&path, None, &opened).unwrap();
        assert_eq!(store.cached(&path, None), Some(opened.clone()));
        assert_eq!(store.cached(&path, Some("b")), Some(opened), "la sugerida también queda con su nombre");
        assert_eq!(store.list()[0].name, "ventas.csv");
        std::fs::write(&sheet, "a,b\n1,2\n3,4\n").unwrap(); // otro tamaño
        assert_eq!(store.cached(&path, None), None);
        store.remove(&store.list()[0].id).unwrap();
        assert!(store.list().is_empty());
    }
}
