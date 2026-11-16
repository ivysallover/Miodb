//! MIO de escritorio: la ventana y el puente con el motor.
//!
//! La ventana muestra las pantallas de React y le pide cosas al motor (`commands.rs`). No hay servidor ni
//! puertos: la planilla se lee del disco de la persona y se analiza en su compu (`session.rs`,
//! `analysis.rs`). Cada análisis queda guardado (`projects.rs`): abrir de nuevo una planilla que no cambió
//! muestra el resultado sin recalcularlo.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod analysis;
mod bases;
mod commands;
mod example;
mod google;
mod origin;
mod projects;
#[cfg(debug_assertions)]
mod puente;
mod session;

use bases::Bases;
use projects::Projects;
use session::{Open, Pending, Reading, Turn};
use tauri::Manager;
use tauri_plugin_log::{Target, TargetKind};

fn main() {
    // Si la app se cae, que quede anotado (y después, lo de siempre: el mensaje en la terminal).
    let default = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        log::error!("la app se cerró por un error: {info}");
        default(info);
    }));
    tauri::Builder::default()
        // El registro: un archivo en la carpeta de la app (hasta 1 MB; al llenarse, empieza otro y queda
        // el anterior), con las advertencias y los errores, también los de la pantalla.
        .plugin(
            tauri_plugin_log::Builder::new()
                .clear_targets()
                .target(Target::new(TargetKind::LogDir { file_name: Some("registro".into()) }))
                .level(log::LevelFilter::Warn)
                .max_file_size(1_000_000)
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Open::default())
        .manage(Pending::default())
        .manage(Reading::default())
        .manage(Turn::default())
        .setup(|app| {
            let dir = app.path().app_data_dir()?.join("proyectos");
            // Solo en desarrollo: con `MIO_PUENTE` las pantallas también se usan desde un navegador
            // (`puente.rs`), con los proyectos en `MIO_PUENTE_DATOS` para no tocar los de verdad.
            #[cfg(debug_assertions)]
            let dir = std::env::var_os("MIO_PUENTE_DATOS").map(std::path::PathBuf::from).unwrap_or(dir);
            // Las conexiones, al lado de los proyectos (en desarrollo con el puente, también aparte).
            app.manage(Bases::new(dir.with_file_name("conexiones.json")));
            app.manage(Projects::new(dir)?);
            #[cfg(debug_assertions)]
            if let Some(port) = std::env::var("MIO_PUENTE").ok().and_then(|p| p.parse().ok()) {
                puente::start(app.handle(), port);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::abrir_planilla,
            commands::revisar_union,
            commands::abrir_varias,
            commands::abrir_base,
            commands::analizar,
            commands::filtrar,
            commands::filas,
            commands::vista_general,
            commands::campos,
            commands::tabla_dinamica,
            commands::comparar,
            commands::exportar,
            commands::exportar_tabla,
            commands::guardar_archivo,
            commands::imprimir,
            commands::proyectos,
            commands::carpeta_proyectos,
            commands::espacio_proyectos,
            commands::borrar_proyecto,
            commands::borrar_proyectos,
            commands::cancelar,
            commands::ingresar_con_google,
            commands::ejemplo,
            commands::carpeta_registro,
            commands::buscar_actualizacion,
            commands::actualizar,
            commands::conexiones,
            commands::guardar_conexion,
            commands::borrar_conexion,
            commands::probar_conexion,
            commands::tablas_de_base,
        ])
        .run(tauri::generate_context!())
        .expect("no se pudo abrir la ventana de MIO");
}
