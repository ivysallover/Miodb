//! Una planilla abierta: leída (CSV o Excel), limpia, con su perfil, y su análisis con el mismo
//! formato que devuelve el motor de la web (`analysis_pipeline`), así la pantalla lo muestra con los
//! mismos componentes. Es la entrada de la app de escritorio.

use crate::charts::auto_charts;
use crate::dates::DAY_NS;
use crate::clean::{clean, Col, Data, Frame, Report, DATE, NUMERIC};
use crate::anomalies::anomalies;
use crate::drivers::feature_importance;
use crate::segments::segments;
use crate::forecaster::run_forecast;
use crate::profile::{profile, Profile};
use crate::progress::{Progress, Stage};
use crate::pynum::{cast, count_label, format_number, np_sum};
use crate::reader::{read_csv, read_excel, Format};
use serde_json::{json, Value};
use std::path::Path;

/// Extensiones que se leen como Excel; el resto, como texto separado (CSV, TSV, TXT).
pub const EXCEL_EXTENSIONS: [&str; 4] = ["xlsx", "xlsm", "xls", "ods"];

/// Períodos que se proyectan (los mismos que la web).
const HORIZON: usize = 60;

/// Hasta `max` de `rows`, repartidas parejo: donde la web toma una muestra al azar, acá se toma una
/// fija, así la misma planilla da siempre lo mismo.
pub(crate) fn spread(rows: Vec<usize>, max: usize) -> Vec<usize> {
    if rows.len() <= max { rows } else { (0..max).map(|i| rows[i * rows.len() / max]).collect() }
}

/// Filas que usan los modelos (qué lo mueve, valores raros, grupos), como la web: hasta 10.000.
fn model_rows(n: usize) -> Vec<usize> {
    spread((0..n).collect(), 10_000)
}

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
    pub profile: Profile,
}

impl Sheet {
    /// Lee, limpia y perfila la planilla igual que el motor de la web, avisando cada etapa.
    pub fn open(path: &Path, progress: &Progress) -> Result<Sheet, String> {
        let bytes = std::fs::metadata(path).map_err(|e| format!("No pude abrir el archivo: {e}"))?.len() as usize;
        let ext = path.extension().map(|e| e.to_string_lossy().to_lowercase()).unwrap_or_default();
        let (source, table) = if EXCEL_EXTENSIONS.contains(&ext.as_str()) {
            progress.report(Stage::Reading, None);
            (Source::Excel, read_excel(path)?)
        } else {
            let (fmt, table) = read_csv(path, progress)?;
            (Source::Csv(fmt), table)
        };
        progress.report(Stage::Cleaning, None);
        let (frame, report) = clean(table);
        if frame.rows() == 0 {
            return Err("La planilla no tiene datos: todas las celdas están vacías.".into());
        }
        let profile = profile(&frame);
        let file = path.file_name().map_or_else(String::new, |f| f.to_string_lossy().into_owned());
        Ok(Sheet { file, bytes, source, frame, report, profile })
    }

    /// Las columnas de la persona (sin las auxiliares que agrega la limpieza, que empiezan con `_`).
    pub fn columns(&self) -> impl Iterator<Item = &Col> {
        self.frame.cols.iter().filter(|c| !c.name.starts_with('_'))
    }

    /// Los valores de una columna numérica (vacío = NaN); `None` si la columna no lo es.
    fn numbers(&self, name: &str) -> Option<Vec<f64>> {
        if self.profile.kind(name) != Some(NUMERIC) {
            return None;
        }
        self.frame.col(name)?.numbers().map(|v| v.into_owned())
    }

    /// Qué se analiza, como `_resolve_target`: la columna pedida (sin importar mayúsculas), si no la
    /// primera sugerida, si no la primera numérica, si no la primera.
    pub fn target(&self, requested: Option<&str>) -> String {
        let numeric = self.profile.of_kind(NUMERIC);
        if let Some(want) = requested.map(|t| t.trim().to_lowercase()) {
            let same = |c: &&String| c.trim().to_lowercase() == want;
            let all: Vec<String> = self.frame.cols.iter().map(|c| c.name.clone()).collect();
            if let Some(c) = numeric.iter().find(same).or_else(|| all.iter().find(same)) {
                return c.clone();
            }
        }
        self.profile.suggested_targets.first().or(numeric.first()).cloned().unwrap_or_else(|| self.frame.cols[0].name.clone())
    }

    /// El pronóstico (con la guerra de modelos) de `value` a lo largo de `date`.
    fn forecast(&self, date: &str, value: &str) -> Value {
        let (Some(Data::Time(t)), Some(values)) = (self.frame.col(date).map(|c| &c.data), self.numbers(value)) else {
            return json!({ "chart_data": null, "metrics": {} });
        };
        let days: Vec<f64> = t.iter().map(|x| x.map_or(f64::NAN, |ns| ns.div_euclid(DAY_NS) as f64)).collect();
        run_forecast(&days, &values, value, HORIZON)
    }

    /// Los números clave de `target` (`kpis`): registros, columnas y, si es numérica, total, promedio,
    /// máximo y mínimo, sumados como pandas (enteros exactos; decimales con la suma de numpy).
    fn kpis(&self, target: &str) -> Value {
        let p = &self.profile;
        let mut kpis = json!({ "Registros": count_label(p.n_rows), "Columnas": p.columns.len() });
        let Some(v) = self.numbers(target).map(|v| v.into_iter().filter(|x| !x.is_nan()).collect::<Vec<f64>>()).filter(|v| !v.is_empty()) else {
            return kpis;
        };
        let col = self.frame.col(target).expect("columna del perfil");
        let single = col.dtype == "float32";
        let (sum, mean) = match &col.data {
            Data::Int(_) => (v.iter().sum::<f64>(), np_sum(&v, false) / v.len() as f64),
            _ => {
                let sum = np_sum(&v, single);
                (sum, cast(sum / v.len() as f64, single))
            }
        };
        kpis["Total"] = json!(format_number(sum));
        kpis["Promedio"] = json!(format_number(mean));
        kpis["Maximo"] = json!(format_number(v.iter().copied().fold(f64::NEG_INFINITY, f64::max)));
        kpis["Minimo"] = json!(format_number(v.iter().copied().fold(f64::INFINITY, f64::min)));
        kpis
    }

    /// El análisis completo de `requested` (o de lo que sugiere el perfil), con el formato de la web,
    /// avisando cada etapa.
    pub fn analysis(&self, requested: Option<&str>, progress: &Progress) -> Value {
        let target = self.target(requested);
        let p = &self.profile;
        let numeric = p.of_kind(NUMERIC);
        let dates = p.of_kind(DATE);
        let numeric_target = numeric.contains(&target);
        let rows = model_rows(self.frame.rows());

        progress.report(Stage::Charts, None);
        let charts = auto_charts(&self.frame, p, &target);

        progress.report(Stage::Drivers, None);
        let drivers = if numeric_target {
            let others: Vec<String> = numeric.iter().filter(|c| **c != target).cloned().collect();
            feature_importance(&self.frame, &rows, &target, &others)
        } else {
            json!({ "chart_importance": null, "chart_shap": null, "metrics": {} })
        };

        progress.report(Stage::Anomalies, None);
        let types: Vec<(String, &str)> = p.columns.iter().map(|c| (c.name.clone(), c.kind)).collect();
        let odd = anomalies(&self.frame, &rows, &numeric, numeric_target.then_some(target.as_str()), dates.first().map(String::as_str), &types);

        progress.report(Stage::Groups, None);
        let groups = if numeric.len() >= 2 {
            segments(&self.frame, &rows, &numeric[..numeric.len().min(6)], Some(target.as_str()))
        } else {
            json!({ "scatter_data": null, "radar_data": null, "metrics": {} })
        };

        progress.report(Stage::Forecast, None);
        let forecast = match (dates.first(), numeric_target) {
            (Some(d), true) => self.forecast(d, &target),
            _ => json!({ "chart_data": null, "metrics": {} }),
        };

        json!({
            "filename": self.file,
            "target_col": target,
            "profile": p.to_json(),
            "cleaning_report": {
                "actions": self.report.actions,
                "duplicates_removed": self.report.duplicates_removed,
                "nulls_imputed": self.report.imputed,
            },
            "kpis": self.kpis(&target),
            "charts": charts,
            "forecast": forecast,
            "feature_importance": drivers,
            "anomalies": odd,
            "segmentation": groups,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Montos argentinos como texto, una fila duplicada y una celda "s/d": la planilla sale limpia,
    /// el análisis elige las ventas, trae los gráficos y el pronóstico corre la competencia.
    #[test]
    fn abre_limpia_y_analiza() {
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
        let s = Sheet::open(&path, &Progress::NONE).unwrap();
        assert_eq!(s.frame.rows(), 150);
        assert_eq!(s.report.duplicates_removed, 1);
        let a = s.analysis(None, &Progress::NONE);
        assert_eq!(a["target_col"], "ventas");
        assert!(a["cleaning_report"]["actions"].as_array().unwrap().iter().any(|x| x.as_str().unwrap().contains("duplicadas")));
        assert!(a["charts"].as_array().unwrap().iter().any(|c| c["chart_id"] == "time_evo"));
        let m = &a["forecast"]["metrics"];
        assert!(m["error"].is_null(), "{m}");
        assert!(m["competencia"]["ranking"].as_array().unwrap().len() >= 3);
        assert_eq!(s.analysis(Some("VENTAS"), &Progress::NONE)["target_col"], "ventas");
    }

    /// Abrir y analizar avisan las etapas en orden, y la lectura avanza hasta el final del archivo.
    #[test]
    fn avisa_por_donde_va() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden/csv_analisis/ventas_semanales.csv");
        let seen = std::sync::Mutex::new(Vec::new());
        let listener = |stage: Stage, done: Option<f64>| seen.lock().unwrap().push((stage, done));
        let progress = Progress::new(&listener);
        let s = Sheet::open(&path, &progress).unwrap();
        s.analysis(None, &progress);
        let seen = seen.into_inner().unwrap();
        let mut stages: Vec<Stage> = seen.iter().map(|(s, _)| *s).collect();
        stages.dedup();
        assert_eq!(stages, [Stage::Reading, Stage::Cleaning, Stage::Charts, Stage::Drivers, Stage::Anomalies, Stage::Groups, Stage::Forecast]);
        assert_eq!(seen.iter().filter_map(|(s, d)| (*s == Stage::Reading).then_some(*d)).last(), Some(Some(1.0)));
    }

    /// Un Excel con título y filas vacías arriba: toma el encabezado real y las fechas como fechas.
    #[test]
    fn abre_un_excel_con_titulo_arriba() {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/golden/xlsx/titulo_corrido.xlsx");
        let s = Sheet::open(&path, &Progress::NONE).unwrap();
        assert!(matches!(s.source, Source::Excel));
        assert_eq!(s.columns().map(|c| c.name.as_str()).collect::<Vec<_>>(), ["fecha", "ventas", "region"]);
        assert_eq!(s.profile.of_kind(DATE), ["fecha"]);
        assert_eq!(s.target(None), "ventas");
    }
}
