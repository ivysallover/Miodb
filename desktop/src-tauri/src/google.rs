//! Entrar con Google desde la app. Google no deja ingresar desde una ventana embebida: se abre el
//! navegador de la compu, la persona elige su cuenta y Google vuelve a un servidor de un solo uso en
//! esta compu (`127.0.0.1`, `tauri-plugin-oauth`). El código que trae se cambia por un permiso con
//! PKCE (`oauth2`), y la ventana entra a Firebase con ese permiso (`signInWithCredential`).
//!
//! Hace falta un cliente OAuth de Google de tipo "App de escritorio" del mismo proyecto de Firebase.
//! Sus datos se ponen al compilar: `MIO_GOOGLE_CLIENT_ID` y `MIO_GOOGLE_CLIENT_SECRET` (en una app
//! de escritorio el "secreto" no es secreto, Google lo da por sabido; lo que protege es PKCE).

use oauth2::basic::BasicClient;
use oauth2::url::Url;
use oauth2::{reqwest, AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, PkceCodeChallenge, RedirectUrl, Scope, TokenResponse, TokenUrl};
use std::sync::mpsc;
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_oauth::OauthConfig;
use tauri_plugin_opener::OpenerExt;

const CLIENT_ID: Option<&str> = option_env!("MIO_GOOGLE_CLIENT_ID");
const CLIENT_SECRET: Option<&str> = option_env!("MIO_GOOGLE_CLIENT_SECRET");
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
/// Cuánto se espera a que la persona elija su cuenta en el navegador.
const WAIT: Duration = Duration::from_secs(180);
/// Lo que ve en el navegador al volver.
const DONE_PAGE: &str = "<html><head><meta charset=\"utf-8\"><title>MIO</title></head><body style=\"font-family:system-ui;background:#f3f3f5;display:grid;place-items:center;height:100vh;margin:0\"><p style=\"font-size:20px;font-weight:700\">Listo. Volvé a la app de MIO.</p></body></html>";

/// Si esta compilación de la app tiene con qué entrar con Google.
pub fn available() -> bool {
    CLIENT_ID.is_some() && CLIENT_SECRET.is_some()
}

/// El valor de `key` en la dirección a la que volvió Google.
fn param(url: &Url, key: &str) -> Option<String> {
    url.query_pairs().find(|(k, _)| k == key).map(|(_, v)| v.into_owned())
}

/// Hace el ingreso con Google en el navegador y devuelve el permiso para entrar a Firebase.
pub async fn sign_in(app: &AppHandle) -> Result<String, String> {
    let (Some(id), Some(secret)) = (CLIENT_ID, CLIENT_SECRET) else {
        return Err("Esta versión de la app no tiene configurado el ingreso con Google.".into());
    };
    let (tx, rx) = mpsc::channel();
    let config = OauthConfig { response: Some(DONE_PAGE.into()), ..Default::default() };
    let port = tauri_plugin_oauth::start_with_config(config, move |url| {
        let _ = tx.send(url);
    })
    .map_err(|e| format!("No pude esperar la vuelta de Google: {e}"))?;

    let client = BasicClient::new(ClientId::new(id.into()))
        .set_client_secret(ClientSecret::new(secret.into()))
        .set_auth_uri(AuthUrl::new(AUTH_URL.into()).expect("dirección fija"))
        .set_token_uri(TokenUrl::new(TOKEN_URL.into()).expect("dirección fija"))
        .set_redirect_uri(RedirectUrl::new(format!("http://127.0.0.1:{port}")).expect("dirección local"));
    let (challenge, verifier) = PkceCodeChallenge::new_random_sha256();
    let (url, state) = client
        .authorize_url(CsrfToken::new_random)
        .add_scopes(["openid", "email", "profile"].map(|s| Scope::new(s.into())))
        .add_extra_param("prompt", "select_account")
        .set_pkce_challenge(challenge)
        .url();
    let opened = app.opener().open_url(url.as_str(), None::<&str>);
    let back = match opened {
        Ok(()) => tauri::async_runtime::spawn_blocking(move || rx.recv_timeout(WAIT)).await.ok().and_then(Result::ok),
        Err(_) => None,
    };
    let _ = tauri_plugin_oauth::cancel(port);
    let back = back.ok_or("No llegó la respuesta de Google (se cerró el navegador o pasaron 3 minutos). Probá de nuevo.")?;

    let back = Url::parse(&back).map_err(|_| "Google volvió con una dirección que no entiendo.")?;
    if param(&back, "error").is_some() {
        return Err("Cancelaste el ingreso con Google.".into());
    }
    if param(&back, "state").as_deref() != Some(state.secret().as_str()) {
        return Err("La respuesta de Google no corresponde a este ingreso. Probá de nuevo.".into());
    }
    let code = param(&back, "code").ok_or("Google no mandó el código de ingreso.")?;

    let http = reqwest::ClientBuilder::new()
        // Seguir redirecciones abre la puerta a pedidos a otros servidores (SSRF).
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;
    let token = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(verifier)
        .request_async(&http)
        .await
        .map_err(|_| "No pude terminar el ingreso con Google. Revisá tu conexión y probá de nuevo.")?;
    Ok(token.access_token().secret().clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lee_lo_que_trae_la_vuelta() {
        let url = Url::parse("http://127.0.0.1:5000/?state=abc&code=4%2F0A&scope=email").unwrap();
        assert_eq!(param(&url, "code").as_deref(), Some("4/0A"));
        assert_eq!(param(&url, "state").as_deref(), Some("abc"));
        assert_eq!(param(&url, "error"), None);
    }
}
