//! Excel como los arma una oficina: título y fecha del reporte arriba, celdas combinadas, la fila de total
//! con su fórmula, números guardados como texto, fechas escritas como texto, una hoja vacía adelante.

use mio_engine::progress::Progress;
use mio_engine::sheet::{Sheet, Source};
use rust_xlsxwriter::{ExcelDateTime, Format, Formula, Workbook};
use std::path::PathBuf;

const ROWS: u32 = 120;
fn amount(i: u32) -> f64 {
    100.0 + f64::from(i) * 12.5
}
fn total() -> f64 {
    (0..ROWS).map(amount).sum()
}
fn ar(x: f64) -> String {
    let s = format!("{x:.2}");
    let (int, dec) = s.split_once('.').unwrap();
    let mut out = String::new();
    for (k, ch) in int.chars().enumerate() {
        if k > 0 && (int.len() - k) % 3 == 0 {
            out.push('.');
        }
        out.push(ch);
    }
    format!("{out},{dec}")
}
fn path(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join("mio_excel_de_oficina");
    std::fs::create_dir_all(&dir).unwrap();
    dir.join(name)
}
fn close(what: &str, got: Option<f64>, want: f64) {
    let got = got.unwrap_or_else(|| panic!("{what}: no quedó como número"));
    assert!((got - want).abs() < 0.01, "{what}: dio {got} y es {want}");
}

/// Un reporte con título, fecha del reporte, encabezado en la fila 4, datos y la fila de total con fórmula.
fn report(name: &str, numbers_as_text: bool, dates_as_text: bool, empty_first: bool) -> PathBuf {
    let mut book = Workbook::new();
    if empty_first {
        book.add_worksheet().set_name("Portada").unwrap();
    }
    let sheet = book.add_worksheet();
    sheet.set_name("Ventas").unwrap();
    let bold = Format::new().set_bold();
    let day = Format::new().set_num_format("dd/mm/yyyy");
    sheet.merge_range(0, 0, 0, 3, "Reporte de ventas — Sucursales del Litoral", &bold).unwrap();
    sheet.write_string(1, 0, "Emitido el 05/01/2025").unwrap();
    for (j, h) in ["Fecha", "Sucursal", "Vendedor", "Monto"].iter().enumerate() {
        sheet.write_string_with_format(3, j as u16, *h, &bold).unwrap();
    }
    for i in 0..ROWS {
        let r = 4 + i;
        let (m, d) = (1 + i % 12, 1 + i % 28);
        if dates_as_text {
            sheet.write_string(r, 0, format!("{d:02}/{m:02}/2024")).unwrap();
        } else {
            sheet.write_datetime_with_format(r, 0, &ExcelDateTime::from_ymd(2024, m as u8, d as u8).unwrap(), &day).unwrap();
        }
        sheet.write_string(r, 1, ["Rosario", "Paraná", "Santa Fe"][(i % 3) as usize]).unwrap();
        sheet.write_string(r, 2, ["Ana", "Luis", "Marta", "Juan"][(i % 4) as usize]).unwrap();
        if numbers_as_text {
            sheet.write_string(r, 3, ar(amount(i))).unwrap();
        } else {
            sheet.write_number(r, 3, amount(i)).unwrap();
        }
    }
    let last = 4 + ROWS;
    sheet.write_string_with_format(last, 2, "TOTAL", &bold).unwrap();
    sheet.write_formula(last, 3, Formula::new(format!("=SUM(D5:D{last})")).set_result(total().to_string())).unwrap();
    let p = path(name);
    book.save(&p).unwrap();
    p
}

fn check(name: &str, p: &PathBuf) -> Sheet {
    let s = Sheet::open(p, None, &Progress::NONE).unwrap_or_else(|e| panic!("{name}: {e}"));
    assert_eq!(s.columns().map(|c| c.name.as_str()).collect::<Vec<_>>(), ["Fecha", "Sucursal", "Vendedor", "Monto"], "{name}: encabezado");
    assert_eq!(s.frame.rows(), ROWS as usize, "{name}: filas (sin la de total)");
    close(name, s.total("Monto"), total());
    assert_eq!(s.profile.of_kind("fecha"), ["Fecha"], "{name}: la fecha es fecha");
    let o = s.overview();
    let f = o["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == "Fecha").unwrap();
    assert_eq!((f["fechas"]["desde"].as_str(), f["fechas"]["hasta"].as_str()), (Some("2024-01-01"), Some("2024-12-28")), "{name}: {f}");
    assert!(s.analysis(None, &Progress::NONE).is_ok());
    s
}

#[test]
fn un_reporte_de_excel_con_titulo_y_total() {
    check("con números", &report("numeros.xlsx", false, false, false));
}

#[test]
fn numeros_y_fechas_guardados_como_texto() {
    check("como texto", &report("texto.xlsx", true, true, false));
}

#[test]
fn la_primera_hoja_vacia_no_frena_nada() {
    let s = check("portada vacía", &report("portada.xlsx", false, false, true));
    assert!(matches!(&s.source, Source::Book { sheet, .. } if sheet == "Ventas"), "abre la hoja con datos");
}
