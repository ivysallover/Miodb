//! Los grupos de registros parecidos, como `models/segmentation.py`: K-Means (de `linfa`) sobre hasta
//! seis columnas numéricas estandarizadas, con la cantidad de grupos (2 a 5) que da el mejor
//! puntaje de silueta; cada grupo con su nombre, su tamaño y su promedio en cada columna.
//!
//! Donde Python sortea (las 1.000 filas con que elige cuántos grupos, sin semilla fija, y las 300 de la
//! silueta) acá se toman repartidas parejo, y K-Means arranca con una semilla fija: la misma planilla
//! da siempre los mismos grupos. La numeración de los grupos sale del arranque, así que el nombre de
//! cada uno puede no coincidir con el de la web; los grupos, sí.

use crate::clean::{filled_numbers, Data, Frame};
use crate::pynum::{mean, py_round, std};
use crate::sheet::spread;
use linfa::prelude::*;
use linfa_clustering::KMeans;
use ndarray::Array2;
use rand::SeedableRng;
use rand_chacha::ChaCha8Rng;
use serde_json::{json, Map, Value};

const LABELS: [&str; 7] = ["Segmento Estrella", "Segmento Activo", "Segmento Ocasional", "Segmento Dormido", "Segmento Nuevo", "Segmento Fiel", "Segmento en Riesgo"];
const SEED: u64 = 42;

fn failed(msg: &str) -> Value {
    json!({ "scatter_data": null, "radar_data": null, "metrics": { "error": msg } })
}

/// K-Means con `k` grupos (un arranque k-means++, como `n_init="auto"`): el grupo de cada fila.
fn kmeans(x: &Array2<f64>, k: usize) -> Option<Vec<usize>> {
    let model = KMeans::params_with_rng(k, ChaCha8Rng::seed_from_u64(SEED)).n_runs(1).fit(&DatasetBase::from(x.clone())).ok()?;
    Some(model.predict(x).to_vec())
}

fn rows_of(x: &Array2<f64>, rows: &[usize]) -> Array2<f64> {
    x.select(ndarray::Axis(0), rows)
}

/// `_find_optimal_k`: de 2 a 5 grupos, el de mejor silueta sobre una muestra.
fn best_k(x: &Array2<f64>) -> usize {
    let n = x.nrows();
    if n < 10 {
        return 3.min(2.max(n / 2));
    }
    let sample = rows_of(x, &spread((0..n).collect(), 1000));
    let check = spread((0..sample.nrows()).collect(), 300);
    let (mut best, mut best_score) = (3, -1.0);
    for k in 2..6.min(sample.nrows()) {
        let Some(labels) = kmeans(&sample, k) else { continue };
        let picked: Vec<usize> = check.iter().map(|&i| labels[i]).collect();
        let Ok(score) = DatasetBase::new(rows_of(&sample, &check), ndarray::Array1::from(picked)).silhouette_score() else { continue };
        if score > best_score {
            (best, best_score) = (k, score);
        }
    }
    best
}

/// `"texto_largo".replace("_", " ").capitalize()` de Python.
fn capitalize(s: &str) -> String {
    let t = s.replace('_', " ").to_lowercase();
    let mut c = t.chars();
    c.next().map_or(String::new(), |f| f.to_uppercase().chain(c).collect())
}

/// `run_clustering` sobre las filas `rows`: el gráfico de tamaños, el de un valor por grupo y el perfil.
pub fn segments(f: &Frame, rows: &[usize], numeric: &[String], target: Option<&str>) -> Value {
    if numeric.len() < 2 {
        return failed("Se requieren al menos 2 columnas numéricas para segmentar.");
    }
    let n = rows.len();
    if n < 10 {
        return failed("Se requieren al menos 10 registros para segmentar.");
    }
    let cols: Vec<(String, Vec<f64>)> = numeric.iter()
        .filter_map(|c| filled_numbers(f, c, rows).map(|v| (c.clone(), v)))
        .filter(|(_, v)| std(v) > 0.0)
        .collect();
    if cols.len() < 2 {
        return failed("Las columnas numéricas no tienen suficiente varianza para segmentar.");
    }
    // Estandarizadas como `StandardScaler` (desvío poblacional).
    let x = Array2::from_shape_fn((n, cols.len()), |(r, j)| {
        let v = &cols[j].1;
        let m = mean(v);
        let sd = (v.iter().map(|a| (a - m).powi(2)).sum::<f64>() / n as f64).sqrt();
        (v[r] - m) / sd
    });
    let k = best_k(&x).min(6.min(n - 1)).max(2);
    let Some(labels) = kmeans(&x, k) else { return failed("No se pudieron formar los grupos.") };
    let names: Vec<String> = (0..k).map(|i| LABELS.get(i).map_or(format!("Segmento {}", i + 1), |l| l.to_string())).collect();
    let sizes: Vec<usize> = (0..k).map(|g| labels.iter().filter(|l| **l == g).count()).collect();

    // El promedio de cada columna por grupo, con los valores de la planilla (los vacíos no cuentan).
    let raw = |c: &str| -> Vec<f64> {
        match f.col(c).map(|c| &c.data) {
            Some(Data::Int(v)) => rows.iter().map(|&i| v[i] as f64).collect(),
            Some(Data::Float(v)) => rows.iter().map(|&i| v[i]).collect(),
            _ => vec![f64::NAN; n],
        }
    };
    let group_means = |c: &str| -> Vec<f64> {
        let v = raw(c);
        (0..k).map(|g| mean(&v.iter().zip(&labels).filter(|(x, l)| **l == g && !x.is_nan()).map(|(x, _)| *x).collect::<Vec<_>>())).collect()
    };
    let metric = match target.filter(|t| cols.iter().any(|(c, _)| c == t)) {
        Some(t) => t.to_string(),
        // La columna que más cambia entre grupos, relativa a su promedio.
        None => cols.iter().map(|(c, _)| {
            let m = group_means(c);
            let (lo, hi) = m.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), x| (a.min(*x), b.max(*x)));
            ((hi - lo) / (mean(&m).abs() + 1e-5), c)
        }).fold((-1.0, &cols[0].0), |best, (d, c)| if d > best.0 { (d, c) } else { best }).1.clone(),
    };
    let metric_means = group_means(&metric);
    let kind = if k <= 5 { "Donut" } else { "HorizontalBar" };
    let (x_axis, y_axis) = if kind == "Donut" { ("category", "value") } else { ("value", "category") };
    let layout = |kind: &str, x: &str, y: &str| json!({ "chart_type": kind, "x_axis_type": x, "y_axis_type": y, "is_log_scale": false,
        "has_time_gaps": false, "high_cardinality": false, "show_confidence_bands": false });
    let profile: Vec<Value> = (0..k).map(|g| {
        let mut row = Map::new();
        row.insert("Segmento".into(), json!(names[g]));
        row.insert("Cantidad".into(), json!(sizes[g]));
        for (c, _) in &cols {
            row.insert(c.clone(), json!(py_round(group_means(c)[g], 2)));
        }
        Value::Object(row)
    }).collect();
    json!({
        "scatter_data": {
            "chart_id": "seg_distribution",
            "metadata": { "title": "Distribución de Segmentos", "insight_subtitle": format!("Participación de los {k} grupos detectados"), "source_metric": "cantidad" },
            "layout_directives": layout(kind, x_axis, y_axis),
            "dataset": { "dimensions": ["_segment", "cantidad"], "source": (0..k).map(|g| json!({ "_segment": names[g], "cantidad": sizes[g] })).collect::<Vec<_>>() },
        },
        "radar_data": {
            "chart_id": "seg_profile_value",
            "metadata": { "title": format!("Perfil: {} por Segmento", capitalize(&metric)), "insight_subtitle": format!("Comparativa de valor medio de {metric}"), "source_metric": metric },
            "layout_directives": layout("HorizontalBar", "value", "category"),
            "dataset": { "dimensions": ["_segment", metric.as_str()], "source": (0..k).map(|g| json!({ "_segment": names[g], metric.as_str(): py_round(metric_means[g], 2) })).collect::<Vec<_>>() },
        },
        "metrics": {
            "k": k,
            "varianza_explicada_pca": 100.0,
            "distribucion": (0..k).map(|g| (names[g].clone(), json!(sizes[g]))).collect::<Map<_, _>>(),
            "perfil": profile,
        },
    })
}
