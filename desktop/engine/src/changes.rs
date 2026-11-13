//! Qué cambió desde la última vez que se analizó la misma columna de la misma planilla (el archivo se
//! actualizó, por ejemplo con el mes nuevo): filas, total, valores raros nuevos y cómo le fue a la
//! predicción de entonces con lo que pasó de verdad. Compara los dos análisis (lo que devuelve la app:
//! el análisis con el formato de la web y el `total`), sin volver a la planilla vieja.

use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};

/// La huella de un registro raro, para reconocerlo en los dos análisis: sale de sus valores, sin lo que
/// le agrega la detección (lo que empieza con `_`). Un registro guardado solo como huella (`summary`) la trae.
fn record_key(r: &Value) -> String {
    if let Some(print) = r[PRINT].as_str() {
        return print.to_string();
    }
    let fields: Map<String, Value> = r.as_object().into_iter().flatten().filter(|(k, _)| !k.starts_with('_')).map(|(k, v)| (k.clone(), v.clone())).collect();
    let mut h = rustc_hash::FxHasher::default();
    Value::Object(fields).to_string().hash(&mut h);
    format!("{:016x}", h.finish())
}

const PRINT: &str = "_huella";

/// Lo justo de un análisis para decir qué cambió la próxima vez, sin ninguna fila ni valor de la tabla:
/// cuántas filas, el total, la serie por período con su predicción, cuántos raros y la huella de cada
/// uno. Es lo único que se guarda de una base de datos (de la base no queda nada en la compu).
pub fn summary(opened: &Value) -> Value {
    let a = &opened["analisis"];
    json!({
        "total": opened["total"],
        "analisis": {
            "filename": a["filename"],
            "target_col": a["target_col"],
            "profile": { "n_rows": a["profile"]["n_rows"], "n_cols": a["profile"]["n_cols"], "quality_score": a["profile"]["quality_score"] },
            "anomalies": { "metrics": {
                "n_anomalias": a["anomalies"]["metrics"]["n_anomalias"],
                "anomaly_records": records(a).map(|r| json!({ PRINT: record_key(r) })).collect::<Vec<_>>(),
            } },
            "forecast": { "metrics": { "frecuencia": a["forecast"]["metrics"]["frecuencia"], "motor": a["forecast"]["metrics"]["motor"] }, "chart_data": { "dataset": { "source": a["forecast"]["chart_data"]["dataset"]["source"] } } },
        },
    })
}

fn records(analysis: &Value) -> impl Iterator<Item = &Value> {
    analysis["anomalies"]["metrics"]["anomaly_records"].as_array().into_iter().flatten()
}

fn rows(analysis: &Value) -> impl Iterator<Item = &Value> {
    analysis["forecast"]["chart_data"]["dataset"]["source"].as_array().into_iter().flatten()
}

/// La predicción de antes contra lo que pasó: los períodos que entonces eran futuro y ahora tienen dato.
/// El último período con dato no cuenta (puede estar a medio cargar). `None` si no hay ninguno (por
/// ejemplo, si cambió la frecuencia: de semanas a meses).
fn forecast_check(before: &Value, after: &Value) -> Option<Value> {
    let actual: Vec<(&str, f64)> = rows(after).filter_map(|r| Some((r["date"].as_str()?, r["historical"].as_f64()?))).collect();
    let actual: HashMap<&str, f64> = actual[..actual.len().saturating_sub(1)].iter().copied().collect();
    let periods: Vec<Value> = rows(before)
        .filter(|r| r["historical"].is_null())
        .filter_map(|r| {
            let date = r["date"].as_str()?;
            Some(json!({ "fecha": date, "real": actual.get(date)?, "predicho": r["forecast"].as_f64()?, "abajo": r["lower"].as_f64()?, "arriba": r["upper"].as_f64()? }))
        })
        .collect();
    if periods.is_empty() {
        return None;
    }
    let num = |p: &Value, k: &str| p[k].as_f64().unwrap_or(f64::NAN);
    let inside = periods.iter().filter(|p| (num(p, "abajo")..=num(p, "arriba")).contains(&num(p, "real"))).count();
    let errors: Vec<f64> = periods.iter().filter(|p| num(p, "real") != 0.0).map(|p| ((num(p, "real") - num(p, "predicho")) / num(p, "real")).abs() * 100.0).collect();
    let error = (!errors.is_empty()).then(|| errors.iter().sum::<f64>() / errors.len() as f64);
    Some(json!({
        "frecuencia": before["forecast"]["metrics"]["frecuencia"],
        "motor": before["forecast"]["metrics"]["motor"],
        "dentro": inside,
        "error_pct": error,
        "periodos": periods,
    }))
}

/// Lo que cambió de `before` a `after` (lo que devolvió la app cada vez), analizado `since` (segundos
/// desde 1970): filas, total de lo que se analiza (si los dos lo tienen), valores raros (y cuántos son
/// nuevos) y la predicción de antes contra lo que pasó.
pub fn compare(before: &Value, after: &Value, since: u64) -> Value {
    let (a, b) = (&before["analisis"], &after["analisis"]);
    let seen: HashSet<String> = records(a).map(record_key).collect();
    let total = match (before["total"].as_f64(), after["total"].as_f64()) {
        (Some(x), Some(y)) => json!([x, y]),
        _ => Value::Null,
    };
    json!({
        "desde": since,
        "filas": [a["profile"]["n_rows"], b["profile"]["n_rows"]],
        "total": total,
        "raros": [a["anomalies"]["metrics"]["n_anomalias"], b["anomalies"]["metrics"]["n_anomalias"]],
        "raros_nuevos": records(b).filter(|r| !seen.contains(&record_key(r))).count(),
        "prediccion": forecast_check(a, b),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opened(rows: usize, total: f64, records: Value, source: Value) -> Value {
        json!({
            "total": total,
            "analisis": {
                "profile": { "n_rows": rows },
                "anomalies": { "metrics": { "n_anomalias": records.as_array().unwrap().len(), "anomaly_records": records } },
                "forecast": { "metrics": { "frecuencia": "Mensual", "motor": "Theta" }, "chart_data": { "dataset": { "source": source } } },
            }
        })
    }

    /// Entraron dos meses: la predicción de antes se compara con los meses completos (el último, a
    /// medio cargar, no), un raro sigue y otro es nuevo.
    #[test]
    fn cuenta_lo_nuevo_y_le_toma_examen_a_la_prediccion() {
        let raro = |id: i64| json!({ "id": id, "monto": 900.0, "_anomaly_reason": "monto alto" });
        let before = opened(100, 1000.0, json!([raro(1)]), json!([
            { "date": "2025-01-01", "historical": 10.0, "forecast": null, "lower": null, "upper": null },
            { "date": "2025-02-01", "historical": 12.0, "forecast": 12.0, "lower": 12.0, "upper": 12.0 },
            { "date": "2025-03-01", "historical": null, "forecast": 14.0, "lower": 11.0, "upper": 17.0 },
            { "date": "2025-04-01", "historical": null, "forecast": 15.0, "lower": 10.0, "upper": 20.0 },
            { "date": "2025-05-01", "historical": null, "forecast": 16.0, "lower": 9.0, "upper": 23.0 },
        ]));
        let after = opened(130, 1300.0, json!([raro(1), raro(2)]), json!([
            { "date": "2025-01-01", "historical": 10.0 },
            { "date": "2025-02-01", "historical": 12.0 },
            { "date": "2025-03-01", "historical": 20.0 },
            { "date": "2025-04-01", "historical": 15.0 },
            { "date": "2025-05-01", "historical": 2.0 },
        ]));
        let c = compare(&before, &after, 77);
        assert_eq!((&c["desde"], &c["filas"], &c["total"]), (&json!(77), &json!([100, 130]), &json!([1000.0, 1300.0])));
        assert_eq!((&c["raros"], &c["raros_nuevos"]), (&json!([1, 2]), &json!(1)));
        let p = &c["prediccion"];
        assert_eq!(p["periodos"].as_array().unwrap().len(), 2, "mayo está a medio cargar: {p}");
        assert_eq!(p["dentro"], 1, "marzo (20) se pasó del rango; abril (15) cayó adentro");
        assert!((p["error_pct"].as_f64().unwrap() - 15.0).abs() < 1e-9, "(30 % + 0 %) / 2");
        assert_eq!(p["frecuencia"], "Mensual");
    }

    /// Lo que se guarda de una base: sirve igual para decir qué cambió y no lleva ningún valor de la tabla.
    #[test]
    fn el_resumen_compara_igual_y_no_guarda_filas() {
        let raro = |id: i64| json!({ "cliente": format!("Kiosco {id}"), "monto": 900.0, "_anomaly_reason": "monto alto" });
        let serie = json!([{ "date": "2025-01-01", "historical": 10.0 }, { "date": "2025-02-01", "historical": null, "forecast": 12.0, "lower": 9.0, "upper": 15.0 }]);
        let before = opened(100, 1000.0, json!([raro(1)]), serie);
        let after = opened(130, 1300.0, json!([raro(1), raro(2)]), json!([{ "date": "2025-01-01", "historical": 10.0 }, { "date": "2025-02-01", "historical": 13.0 }, { "date": "2025-03-01", "historical": 1.0 }]));
        let kept = summary(&before);
        assert!(!kept.to_string().contains("Kiosco"), "ningún valor de la tabla: {kept}");
        assert_eq!(compare(&kept, &after, 5), compare(&before, &after, 5));
        assert_eq!(compare(&kept, &after, 5)["raros_nuevos"], 1);
    }

    /// Sin períodos en común (otra frecuencia) o sin total en el análisis de antes: no se inventa.
    #[test]
    fn sin_nada_comparable_no_dice_nada() {
        let before = json!({ "analisis": { "profile": { "n_rows": 5 } } });
        let after = opened(6, 10.0, json!([]), json!([{ "date": "2025-01-05", "historical": 3.0 }]));
        let c = compare(&before, &after, 1);
        assert!(c["prediccion"].is_null() && c["total"].is_null(), "{c}");
        assert_eq!(c["raros_nuevos"], 0);
    }
}
