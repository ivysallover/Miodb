//! Una planilla abierta: leída (CSV o Excel), limpia y lista para analizar. Es la entrada de la app
//! de escritorio; cada paso es una pieza del motor (lector, limpieza, perfil, pronóstico).

use crate::clean::{clean, suggest_targets, Col, Data, Frame, Obj, Report, DATE, NUMERIC};
use crate::forecaster::run_forecast;
use crate::reader::{read_csv, read_excel, Format};
use serde_json::Value;
use std::path::Path;

/// Extensiones que se leen como Excel; el resto, como texto separado (CSV, TSV, TXT).
pub const EXCEL_EXTENSIONS: [&str; 4] = ["xlsx", "xlsm", "xls", "ods"];

/// De dónde salió la tabla.
pub enum Source {
    Csv(Format),
    Excel,
}

pub struct Sheet {
    pub file: String,
    pub bytes: usize,
    pub source: Source,
    pub frame: Frame,
    pub report: Report,
}

impl Sheet {
    /// Lee y limpia la planilla igual que el motor de la web.
    pub fn open(path: &Path) -> Result<Sheet, String> {
        let raw = std::fs::read(path).map_err(|e| format!("No pude abrir el archivo: {e}"))?;
        let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
        let (source, table) = if EXCEL_EXTENSIONS.contains(&ext.as_str()) {
            (Source::Excel, read_excel(&raw)?)
        } else {
            let (fmt, table) = read_csv(&raw)?;
            (Source::Csv(fmt), table)
        };
        let (frame, report) = clean(&table);
        if frame.rows() == 0 {
            return Err("La planilla no tiene datos: todas las celdas están vacías.".into());
        }
        let file = path.file_name().map_or_else(String::new, |f| f.to_string_lossy().into_owned());
        Ok(Sheet { file, bytes: raw.len(), source, frame, report })
    }

    /// Las columnas de la persona (sin las auxiliares que agrega la limpieza, que empiezan con `_`).
    pub fn columns(&self) -> impl Iterator<Item = &Col> {
        self.frame.cols.iter().filter(|c| !c.name.starts_with('_'))
    }

    pub fn kind(&self, name: &str) -> Option<&str> {
        self.report.type_of(name)
    }

    pub fn is_date(&self, name: &str) -> bool {
        self.frame.col(name).map_or(false, |c| matches!(c.data, Data::Time(_)))
    }

    /// Los valores de una columna numérica (vacío = NaN); `None` si la columna no lo es.
    pub fn numbers(&self, name: &str) -> Option<Vec<f64>> {
        if self.kind(name) != Some(NUMERIC) {
            return None;
        }
        match &self.frame.col(name)?.data {
            Data::Int(v) => Some(v.iter().map(|x| *x as f64).collect()),
            Data::Float(v) => Some(v.clone()),
            Data::Obj(v) if v.iter().any(|o| matches!(o, Obj::Num(_))) => {
                Some(v.iter().map(|o| if let Obj::Num(x) = o { *x } else { f64::NAN }).collect())
            }
            _ => None,
        }
    }

    pub fn suggested_date(&self) -> Option<&str> {
        self.columns().find(|c| self.kind(&c.name) == Some(DATE)).map(|c| c.name.as_str())
    }

    /// El dato a proyectar: el primero que sugiere el perfil (ventas antes que costos, edades o
    /// porcentajes) y que tiene números.
    pub fn suggested_value(&self) -> Option<String> {
        suggest_targets(&self.frame, &self.report).into_iter().find(|n| self.numbers(n).is_some())
    }

    /// El pronóstico (con la guerra de modelos) de `value` a lo largo de `date`.
    pub fn forecast(&self, date: &str, value: &str, horizon: usize) -> Result<Value, String> {
        let days: Vec<f64> = match &self.frame.col(date).ok_or("No encontré la columna de fecha.")?.data {
            Data::Time(v) => v.iter().map(|x| x.map_or(f64::NAN, |ns| ns.div_euclid(86_400_000_000_000) as f64)).collect(),
            _ => return Err("La columna de fecha no tiene fechas.".into()),
        };
        let values = self.numbers(value).ok_or("La columna de valores no es numérica.")?;
        Ok(run_forecast(&days, &values, value, horizon))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Montos argentinos como texto, una fila duplicada y una celda "s/d": la planilla sale limpia,
    /// con fecha y ventas sugeridas, y el pronóstico corre la competencia.
    #[test]
    fn abre_limpia_y_pronostica() {
        let dir = std::env::temp_dir().join("mio_sheet_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("ventas.csv");
        let mut csv = String::from("fecha;ventas;id_cliente;sucursal\n");
        for i in 0..150 {
            let (d, m) = (i % 28 + 1, i / 28 + 1);
            let monto = if i == 7 { "s/d".to_string() } else { format!("$ {},{:02}", 200 + i * 2 + (i % 7) * 10, i % 100) };
            csv.push_str(&format!("{:02}/{:02}/2024;{};C{:04};{}\n", d, m, monto, 1000 + i, if i % 2 == 0 { "Norte" } else { "Sur" }));
        }
        csv.push_str("01/01/2024;$ 200,00;C1000;Norte\n");
        std::fs::write(&path, csv).unwrap();
        let s = Sheet::open(&path).unwrap();
        assert_eq!(s.frame.rows(), 150);
        assert_eq!(s.report.duplicates_removed, 1);
        assert_eq!(s.report.monetary, vec!["ventas".to_string()]);
        assert_eq!(s.suggested_date(), Some("fecha"));
        assert_eq!(s.suggested_value().as_deref(), Some("ventas"));
        let m = &s.forecast("fecha", "ventas", 60).unwrap()["metrics"];
        assert!(m["error"].is_null(), "{m}");
        assert!(m["competencia"]["ranking"].as_array().unwrap().len() >= 3);
    }

    /// Un Excel con título y filas vacías arriba: toma el encabezado real y las fechas como fechas.
    #[test]
    fn abre_un_excel_con_titulo_arriba() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden/xlsx/titulo_corrido.xlsx");
        let s = Sheet::open(&path).unwrap();
        assert!(matches!(s.source, Source::Excel));
        assert_eq!(s.columns().map(|c| c.name.as_str()).collect::<Vec<_>>(), ["fecha", "ventas", "region"]);
        assert!(s.is_date("fecha"));
        assert_eq!(s.suggested_date(), Some("fecha"));
        assert_eq!(s.suggested_value().as_deref(), Some("ventas"));
    }
}
