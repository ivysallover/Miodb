//! El pronóstico completo en Rust contra `run_forecast` de Python, con planillas que pasan por cada
//! camino (`tests/golden/make_golden_forecaster.py`).
//!
//! Igual hasta el redondeo cuando no gana Prophet. Cuando gana Prophet, a menos de 1 % (el Prophet de
//! Rust resuelve el óptimo exacto y el real corta un poco antes). La franja de Prophet no se compara:
//! en Python sale de simulaciones al azar.

use mio_engine::forecaster::run_forecast;
use serde_json::Value;

fn f(v: &Value) -> Option<f64> {
    v.as_f64()
}

fn near(what: &str, got: &Value, want: &Value, rel: f64) {
    match (f(got), f(want)) {
        (Some(g), Some(w)) => {
            let tol = if rel > 0.0 { rel * w.abs().max(1.0) + 0.02 } else { 0.0101 };
            assert!((g - w).abs() <= tol, "{what}: Rust {g} vs Python {w}");
        }
        (None, None) => {}
        _ => panic!("{what}: Rust {got} vs Python {want}"),
    }
}

#[test]
fn el_pronostico_da_lo_mismo_que_en_python() {
    let raw = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden/forecaster.json")).unwrap();
    let doc: Value = serde_json::from_str(&raw).unwrap();
    for c in doc["casos"].as_array().unwrap() {
        let name = c["name"].as_str().unwrap();
        let days: Vec<f64> = c["days"].as_array().unwrap().iter().map(|v| v.as_f64().unwrap()).collect();
        let values: Vec<f64> = c["values"].as_array().unwrap().iter().map(|v| v.as_f64().unwrap_or(f64::NAN)).collect();
        let got = run_forecast(&days, &values, "ventas", 60);
        let (gm, wm) = (&got["metrics"], &c["metrics"]);

        if let Some(err) = wm["error"].as_str() {
            assert_eq!(gm["error"].as_str(), Some(err), "{name}: mensaje de error");
            assert!(got["chart_data"].is_null(), "{name}: sin gráfico");
            continue;
        }
        assert!(gm["error"].is_null(), "{name}: Rust dio error {}", gm["error"]);
        assert_eq!(gm["motor"], wm["motor"], "{name}: ganador");
        for k in ["periodos", "frecuencia", "validacion", "confianza"] {
            assert_eq!(gm[k], wm[k], "{name}: {k}");
        }
        let motor = wm["motor"].as_str().unwrap();
        let prophet_wins = motor.contains("Prophet");
        let rel = if prophet_wins { 0.01 } else { 0.0 };
        for k in ["ultimo_valor_real", "r2"] {
            near(&format!("{name}/{k}"), &gm[k], &wm[k], 0.0);
        }
        near(&format!("{name}/valor_final_forecast"), &gm["valor_final_forecast"], &wm["valor_final_forecast"], rel);
        // Errores absolutos: con Prophet, se comparan contra el nivel de la serie (un MAE de 16 sobre
        // valores de 1.000 que se mueve 0,2 es una diferencia de 0,02 % de la serie).
        let level = wm["ultimo_valor_real"].as_f64().unwrap().abs().max(1.0);
        for k in ["mae", "rmse"] {
            if prophet_wins {
                let (g, w) = (gm[k].as_f64().unwrap(), wm[k].as_f64().unwrap());
                assert!((g - w).abs() <= 0.01 * level, "{name}/{k}: Rust {g} vs Python {w} (más de 1 % del nivel {level})");
            } else {
                near(&format!("{name}/{k}"), &gm[k], &wm[k], 0.0);
            }
        }
        // Porcentajes: si la proyección difiere menos de 1 %, un porcentaje derivado puede moverse
        // décimas; se mide en puntos.
        for k in ["tendencia_pct", "mape", "precision_pct"] {
            if prophet_wins {
                let (g, w) = (gm[k].as_f64().unwrap(), wm[k].as_f64().unwrap());
                assert!((g - w).abs() <= 1.0, "{name}/{k}: Rust {g} vs Python {w} (más de 1 punto)");
            } else {
                near(&format!("{name}/{k}"), &gm[k], &wm[k], 0.0);
            }
        }

        // La guerra de modelos: mismos participantes en el mismo orden, mismo ganador y árbitro.
        let (gc, wc) = (&gm["competencia"], &wm["competencia"]);
        assert_eq!(gc.is_null(), wc.is_null(), "{name}: hubo competencia en uno y no en el otro");
        if !wc.is_null() {
            let ids = |v: &Value| v["ranking"].as_array().unwrap().iter().map(|r| r["id"].as_str().unwrap().to_string()).collect::<Vec<_>>();
            assert_eq!(ids(gc), ids(wc), "{name}: orden de la competencia");
            assert_eq!(gc["ganador"], wc["ganador"], "{name}: ganador de la competencia");
            for k in ["tramos", "puntos_por_tramo", "promedio_de_dos"] {
                assert_eq!(gc[k], wc[k], "{name}: {k}");
            }
            near(&format!("{name}/error_regla_simple"), &gc["error_regla_simple"], &wc["error_regla_simple"], 0.0);
            for (g, w) in gc["ranking"].as_array().unwrap().iter().zip(wc["ranking"].as_array().unwrap()) {
                if w["id"] == "prophet" {
                    // Un porcentaje de error: se mide en puntos.
                    let (ge, we) = (g["error"].as_f64().unwrap(), w["error"].as_f64().unwrap());
                    assert!((ge - we).abs() <= 0.5, "{name}/error de Prophet: Rust {ge} vs Python {we}");
                } else {
                    near(&format!("{name}/error de {}", w["id"]), &g["error"], &w["error"], 0.0);
                }
            }
        }

        // El gráfico: mismas fechas, misma historia, misma proyección (y misma franja si no es de Prophet).
        let gs = got["chart_data"]["dataset"]["source"].as_array().unwrap();
        let ws = c["chart_data"]["dataset"]["source"].as_array().unwrap();
        assert_eq!(gs.len(), ws.len(), "{name}: filas del gráfico");
        assert_eq!(got["chart_data"]["metadata"]["title"], c["chart_data"]["metadata"]["title"], "{name}: título");
        let band_from_prophet = motor.starts_with("Prophet (");
        for (i, (g, w)) in gs.iter().zip(ws).enumerate() {
            assert_eq!(g["date"], w["date"], "{name}: fecha de la fila {i}");
            near(&format!("{name}/historia[{i}]"), &g["historical"], &w["historical"], 0.0);
            near(&format!("{name}/proyección[{i}]"), &g["forecast"], &w["forecast"], rel);
            if !band_from_prophet {
                near(&format!("{name}/piso[{i}]"), &g["lower"], &w["lower"], rel);
                near(&format!("{name}/techo[{i}]"), &g["upper"], &w["upper"], rel);
            }
        }
        if !band_from_prophet {
            assert_eq!(got["chart_data"]["metadata"]["insight_subtitle"], c["chart_data"]["metadata"]["insight_subtitle"], "{name}: subtítulo");
        }
    }
}
