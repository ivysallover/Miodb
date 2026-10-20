//! Qué mueve lo que se analiza, como `models/feature_importance.py`: un LightGBM explica lo que se
//! analiza con las otras columnas numéricas; cuántas veces usa cada una para decidir y, con SHAP
//! (`pred_contrib`, el TreeSHAP del propio LightGBM), cuánto empuja cada una y para qué lado.
//!
//! Se entrena con las filas que elige `Sheet` para los modelos (`model_rows`). SHAP se mide sobre todas
//! ellas (en Python, sobre 250 al azar; con 250 filas o menos son las mismas).

use crate::charts::{chart, Layout};
use crate::clean::{filled_numbers, Frame};
use crate::lgbm;
use crate::pynum::{pearson, py_round, std};
use serde_json::{json, Map, Value};

/// Los parámetros que manda `LGBMRegressor(n_estimators=40, learning_rate=0.08, max_depth=4,
/// random_state=42, n_jobs=1)`, con sus nombres canónicos y el resto por defecto.
const PARAMS: &str = "boosting=gbdt objective=regression metric=l2 num_iterations=40 learning_rate=0.08 num_leaves=31 \
    max_depth=4 min_data_in_leaf=20 min_sum_hessian_in_leaf=0.001 min_gain_to_split=0 lambda_l1=0 lambda_l2=0 \
    feature_fraction=1 bagging_fraction=1 bagging_freq=0 bin_construct_sample_cnt=200000 seed=42 num_threads=1 verbosity=-1";

fn failed(msg: &str) -> Value {
    json!({ "chart_importance": null, "chart_shap": null, "metrics": { "error": msg } })
}

/// Un gráfico de barras horizontales (o de tornado) de (variable, valor).
fn by_feature(id: &str, title: String, insight: &str, kind: &str, metric: &str, rows: &[(String, Value)]) -> Value {
    let source = rows.iter().map(|(f, v)| json!({ "feature": f, metric: v })).collect();
    chart(id, &title, insight, metric, Layout::new(kind, "value", "category"), &["feature", metric], source)
}

/// `run_feature_importance` sobre las filas `rows`: los gráficos de importancia y de SHAP, y las métricas.
pub fn feature_importance(f: &Frame, rows: &[usize], target: &str, features: &[String]) -> Value {
    let Some(y) = filled_numbers(f, target, rows) else { return failed(&format!("Columna objetivo '{target}' no encontrada.")) };
    let available: Vec<(String, Vec<f64>)> = features.iter().filter(|c| *c != target).filter_map(|c| filled_numbers(f, c, rows).map(|v| (c.clone(), v))).collect();
    if available.is_empty() {
        return failed("No hay columnas de variables predictoras disponibles.");
    }
    if rows.len() < 20 {
        return failed("Se requieren al menos 20 registros para encontrar factores clave.");
    }
    if y.iter().all(|v| *v == y[0]) {
        return failed("La variable objetivo es constante. No se pueden buscar factores.");
    }
    let cols: Vec<(String, Vec<f64>)> = available.into_iter().filter(|(_, v)| std(v) > 0.0).collect();
    if cols.is_empty() {
        return failed("Las variables predictoras no tienen varianza.");
    }
    let k = cols.len();
    let x: Vec<f64> = (0..rows.len()).flat_map(|r| cols.iter().map(move |(_, v)| v[r])).collect();
    let labels: Vec<f32> = y.iter().map(|v| *v as f32).collect();
    let model = match lgbm::train(&x, rows.len(), k, &labels, PARAMS, 40) {
        Ok(m) => m,
        Err(e) => return failed(&e),
    };
    let (Ok(importance), Ok(contrib)) = (model.split_importance(), model.contributions(&x)) else {
        return failed("LightGBM no pudo medir las variables.");
    };

    // Importancia: de menor a mayor, las 15 más altas (como `sort_values().tail(15)`).
    let mut by_imp: Vec<usize> = (0..k).collect();
    by_imp.sort_by(|a, b| importance[*a].total_cmp(&importance[*b]));
    let top_imp = &by_imp[k.saturating_sub(15)..];
    let imp_rows: Vec<(String, Value)> = top_imp.iter().map(|&i| (cols[i].0.clone(), json!(importance[i] as i64))).collect();

    // SHAP: el promedio del valor absoluto por variable, con el signo de cómo se mueve con ella.
    let per_row = k + 1;
    let shap = |i: usize| (0..rows.len()).map(|r| contrib[r * per_row + i]).collect::<Vec<f64>>();
    let mean_abs: Vec<f64> = (0..k).map(|i| shap(i).iter().map(|v| v.abs()).sum::<f64>() / rows.len() as f64).collect();
    let signed: Vec<f64> = (0..k).map(|i| {
        let r = pearson(&cols[i].1, &shap(i));
        mean_abs[i] * if r.is_nan() { 1.0 } else { r.signum() }
    }).collect();
    let mut by_shap: Vec<usize> = (0..k).collect();
    by_shap.sort_by(|a, b| mean_abs[*a].total_cmp(&mean_abs[*b]));
    let shap_rows: Vec<(String, Value)> = by_shap[k.saturating_sub(15)..].iter().map(|&i| (cols[i].0.clone(), json!(signed[i]))).collect();

    let top_features: Vec<Value> = top_imp.iter().rev().take(5).map(|&i| json!({ "feature": cols[i].0, "importance": importance[i] as i64 })).collect();
    let summary: Map<String, Value> = cols.iter().zip(&mean_abs).map(|((c, _), m)| (c.clone(), json!(py_round(*m, 4)))).collect();
    json!({
        "chart_importance": by_feature("feat_importance", format!("Impacto de Variables en {target}"), "Importancia Gini (LGBM)", "HorizontalBar", "importance", &imp_rows),
        "chart_shap": by_feature("feat_shap", format!("Factores de Atribución (SHAP) en {target}"), "Direccionalidad del Impacto", "Tornado", "shap_importance", &shap_rows),
        "metrics": { "top_features": top_features, "shap_summary": summary, "n_features": k, "shap_disponible": true },
    })
}
