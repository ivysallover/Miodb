//! El ejemplo que trae la app ("Probar con un ejemplo", `desktop/src-tauri/ejemplos`, armado por
//! `desktop/ejemplos/armar_ejemplo.py`) tiene que mostrar todo lo que hace MIO: los dos semestres se
//! apilan, los clientes y los productos se cruzan, y el análisis trae valores raros y predicción.

use mio_engine::combine::Step;
use mio_engine::progress::Progress;
use mio_engine::sheet::{Sheet, Source};
use std::path::PathBuf;

/// La misma planilla da siempre lo mismo, hasta el último decimal y en el mismo orden: si no, abrir dos veces
/// un proyecto mostraría números distintos. Dos lecturas de cero, como dos veces que se abre la app.
#[test]
fn el_mismo_archivo_da_exactamente_lo_mismo() {
    let dir = PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../src-tauri/ejemplos"));
    let files = ["ventas_2025_1er_semestre.csv", "ventas_2025_2do_semestre.csv", "clientes.csv", "productos.csv"].map(|f| dir.join(f));
    let run = || {
        let s = Sheet::open_many(&files.iter().map(|p| p.as_path()).collect::<Vec<_>>(), &Progress::NONE).unwrap();
        [s.analysis(None, &Progress::NONE).unwrap().to_string(), s.overview().to_string(), s.fields().to_string()]
    };
    assert!(run() == run(), "dos corridas dieron distinto");
}

#[test]
fn el_ejemplo_muestra_la_union_los_valores_raros_y_la_prediccion() {
    let dir = PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../src-tauri/ejemplos"));
    let files = ["ventas_2025_1er_semestre.csv", "ventas_2025_2do_semestre.csv", "clientes.csv", "productos.csv"].map(|f| dir.join(f));
    let s = Sheet::open_many(&files.iter().map(|p| p.as_path()).collect::<Vec<_>>(), &Progress::NONE).unwrap();
    let Source::Combined(steps) = &s.source else { panic!("tienen que quedar unidas") };
    assert!(matches!(&steps[0], Step::Stacked { files, .. } if files.len() == 2), "{steps:?}");
    let joined: Vec<(&str, &str, &str)> = steps.iter().filter_map(|s| match s {
        Step::Joined { file, key, other_key, .. } => Some((file.as_str(), key.as_str(), other_key.as_str())),
        _ => None,
    }).collect();
    assert_eq!(joined, [("clientes.csv", "cliente_id", "id"), ("productos.csv", "producto", "codigo")]);

    let a = s.analysis(None, &Progress::NONE).unwrap();
    assert_eq!(a["target_col"], "monto", "los montos con $ y puntos se leen como números");
    assert!(a["anomalies"]["metrics"]["n_anomalias"].as_u64().unwrap() > 0, "encuentra los pedidos raros");
    // Las ventas del ejemplo no tienen un patrón que le gane a repetir lo último: compiten los modelos y se dice.
    let f = &a["forecast"]["metrics"];
    assert!(f["competencia"]["ranking"].as_array().is_some_and(|r| r.len() >= 3), "con un año de días compiten los modelos: {f}");
    for col in ["segmento", "categoria", "archivo"] {
        assert!(s.columns().any(|c| c.name == col), "falta {col}");
    }
}
