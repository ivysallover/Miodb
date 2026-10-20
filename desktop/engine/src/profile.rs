//! El perfil de la planilla limpia, como `core/data_profiler.py`: el tipo de cada columna (el que
//! usan los gráficos y la elección de qué analizar, distinto del de la limpieza), la calidad de la
//! planilla y qué columnas conviene analizar.

use crate::clean::{first_rows, parses_as_date, Data, Frame, Obj, CATEGORICAL, DATE, ID, NUMERIC, TEXT};
use serde_json::{json, Value};

pub struct ColumnProfile {
    pub name: String,
    pub kind: &'static str,
    pub n_unique: usize,
    pub null_count: usize,
}

pub struct Profile {
    pub n_rows: usize,
    pub columns: Vec<ColumnProfile>,
    pub quality_score: i64,
    pub quality_label: &'static str,
    pub suggested_targets: Vec<String>,
}

/// Tipo de una columna como `_infer_column_type` (con la cantidad de valores distintos ya contada).
fn column_kind(f: &Frame, i: usize, n_unique: usize) -> &'static str {
    let c = &f.cols[i];
    let name = c.name.to_lowercase();
    let tokens: Vec<&str> = name.split(|ch: char| ch.is_whitespace() || ch == '_').filter(|t| !t.is_empty()).collect();
    const POSTAL: [&str; 16] = ["postal", "zip", "zipcode", "postcode", "cp", "cod_postal", "codigo_postal", "phone", "telefono",
        "teléfono", "celular", "fax", "dni", "ssn", "cuit", "cuil"];
    if POSTAL.iter().any(|k| name.contains(k)) {
        return CATEGORICAL;
    }
    const IDS: [&str; 9] = ["id", "cod", "codigo", "código", "code", "key", "uuid", "numero", "número"];
    let n_rows = c.len();
    if IDS.iter().any(|k| tokens.contains(k)) && n_unique as f64 / n_rows.max(1) as f64 > 0.95 {
        return ID;
    }
    match &c.data {
        Data::Time(_) => DATE,
        Data::Bool(_) => CATEGORICAL,
        Data::Int(_) | Data::Float(_) => {
            if n_unique <= 10 && (n_unique as f64) < n_rows as f64 * 0.05 { CATEGORICAL } else { NUMERIC }
        }
        Data::Obj(d) => {
            // Un texto que en su mayoría se lee como fecha (de las primeras 20 con datos).
            let sample: Vec<&Obj> = d.iter().filter(|o| **o != Obj::Null).take(20).collect();
            let dates = sample.iter().filter(|o| matches!(o, Obj::Str(s) if parses_as_date(s))).count();
            if !sample.is_empty() && dates as f64 / sample.len() as f64 > 0.8 {
                return DATE;
            }
            let non_null = n_rows - c.null_count();
            if n_unique == 0 || non_null == 0 {
                return TEXT;
            }
            if (n_unique as f64 / non_null as f64) < 0.4 || n_unique <= 30 { CATEGORICAL } else { TEXT }
        }
    }
}

/// Puntaje por el nombre, como `target_score`: ventas primero; costos, descuentos, edades, ratings
/// y porcentajes al final.
pub fn target_score(name: &str) -> f64 {
    const STRONG: [&str; 7] = ["venta", "sales", "revenue", "ingreso", "factur", "importe", "total"];
    const MEDIUM: [&str; 7] = ["ganancia", "profit", "margen", "beneficio", "monto", "valor", "amount"];
    const WEAK: [&str; 10] = ["precio", "price", "cantidad", "quantity", "units", "unidades", "churn", "baja", "cancelacion", "score"];
    const PENALTY_SUB: [&str; 11] = ["costo", "cost", "descuento", "discount", "impuesto", "envio", "envío", "shipping", "porcentaje", "percentage", "lifetime"];
    const PENALTY_TOKENS: [&str; 19] = ["age", "edad", "rate", "tasa", "pct", "days", "dias", "días", "dia", "día", "year", "año", "month", "mes", "points", "puntos", "stock", "rating", "tax"];
    const SALES: [&str; 5] = ["venta", "sales", "revenue", "ingreso", "factur"];
    let n = name.to_lowercase();
    let tokens: Vec<&str> = n.split(|c: char| !(c.is_ascii_alphanumeric() || "áéíóúñ".contains(c))).filter(|t| !t.is_empty()).collect();
    let mut score = if STRONG.iter().any(|k| n.contains(k)) {
        100.0
    } else if MEDIUM.iter().any(|k| n.contains(k)) {
        60.0
    } else if WEAK.iter().any(|k| n.contains(k)) {
        30.0
    } else {
        0.0
    };
    if SALES.iter().any(|k| n.contains(k)) && (n.contains("total") || n.contains("net") || n.contains("neto")) {
        score += 10.0;
    }
    if PENALTY_SUB.iter().any(|k| n.contains(k)) || tokens.iter().any(|t| PENALTY_TOKENS.contains(t)) {
        score -= 80.0;
    }
    score
}

/// Puntaje de 0 a 100 como `_compute_quality_score`: vacíos, filas repetidas, pocas columnas
/// numéricas y planillas muy chicas restan.
fn quality(f: &Frame, cols: &[ColumnProfile]) -> (i64, &'static str) {
    let n = f.rows();
    let null_pct = |c: &ColumnProfile| (c.null_count as f64 / n.max(1) as f64 * 100.0 * 10.0).round_ties_even() / 10.0;
    let avg_null = if cols.is_empty() { 100.0 } else { cols.iter().map(null_pct).sum::<f64>() / cols.len() as f64 };
    let dup_pct = (n - first_rows(f).len()) as f64 / n.max(1) as f64 * 100.0;
    let numerics = cols.iter().filter(|c| c.kind == NUMERIC).count();
    let mut penalties = (avg_null * 1.5).min(30.0) + (dup_pct * 2.0).min(20.0);
    penalties += match numerics { 0 => 20.0, 1 => 10.0, _ => 0.0 };
    penalties += if n < 50 { 20.0 } else if n < 100 { 10.0 } else { 0.0 };
    let score = ((100.0 - penalties).round_ties_even() as i64).clamp(0, 100);
    (score, if score >= 80 { "Alta" } else if score >= 55 { "Media" } else { "Baja" })
}

/// El perfil completo, como `profile_dataframe`.
pub fn profile(f: &Frame) -> Profile {
    let columns: Vec<ColumnProfile> = (0..f.cols.len())
        .map(|i| {
            let c = &f.cols[i];
            let n_unique = c.nunique();
            ColumnProfile { name: c.name.clone(), kind: column_kind(f, i, n_unique), n_unique, null_count: c.null_count() }
        })
        .collect();
    let (quality_score, quality_label) = quality(f, &columns);
    // Qué analizar: puntaje por el nombre, después las más variadas, después por nombre.
    let mut scored: Vec<(f64, &str)> = columns.iter()
        .filter(|c| c.kind == NUMERIC)
        .map(|c| (target_score(&c.name) + c.n_unique as f64 / (c.n_unique + c.null_count).max(1) as f64, c.name.as_str()))
        .collect();
    scored.sort_by(|a, b| b.0.total_cmp(&a.0).then(a.1.cmp(b.1)));
    let suggested_targets = scored.into_iter().take(5).map(|(_, n)| n.to_string()).collect();
    Profile { n_rows: f.rows(), columns, quality_score, quality_label, suggested_targets }
}

impl Profile {
    pub fn kind(&self, name: &str) -> Option<&'static str> {
        self.columns.iter().find(|c| c.name == name).map(|c| c.kind)
    }

    /// Las columnas de la persona de un tipo (sin las auxiliares de la limpieza, que empiezan con `_`).
    pub fn of_kind(&self, kind: &str) -> Vec<String> {
        self.columns.iter().filter(|c| c.kind == kind && !c.name.starts_with('_')).map(|c| c.name.clone()).collect()
    }

    /// Como `profile` en la respuesta del motor de la web.
    pub fn to_json(&self) -> Value {
        json!({
            "n_rows": self.n_rows,
            "n_cols": self.columns.len(),
            "quality_score": self.quality_score,
            "quality_label": self.quality_label,
            "numeric_columns": self.of_kind(NUMERIC),
            "date_columns": self.of_kind(DATE),
            "categorical_columns": self.of_kind(CATEGORICAL),
            "suggested_targets": self.suggested_targets,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::target_score;

    #[test]
    fn la_columna_sugerida_es_la_de_ventas() {
        let pyme = ["cantidad", "precio_unitario", "monto_descuento", "subtotal", "total_venta", "costo_unitario", "costo_total", "ganancia", "margen_porcentaje", "stock_disponible"];
        let best = pyme.iter().max_by(|a, b| target_score(a).total_cmp(&target_score(b))).unwrap();
        assert_eq!(*best, "total_venta");
        let shop = ["customer_age", "delivery_days", "customer_rating", "quantity", "gross_sales", "discount_amount", "tax_amount", "shipping_cost", "net_sales", "product_cost", "profit", "profit_margin_percentage", "customer_lifetime_value"];
        let best = shop.iter().max_by(|a, b| target_score(a).total_cmp(&target_score(b))).unwrap();
        assert_eq!(*best, "net_sales");
    }
}
