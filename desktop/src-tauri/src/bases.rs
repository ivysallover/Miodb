//! Las conexiones a bases de datos que guarda la persona: cómo llegar (servidor, puerto, base, usuario,
//! cuántas filas traer) en `conexiones.json`, en la carpeta de la app; la contraseña, en el llavero del
//! sistema (Llavero de macOS, Administrador de credenciales de Windows), nunca en un archivo ni en la
//! cuenta de MIO. De la base no se guarda nada: se consulta cada vez (`mio_engine::database`).
//!
//! Un proyecto de una base tiene como fuente `base://<id>` y, en lugar de la hoja, lo elegido (la tabla o
//! la consulta, `Pick::to_json`). Como no hay archivo que mirar, el proyecto nunca está "al día": abrirlo
//! vuelve a consultar y dice qué cambió desde la última vez (`projects.rs`).

use mio_engine::database::{Server, DEFAULT_LIMIT};
use rand::distributions::{Alphanumeric, DistString};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::sync::Mutex;

const SCHEME: &str = "base://";
/// Con qué nombre se guardan las contraseñas en el llavero.
const KEYCHAIN_SERVICE: &str = "MIO";
/// Más de esto no entra en la memoria de una compu común.
const MAX_LIMIT: usize = 50_000_000;

/// La fuente de un proyecto de la conexión `id`.
pub fn source(id: &str) -> String {
    format!("{SCHEME}{id}")
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Saved {
    pub id: String,
    pub nombre: String,
    pub motor: String,
    pub servidor: String,
    #[serde(default)]
    pub puerto: Option<u16>,
    pub base: String,
    pub usuario: String,
    /// Cuántas filas se traen como mucho.
    pub tope: usize,
}

pub struct Bases {
    file: PathBuf,
    /// De a uno al escribir el archivo.
    writing: Mutex<()>,
}

fn keychain(id: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYCHAIN_SERVICE, &format!("base-{id}")).map_err(|e| format!("No pude usar el llavero del sistema: {e}"))
}

impl Bases {
    pub fn new(file: PathBuf) -> Bases {
        Bases { file, writing: Mutex::new(()) }
    }

    pub fn list(&self) -> Vec<Saved> {
        std::fs::read(&self.file).ok().and_then(|b| serde_json::from_slice(&b).ok()).unwrap_or_default()
    }

    pub fn get(&self, id: &str) -> Result<Saved, String> {
        self.list().into_iter().find(|c| c.id == id).ok_or_else(|| "Esa conexión ya no está guardada: volvé a crearla.".into())
    }

    fn write(&self, list: &[Saved]) -> Result<(), String> {
        let fail = |e: std::io::Error| format!("No pude guardar la conexión: {e}");
        // Se escribe aparte y se reemplaza de una vez: un corte a mitad de camino no deja el archivo roto.
        let tmp = self.file.with_extension("tmp");
        std::fs::write(&tmp, serde_json::to_vec_pretty(list).map_err(|e| e.to_string())?).map_err(fail)?;
        std::fs::rename(tmp, &self.file).map_err(fail)
    }

    /// Guarda la conexión que manda la pantalla (nueva, o la misma si trae `id`). La contraseña, si viene,
    /// va al llavero; sin contraseña, queda la que ya estaba.
    pub fn save(&self, v: &Value, password: Option<String>) -> Result<Saved, String> {
        let server = Server::from_json(v, String::new())?;
        let _one = self.writing.lock().unwrap_or_else(|e| e.into_inner());
        let mut list = self.list();
        let id = v["id"].as_str().filter(|id| list.iter().any(|c| &c.id == id)).map_or_else(|| Alphanumeric.sample_string(&mut rand::thread_rng(), 12), str::to_string);
        let saved = Saved {
            nombre: v["nombre"].as_str().map(str::trim).filter(|s| !s.is_empty()).map_or_else(|| format!("{} en {}", server.database, server.host), str::to_string),
            motor: v["motor"].as_str().unwrap_or_default().to_string(),
            puerto: v["puerto"].as_u64().map(|_| server.port),
            servidor: server.host,
            base: server.database,
            usuario: server.user,
            tope: v["tope"].as_u64().map_or(DEFAULT_LIMIT, |t| (t as usize).clamp(1, MAX_LIMIT)),
            id: id.clone(),
        };
        if let Some(p) = password.filter(|p| !p.is_empty()) {
            keychain(&id)?.set_password(&p).map_err(|e| format!("No pude guardar la contraseña en el llavero: {e}"))?;
        }
        match list.iter_mut().find(|c| c.id == id) {
            Some(old) => *old = saved.clone(),
            None => list.push(saved.clone()),
        }
        self.write(&list)?;
        Ok(saved)
    }

    /// Borra la conexión y su contraseña del llavero (los proyectos que la usaban quedan, sin poder abrirse).
    pub fn remove(&self, id: &str) -> Result<(), String> {
        let _one = self.writing.lock().unwrap_or_else(|e| e.into_inner());
        let list: Vec<Saved> = self.list().into_iter().filter(|c| c.id != id).collect();
        self.write(&list)?;
        match keychain(id)?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(format!("No pude borrar la contraseña del llavero: {e}")),
        }
    }

    /// Cómo llegar a la base: lo de `v` (lo que muestra la pantalla) con `password`, o si no viene, la
    /// guardada de la conexión `v.id` (sin contraseña guardada, ninguna: hay bases que no la piden).
    pub fn server(&self, v: &Value, password: Option<String>) -> Result<Server, String> {
        let password = match (password.filter(|p| !p.is_empty()), v["id"].as_str()) {
            (Some(p), _) => p,
            (None, Some(id)) => match keychain(id)?.get_password() {
                Ok(p) => p,
                Err(keyring::Error::NoEntry) => String::new(),
                Err(e) => return Err(format!("No pude leer la contraseña del llavero: {e}")),
            },
            (None, None) => String::new(),
        };
        Server::from_json(v, password)
    }

    /// Cómo llegar a una conexión guardada.
    pub fn server_of(&self, saved: &Saved) -> Result<Server, String> {
        self.server(&serde_json::to_value(saved).map_err(|e| e.to_string())?, None)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn guarda_cambia_y_borra_sin_la_contrasena() {
        let file = std::env::temp_dir().join(format!("mio_conexiones_{}.json", std::process::id()));
        let _ = std::fs::remove_file(&file);
        let bases = Bases::new(file.clone());
        let form = json!({ "motor": "postgres", "servidor": "db.local", "base": "tienda", "usuario": "lector", "tope": 0 });
        let saved = bases.save(&form, None).unwrap();
        assert_eq!((saved.nombre.as_str(), saved.puerto, saved.tope), ("tienda en db.local", None, 1), "nombre de fábrica, puerto del motor y tope de al menos 1");
        // La misma conexión con otro nombre: se reemplaza, no se duplica.
        let again = bases.save(&json!({ "id": saved.id, "nombre": "Caja", "motor": "postgres", "servidor": "db.local", "puerto": 6543, "base": "tienda", "usuario": "lector" }), None).unwrap();
        assert_eq!((bases.list().len(), again.nombre.as_str(), again.puerto, again.tope), (1, "Caja", Some(6543), DEFAULT_LIMIT));
        assert!(!std::fs::read_to_string(&file).unwrap().contains("contrase"), "en el archivo no hay contraseñas");
        assert!(bases.save(&json!({ "motor": "postgres" }), None).is_err());
        assert_eq!(source(&again.id), format!("base://{}", again.id));
        let _ = std::fs::remove_file(&file);
    }
}
