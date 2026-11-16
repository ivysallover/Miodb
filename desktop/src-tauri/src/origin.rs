//! De dónde sale lo que se abrió: una planilla (con su hoja, en un Excel o una base SQLite), varias
//! planillas unidas, o lo elegido de una base de datos. Es lo que identifica a un proyecto guardado.

use crate::bases;
use rustc_hash::FxHasher;
use serde_json::Value;
use std::hash::{Hash, Hasher};
use std::time::UNIX_EPOCH;

#[derive(Clone, PartialEq, Debug)]
pub enum Origin {
    /// Una planilla o varias para unir: sus rutas, la hoja (en un Excel) y, con varias, cómo unirlas
    /// (`combine::Choices`, como lo manda la pantalla; `None` = lo que sugiere MIO).
    Files { paths: Vec<String>, sheet: Option<String>, union: Option<Value> },
    /// Una conexión guardada (`bases.rs`) y lo elegido de ella (`Pick::to_json`, siempre escrito igual).
    Base { id: String, pick: String },
}

impl Origin {
    pub fn file(path: String, sheet: Option<String>) -> Origin {
        Origin::Files { paths: vec![path], sheet, union: None }
    }

    pub fn is_base(&self) -> bool {
        matches!(self, Origin::Base { .. })
    }

    /// El proyecto de este origen. Las planillas, en cualquier orden. Una sola (o una base) se identifica
    /// igual que antes de poder unir planillas: los proyectos guardados siguen valiendo.
    pub fn id(&self) -> String {
        let mut h = FxHasher::default();
        match self {
            Origin::Files { paths, sheet, union } => {
                let mut sorted: Vec<&String> = paths.iter().collect();
                sorted.sort();
                if let [one] = sorted[..] {
                    (one.as_str(), sheet.as_deref()).hash(&mut h);
                } else {
                    (sorted, sheet.as_deref(), union.as_ref().map(Value::to_string)).hash(&mut h);
                }
            }
            Origin::Base { id, pick } => (bases::source(id).as_str(), Some(pick.as_str())).hash(&mut h),
        }
        format!("{:016x}", h.finish())
    }

    /// Tamaño y fecha de modificación de los archivos, para saber si alguno cambió (la suma de los tamaños
    /// y la fecha más nueva: editar cualquiera cambia una de las dos). De una base, nunca: no hay archivo
    /// que mirar, así que lo guardado nunca está al día.
    pub fn stamp(&self) -> Option<(u64, u64)> {
        let Origin::Files { paths, .. } = self else { return None };
        paths.iter().try_fold((0, 0), |(bytes, newest), path| {
            let m = std::fs::metadata(path).ok()?;
            let modified = m.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs();
            Some((bytes + m.len(), newest.max(modified)))
        })
    }

    /// Cuánto pesan los archivos (de una base, nada: no hay archivo).
    pub fn bytes(&self) -> u64 {
        self.stamp().map_or(0, |(bytes, _)| bytes)
    }

    /// Cómo se anota en la lista de proyectos: la ruta (la primera, con varias; `base://<id>` de una base),
    /// todas las rutas si son varias, cómo se unieron y la hoja (de una base, lo elegido).
    pub fn listed(&self) -> (String, Vec<String>, Option<Value>, Option<String>) {
        match self {
            Origin::Files { paths, sheet, union } => {
                let many = if paths.len() > 1 { paths.clone() } else { Vec::new() };
                (paths.first().cloned().unwrap_or_default(), many, union.clone(), sheet.clone())
            }
            Origin::Base { id, pick } => (bases::source(id), Vec::new(), None, Some(pick.clone())),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// El id de antes (una ruta y su hoja, o `base://<id>` y lo elegido): los proyectos guardados siguen valiendo.
    #[test]
    fn el_proyecto_es_el_mismo_que_antes() {
        let old = |a: &str, b: Option<&str>| {
            let mut h = FxHasher::default();
            (a, b).hash(&mut h);
            format!("{:016x}", h.finish())
        };
        assert_eq!(Origin::file("/a/ventas.xlsx".into(), Some("Hoja2".into())).id(), old("/a/ventas.xlsx", Some("Hoja2")));
        assert_eq!(Origin::Base { id: "x1".into(), pick: "{}".into() }.id(), old("base://x1", Some("{}")));
        let two = |a: &str, b: &str| Origin::Files { paths: vec![a.into(), b.into()], sheet: None, union: None };
        assert_eq!(two("/a", "/b").id(), two("/b", "/a").id(), "el orden de las planillas no importa");
        assert!(Origin::Base { id: "x1".into(), pick: "{}".into() }.stamp().is_none());
    }
}
