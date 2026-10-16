//! La competencia en Rust tiene que dar lo mismo que la de Python (la referencia): mismas
//! predicciones por tramo, mismos errores, mismo ganador, mismo árbitro y misma banda.
//! Las salidas de Python salen de `tests/golden/make_golden.py`.

use mio_engine::forecast::{self, baseline_error, band_margins, compete, local_candidates};
use serde_json::Value;

fn nums(v: &Value) -> Vec<f64> {
    v.as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect()
}

fn close(a: f64, b: f64) -> bool {
    (a - b).abs() <= 1e-7 * (1.0 + b.abs())
}

fn assert_close(what: &str, got: &[f64], want: &[f64]) {
    assert_eq!(got.len(), want.len(), "{what}: largo distinto");
    for (i, (g, w)) in got.iter().zip(want).enumerate() {
        assert!(close(*g, *w), "{what}[{i}]: Rust {g} vs Python {w}");
    }
}

#[test]
fn la_competencia_da_lo_mismo_que_en_python() {
    let raw = std::fs::read_to_string(concat!(env!("CARGO_MANIFEST_DIR"), "/tests/golden/competencia.json")).unwrap();
    let doc: Value = serde_json::from_str(&raw).unwrap();
    let casos = doc["casos"].as_array().unwrap();
    assert!(casos.len() >= 5);
    for c in casos {
        let name = c["name"].as_str().unwrap();
        let y = nums(&c["y"]);
        let season = c["season"].as_u64().unwrap() as usize;
        let hold = c["hold"].as_u64().unwrap() as usize;
        let origins: Vec<usize> = c["origins"].as_array().unwrap().iter().map(|v| v.as_u64().unwrap() as usize).collect();
        assert_eq!(forecast::fold_origins(y.len(), hold, 3, 10), origins, "{name}: tramos");

        // Cada candidato, tramo por tramo y en su proyección final.
        for (id, f) in local_candidates(season) {
            let ref_c = &c["candidates"][id];
            for (k, &o) in origins.iter().enumerate() {
                let got = f(&y[..o], hold).unwrap();
                assert_close(&format!("{name}/{id}/tramo{k}"), &got[..hold], &nums(&ref_c["folds"][k]));
            }
            assert_close(&format!("{name}/{id}/final"), &f(&y, 12).unwrap(), &nums(&ref_c["final"]));
        }

        // La competencia entera.
        let comp = compete(&y, hold, local_candidates(season), c["nonneg"].as_bool().unwrap(), 3, 6.0).unwrap();
        let want_rank: Vec<(String, f64)> = c["ranking"].as_array().unwrap().iter()
            .map(|r| (r["id"].as_str().unwrap().to_string(), r["error"].as_f64().unwrap())).collect();
        assert_eq!(comp.ranking.iter().map(|e| e.id.clone()).collect::<Vec<_>>(),
                   want_rank.iter().map(|r| r.0.clone()).collect::<Vec<_>>(), "{name}: orden del ranking");
        for (e, (_, w)) in comp.ranking.iter().zip(&want_rank) {
            assert!(close(e.error, *w), "{name}: error de {} Rust {} vs Python {}", e.id, e.error, w);
        }
        let want_winner: Vec<String> = c["winner"].as_array().unwrap().iter().map(|v| v.as_str().unwrap().to_string()).collect();
        assert_eq!(comp.winner, want_winner, "{name}: ganador");
        assert!(close(comp.winner_error(), c["winner_error"].as_f64().unwrap()), "{name}: error del ganador");
        assert!(close(baseline_error(&y, &comp.origins, hold), c["baseline_error"].as_f64().unwrap()), "{name}: árbitro");
        let band = band_margins(&y, comp.preds_of(&comp.winner_key()).unwrap(), &comp.origins, 12);
        assert_close(&format!("{name}/banda"), &band, &nums(&c["band"]));
    }
}
