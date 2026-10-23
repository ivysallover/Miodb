//! Entrar con Google desde la app. Google no deja ingresar desde una ventana embebida, así que el
//! ingreso pasa por el navegador de la compu, en una página de la web de MIO (`/escritorio/google`,
//! `src/pages/EscritorioGooglePage.tsx`) que entra con Google como la web, con el mismo proyecto de
//! Firebase y sin nada que configurar aparte.
//!
//! La app espera la vuelta en un servidor de un solo uso en esta compu (`127.0.0.1`,
//! `tauri-plugin-oauth`); la página vuelve ahí con la credencial de Google y el `estado` que le pasó
//! la app, que se verifica para que nada más pueda colarse en ese puerto. La ventana entra a Firebase
//! con esa credencial (`signInWithCredential`).

use rand::distributions::{Alphanumeric, DistString};
use std::sync::mpsc;
use std::time::Duration;
use tauri::AppHandle;
use tauri::Url;
use tauri_plugin_oauth::OauthConfig;
use tauri_plugin_opener::OpenerExt;

/// Cuánto se espera a que la persona elija su cuenta en el navegador.
const WAIT: Duration = Duration::from_secs(180);
/// Lo que ve en el navegador al volver.
const DONE_PAGE: &str = "<html><head><meta charset=\"utf-8\"><title>MIO</title></head><body style=\"font-family:system-ui;background:#f3f3f5;display:grid;place-items:center;height:100vh;margin:0\"><p style=\"font-size:20px;font-weight:700\">Listo. Volvé a la app de MIO.</p></body></html>";

/// El valor de `key` en la dirección a la que volvió la página.
fn param(url: &Url, key: &str) -> Option<String> {
    url.query_pairs().find(|(k, _)| k == key).map(|(_, v)| v.into_owned())
}

/// Lo que trajo la vuelta: la credencial de Google, si el estado es el que se mandó.
fn credential(back: &str, state: &str) -> Result<String, String> {
    let back = Url::parse(back).map_err(|_| "El navegador volvió con una dirección que no entiendo.")?;
    if param(&back, "estado").as_deref() != Some(state) {
        return Err("La respuesta del navegador no corresponde a este ingreso. Probá de nuevo.".into());
    }
    param(&back, "id_token").filter(|t| !t.is_empty()).ok_or_else(|| "Google no mandó la credencial.".into())
}

/// Hace el ingreso con Google en `page` (en el navegador) y devuelve la credencial para Firebase.
pub async fn sign_in(app: &AppHandle, page: &str) -> Result<String, String> {
    let mut page = Url::parse(page).map_err(|_| "La página de ingreso no es una dirección válida.")?;
    let state = Alphanumeric.sample_string(&mut rand::thread_rng(), 32);
    let (tx, rx) = mpsc::channel();
    let config = OauthConfig { response: Some(DONE_PAGE.into()), ..Default::default() };
    let port = tauri_plugin_oauth::start_with_config(config, move |url| {
        let _ = tx.send(url);
    })
    .map_err(|e| format!("No pude esperar la vuelta del navegador: {e}"))?;
    page.query_pairs_mut().append_pair("puerto", &port.to_string()).append_pair("estado", &state);

    let back = match app.opener().open_url(page.as_str(), None::<&str>) {
        Ok(()) => tauri::async_runtime::spawn_blocking(move || rx.recv_timeout(WAIT)).await.ok().and_then(Result::ok),
        Err(_) => None,
    };
    let _ = tauri_plugin_oauth::cancel(port);
    credential(&back.ok_or("No llegó la respuesta del navegador (se cerró o pasaron 3 minutos). Probá de nuevo.")?, &state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solo_vale_la_vuelta_con_el_mismo_estado() {
        assert_eq!(credential("http://127.0.0.1:5000/?estado=abc&id_token=ey.J0", "abc").as_deref(), Ok("ey.J0"));
        assert!(credential("http://127.0.0.1:5000/?estado=otro&id_token=ey.J0", "abc").is_err());
        assert!(credential("http://127.0.0.1:5000/?id_token=ey.J0", "abc").is_err());
        assert!(credential("http://127.0.0.1:5000/?estado=abc", "abc").is_err());
        assert!(credential("http://127.0.0.1:5000/?estado=abc&id_token=", "abc").is_err());
    }
}
