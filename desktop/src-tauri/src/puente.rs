//! Solo para desarrollo (no existe en la app que se publica): las pantallas abiertas en un navegador común
//! (`http://localhost:3000/escritorio?puente`) le piden al motor lo mismo que dentro de la ventana, por un
//! servidor en esta compu. Sirve para probar la app entera de punta a punta sin la ventana. Se enciende con
//! `MIO_PUENTE=<puerto>`; solo escucha en 127.0.0.1 y solo le contesta al servidor de desarrollo.

use crate::*;
use tauri::{AppHandle, Manager};
use tiny_http::{Header, Method, Response, Server};

/// La página que puede pedir cosas: el servidor de desarrollo.
const ORIGIN: &str = "http://localhost:3000";

fn text(args: &Value, key: &str) -> Result<String, String> {
    args[key].as_str().map(str::to_string).ok_or_else(|| format!("falta {key}"))
}

fn list(args: &Value, key: &str) -> Vec<String> {
    args[key].as_array().map_or_else(Vec::new, |a| a.iter().filter_map(|x| x.as_str().map(str::to_string)).collect())
}

fn maybe(args: &Value, key: &str) -> Option<String> {
    args[key].as_str().map(str::to_string)
}

/// Un pedido de la pantalla, con el mismo nombre y los mismos datos que dentro de la ventana.
async fn invoke(app: AppHandle, cmd: &str, args: Value) -> Result<Value, String> {
    let (open, store) = (app.state::<Open>(), app.state::<Projects>());
    let json = |v: Result<Value, String>| v;
    match cmd {
        "abrir_planilla" => json(abrir_planilla(app.clone(), text(&args, "path")?, maybe(&args, "hoja"), open, store).await),
        "revisar_union" => json(revisar_union(app.clone(), list(&args, "paths"), args.get("union").cloned().filter(|v| !v.is_null())).await),
        "abrir_varias" => json(abrir_varias(app.clone(), list(&args, "paths"), args.get("union").cloned().filter(|v| !v.is_null()), open, store).await),
        "analizar" => json(analizar(app.clone(), text(&args, "columna")?, open, store).await),
        "filas" => json(filas(app.clone(), text(&args, "columna")?, list(&args, "valores"), text(&args, "objetivo")?, open).await),
        "vista_general" => json(vista_general(app.clone(), open).await),
        "filtrar" => json(filtrar(app.clone(), args["condiciones"].as_array().cloned().unwrap_or_default(), text(&args, "columna")?, open, store).await),
        "campos" => json(campos(app.clone(), open).await),
        "tabla_dinamica" => json(tabla_dinamica(app.clone(), args["pedido"].clone(), open).await),
        "exportar_tabla" => exportar_tabla(app.clone(), args["pedido"].clone(), text(&args, "formato")?, text(&args, "destino")?, open).await.map(|_| Value::Null),
        "comparar" => json(comparar(app.clone(), text(&args, "columna")?, text(&args, "a")?, text(&args, "b")?, maybe(&args, "objetivo"), open).await),
        "proyectos" => proyectos(store).await.map(|p| json!(p)),
        "carpeta_proyectos" => Ok(json!(carpeta_proyectos(store))),
        "exportar" => exportar(app.clone(), text(&args, "formato")?, text(&args, "destino")?, open).await.map(|_| Value::Null),
        "guardar_archivo" => guardar_archivo(text(&args, "destino")?, text(&args, "datos")?).map(|_| Value::Null),
        "ejemplo" => ejemplo(app.clone()).map(|p| json!(p)),
        "carpeta_registro" => carpeta_registro(app.clone()).map(|p| json!(p)),
        "cancelar" => {
            cancelar(app.state::<Turn>());
            Ok(Value::Null)
        }
        "espacio_proyectos" => Ok(json!(espacio_proyectos(store))),
        "borrar_proyectos" => borrar_proyectos(store).map(|_| Value::Null),
        "borrar_proyecto" => borrar_proyecto(text(&args, "id")?, store).map(|_| Value::Null),
        // Lo que en el navegador no tiene sentido: imprimir lo hace el navegador, y no hay versiones.
        "imprimir" | "buscar_actualizacion" => Ok(Value::Null),
        other => Err(format!("El puente no conoce «{other}».")),
    }
}

fn reply(status: u16, body: String) -> Response<std::io::Cursor<Vec<u8>>> {
    let header = |k: &str, v: &str| Header::from_bytes(k.as_bytes(), v.as_bytes()).expect("encabezado");
    Response::from_string(body)
        .with_status_code(status)
        .with_header(header("Access-Control-Allow-Origin", ORIGIN))
        .with_header(header("Access-Control-Allow-Headers", "content-type"))
        .with_header(header("Content-Type", "application/json; charset=utf-8"))
}

/// Atiende los pedidos en `127.0.0.1:<puerto>`, cada uno en su hilo (como la ventana, varios a la vez).
pub fn start(app: &AppHandle, port: u16) {
    let server = match Server::http(("127.0.0.1", port)) {
        Ok(s) => std::sync::Arc::new(s),
        Err(e) => return log::error!("puente: no pude escuchar en el puerto {port}: {e}"),
    };
    let app = app.clone();
    std::thread::spawn(move || {
        for mut req in server.incoming_requests() {
            let origin = req.headers().iter().find(|h| h.field.equiv("Origin")).map(|h| h.value.as_str().to_string());
            if origin.as_deref() != Some(ORIGIN) {
                let _ = req.respond(reply(403, "{}".into()));
                continue;
            }
            if *req.method() == Method::Options {
                let _ = req.respond(reply(204, String::new()));
                continue;
            }
            let app = app.clone();
            std::thread::spawn(move || {
                let mut body = String::new();
                let _ = req.as_reader().read_to_string(&mut body);
                let parsed: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
                let (cmd, args) = (parsed["cmd"].as_str().unwrap_or_default().to_string(), parsed["args"].clone());
                let out = tauri::async_runtime::block_on(invoke(app, &cmd, args));
                let _ = match out {
                    Ok(v) => req.respond(reply(200, v.to_string())),
                    Err(e) => req.respond(reply(500, json!({ "error": e }).to_string())),
                };
            });
        }
    });
}
