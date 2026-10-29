//! Entrar con Google desde la app. Google no deja ingresar desde una ventana embebida, así que el
//! ingreso pasa por el navegador de la compu, en la página `/escritorio/google`
//! (`src/pages/EscritorioGooglePage.tsx`), que entra con Google como la web: mismo proyecto de
//! Firebase, nada que configurar aparte.
//!
//! Mientras dura el ingreso, la app levanta un servidor de un solo uso en esta compu (`tiny_http`):
//! sirve esa página con los archivos que lleva adentro, en `localhost` (dominio que Firebase autoriza de
//! entrada; escucha en `127.0.0.1` y en `::1`, porque en Windows el navegador busca `localhost` primero
//! por IPv6 y, si nadie atiende ahí, dice "rechazó la conexión"), y recibe la vuelta en `/vuelta` con la credencial de Google y el `estado` al azar que le
//! pasó la app, que se verifica para que nada más pueda colarse. Mientras se desarrolla, la página es
//! la del servidor de desarrollo (`pagina`). La ventana entra a Firebase con la credencial
//! (`signInWithCredential`).

use rand::distributions::{Alphanumeric, DistString};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Url};
use tauri_plugin_opener::OpenerExt;
use tiny_http::{Header, Request, Response, Server};

/// Cuánto se espera a que la persona elija su cuenta en el navegador.
const WAIT: Duration = Duration::from_secs(180);
/// Lo que ve en el navegador al volver.
const DONE_PAGE: &str = "<!doctype html><html lang=\"es\"><head><meta charset=\"utf-8\"><title>MIO</title></head><body style=\"font-family:system-ui;background:#f3f3f5;display:grid;place-items:center;height:100vh;margin:0\"><p style=\"font-size:20px;font-weight:700\">Listo. Volvé a la app de MIO.</p></body></html>";

/// El valor de `key` en una dirección.
fn param(url: &Url, key: &str) -> Option<String> {
    url.query_pairs().find(|(k, _)| k == key).map(|(_, v)| v.into_owned())
}

/// La credencial de Google que trae la vuelta, si el estado es el que se mandó.
fn credential(back: &Url, state: &str) -> Option<String> {
    (param(back, "estado").as_deref() == Some(state)).then(|| param(back, "id_token")).flatten().filter(|t| !t.is_empty())
}

fn header(name: &str, value: &str) -> Header {
    Header::from_bytes(name.as_bytes(), value.as_bytes()).expect("encabezado válido")
}

/// Responde un pedido: la vuelta (y si trae la credencial, la devuelve) o un archivo de la página.
fn answer(req: Request, app: &AppHandle, state: &str) -> Option<String> {
    let url = Url::parse(&format!("http://localhost{}", req.url())).ok()?;
    if url.path() == "/vuelta" {
        let got = credential(&url, state);
        if got.is_some() {
            let _ = req.respond(Response::from_string(DONE_PAGE).with_header(header("Content-Type", "text/html; charset=utf-8")));
        } else {
            let _ = req.respond(Response::from_string("No corresponde a este ingreso.").with_status_code(400));
        }
        return got;
    }
    // La página de ingreso y sus archivos, de los que lleva la app (cualquier ruta sin archivo da la página).
    let _ = match app.asset_resolver().get(url.path().to_string()) {
        Some(asset) => {
            let mut res = Response::from_data(asset.bytes).with_header(header("Content-Type", &asset.mime_type));
            if let Some(csp) = asset.csp_header {
                res = res.with_header(header("Content-Security-Policy", &csp));
            }
            req.respond(res)
        }
        None => req.respond(Response::from_string("").with_status_code(404)),
    };
    None
}

/// Cada cuánto se pasa de un servidor al otro mientras se espera.
const TICK: Duration = Duration::from_millis(100);

/// El servidor de un solo uso: en un puerto libre de `127.0.0.1` y, si la compu tiene IPv6, en el
/// mismo puerto de `::1`, así `localhost` llega por cualquiera de las dos. Devuelve los servidores y el puerto.
fn listen() -> Result<(Vec<Server>, u16), String> {
    let failed = |e: Box<dyn std::error::Error + Send + Sync>| format!("No pude esperar la vuelta del navegador: {e}");
    let v4 = Server::http("127.0.0.1:0").map_err(failed)?;
    let port = v4.server_addr().to_ip().map(|a| a.port()).ok_or("No pude esperar la vuelta del navegador.")?;
    let v6 = Server::http(format!("[::1]:{port}")).ok();
    Ok((std::iter::once(v4).chain(v6).collect(), port))
}

/// Atiende los servidores hasta que llega la credencial o se termina el tiempo.
fn serve(servers: &[Server], app: &AppHandle, state: &str) -> Result<String, String> {
    let until = Instant::now() + WAIT;
    loop {
        if Instant::now() >= until {
            return Err("No llegó la respuesta del navegador (se cerró o pasaron 3 minutos). Probá de nuevo.".into());
        }
        for server in servers {
            if let Some(req) = server.recv_timeout(TICK).map_err(|e| e.to_string())? {
                if let Some(token) = answer(req, app, state) {
                    return Ok(token);
                }
            }
        }
    }
}

/// Hace el ingreso con Google en el navegador y devuelve la credencial para Firebase. `page` es la
/// página de ingreso del servidor de desarrollo; sin ella, la sirve la app.
pub async fn sign_in(app: &AppHandle, page: Option<String>) -> Result<String, String> {
    let (servers, port) = listen()?;
    let state = Alphanumeric.sample_string(&mut rand::thread_rng(), 32);
    let mut url = Url::parse(&page.unwrap_or_else(|| format!("http://localhost:{port}/escritorio/google"))).map_err(|_| "La página de ingreso no es una dirección válida.")?;
    url.query_pairs_mut().append_pair("puerto", &port.to_string()).append_pair("estado", &state);
    app.opener().open_url(url.as_str(), None::<&str>).map_err(|e| format!("No pude abrir el navegador: {e}"))?;
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || serve(&servers, &app, &state)).await.map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn solo_vale_la_vuelta_con_el_mismo_estado_y_con_credencial() {
        let at = |q: &str| Url::parse(&format!("http://localhost:5000/vuelta?{q}")).unwrap();
        assert_eq!(credential(&at("estado=abc&id_token=ey.J0"), "abc").as_deref(), Some("ey.J0"));
        assert_eq!(credential(&at("estado=otro&id_token=ey.J0"), "abc"), None);
        assert_eq!(credential(&at("id_token=ey.J0"), "abc"), None);
        assert_eq!(credential(&at("estado=abc"), "abc"), None);
        assert_eq!(credential(&at("estado=abc&id_token="), "abc"), None);
    }

    /// `localhost` llega por IPv4 y por IPv6 al mismo puerto (en Windows el navegador prueba IPv6 primero).
    #[test]
    fn escucha_por_ipv4_y_por_ipv6() {
        use std::io::{Read, Write};
        let (servers, port) = listen().unwrap();
        let ask = |addr: &str| {
            let mut c = std::net::TcpStream::connect(addr).unwrap();
            c.write_all(b"GET /hola HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n").unwrap();
            c
        };
        let mut v4 = ask(&format!("127.0.0.1:{port}"));
        let req = servers[0].recv_timeout(Duration::from_secs(2)).unwrap().expect("llegó por IPv4");
        assert_eq!(req.url(), "/hola");
        req.respond(Response::from_string("ok")).unwrap();
        let mut body = String::new();
        v4.read_to_string(&mut body).unwrap();
        assert!(body.ends_with("ok"));
        // Si la compu tiene IPv6 (casi todas), también por ahí.
        if std::net::TcpListener::bind("[::1]:0").is_ok() {
            assert_eq!(servers.len(), 2, "con IPv6 en la compu, tiene que escuchar también ahí");
            ask(&format!("[::1]:{port}"));
            assert!(servers[1].recv_timeout(Duration::from_secs(2)).unwrap().is_some(), "llegó por IPv6");
        }
    }
}
