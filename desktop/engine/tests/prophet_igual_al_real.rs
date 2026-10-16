//! El Prophet de Rust contra el Prophet real (1.3.0, con Stan) en series de referencia
//! (`tests/golden/make_golden_prophet.py`). Prophet busca el óptimo con L-BFGS y corta un poco antes;
//! el de Rust lo resuelve exacto. Por eso se pide: los mismos quiebres, curvas a menos de 0,5 %,
//! predicciones a menos de 1 %, y un óptimo igual o mejor que el del Prophet real.

use mio_engine::prophet::{candidate, fit, future_days, Config, Freq};
use serde_json::Value;

fn nums(v: &Value) -> Vec<f64> {
    v.as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect()
}
fn worst_rel(a: &[f64], b: &[f64]) -> f64 {
    assert_eq!(a.len(), b.len());
    a.iter().zip(b).map(|(x, y)| (x - y).abs() / y.abs().max(1e-9)).fold(0.0, f64::max)
}

#[test]
fn el_prophet_de_rust_se_comporta_como_el_real() {
    let raw = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden/prophet.json")).unwrap();
    let doc: Value = serde_json::from_str(&raw).unwrap();
    for c in doc["casos"].as_array().unwrap() {
        let name = c["name"].as_str().unwrap();
        let cv = &c["config"];
        let cfg = Config {
            linear: cv["growth"] == "linear",
            yearly: cv["yearly"].as_bool().unwrap(),
            weekly: cv["weekly"].as_bool().unwrap(),
            changepoint_prior_scale: cv["cps"].as_f64().unwrap(),
        };
        let freq = match c["freq"].as_str().unwrap() { "D" => Freq::Day, "W" => Freq::Week, _ => Freq::MonthStart };
        let days = nums(&c["ds_days"]);
        let y = nums(&c["y"]);
        let n = y.len();
        let fv = &c["fit"];

        let ours = fit(&days, &y, cfg).unwrap();
        if cfg.linear {
            assert!(worst_rel(&ours.changepoints_t, &nums(&fv["changepoints_t"])) < 1e-12, "{name}: quiebres");
        }
        let (yh, _) = ours.predict(&days);
        let d = worst_rel(&yh, &nums(&fv["yhat"]));
        assert!(d < 0.005, "{name}: curva en la historia {d:.2e}");

        // Óptimo: con los parámetros del Prophet real, la función objetivo no puede quedar mejor.
        let mut theirs = ours.clone();
        theirs.k = fv["k"].as_f64().unwrap();
        theirs.m = fv["m"].as_f64().unwrap();
        theirs.sigma_obs = fv["sigma_obs"].as_f64().unwrap();
        theirs.beta = nums(&fv["beta"]);
        theirs.delta = if cfg.linear { nums(&fv["delta"]) } else { vec![] };
        let (a, b) = (ours.neg_log_posterior(&days, &y), theirs.neg_log_posterior(&days, &y));
        assert!(a <= b + 1e-9, "{name}: el óptimo de Rust ({a}) es peor que el de Prophet ({b})");

        // Las fechas futuras son las mismas que las de Prophet.
        assert_eq!(future_days(days[n - 1], freq, 12), nums(&c["future_days"]), "{name}: fechas futuras");

        // Como candidato de la competencia: cada tramo escondido y la proyección final.
        let pred = candidate(days.clone(), freq, cfg);
        let hold = c["hold"].as_u64().unwrap() as usize;
        for fold in c["folds"].as_array().unwrap() {
            let o = fold["origin"].as_u64().unwrap() as usize;
            let d = worst_rel(&pred(&y[..o], hold).unwrap(), &nums(&fold["damped"]));
            assert!(d < 0.01, "{name}: tramo desde {o}, diferencia {d:.2e}");
        }
        let d = worst_rel(&pred(&y, 12).unwrap(), &nums(&c["final_damped"]));
        assert!(d < 0.01, "{name}: proyección final, diferencia {d:.2e}");
    }
}
