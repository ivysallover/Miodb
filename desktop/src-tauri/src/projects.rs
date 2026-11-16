//! Proyectos guardados: cada planilla analizada queda en la carpeta de datos de la app (un proyecto por
//! planilla, por hoja de un Excel, por grupo de planillas unidas o por lo elegido de una base, con el
//! análisis de cada columna que se miró), así abrirla de nuevo muestra el análisis sin volver a
//! calcularlo. Si alguno de los archivos cambió (otro tamaño u otra fecha de modificación), lo guardado no
//! vale y se analiza de nuevo.
//!
//! Cada proyecto son hasta tres archivos: `<id>.json`, la ficha para la lista (chica: listar no lee los
//! análisis); `<id>.analisis`, los análisis por columna y los de antes, comprimidos; y `<id>.vistas`, lo de
//! toda la planilla, también comprimido. Los proyectos de antes (todo en `<id>.json`, sin comprimir) se
//! siguen leyendo y pasan al formato nuevo la próxima vez que se guardan.

use crate::origin::Origin;
use flate2::{read::GzDecoder, write::GzEncoder, Compression};
use mio_engine::changes;
use mio_engine::sheet::ENGINE_VERSION;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{Map, Value};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

/// Lo que se muestra de un proyecto en la lista.
#[derive(Serialize, Deserialize, Clone)]
pub struct Meta {
    pub id: String,
    /// El archivo (el primero, si son varias planillas unidas; `base://<id>` si es de una base).
    pub path: String,
    /// Todos los archivos, si son varias planillas unidas (si es una sola, vacío).
    #[serde(default)]
    pub archivos: Vec<String>,
    /// Con varias planillas, lo que se eligió al revisar la unión (`combine::Choices`), si no es lo sugerido.
    #[serde(default)]
    pub union: Option<Value>,
    pub name: String,
    /// La hoja, en un Excel; de una base, lo elegido.
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
    /// Con qué versión del motor se calculó (`ENGINE_VERSION`); los de antes de que existiera, 0.
    #[serde(default)]
    pub motor: u32,
}

/// Los análisis de un proyecto (`<id>.analisis`).
#[derive(Serialize, Deserialize, Default)]
struct Body {
    /// Lo que devolvió el análisis, por columna analizada.
    #[serde(default)]
    analyses: Map<String, Value>,
    /// Los análisis de antes de que cambiara el archivo, para decir qué cambió en las columnas que se
    /// miren ahora (`changes.rs`): solo su resumen (`changes::summary`), que alcanza para comparar.
    #[serde(default)]
    previous: Option<Previous>,
}

#[derive(Serialize, Deserialize)]
struct Previous {
    saved_at: u64,
    analyses: Map<String, Value>,
}

struct Saved {
    meta: Meta,
    body: Body,
}

/// La ficha (`<id>.json`). Los proyectos de antes traen ahí también los análisis.
#[derive(Deserialize)]
struct Card {
    meta: Meta,
    #[serde(flatten)]
    legacy: Body,
}

/// Solo la ficha, sin armar los análisis en memoria (para la lista).
#[derive(Serialize, Deserialize)]
struct JustMeta {
    meta: Meta,
}

/// Lo que se calcula de toda la planilla, guardado aparte del análisis: mientras no cambien los archivos ni
/// el motor, entrar a esas pantallas no vuelve a leerla.
#[derive(Serialize, Deserialize, Default)]
struct Views {
    bytes: u64,
    modified: u64,
    motor: u32,
    #[serde(default)]
    overview: Option<Value>,
    #[serde(default)]
    fields: Option<Value>,
}

/// Qué se guarda de toda la planilla.
#[derive(Clone, Copy)]
pub enum View {
    Overview,
    Fields,
}

pub struct Projects {
    dir: PathBuf,
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs())
}

/// Lee un archivo guardado, comprimido o no (los de antes no lo estaban).
fn read<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let bytes = std::fs::read(path).ok()?;
    if bytes.starts_with(&[0x1f, 0x8b]) {
        let mut plain = Vec::new();
        GzDecoder::new(&bytes[..]).read_to_end(&mut plain).ok()?;
        return serde_json::from_slice(&plain).ok();
    }
    serde_json::from_slice(&bytes).ok()
}

/// Escribe aparte y reemplaza de una vez: un corte a mitad de camino no deja un archivo roto.
fn write(path: &Path, value: &impl Serialize, compress: bool) -> std::io::Result<()> {
    let json = serde_json::to_vec(value)?;
    let bytes = if compress {
        let mut gz = GzEncoder::new(Vec::with_capacity(json.len() / 8), Compression::fast());
        gz.write_all(&json)?;
        gz.finish()?
    } else {
        json
    };
    let tmp = path.with_extension(format!("{}.tmp", path.extension().and_then(|e| e.to_str()).unwrap_or_default()));
    std::fs::write(&tmp, bytes)?;
    std::fs::rename(tmp, path)
}

/// Las extensiones de los archivos de un proyecto.
const EXTENSIONS: [&str; 3] = ["json", "analisis", "vistas"];

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

    fn file(&self, id: &str, ext: &str) -> PathBuf {
        self.dir.join(format!("{id}.{ext}"))
    }

    fn load(&self, id: &str) -> Option<Saved> {
        let card: Card = read(&self.file(id, "json"))?;
        let body = read(&self.file(id, "analisis")).unwrap_or(card.legacy);
        Some(Saved { meta: card.meta, body })
    }

    fn meta(&self, id: &str) -> Option<Meta> {
        read::<JustMeta>(&self.file(id, "json")).map(|c| c.meta)
    }

    /// Los proyectos, del más reciente al más viejo.
    pub fn list(&self) -> Vec<Meta> {
        let mut out: Vec<Meta> = std::fs::read_dir(&self.dir)
            .into_iter()
            .flatten()
            .flatten()
            .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
            .filter_map(|e| read::<JustMeta>(&e.path()).map(|c| c.meta))
            .collect();
        out.sort_by_key(|m| std::cmp::Reverse(m.saved_at));
        out
    }

    /// Lo guardado, si ningún archivo ni el motor cambiaron desde entonces.
    fn valid(&self, origin: &Origin) -> Option<Saved> {
        let saved = self.load(&origin.id())?;
        (saved.meta.motor == ENGINE_VERSION && origin.stamp()? == (saved.meta.bytes, saved.meta.modified)).then_some(saved)
    }

    /// El análisis guardado de `column`, si ningún archivo cambió.
    pub fn cached(&self, origin: &Origin, column: &str) -> Option<Value> {
        self.valid(origin)?.body.analyses.remove(column)
    }

    /// El análisis de la última columna que se miró, si ningún archivo cambió: lo que se muestra al abrir.
    pub fn last(&self, origin: &Origin) -> Option<Value> {
        let mut saved = self.valid(origin)?;
        saved.body.analyses.remove(&saved.meta.analizado)
    }

    /// Por qué un proyecto guardado se vuelve a calcular: `base` si es de una base de datos (se consulta
    /// cada vez), `motor` si se calculó con otra versión de MIO, `archivo` si la planilla cambió; `None` si
    /// está al día o no existe.
    pub fn stale(&self, origin: &Origin) -> Option<&'static str> {
        let meta = self.meta(&origin.id())?;
        if origin.is_base() {
            Some("base")
        } else if meta.motor != ENGINE_VERSION {
            Some("motor")
        } else {
            (origin.stamp() != Some((meta.bytes, meta.modified))).then_some("archivo")
        }
    }

    /// La última columna que se miró, aunque el archivo haya cambiado desde entonces.
    pub fn analyzed(&self, origin: &Origin) -> Option<String> {
        self.meta(&origin.id()).map(|m| m.analizado)
    }

    /// El análisis de `column` de antes de que cambiara el archivo, y cuándo se hizo: el guardado, si el
    /// archivo cambió desde entonces; si no, el de la versión anterior. Con otro motor no hay con qué
    /// comparar: la diferencia sería el arreglo, no lo que pasó en los datos.
    pub fn before(&self, origin: &Origin, column: &str) -> Option<(Value, u64)> {
        let mut saved = self.load(&origin.id()).filter(|s| s.meta.motor == ENGINE_VERSION)?;
        if origin.stamp() != Some((saved.meta.bytes, saved.meta.modified)) {
            return Some((saved.body.analyses.remove(column)?, saved.meta.saved_at));
        }
        let mut previous = saved.body.previous?;
        Some((previous.analyses.remove(column)?, previous.saved_at))
    }

    /// Lo guardado de toda la planilla, si ningún archivo ni el motor cambiaron.
    pub fn view(&self, origin: &Origin, which: View) -> Option<Value> {
        let saved: Views = read(&self.file(&origin.id(), "vistas"))?;
        if saved.motor != ENGINE_VERSION || origin.stamp()? != (saved.bytes, saved.modified) {
            return None;
        }
        match which {
            View::Overview => saved.overview,
            View::Fields => saved.fields,
        }
    }

    /// Guarda lo calculado de toda la planilla (lo otro que estuviera guardado y siga valiendo, queda).
    pub fn save_view(&self, origin: &Origin, which: View, value: &Value) -> std::io::Result<()> {
        let file = self.file(&origin.id(), "vistas");
        let (bytes, modified) = origin.stamp().unwrap_or_default();
        let mut saved: Views = read(&file).filter(|v: &Views| v.motor == ENGINE_VERSION && (v.bytes, v.modified) == (bytes, modified)).unwrap_or_default();
        (saved.bytes, saved.modified, saved.motor) = (bytes, modified, ENGINE_VERSION);
        match which {
            View::Overview => saved.overview = Some(value.clone()),
            View::Fields => saved.fields = Some(value.clone()),
        }
        write(&file, &saved, true)
    }

    /// Guarda el análisis de `column`. Si el archivo cambió, lo de antes queda resumido para decir qué cambió.
    pub fn save(&self, origin: &Origin, column: &str, opened: &Value) -> std::io::Result<()> {
        let id = origin.id();
        let (bytes, modified) = origin.stamp().unwrap_or_default();
        let Body { mut analyses, previous } = match self.load(&id).filter(|s| s.meta.motor == ENGINE_VERSION) {
            Some(s) if (s.meta.bytes, s.meta.modified) == (bytes, modified) => s.body,
            // Lo guardado pasa a ser lo de antes, resumido (sin sus propios cambios, que ya no dicen nada).
            Some(s) => {
                let analyses = s.body.analyses.iter().map(|(k, v)| (k.clone(), changes::summary(v))).collect();
                Body { analyses: Map::new(), previous: Some(Previous { saved_at: s.meta.saved_at, analyses }) }
            }
            None => Body::default(),
        };
        let a = &opened["analisis"];
        let target = a["target_col"].as_str().unwrap_or_default().to_string();
        if target != column {
            analyses.insert(target.clone(), opened.clone());
        }
        analyses.insert(column.to_string(), opened.clone());
        let (path, archivos, union, hoja) = origin.listed();
        let meta = Meta {
            id: id.clone(),
            name: a["filename"].as_str().map_or_else(|| Path::new(&path).file_name().map_or_else(|| path.clone(), |f| f.to_string_lossy().into_owned()), str::to_string),
            path,
            archivos,
            union,
            hoja,
            bytes,
            modified,
            saved_at: now(),
            filas: a["profile"]["n_rows"].as_u64().unwrap_or(0),
            columnas: a["profile"]["n_cols"].as_u64().unwrap_or(0),
            calidad: a["profile"]["quality_score"].as_i64().unwrap_or(0),
            analizado: target,
            motor: ENGINE_VERSION,
        };
        // Primero los análisis y después la ficha: la ficha es la que dice si lo guardado vale.
        write(&self.file(&id, "analisis"), &Body { analyses, previous }, true)?;
        write(&self.file(&id, "json"), &JustMeta { meta }, false)
    }

    pub fn remove(&self, id: &str) -> std::io::Result<()> {
        for ext in ["analisis", "vistas"] {
            let _ = std::fs::remove_file(self.file(id, ext));
        }
        std::fs::remove_file(self.file(id, "json"))
    }

    /// Los archivos de los proyectos guardados.
    fn files(&self) -> impl Iterator<Item = std::fs::DirEntry> {
        std::fs::read_dir(&self.dir).into_iter().flatten().flatten().filter(|e| e.path().extension().and_then(|x| x.to_str()).is_some_and(|x| EXTENSIONS.contains(&x)))
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

    /// Una carpeta de prueba vacía y una planilla adentro.
    fn setup(name: &str) -> (Projects, PathBuf, Origin) {
        let dir = std::env::temp_dir().join(name);
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir.join("proyectos")).unwrap();
        let sheet = dir.join("ventas.csv");
        std::fs::write(&sheet, "a,b\n1,2\n").unwrap();
        let origin = Origin::file(sheet.to_string_lossy().to_string(), None);
        (store, sheet, origin)
    }

    fn version(total: f64) -> Value {
        json!({ "total": total, "analisis": { "target_col": "b", "profile": { "n_rows": 1, "n_cols": 2, "quality_score": 60 } } })
    }

    /// Toda la planilla queda guardada mientras no cambie el archivo, sin pisar la otra parte.
    #[test]
    fn guarda_lo_de_toda_la_planilla_hasta_que_cambie_el_archivo() {
        let (store, sheet, path) = setup("mio_proyectos_vistas_test");
        assert!(store.view(&path, View::Overview).is_none());
        store.save_view(&path, View::Overview, &json!({ "filas": 1 })).unwrap();
        store.save_view(&path, View::Fields, &json!({ "columnas": [] })).unwrap();
        assert_eq!(store.view(&path, View::Overview).unwrap()["filas"], 1);
        assert!(store.view(&path, View::Fields).is_some(), "guardar una no pisa la otra");
        assert!(store.list().is_empty(), "no es un proyecto de la lista");
        assert!(store.size() > 0, "cuenta para lo que ocupa");
        std::fs::write(&sheet, "a,b\n1,2\n3,4\n").unwrap();
        assert!(store.view(&path, View::Overview).is_none(), "el archivo cambió");
        store.clear().unwrap();
        assert_eq!(store.size(), 0);
    }

    /// Lo calculado con un motor viejo no se muestra ni se compara: se vuelve a analizar lo mismo que se miraba.
    #[test]
    fn lo_guardado_con_otro_motor_se_vuelve_a_calcular() {
        let (store, _, path) = setup("mio_proyectos_motor_test");
        store.save(&path, "b", &version(1.0)).unwrap();
        assert!(store.last(&path).is_some());

        let file = store.file(&path.id(), "json");
        let mut saved: Value = serde_json::from_slice(&std::fs::read(&file).unwrap()).unwrap();
        saved["meta"].as_object_mut().unwrap().remove("motor");
        std::fs::write(&file, saved.to_string()).unwrap();
        assert!(store.last(&path).is_none());
        assert!(store.cached(&path, "b").is_none());
        assert!(store.before(&path, "b").is_none());
        assert_eq!(store.stale(&path), Some("motor"));
        assert_eq!(store.analyzed(&path).as_deref(), Some("b"), "se sigue sabiendo qué se miraba");
        store.save(&path, "b", &version(1.0)).unwrap();
        assert!(store.last(&path).is_some());
    }

    #[test]
    fn guarda_y_vuelve_a_calcular_solo_si_el_archivo_cambia() {
        let (store, sheet, path) = setup("mio_proyectos_test");
        let opened = version(1.0);
        store.save(&path, "B", &opened).unwrap();
        assert_eq!(store.cached(&path, "B"), Some(opened.clone()));
        assert_eq!(store.cached(&path, "b"), Some(opened.clone()), "también queda con el nombre de la columna analizada");
        assert_eq!(store.last(&path), Some(opened), "al abrir, lo último que se miró");
        let Origin::Files { paths, .. } = &path else { unreachable!() };
        assert_eq!(store.last(&Origin::file(paths[0].clone(), Some("Hoja2".into()))), None, "otra hoja es otro proyecto");
        assert_eq!(store.list()[0].name, "ventas.csv");
        assert_eq!(store.stale(&path), None);
        std::fs::write(&sheet, "a,b\n1,2\n3,4\n").unwrap(); // otro tamaño
        assert_eq!(store.last(&path), None);
        assert_eq!(store.stale(&path), Some("archivo"));
        store.remove(&store.list()[0].id).unwrap();
        assert!(store.list().is_empty());
        assert_eq!(store.size(), 0, "no queda ningún archivo del proyecto");
    }

    /// Los proyectos de antes (todo en un `.json` sin comprimir) se siguen abriendo y, al guardar, pasan al
    /// formato nuevo: la ficha sola y los análisis comprimidos.
    #[test]
    fn lo_guardado_antes_se_sigue_leyendo() {
        let (store, _, path) = setup("mio_proyectos_viejo_test");
        store.save(&path, "b", &version(1.0)).unwrap();
        let meta: Value = serde_json::from_slice(&std::fs::read(store.file(&path.id(), "json")).unwrap()).unwrap();
        std::fs::remove_file(store.file(&path.id(), "analisis")).unwrap();
        let old = json!({ "meta": meta["meta"], "analyses": { "b": version(1.0) }, "previous": null });
        std::fs::write(store.file(&path.id(), "json"), old.to_string()).unwrap();
        assert_eq!(store.last(&path), Some(version(1.0)));
        assert_eq!(store.list().len(), 1);

        store.save(&path, "b", &version(1.0)).unwrap();
        let card = std::fs::read_to_string(store.file(&path.id(), "json")).unwrap();
        assert!(!card.contains("analyses"), "la ficha va sola: {card}");
        assert!(std::fs::read(store.file(&path.id(), "analisis")).unwrap().starts_with(&[0x1f, 0x8b]), "comprimido");
        assert_eq!(store.last(&path), Some(version(1.0)));
    }

    /// De una base no hay archivo que mirar: nunca queda al día (se vuelve a consultar), dice por qué y
    /// lo de la última vez queda para decir qué cambió.
    #[test]
    fn una_base_se_consulta_siempre_y_dice_que_cambio() {
        let dir = std::env::temp_dir().join("mio_proyectos_base_test");
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir).unwrap();
        let source = Origin::Base { id: "abc123".into(), pick: r#"{"tabla":"ventas","esquema":null}"#.into() };
        let version = |total: f64| json!({ "total": total, "analisis": { "target_col": "monto", "profile": { "n_rows": 1, "n_cols": 2, "quality_score": 60 } } });
        store.save(&source, "monto", &version(5.0)).unwrap();
        assert!(store.last(&source).is_none() && store.cached(&source, "monto").is_none(), "no se muestra lo guardado: se consulta de nuevo");
        assert_eq!(store.stale(&source), Some("base"));
        assert_eq!(store.analyzed(&source).as_deref(), Some("monto"));
        assert_eq!(store.before(&source, "monto").map(|b| b.0), Some(version(5.0)), "lo de la última vez, para decir qué cambió");
        let m = &store.list()[0];
        assert_eq!((m.path.as_str(), m.hoja.as_deref()), ("base://abc123", Some(r#"{"tabla":"ventas","esquema":null}"#)));
    }

    #[test]
    fn guarda_lo_de_antes_para_decir_que_cambio() {
        let (store, sheet, path) = setup("mio_proyectos_antes_test");
        store.save(&path, "b", &version(2.0)).unwrap();
        assert_eq!(store.before(&path, "b"), None, "la primera vez no hay antes");

        std::fs::write(&sheet, "a,b\n1,2\n3,4\n").unwrap(); // entró el mes nuevo
        assert_eq!(store.analyzed(&path).as_deref(), Some("b"), "aunque cambió, se sabe qué se miraba");
        assert_eq!(store.before(&path, "b").map(|b| b.0), Some(version(2.0)), "lo guardado es lo de antes");
        let mut second = version(6.0);
        second["cambios"] = json!({ "filas": [1, 2] });
        store.save(&path, "b", &second).unwrap();
        let before = store.before(&path, "b").unwrap().0;
        assert_eq!(before, changes::summary(&version(2.0)), "ya guardado lo nuevo, lo de antes queda aparte y resumido");
        assert_eq!(changes::compare(&before, &second, 0), changes::compare(&version(2.0), &second, 0), "y alcanza para decir qué cambió");
        assert_eq!(store.before(&path, "a"), None, "de otra columna no había nada");

        std::fs::write(&sheet, "a,b\n1,2\n3,4\n5,6\n").unwrap();
        store.save(&path, "b", &version(12.0)).unwrap();
        let before = store.before(&path, "b").unwrap().0;
        assert_eq!((before["total"].as_f64(), before.get("cambios")), (Some(6.0), None), "lo de antes es la versión anterior, sin sus propios cambios");
    }

    #[test]
    fn varias_planillas_son_un_proyecto_y_vale_mientras_ninguna_cambie() {
        let dir = std::env::temp_dir().join("mio_proyectos_varias_test");
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir.join("proyectos")).unwrap();
        let (a, b) = (dir.join("enero.csv"), dir.join("febrero.csv"));
        std::fs::write(&a, "x\n1\n").unwrap();
        std::fs::write(&b, "x\n2\n").unwrap();
        let files = |paths: Vec<&PathBuf>, union: Option<Value>| Origin::Files { paths: paths.iter().map(|p| p.to_string_lossy().to_string()).collect(), sheet: None, union };
        let opened = json!({ "analisis": { "filename": "enero.csv y 1 más", "target_col": "x", "profile": { "n_rows": 2, "n_cols": 2, "quality_score": 50 } } });
        store.save(&files(vec![&a, &b], None), "x", &opened).unwrap();
        assert_eq!(store.last(&files(vec![&b, &a], None)), Some(opened), "el orden de los archivos no importa");
        assert_eq!(store.last(&files(vec![&a], None)), None, "una sola es otro proyecto");
        let m = &store.list()[0];
        assert_eq!((m.name.as_str(), m.archivos.len()), ("enero.csv y 1 más", 2));
        let other = json!({ "fuera": ["febrero.csv"], "claves": {} });
        assert_eq!(store.last(&files(vec![&a, &b], Some(other))), None, "otra manera de unirlas es otro proyecto");
        std::fs::write(&b, "x\n2\n3\n").unwrap(); // cambia la segunda
        assert_eq!(store.last(&files(vec![&a, &b], None)), None);
    }

    #[test]
    fn borrar_todos_deja_las_planillas_y_lo_que_no_es_un_proyecto() {
        let dir = std::env::temp_dir().join("mio_proyectos_borrar_test");
        let _ = std::fs::remove_dir_all(&dir);
        let store = Projects::new(dir.clone()).unwrap();
        let sheet = dir.join("ventas.csv");
        std::fs::write(&sheet, "a,b\n1,2\n").unwrap();
        let path = sheet.to_string_lossy().to_string();
        store.save(&Origin::file(path.clone(), None), "b", &version(1.0)).unwrap();
        store.save(&Origin::file(path, Some("Hoja2".into())), "b", &version(1.0)).unwrap();
        assert_eq!(store.list().len(), 2);
        assert!(store.size() > 0);
        store.clear().unwrap();
        assert!(store.list().is_empty());
        assert_eq!(store.size(), 0);
        assert!(sheet.exists(), "la planilla no se toca");
        std::fs::write(dir.join("a_medias.analisis.tmp"), b"{").unwrap();
        Projects::new(dir.clone()).unwrap();
        assert!(!dir.join("a_medias.analisis.tmp").exists(), "un guardado cortado no queda");
    }
}
