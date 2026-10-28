//! Parquet, JSON y SQLite dan el mismo análisis que el CSV del que salen: las planillas de
//! `golden/csv_analisis/`, escritas en cada formato con pandas (`golden/make_golden_formats.py`).
//! El análisis depende solo de la planilla limpia y de lo que informó la limpieza (el resto es el mismo
//! motor), así que se exige que esas dos sean iguales; una vez se corre el análisis entero, para verlo.

use mio_engine::progress::Progress;
use mio_engine::sheet::Sheet;
use std::path::Path;

#[test]
fn cada_formato_da_la_misma_planilla_limpia_que_su_csv() {
    let golden = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden");
    let open = |path: &Path| Sheet::open(path, None, &Progress::NONE).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
    let mut seen = 0;
    for entry in std::fs::read_dir(golden.join("csv_analisis")).unwrap() {
        let csv = entry.unwrap().path();
        let stem = csv.file_stem().unwrap().to_string_lossy().into_owned();
        let expected = open(&csv);
        for ext in ["parquet", "json", "sqlite"] {
            let other = open(&golden.join("formatos").join(format!("{stem}.{ext}")));
            // -0,0 y 0,0 son el mismo número; pandas escribe el JSON sin ese signo.
            let table = |s: &Sheet| format!("{:?}", s.frame).replace("-0.0,", "0.0,");
            assert_eq!(table(&other), table(&expected), "{stem}.{ext}: otra planilla limpia");
            assert_eq!(other.report.actions, expected.report.actions, "{stem}.{ext}: otra limpieza");
            seen += 1;
        }
    }
    assert!(seen >= 18, "faltan planillas: correr make_golden_formats.py");
}

#[test]
fn un_parquet_da_el_mismo_analisis_entero() {
    let golden = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden");
    let analysis = |path: &Path| {
        let s = Sheet::open(path, None, &Progress::NONE).unwrap();
        let mut a = s.analysis(None, &Progress::NONE).unwrap();
        a["filename"] = serde_json::Value::Null;
        a
    };
    assert_eq!(analysis(&golden.join("formatos/ventas_semanales.parquet")), analysis(&golden.join("csv_analisis/ventas_semanales.csv")));
}
