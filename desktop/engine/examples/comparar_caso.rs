//! Diagnóstico: la competencia de una planilla de referencia, en Rust y en Python, lado a lado.
use mio_engine::forecaster::run_forecast;
use serde_json::Value;
fn main() {
    let caso = std::env::args().nth(1).expect("nombre de la planilla");
    let doc: Value = serde_json::from_str(&std::fs::read_to_string("engine/tests/golden/forecaster.json").unwrap()).unwrap();
    let c = doc["casos"].as_array().unwrap().iter().find(|c| c["name"] == caso.as_str()).unwrap();
    let days: Vec<f64> = c["days"].as_array().unwrap().iter().map(|v| v.as_f64().unwrap()).collect();
    let vals: Vec<f64> = c["values"].as_array().unwrap().iter().map(|v| v.as_f64().unwrap_or(f64::NAN)).collect();
    let t = std::time::Instant::now();
    let got = run_forecast(&days, &vals, "ventas", 60);
    println!("Rust ({} ms): {}", t.elapsed().as_millis(), got["metrics"]["competencia"]);
    println!("Python:      {}", c["metrics"]["competencia"]);
}
