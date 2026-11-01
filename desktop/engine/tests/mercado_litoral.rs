//! Mercado Litoral: 18 CSV con problemas sembrados a propósito, cada uno anotado en
//! `_anomalias_inyectadas.csv`, para medir qué entiende MIO y qué se le escapa. Los datos no están en el
//! repo (175 MB, `gen.py` los regenera): la prueba corre si están en `$MERCADO_LITORAL` o en
//! `~/Downloads/mercado_litoral`, y si no, avisa y pasa.

use mio_engine::combine::Step;
use mio_engine::progress::Progress;
use mio_engine::sheet::{Sheet, Source};
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

const FILES: [&str; 18] = [
    "_anomalias_inyectadas", "clientes", "compras", "devoluciones", "empleados", "inventario_mensual_2023", "inventario_mensual_2024",
    "inventario_mensual_2025", "macro_mensual", "productos", "promociones", "proveedores", "sensores_frio", "tiendas", "ventas_detalle_2023",
    "ventas_detalle_2024", "ventas_detalle_2025", "ventas_tickets",
];

fn folder() -> Option<PathBuf> {
    let dir = std::env::var_os("MERCADO_LITORAL").map(PathBuf::from).or_else(|| Some(PathBuf::from(std::env::var_os("HOME")?).join("Downloads/mercado_litoral")))?;
    dir.join("_anomalias_inyectadas.csv").exists().then_some(dir)
}

/// `(ticket, línea)` de cada problema sembrado en `ventas_detalle`, por tipo.
fn seeded(dir: &PathBuf) -> HashMap<String, HashSet<(String, String)>> {
    let mut out: HashMap<String, HashSet<(String, String)>> = HashMap::new();
    let mut r = csv::Reader::from_path(dir.join("_anomalias_inyectadas.csv")).unwrap();
    for row in r.records().flatten() {
        if &row[0] == "ventas_detalle" {
            if let Some((ticket, line)) = row[1].split_once('#') {
                out.entry(row[3].to_string()).or_default().insert((ticket.to_string(), line.to_string()));
            }
        }
    }
    out
}

#[test]
fn entiende_mercado_litoral() {
    let Some(dir) = folder() else {
        eprintln!("Sin los datos de Mercado Litoral: esta prueba no corrió.");
        return;
    };
    let files: Vec<PathBuf> = FILES.iter().map(|f| dir.join(format!("{f}.csv"))).collect();
    let t = std::time::Instant::now();
    let s = Sheet::open_many(&files.iter().map(|p| p.as_path()).collect::<Vec<_>>(), &Progress::NONE).unwrap();
    eprintln!("abrir y unir: {:?}", t.elapsed());

    // Las ventas de los tres años quedan juntas, aunque en 2025 cambien las columnas.
    let Source::Combined(steps) = &s.source else { panic!("tienen que quedar unidas") };
    let sales = steps.iter().find_map(|x| match x {
        Step::Stacked { files, rows, renamed } if files.iter().any(|f| f.contains("ventas_detalle")) => Some((files, rows, renamed)),
        _ => None,
    }).expect("ventas apiladas");
    assert_eq!(sales.0.len(), 3, "{steps:?}");
    assert_eq!(*sales.1, 1_157_455);
    assert!(sales.2.iter().any(|(_, from, to)| from == "precio_unit" && to == "precio_unitario"), "{:?}", sales.2);
    assert!(s.frame.col("canal").is_some(), "la columna nueva de 2025 queda");

    let text = |name: &str, i: usize| -> String { mio_engine::anomalies::cell_text(s.frame.col(name).unwrap(), i) };
    let number = |name: &str, i: usize| s.frame.col(name).unwrap().numbers().unwrap()[i];
    let n = s.frame.rows();
    let at: HashMap<(String, String), usize> = (0..n).map(|i| ((text("ticket_id", i), text("linea", i)), i)).collect();
    let row = |ticket: &str, line: &str| at[&(ticket.to_string(), line.to_string())];

    // Coma decimal y moneda: cada valor con su formato, en la misma columna.
    let close = |a: f64, b: f64, what: &str| assert!((a - b).abs() < 0.01, "{what}: {a} y {b}");
    let mut raw = csv::Reader::from_path(dir.join("ventas_detalle_2023.csv")).unwrap();
    let mut seen_comma = 0;
    for rec in raw.records().flatten() {
        if rec[4].contains(',') && !rec[4].contains('.') && seen_comma < 200 && at.contains_key(&(rec[0].to_string(), rec[1].to_string())) {
            let i = row(&rec[0], &rec[1]);
            close(number("precio_unitario", i), rec[4].replace(',', ".").parse().unwrap(), &rec[4]);
            seen_comma += 1;
        }
    }
    assert_eq!(seen_comma, 200);
    let mut tickets = csv::Reader::from_path(dir.join("ventas_tickets.csv")).unwrap();
    let mut seen_money = 0;
    for rec in tickets.records().flatten() {
        if rec[11].contains('$') && seen_money < 200 {
            if let Some(i) = (1..7).find_map(|line| at.get(&(rec[0].to_string(), line.to_string()))) {
                let want: f64 = rec[11].replace(['$', ' ', '.'], "").replace(',', ".").parse().unwrap();
                close(number("total_neto", *i), want, &rec[11]);
                seen_money += 1;
            }
        }
    }
    assert_eq!(seen_money, 200);
    // El IVA con coma y el costo no se multiplican por 100.
    let iva: HashSet<String> = (0..n).step_by(97).map(|i| text("iva_pct", i)).collect();
    assert!(iva.iter().all(|v| v == "21" || v == "10.5"), "{iva:?}");

    // Las fechas: se leen todas las que existen, y las de 2027 dejan de arruinar la serie.
    let o = s.overview();
    let fecha = o["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == "fecha_hora").unwrap();
    eprintln!("fechas: {} a {}; vacías {}", fecha["fechas"]["desde"], fecha["fechas"]["hasta"], fecha["vacios"]);
    assert_eq!(fecha["fechas"]["meses"].as_array().unwrap().len(), 36, "{}", fecha["fechas"]["hasta"]);
    assert!(fecha["fechas"]["hasta"].as_str().unwrap().starts_with("2025-12"));

    // Lo escrito distinto cuenta como una sola cosa.
    let distinct = |name: &str| o["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == name).unwrap()["distintos"].as_u64().unwrap();
    eprintln!("medio_pago {} · tienda_id {} · sku {} · acepta_marketing {}", distinct("medio_pago"), distinct("tienda_id"), distinct("sku"), distinct("acepta_marketing"));
    assert!(distinct("medio_pago") <= 8);
    assert!(distinct("tienda_id") <= 42);
    // Códigos: `sku-000123` y `SKU000123` pasan a `SKU-000123`; quedan aparte solo los que no están en el catálogo.
    let clean_sku = (0..n).step_by(7).filter(|&i| text("sku", i).starts_with("SKU-")).count() as f64 / (n / 7) as f64;
    assert!(clean_sku > 0.998, "{clean_sku}");
    assert_eq!(distinct("acepta_marketing"), 2);
    assert!((0..n).step_by(11).all(|i| !text("apellido", i).contains('Ã')), "sin acentos rotos");
    assert!(!s.profile.of_kind("numérica").iter().any(|c| ["lat", "lon", "ean13"].contains(&c.as_str())), "ni coordenadas ni códigos como cantidades");

    // Lo que MIO marca contra lo sembrado.
    let t = std::time::Instant::now();
    let a = s.analysis(Some("subtotal"), &Progress::NONE).unwrap();
    eprintln!("analizar: {:?}", t.elapsed());
    let seeds = seeded(&dir);
    let problems = s.problems();
    let of = |column: &str, kind: &str| -> HashSet<(String, String)> {
        problems.iter().filter(|p| p.column == column && p.kind == kind).flat_map(|p| p.rows.iter().map(|&i| (text("ticket_id", i), text("linea", i)))).collect()
    };
    let score = |what: &str, seed: &str, found: &HashSet<(String, String)>| -> f64 {
        let want: HashSet<_> = seeds[seed].iter().filter(|k| at.contains_key(*k)).collect();
        let hit = want.iter().filter(|k| found.contains(**k)).count();
        let recall = hit as f64 / want.len().max(1) as f64;
        eprintln!("{what}: encontró {hit} de {} sembradas ({:.0} %); marcó {}", want.len(), recall * 100.0, found.len());
        recall
    };
    assert!(score("cantidad negativa", "cantidad negativa", &of("cantidad", "negativo")) > 0.99);
    assert!(score("precio cero", "precio cero", &of("precio_unitario", "cero")) > 0.99);
    assert!(score("precio ×100", "outlier (x100)", &of("precio_unitario", "lejos")) > 0.9);
    assert!(score("cantidad extrema", "outlier extremo", &of("cantidad", "lejos")) > 0.8);
    for p in problems {
        eprintln!("  {}", p.text);
    }
    let m = &a["anomalies"]["metrics"];
    eprintln!("n_anomalias {}; {} ejemplos", m["n_anomalias"], m["anomaly_records"].as_array().unwrap().len());

    // Con todo eso, hay predicción.
    let forecast: &Value = &a["forecast"];
    assert!(forecast["metrics"]["error"].is_null(), "{}", forecast["metrics"]["error"]);
    eprintln!("predicción: {} · {}", forecast["metrics"]["competencia"]["ganador"], forecast["metrics"]["frecuencia"]);
    eprintln!("{:?}", a["charts"].as_array().unwrap().iter().map(|c| c["metadata"]["title"].as_str().unwrap().to_string()).collect::<Vec<_>>());
}
