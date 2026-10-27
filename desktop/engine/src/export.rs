//! La planilla ya limpia (y unida, si eran varias), para llevársela: en CSV, para otros sistemas
//! (coma, punto decimal, fechas AAAA-MM-DD, UTF-8), o en Excel, para seguir trabajando (números como
//! números, fechas como fechas, el encabezado fijo y con filtros; `rust_xlsxwriter`). Van las columnas
//! de la persona, sin las auxiliares de la limpieza (las que empiezan con `_`).

use crate::clean::{Col, Data, Frame, Obj};
use crate::dates::{timestamp, ymd, DAY_NS};
use rust_xlsxwriter::{ExcelDateTime, Format, Workbook};
use std::path::Path;

/// Las filas que entran en una hoja de Excel (sin contar el encabezado).
pub const EXCEL_ROWS: usize = 1_048_575;
/// Cuántas filas se miran para decidir el ancho de cada columna en Excel.
const WIDTH_SAMPLE: usize = 1_000;

/// Una celda, con su tipo.
enum Cell<'a> {
    Empty,
    Int(i64),
    Num(f64),
    Bool(bool),
    Text(&'a str),
    Time(i64),
}

fn cell(c: &Col, row: usize) -> Cell<'_> {
    match &c.data {
        Data::Int(v) => Cell::Int(v[row]),
        Data::Float(v) if v[row].is_nan() => Cell::Empty,
        Data::Float(v) => Cell::Num(v[row]),
        Data::Bool(v) => Cell::Bool(v[row]),
        Data::Time(v) => v[row].map_or(Cell::Empty, Cell::Time),
        Data::Obj(d) => match d.get(row) {
            Obj::Null => Cell::Empty,
            Obj::Str(s) => Cell::Text(s),
            Obj::Bool(b) => Cell::Bool(*b),
            Obj::Num(x) if x.is_nan() => Cell::Empty,
            Obj::Num(x) => Cell::Num(*x),
        },
    }
}

/// Una fecha como texto: solo el día si es a la medianoche.
fn date_text(ns: i64) -> String {
    if ns.rem_euclid(DAY_NS) == 0 { ymd(ns.div_euclid(DAY_NS)) } else { timestamp(ns) }
}

fn columns(frame: &Frame) -> Vec<&Col> {
    frame.cols.iter().filter(|c| !c.name.starts_with('_')).collect()
}

/// Escribe la planilla en CSV.
pub fn write_csv(frame: &Frame, path: &Path) -> Result<(), String> {
    let fail = |e: &dyn std::fmt::Display| format!("No pude guardar el CSV: {e}");
    let cols = columns(frame);
    let mut w = csv::Writer::from_path(path).map_err(|e| fail(&e))?;
    w.write_record(cols.iter().map(|c| c.name.as_str())).map_err(|e| fail(&e))?;
    for row in 0..frame.rows() {
        w.write_record(cols.iter().map(|c| match cell(c, row) {
            Cell::Empty => String::new(),
            Cell::Int(x) => x.to_string(),
            Cell::Num(x) => x.to_string(),
            Cell::Bool(b) => b.to_string(),
            Cell::Text(s) => s.to_string(),
            Cell::Time(ns) => date_text(ns),
        }))
        .map_err(|e| fail(&e))?;
    }
    w.flush().map_err(|e| fail(&e))
}

/// Escribe la planilla en Excel. Si no entra en una hoja, lo dice (en CSV sí entra).
pub fn write_xlsx(frame: &Frame, path: &Path) -> Result<(), String> {
    if frame.rows() > EXCEL_ROWS {
        return Err(format!("Excel admite hasta {EXCEL_ROWS} filas por hoja y esta tiene {}. Exportala en CSV.", frame.rows()));
    }
    let fail = |e: &dyn std::fmt::Display| format!("No pude guardar el Excel: {e}");
    let cols = columns(frame);
    let mut book = Workbook::new();
    let sheet = book.add_worksheet_with_constant_memory().map_err(|e| fail(&e))?;
    sheet.set_name("Planilla").map_err(|e| fail(&e))?;
    let head = Format::new().set_bold();
    let day = Format::new().set_num_format("dd/mm/yyyy");
    let moment = Format::new().set_num_format("dd/mm/yyyy hh:mm");
    for (j, c) in cols.iter().enumerate() {
        let j = j as u16;
        sheet.write_string_with_format(0, j, &c.name, &head).map_err(|e| fail(&e))?;
        let longest = (0..frame.rows().min(WIDTH_SAMPLE)).map(|r| match cell(c, r) {
            Cell::Text(s) => s.chars().count(),
            Cell::Time(_) => 16,
            _ => 12,
        });
        sheet.set_column_width(j, (longest.chain([c.name.chars().count()]).max().unwrap_or(10) + 2).min(60) as f64).map_err(|e| fail(&e))?;
    }
    for row in 0..frame.rows() {
        let r = row as u32 + 1;
        for (j, c) in cols.iter().enumerate() {
            let j = j as u16;
            let written = match cell(c, row) {
                Cell::Empty => continue,
                Cell::Int(x) => sheet.write_number(r, j, x as f64).map(drop),
                Cell::Num(x) => sheet.write_number(r, j, x).map(drop),
                Cell::Bool(b) => sheet.write_boolean(r, j, b).map(drop),
                Cell::Text(s) => sheet.write_string(r, j, s).map(drop),
                Cell::Time(ns) => {
                    let when = ExcelDateTime::from_timestamp(ns.div_euclid(1_000_000_000)).map_err(|e| fail(&e))?;
                    sheet.write_datetime_with_format(r, j, &when, if ns.rem_euclid(DAY_NS) == 0 { &day } else { &moment }).map(drop)
                }
            };
            written.map_err(|e| fail(&e))?;
        }
    }
    sheet.set_freeze_panes(1, 0).map_err(|e| fail(&e))?;
    if !cols.is_empty() {
        sheet.autofilter(0, 0, frame.rows() as u32, cols.len() as u16 - 1).map_err(|e| fail(&e))?;
    }
    book.save(path).map_err(|e| fail(&e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Progress;
    use crate::sheet::Sheet;

    #[test]
    fn exporta_la_planilla_limpia_en_csv_y_en_excel() {
        let dir = std::env::temp_dir().join("mio_exportar_test");
        std::fs::create_dir_all(&dir).unwrap();
        let src = dir.join("ventas.csv");
        std::fs::write(&src, "fecha;ventas;sucursal\n01/01/2024;$ 1.200,50;Norte\n02/01/2024;$ 980,00;Sur\n03/01/2024;;Norte\n").unwrap();
        let s = Sheet::open(&src, None, &Progress::NONE).unwrap();

        let csv_path = dir.join("limpia.csv");
        write_csv(&s.frame, &csv_path).unwrap();
        let text = std::fs::read_to_string(&csv_path).unwrap();
        let mut lines = text.lines();
        let header = lines.next().unwrap();
        assert!(!header.contains('_'), "sin columnas auxiliares: {header}");
        let first = lines.next().unwrap();
        assert!(first.contains("2024-01-01") && first.contains("1200.5"), "fechas y números como datos: {first}");

        let xlsx = dir.join("limpia.xlsx");
        write_xlsx(&s.frame, &xlsx).unwrap();
        let book = crate::reader::read_excel(&xlsx, None).unwrap();
        assert_eq!(book.table.rows(), s.frame.rows(), "el Excel tiene las mismas filas");
    }
}
