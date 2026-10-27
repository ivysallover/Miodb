//! Proyectos guardados: cada planilla analizada queda en la carpeta de datos de la app (un archivo
//! por planilla, por hoja de un Excel o por grupo de planillas unidas, con el análisis de cada columna
//! que se miró), así abrirla de nuevo muestra el análisis sin volver a calcularlo. Si alguno de los
//! archivos cambió (otro tamaño u otra fecha de modificación), lo guardado no vale y se analiza de nuevo.

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
    /// El archivo (el primero, si son varias planillas unidas).
    pub path: String,
    /// Todos los archivos, si son varias planillas unidas (si es una sola, vacío).
    #[serde(default)]
    pub archivos: Vec<String>,
    /// Con varias planillas, lo que se eligió al revisar la unión (`combine::Choices`), si no es lo sugerido.
    #[serde(default)]
    pub union: Option<Value>,
    pub name: String,
    /// La hoja, en un Excel.
    pub hoja: Option<String>,
    pub bytes: u64,
    /// Fecha de modificación del archivo cuando se analizó (segundos desde 1970; con varios, la más nueva).
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

/// Tamaño y fecha de modificación de los archivos, para saber si alguno cambió (la suma de los
/// tamaños y la fecha más nueva: editar cualquiera cambia una de las dos).
fn stamp(paths: &[String]) -> Option<(u64, u64)> {
    paths.iter().try_fold((0, 0), |(bytes, newest), path| {
        let m = std::fs::metadata(path).ok()?;
        let modified = m.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs();
        Some((bytes + m.len(), newest.max(modified)))
    })
}

/// El proyecto de esos archivos (en cualquier orden), esa hoja y esa manera de unirlos.
fn id_of(paths: &[String], sheet: Option<&str>, union: Option<&Value>) -> String {
    let mut sorted: Vec<&String> = paths.iter().collect();
    sorted.sort();
    let mut h = FxHasher::default();
    if let [one] = sorted[..] {
        (one.as_str(), sheet).hash(&mut h); // igual que antes de poder unir planillas: los guardados siguen valiendo
    } else {
        (sorted, sheet, union.map(Value::to_string)).hash(&mut h);
    }
    format!("{:016x}", h.finish())
}

impl Projects {
    pub fn new(dir: PathBuf) -> std::io::Result<Projects> {
        std::fs::create_dir_all(&dir)?;
        // Un guardado que se cortó (la app se cerró a mitad de camino) deja solo su archivo aparte: se borra.
        for e in std::fs::read_dir(&dir)?.flatten() {
            if e.path().extension().is_some_and(|x| x == "tmp") {
                let _ = std::fs::remove_file(e.path());
            }
        }
        Ok(Projects { dir })
    }

    pub fn dir(&self) -> &Path {
        &self.dir
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
        out.sort_by_key(|m| std::cmp::Reverse(m.saved_at));
        out
    }

    /// El análisis guardado de `column` (`None` = la sugerida) de las planillas (y hoja), si ningún
    /// archivo cambió desde entonces.
    pub fn cached(&self, paths: &[String], sheet: Option<&str>, union: Option<&Value>, column: Option<&str>) -> Option<Value> {
        let saved = self.load(&id_of(paths, sheet, union))?;
        let (bytes, modified) = stamp(paths)?;
        if (saved.meta.bytes, saved.meta.modified) != (bytes, modified) {
            return None;
        }
        saved.analyses.get(column.unwrap_or(SUGGESTED)).cloned()
    }

    /// Guarda el análisis de `column` (`None` = la sugerida). Si el archivo cambió, lo anterior se descarta.
    pub fn save(&self, paths: &[String], sheet: Option<&str>, union: Option<&Value>, column: Option<&str>, opened: &Value) -> std::io::Result<()> {
        let id = id_of(paths, sheet, union);
        let (bytes, modified) = stamp(paths).unwrap_or_default();
        let mut analyses = self.load(&id).filter(|s| (s.meta.bytes, s.meta.modified) == (bytes, modified)).map(|s| s.analyses).unwrap_or_default();
        let a = &opened["analisis"];
        let target = a["target_col"].as_str().unwrap_or_default().to_string();
        analyses.insert(column.unwrap_or(SUGGESTED).to_string(), opened.clone());
        analyses.insert(target.clone(), opened.clone());
        let path = paths.first().cloned().unwrap_or_default();
        let meta = Meta {
            id: id.clone(),
            name: a["filename"].as_str().map_or_else(|| Path::new(&path).file_name().map_or_else(|| path.clone(), |f| f.to_string_lossy().into_owned()), str::to_string),
            path,
            archivos: if paths.len() > 1 { paths.to_vec() } else { Vec::new() },
            union: union.cloned(),
            hoja: sheet.map(str::to_string),
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

    /// Los archivos de los proyectos guardados.
    fn files(&self) -> impl Iterator<Item = std::fs::DirEntry> {
        std::fs::read_dir(&self.dir).into_iter().flatten().flatten().filter(|e| e.path().extension().is_some_and(|x| x == "json"))
    }

    /// Cuánto ocupan, en bytes.
    pub fn size(&self) -> u64 {
        self.files().filter_map(|e| e.metadata().ok()).map(|m| m.len()).sum()
    }

    /// Borra todos (las planillas no se tocan).
    pub fn clear(&self) -> std::io::Result<()> {
        self.files().try_for_each(|e| std::fs::remove_file(e.path()))
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
        let path = vec![sheet.to_string_lossy().to_string()];
        let opened = json!({ "analisis": { "target_col": "b", "profile": { "n_rows": 1, "n_cols": 2, "quality_score": 60 } } });
        store.save(&path, None, None, None, &opened).unwrap();
        assert_eq!(store.cached(&path, None, None, None), Some(opened.clone()));
        assert_eq!(store.cached(&path, None, None, Some("b")), Some(opened), "la sugerida también queda con su nombre");
        assert_eq!(store.cached(&path, Some("Hoja2"), None, None), None, "otra hoja es otro proyecto");
        assert_eq!(store.list()[0].name, "ventas.csv");
        std::fs::write(&sheet, "a,b\n1,2\n3,4\n").unwrap(); // otro tamaño
        assert_eq!(store.cached(&path, None, None, None), None);
        store.remove(&store.list()[0].id).unwrap();
        assert!(store.list().is_empty());
    }

    #[test]
    fn varias_planillas_son_un_proyecto_y_vale_mientras_ninguna_cambie() {
        let dir = std::env::temp_dir().join("mio_proyectos_varias_test");
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir.join("proyectos")).unwrap();
        let (a, b) = (dir.join("enero.csv"), dir.join("febrero.csv"));
        std::fs::write(&a, "x\n1\n").unwrap();
        std::fs::write(&b, "x\n2\n").unwrap();
        let paths = vec![a.to_string_lossy().to_string(), b.to_string_lossy().to_string()];
        let opened = json!({ "analisis": { "filename": "enero.csv y 1 más", "target_col": "x", "profile": { "n_rows": 2, "n_cols": 2, "quality_score": 50 } } });
        store.save(&paths, None, None, None, &opened).unwrap();
        let reversed: Vec<String> = paths.iter().rev().cloned().collect();
        assert_eq!(store.cached(&reversed, None, None, None), Some(opened), "el orden de los archivos no importa");
        assert_eq!(store.cached(&paths[..1], None, None, None), None, "una sola es otro proyecto");
        let m = &store.list()[0];
        assert_eq!((m.name.as_str(), m.archivos.len()), ("enero.csv y 1 más", 2));
        let other = json!({ "fuera": ["febrero.csv"], "claves": {} });
        assert_eq!(store.cached(&paths, None, Some(&other), None), None, "otra manera de unirlas es otro proyecto");
        std::fs::write(&b, "x\n2\n3\n").unwrap(); // cambia la segunda
        assert_eq!(store.cached(&paths, None, None, None), None);
    }

    #[test]
    fn borrar_todos_deja_las_planillas_y_lo_que_no_es_un_proyecto() {
        let dir = std::env::temp_dir().join("mio_proyectos_borrar_test");
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir.clone()).unwrap();
        let sheet = dir.join("ventas.csv");
        std::fs::write(&sheet, "a,b\n1,2\n").unwrap();
        let path = vec![sheet.to_string_lossy().to_string()];
        let opened = json!({ "analisis": { "target_col": "b", "profile": { "n_rows": 1, "n_cols": 2, "quality_score": 60 } } });
        store.save(&path, None, None, None, &opened).unwrap();
        store.save(&path, Some("Hoja2"), None, None, &opened).unwrap();
        assert_eq!(store.list().len(), 2);
        assert!(store.size() > 0);
        store.clear().unwrap();
        assert!(store.list().is_empty());
        assert_eq!(store.size(), 0);
        assert!(sheet.exists(), "la planilla no se toca");
        std::fs::write(dir.join("a_medias.tmp"), b"{").unwrap();
        Projects::new(dir.clone()).unwrap();
        assert!(!dir.join("a_medias.tmp").exists(), "un guardado cortado no queda");
    }
}
