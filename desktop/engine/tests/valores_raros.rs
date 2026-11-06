//! Cuánto acierta MIO al marcar valores raros: con una planilla de ventas limpia y realista (precios que
//! suben con la inflación, productos caros y baratos, cantidades de cola larga, temporada) no tiene que
//! marcar nada; con la misma planilla y errores sembrados en filas conocidas, se mide cuántos encuentra
//! (lo que se le escapa) y cuántos de los que marca son errores de verdad (los falsos avisos).

use mio_engine::progress::Progress;
use mio_engine::sheet::Sheet;
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;
use std::collections::{BTreeMap, BTreeSet};

const ROWS: usize = 6000;

struct Venta {
    fecha: String,
    producto: usize,
    cantidad: f64,
    precio: f64,
    descuento: f64,
    subtotal: f64,
}

/// Dos años de ventas de 40 productos, con todo lo que es normal y parece raro.
fn ventas(seed: u64) -> Vec<Venta> {
    let mut rng = ChaCha8Rng::seed_from_u64(seed);
    let normal = |rng: &mut ChaCha8Rng| -> f64 { (0..12).map(|_| rng.gen::<f64>()).sum::<f64>() - 6.0 };
    let base: Vec<f64> = (0..40).map(|_| 1500.0 * (1.2 * normal(&mut rng)).exp()).collect();
    (0..ROWS).map(|_| {
        // Más ventas en diciembre: se elige el mes con peso.
        let month = loop {
            let m = rng.gen_range(0..24);
            if rng.gen::<f64>() < if m % 12 == 11 { 1.0 } else { 0.6 } {
                break m;
            }
        };
        let producto = rng.gen_range(0..40);
        let cantidad = 1.0 + (-2.0 * rng.gen::<f64>().ln()).floor();
        // Inflación del 3 % por mes y un poco de variación entre sucursales.
        let precio = (base[producto] * 1.03f64.powi(month) * (1.0 + 0.05 * normal(&mut rng))).round();
        let descuento = [0.0, 0.0, 0.0, 5.0, 10.0, 15.0][rng.gen_range(0..6)];
        Venta {
            fecha: format!("{}-{:02}-{:02}", 2023 + month / 12, month % 12 + 1, rng.gen_range(1..=28)),
            producto,
            cantidad,
            precio,
            descuento,
            subtotal: (cantidad * precio * (1.0 - descuento / 100.0) * 100.0).round() / 100.0,
        }
    }).collect()
}

/// Siembra errores en filas al azar (cada fila uno solo) y dice cuáles.
fn sembrar(v: &mut [Venta], seed: u64) -> BTreeMap<&'static str, BTreeSet<usize>> {
    let mut rng = ChaCha8Rng::seed_from_u64(seed);
    let mut used = BTreeSet::new();
    let mut out: BTreeMap<&'static str, BTreeSet<usize>> = BTreeMap::new();
    let kinds: [(&str, usize); 6] = [("precio ×10", 20), ("precio ×100", 20), ("cantidad extrema", 15), ("precio cero", 15), ("cantidad negativa", 15), ("subtotal mal tipeado", 15)];
    for (kind, count) in kinds {
        while out.get(kind).map_or(0, |s| s.len()) < count {
            let i = rng.gen_range(0..v.len());
            if !used.insert(i) {
                continue;
            }
            let r = &mut v[i];
            match kind {
                "precio ×10" => r.precio *= 10.0,
                "precio ×100" => r.precio *= 100.0,
                "cantidad extrema" => r.cantidad = 500.0,
                "precio cero" => r.precio = 0.0,
                "cantidad negativa" => r.cantidad = -r.cantidad,
                _ => r.subtotal *= 10.0,
            }
            out.entry(kind).or_default().insert(i);
        }
    }
    out
}

/// La planilla como CSV; sin `subtotal`, no hay ninguna cuenta que revisar y cada error se tiene que ver solo.
fn abrir(v: &[Venta], name: &str, subtotal: bool) -> Sheet {
    let dir = std::env::temp_dir().join("mio_valores_raros");
    std::fs::create_dir_all(&dir).unwrap();
    let path = dir.join(name);
    let mut csv = format!("pedido,fecha,producto,cantidad,precio,descuento_pct{}\n", if subtotal { ",subtotal" } else { "" });
    for (i, r) in v.iter().enumerate() {
        let last = if subtotal { format!(",{}", r.subtotal) } else { String::new() };
        csv.push_str(&format!("P{i:05},{},Producto {:02},{},{},{}{last}\n", r.fecha, r.producto, r.cantidad, r.precio, r.descuento));
    }
    std::fs::write(&path, csv).unwrap();
    Sheet::open(&path, None, &Progress::NONE).unwrap()
}

/// Las filas que MIO marca (por número de pedido), con lo que dice de cada una.
fn marcadas(s: &Sheet) -> BTreeMap<usize, String> {
    let a = s.analysis(Some(if s.frame.col("subtotal").is_some() { "subtotal" } else { "precio" }), &Progress::NONE).unwrap();
    let m = &a["anomalies"]["metrics"];
    let mut out: BTreeMap<usize, String> = BTreeMap::new();
    let pedido = s.frame.col("pedido").unwrap();
    for p in s.problems() {
        for &i in &p.rows {
            out.entry(mio_engine::anomalies::cell_text(pedido, i)[1..].parse().unwrap()).or_insert_with(|| p.text.clone());
        }
    }
    for r in m["anomaly_records"].as_array().into_iter().flatten() {
        let i: usize = r["pedido"].as_str().unwrap()[1..].parse().unwrap();
        out.entry(i).or_insert_with(|| r["_anomaly_reason"].as_str().unwrap_or("").to_string());
    }
    assert_eq!(m["n_anomalias"].as_u64().unwrap() as usize, out.len(), "la cuenta que se muestra es la de las filas marcadas");
    out
}

#[test]
fn en_una_planilla_limpia_no_marca_nada() {
    for (subtotal, seed) in (1..=8).flat_map(|seed| [(true, seed), (false, seed)]) {
        let s = abrir(&ventas(seed), &format!("limpia_{seed}_{subtotal}.csv"), subtotal);
        let odd = marcadas(&s);
        for (i, why) in odd.iter().take(10) {
            eprintln!("  marcó P{i:05}: {why}");
        }
        eprintln!("planilla limpia {seed} (subtotal: {subtotal}): marcó {} de {ROWS}", odd.len());
        assert!(odd.is_empty(), "marcó {} filas normales", odd.len());
    }
}

#[test]
fn encuentra_los_errores_sembrados_sin_falsos_avisos() {
    medir(true, 0.95, 0.95);
}

/// Un día de promoción con cantidades más de 50 veces lo normal (y cuentas que cierran) se dice como algo que puede ser real, no
/// como errores; un precio ×10 o ×100, como error de tipeo.
#[test]
fn una_promocion_no_es_un_error_de_tipeo() {
    let mut v = ventas(6);
    let promo: Vec<usize> = (0..v.len()).step_by(37).take(25).collect();
    for (k, &i) in promo.iter().enumerate() {
        let r = &mut v[i];
        r.fecha = "2023-11-24".into();
        r.cantidad = 150.0 + k as f64;
        r.subtotal = (r.cantidad * r.precio * (1.0 - r.descuento / 100.0) * 100.0).round() / 100.0;
    }
    let mut seeds = sembrar(&mut v, 7);
    let s = abrir(&v, "promocion.csv", true);
    let kinds: BTreeMap<usize, &str> = s.problems().iter().flat_map(|p| {
        let pedido = s.frame.col("pedido").unwrap();
        p.rows.iter().map(move |&i| (mio_engine::anomalies::cell_text(pedido, i)[1..].parse::<usize>().unwrap(), p.kind)).collect::<Vec<_>>()
    }).collect();
    let promo_kinds: BTreeSet<&str> = promo.iter().filter(|i| !seeds.values().any(|s| s.contains(i))).filter_map(|i| kinds.get(i).copied()).collect();
    eprintln!("promoción: {promo_kinds:?}; problemas: {:?}", s.problems().iter().map(|p| &p.text).collect::<Vec<_>>());
    assert_eq!(promo_kinds, BTreeSet::from(["evento"]), "la promoción se dice como evento");
    let typos: BTreeSet<usize> = seeds.remove("precio ×10").unwrap().into_iter().chain(seeds.remove("precio ×100").unwrap()).collect();
    let as_typo = typos.iter().filter(|i| kinds.get(i) == Some(&"tipeo")).count();
    assert!(as_typo >= typos.len() * 9 / 10, "{as_typo} de {} precios ×10 o ×100 como tipeo", typos.len());
}

/// Sin una cuenta que revisar: lo que encuentra cada error por sí solo. Un subtotal mal tipeado no existe acá.
#[test]
fn sin_cuentas_encuentra_lo_que_se_ve_solo() {
    medir(false, 0.8, 0.95);
}

fn medir(subtotal: bool, min_recall: f64, min_precision: f64) {
    let mut v = ventas(2);
    let mut seeds = sembrar(&mut v, 3);
    if !subtotal {
        seeds.remove("subtotal mal tipeado");
    }
    let s = abrir(&v, &format!("sembrada_{subtotal}.csv"), subtotal);
    let odd = marcadas(&s);
    let all: BTreeSet<usize> = seeds.values().flatten().copied().collect();
    for (kind, rows) in &seeds {
        let hit = rows.iter().filter(|i| odd.contains_key(i)).count();
        eprintln!("{kind:<22} encontró {hit} de {}", rows.len());
    }
    let wrong: Vec<(&usize, &String)> = odd.iter().filter(|(i, _)| !all.contains(i)).collect();
    for (i, why) in wrong.iter().take(10) {
        eprintln!("  falso aviso P{i:05}: {why}");
    }
    let found = all.iter().filter(|i| odd.contains_key(i)).count();
    let (recall, precision) = (found as f64 / all.len() as f64, (odd.len() - wrong.len()) as f64 / odd.len().max(1) as f64);
    eprintln!("con subtotal: {subtotal} · encontró {found} de {} ({:.0} %); de las {} que marcó, {} son errores ({:.0} %)", all.len(), recall * 100.0, odd.len(), odd.len() - wrong.len(), precision * 100.0);
    assert!(recall >= min_recall, "se le escapan errores");
    assert!(precision >= min_precision, "demasiados falsos avisos");
}
