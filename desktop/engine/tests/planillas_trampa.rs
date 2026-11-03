//! Planillas de oficina con las trampas de siempre, cada una con su respuesta correcta: filas de total,
//! negativos entre paréntesis, monedas con letras, fechas de Excel o con el mes en palabras, archivos en
//! UTF-16 o Latin-1, una sola columna, filas desparejas. Lo que se lee tiene que dar lo que dice la planilla.

use mio_engine::progress::Progress;
use mio_engine::sheet::Sheet;
use std::path::PathBuf;

/// Las 240 ventas de prueba: fecha, sucursal y monto.
fn rows() -> Vec<(String, &'static str, f64)> {
    (0..240).map(|i| (format!("{:02}/{:02}/2024", 1 + i % 28, 1 + i % 12), ["Norte", "Sur", "Este"][i % 3], 100.0 + i as f64 * 7.5)).collect()
}
fn total() -> f64 {
    rows().iter().map(|r| r.2).sum()
}
/// "1.234,56".
fn ar(x: f64) -> String {
    let neg = x < 0.0;
    let cents = (x.abs() * 100.0).round() as i64;
    let mut whole = (cents / 100).to_string();
    let mut groups = Vec::new();
    while whole.len() > 3 {
        groups.insert(0, whole.split_off(whole.len() - 3));
    }
    groups.insert(0, whole);
    format!("{}{},{:02}", if neg { "-" } else { "" }, groups.join("."), cents % 100)
}
fn sheet(name: &str, bytes: Vec<u8>) -> Sheet {
    let dir = std::env::temp_dir().join("mio_planillas_trampa");
    std::fs::create_dir_all(&dir).unwrap();
    let path: PathBuf = dir.join(name);
    std::fs::write(&path, bytes).unwrap();
    Sheet::open(&path, None, &Progress::NONE).unwrap_or_else(|e| panic!("{name}: {e}"))
}
fn csv(name: &str, head: &str, line: impl Fn(usize, &(String, &'static str, f64)) -> String) -> Sheet {
    let text: String = std::iter::once(format!("{head}\n")).chain(rows().iter().enumerate().map(|(i, r)| format!("{}\n", line(i, r)))).collect();
    sheet(name, text.into_bytes())
}
fn close(name: &str, got: Option<f64>, want: f64) {
    let got = got.unwrap_or_else(|| panic!("{name}: no quedó como número"));
    assert!((got - want).abs() < 0.01, "{name}: dio {got} y es {want}");
}

#[test]
fn saca_las_filas_de_total_y_subtotal() {
    let mut text = String::from("fecha;sucursal;monto\n");
    for (i, (d, s, m)) in rows().iter().enumerate() {
        text.push_str(&format!("{d};{s};$ {}\n", ar(*m)));
        if i % 60 == 59 {
            text.push_str(&format!(";Subtotal {s};$ {}\n", ar(*m)));
        }
    }
    text.push_str(&format!(";TOTAL;$ {}\n", ar(total())));
    let s = sheet("totales.csv", text.into_bytes());
    assert_eq!(s.frame.rows(), 240);
    close("totales", s.total("monto"), total());
    assert!(s.report.actions.iter().any(|a| a.contains("5 filas de totales")), "{:?}", s.report.actions);
    // Una sucursal que se llama "Total" en una fila completa es un dato.
    let s = csv("total_es_dato.csv", "fecha;sucursal;monto", |i, (d, s, m)| format!("{d};{};{}", if i == 3 { "Total" } else { s }, ar(*m)));
    assert_eq!(s.frame.rows(), 240);
}

#[test]
fn lee_negativos_monedas_y_miles_de_todas_las_formas() {
    let signed: Vec<f64> = rows().iter().enumerate().map(|(i, r)| if i % 10 == 0 { -r.2 } else { r.2 }).collect();
    let want: f64 = signed.iter().sum();
    let s = csv("parentesis.csv", "fecha;sucursal;monto", |i, (d, s, _)| format!("{d};{s};{}", if signed[i] < 0.0 { format!("({})", ar(-signed[i])) } else { ar(signed[i]) }));
    close("paréntesis", s.total("monto"), want);
    let s = csv("menos_atras.csv", "fecha;sucursal;monto", |i, (d, s, _)| format!("{d};{s};{}", if signed[i] < 0.0 { format!("{}-", ar(-signed[i])) } else { ar(signed[i]) }));
    close("menos atrás", s.total("monto"), want);
    for (name, fmt) in [
        ("codigo.csv", Box::new(|m: f64| format!("ARS {}", ar(m))) as Box<dyn Fn(f64) -> String>),
        ("dolares.csv", Box::new(|m: f64| format!("U$S {}", ar(m)))),
        ("espacios.csv", Box::new(|m: f64| ar(m).replace('.', " "))),
        ("nbsp.csv", Box::new(|m: f64| format!("$\u{a0}{}", ar(m)))),
        ("apostrofo.csv", Box::new(|m: f64| format!("{m:.2}").replace('.', "#").chars().rev().collect::<String>().replace('#', ".").chars().rev().collect::<String>())),
    ] {
        let s = csv(name, "fecha;sucursal;monto", |_, (d, s, m)| format!("{d};{s};{}", fmt(*m)));
        close(name, s.total("monto"), total());
    }
    let s = csv("miles_apostrofo.csv", "fecha;sucursal;monto", |_, (d, s, m)| format!("{d};{s};{}", if *m >= 1000.0 { format!("{}'{:06.2}", (*m / 1000.0) as i64, m % 1000.0) } else { format!("{m:.2}") }));
    close("apóstrofo", s.total("monto"), total());
}

#[test]
fn lee_fechas_de_excel_y_con_el_mes_en_palabras() {
    const MESES: [&str; 12] = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    let excel = |d: &str| {
        let (day, month): (i64, i64) = (d[..2].parse().unwrap(), d[3..5].parse().unwrap());
        mio_engine::dates::days_from_civil(2024, month, day) + 25_569
    };
    let cases: Vec<(&str, Box<dyn Fn(&str) -> String>)> = vec![
        ("serial.csv", Box::new(move |d| excel(d).to_string())),
        ("abreviado.csv", Box::new(|d| format!("{}-{}-2024", &d[..2], &MESES[d[3..5].parse::<usize>().unwrap() - 1][..3]))),
        ("palabras.csv", Box::new(|d| format!("{} de {} de 2024", d[..2].parse::<u32>().unwrap(), MESES[d[3..5].parse::<usize>().unwrap() - 1]))),
    ];
    for (name, date) in cases {
        let s = csv(name, "fecha;sucursal;monto", |_, (d, s, m)| format!("{};{s};{}", date(d), ar(*m)));
        let o = s.overview();
        let f = o["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == "fecha").unwrap();
        assert_eq!((f["fechas"]["desde"].as_str(), f["fechas"]["hasta"].as_str()), (Some("2024-01-01"), Some("2024-12-28")), "{name}: {f}");
    }
    // Un año imposible (9999, 0001) queda vacío: no da la vuelta ni rompe nada.
    let s = csv("anios_imposibles.csv", "fecha;sucursal;monto", |i, (d, s, m)| format!("{};{s};{}", if i % 10 == 0 { format!("{}9999", &d[..6]) } else if i % 10 == 1 { format!("{}0001", &d[..6]) } else { d.clone() }, ar(*m)));
    assert_eq!(s.frame.rows(), 240);
    assert!(s.analysis(None, &Progress::NONE).is_ok());
    // Un teléfono de diez cifras no es una fecha.
    let s = csv("telefonos.csv", "telefono;sucursal;monto", |i, (_, s, m)| format!("{};{s};{}", 3_415_000_000u64 + i as u64, ar(*m)));
    assert!(s.profile.of_kind("fecha").is_empty());
}

#[test]
fn lee_archivos_de_excel_en_unicode_y_latin1() {
    let text: String = std::iter::once("fecha\tsucursal\tmonto\n".to_string()).chain(rows().iter().map(|(d, s, m)| format!("{d}\t{s} Ñandú\t{}\n", ar(*m)))).collect();
    let mut bytes = vec![0xFF, 0xFE];
    bytes.extend(text.encode_utf16().flat_map(u16::to_le_bytes));
    let s = sheet("unicode.txt", bytes);
    assert_eq!(s.columns().map(|c| c.name.as_str()).collect::<Vec<_>>(), ["fecha", "sucursal", "monto"]);
    close("UTF-16", s.total("monto"), total());
    assert!(s.fields().to_string().contains("Norte Ñandú"));

    let text: String = std::iter::once("fecha;sucursal;monto\n".to_string()).chain(rows().iter().map(|(d, s, m)| format!("{d};{s} Peñón;{}\n", ar(*m)))).collect();
    let s = sheet("latin1.csv", encoding_rs::WINDOWS_1252.encode(&text).0.into_owned());
    assert!(s.fields().to_string().contains("Sur Peñón"));
}

#[test]
fn lee_formas_raras_de_la_planilla() {
    // Una sola columna con coma decimal: la coma no separa.
    let s = csv("una_columna.csv", "monto", |_, (_, _, m)| ar(*m));
    assert_eq!(s.frame.rows(), 240);
    close("una columna", s.total("monto"), total());
    // Separadores de más al final: no se pierde ninguna fila ni el encabezado.
    let s = csv("desparejas.csv", "fecha;sucursal;monto;;", |i, (d, s, m)| format!("{d};{s};{}{}", ar(*m), if i % 2 == 0 { ";;;" } else { ";" }));
    assert_eq!(s.frame.rows(), 240);
    assert_eq!(s.columns().map(|c| c.name.as_str()).collect::<Vec<_>>(), ["fecha", "sucursal", "monto"]);
    // Comillas con separador y saltos de línea adentro.
    let s = csv("comillas.csv", "fecha,sucursal,nota,monto", |_, (d, s, m)| format!("{d},{s},\"Pedido, urgente\nllamar\",{m:.2}"));
    assert_eq!(s.frame.rows(), 240);
    close("comillas", s.total("monto"), total());
    // Códigos con ceros adelante y CUIT: quedan como texto, enteros.
    let s = csv("codigos.csv", "codigo;cuit;monto", |i, (_, _, m)| format!("{i:05};{};{}", 20_000_000_000u64 + i as u64 * 997, ar(*m)));
    assert!(s.fields().to_string().contains("\"00007\""));
    // La unidad pegada al número.
    let s = csv("unidad.csv", "producto;peso;monto", |i, (_, _, m)| format!("P{};{} kg;{}", i % 9, i % 7 + 1, ar(*m)));
    close("unidad", s.total("peso").or(Some(0.0)).filter(|x| *x > 0.0).or_else(|| s.frame.col("peso").and_then(|c| c.numbers()).map(|v| v.iter().sum())), (0..240).map(|i| (i % 7 + 1) as f64).sum());
    // Para tildar: el vacío es "No", no el valor más común.
    let s = csv("tildar.csv", "sucursal;marcado;monto", |i, (_, s, m)| format!("{s};{};{}", if i % 3 == 0 { "X" } else { "" }, ar(*m)));
    let marcado = s.fields()["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == "marcado").unwrap()["valores"].clone();
    assert_eq!(marcado, serde_json::json!([["No", 160], ["Sí", 80]]));
}

#[test]
fn lo_vacio_se_dice_sin_romperse() {
    let dir = std::env::temp_dir().join("mio_planillas_trampa");
    std::fs::create_dir_all(&dir).unwrap();
    for (name, text) in [("solo_encabezado.csv", "fecha;sucursal;monto\n"), ("vacia.csv", ""), ("espacios.csv", "   \n\n  \n")] {
        std::fs::write(dir.join(name), text).unwrap();
        assert!(Sheet::open(&dir.join(name), None, &Progress::NONE).is_err(), "{name}");
    }
    let s = sheet("una_fila.csv", b"fecha;sucursal;monto\n01/02/2024;Norte;1.234,56\n".to_vec());
    close("una fila", s.total("monto"), 1234.56);
    assert!(s.analysis(None, &Progress::NONE).is_ok());
}
