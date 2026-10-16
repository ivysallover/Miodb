//! Diagnóstico: hace lo mismo que la app de escritorio con una planilla (leer, limpiar, elegir
//! fecha y valor, pronosticar) e imprime lo que eligió y el resultado.
use mio_engine::clean::{clean, Data, Obj, DATE};
use mio_engine::forecaster::run_forecast;
use mio_engine::reader::read_csv;

fn main() {
    for path in std::env::args().skip(1) {
        let name = path.rsplit('/').next().unwrap().to_string();
        let raw = match std::fs::read(&path) { Ok(r) => r, Err(e) => { println!("{name}: {e}"); continue } };
        let t = std::time::Instant::now();
        let (_, table) = match read_csv(&raw) { Ok(x) => x, Err(e) => { println!("{name}: {e}"); continue } };
        let (f, r) = clean(&table);
        let fecha = f.cols.iter().find(|c| r.type_of(&c.name) == Some(DATE)).map(|c| c.name.clone());
        let valor = mio_engine::clean::suggest_targets(&f, &r).into_iter().next();
        let tipos: Vec<String> = r.types.iter().map(|(c, k)| format!("{c}={k}")).collect();
        println!("\n{name}: {} filas · fecha={fecha:?} valor={valor:?}", f.rows());
        println!("  tipos: {}", tipos.join(", ").chars().take(400).collect::<String>());
        let (Some(fc), Some(vc)) = (fecha.as_ref().and_then(|n| f.col(n)), valor.as_ref().and_then(|n| f.col(n))) else { continue };
        let days: Vec<f64> = match &fc.data { Data::Time(v) => v.iter().map(|x| x.map_or(f64::NAN, |ns| ns.div_euclid(86_400_000_000_000) as f64)).collect(), _ => continue };
        let vals: Vec<f64> = match &vc.data {
            Data::Int(v) => v.iter().map(|x| *x as f64).collect(),
            Data::Float(v) => v.clone(),
            Data::Obj(v) => v.iter().map(|o| if let Obj::Num(x) = o { *x } else { f64::NAN }).collect(),
            _ => continue,
        };
        let out = run_forecast(&days, &vals, valor.as_deref().unwrap(), 60);
        let m = &out["metrics"];
        println!("  resultado ({:.1} s): {}", t.elapsed().as_secs_f64(), m.get("error").and_then(|e| e.as_str()).map(|e| format!("SIN PREDICCIÓN: {e}")).unwrap_or_else(|| format!("ganó {} · {}", m["motor"], m["frecuencia"])));
    }
}
