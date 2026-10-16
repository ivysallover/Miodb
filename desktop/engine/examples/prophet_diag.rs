//! Diagnóstico: cuánto se parece el Prophet de Rust al real en las series de referencia.
use mio_engine::prophet::{damped, fit, Config};
use serde_json::Value;
fn nums(v: &Value) -> Vec<f64> { v.as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect() }
fn rel(a: &[f64], b: &[f64]) -> f64 { a.iter().zip(b).map(|(x, y)| (x - y).abs() / y.abs().max(1e-9)).fold(0.0, f64::max) }
fn main() {
    let doc: Value = serde_json::from_str(&std::fs::read_to_string("engine/tests/golden/prophet.json").unwrap()).unwrap();
    for c in doc["casos"].as_array().unwrap() {
        let cfg_v = &c["config"];
        let cfg = Config { linear: cfg_v["growth"] == "linear", yearly: cfg_v["yearly"].as_bool().unwrap(), weekly: cfg_v["weekly"].as_bool().unwrap(), changepoint_prior_scale: cfg_v["cps"].as_f64().unwrap() };
        let days = nums(&c["ds_days"]); let y = nums(&c["y"]); let n = y.len();
        let t0 = std::time::Instant::now();
        let f = fit(&days, &y, cfg).unwrap();
        let ms = t0.elapsed().as_millis();
        let fitv = &c["fit"];
        let (yh, _) = f.predict(&days);
        let cps_ok = rel(&f.changepoints_t, &nums(&fitv["changepoints_t"])) < 1e-12;
        print!("{:<20} ajuste {:>4} ms | quiebres iguales {} | k {:.4} vs {:.4} | sigma {:.5} vs {:.5} | curva hist dif máx {:.2e}",
            c["name"].as_str().unwrap(), ms, cps_ok, f.k, fitv["k"].as_f64().unwrap(), f.sigma_obs, fitv["sigma_obs"].as_f64().unwrap(), rel(&yh, &nums(&fitv["yhat"])));
        let mut worst: f64 = 0.0;
        for fold in c["folds"].as_array().unwrap() {
            let o = fold["origin"].as_u64().unwrap() as usize; let hold = c["hold"].as_u64().unwrap() as usize;
            let fk = fit(&days[..o], &y[..o], cfg).unwrap();
            let (yh2, tr2) = fk.predict(&days[..o + hold]);
            let got = if cfg.linear { damped(&yh2, &tr2, o, hold) } else { yh2[o..o + hold].to_vec() };
            worst = worst.max(rel(&got, &nums(&fold["damped"])));
        }
        let mut all = days.clone(); all.extend(nums(&c["future_days"]));
        let (yh3, tr3) = f.predict(&all);
        let fin = if cfg.linear { damped(&yh3, &tr3, n, 12) } else { yh3[n..].to_vec() };
        println!(" | tramos dif máx {:.2e} | final dif máx {:.2e}", worst, rel(&fin, &nums(&c["final_damped"])));
    }
}
