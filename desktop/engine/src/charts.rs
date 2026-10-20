//! Los gráficos automáticos, como `core/chart_generator.py` (`auto_charts`): la evolución en el
//! tiempo, promedios y cantidades por grupo, la distribución, cuartiles, correlaciones y la relación
//! más fuerte. Cada gráfico sale con el mismo formato que manda el motor de la web, así la pantalla
//! los dibuja con los mismos componentes.
//!
//! Dos diferencias a propósito, porque en Python son al azar: con más de 300 puntos, el gráfico de
//! relación toma 300 parejos en vez de 300 al azar, y con más de 25 valores raros en una caja se
//! muestran 25 parejos.

use crate::clean::{civil_from_days, days_from_civil, obj_str, quantile, to_datetime, Data, Frame, Obj, CATEGORICAL, DATE, NUMERIC};
use crate::profile::Profile;
use crate::pynum::{cast, count_label, label, np_round, py_round, Kahan};
use rustc_hash::FxHashMap;
use serde_json::{json, Map, Value};

const DAY_NS: i64 = 86_400_000_000_000;

fn ymd(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

// Columnas -------------------------------------------------------------------------------------

/// Los valores de una columna como números (vacío = NaN); `None` si no es numérica.
fn numbers(f: &Frame, name: &str) -> Option<Vec<f64>> {
    match &f.col(name)?.data {
        Data::Int(v) => Some(v.iter().map(|x| *x as f64).collect()),
        Data::Float(v) => Some(v.clone()),
        _ => None,
    }
}

fn is_int(f: &Frame, name: &str) -> bool {
    matches!(f.col(name).map(|c| &c.data), Some(Data::Int(_)))
}

/// Si la columna quedó en `float32`: pandas la promedia y la redondea en precisión simple.
fn is_f32(f: &Frame, name: &str) -> bool {
    f.col(name).map_or(false, |c| c.dtype == "float32")
}

/// Cada fila con el número de su grupo (`None` = vacío), el valor de cada grupo como lo escribe
/// pandas en la tabla del gráfico (texto, número, sí/no o fecha) y como lo escribe Python en un
/// texto (`str(valor)`).
struct Groups {
    of_row: Vec<Option<usize>>,
    labels: Vec<Value>,
    names: Vec<String>,
}

fn groups(f: &Frame, name: &str) -> Groups {
    let c = f.col(name).expect("columna del perfil");
    let mut at: FxHashMap<String, usize> = FxHashMap::default();
    let (mut labels, mut names) = (Vec::new(), Vec::new());
    let mut id = |key: String, v: Value, name: String| {
        let n = labels.len();
        *at.entry(key).or_insert_with(|| {
            labels.push(v);
            names.push(name);
            n
        })
    };
    let num = |x: f64| obj_str(&Obj::Num(x));
    let py_bool = |b: bool| if b { "True" } else { "False" }.to_string();
    let of_row = match &c.data {
        Data::Obj(d) => {
            let ids: Vec<Option<usize>> = d.values().iter().map(|o| match o {
                Obj::Null => None,
                Obj::Str(s) => Some(id(format!("s{s}"), json!(s), s.clone())),
                Obj::Bool(b) => Some(id(format!("n{}", *b as u8), json!(b), py_bool(*b))),
                Obj::Num(x) => Some(id(format!("n{x}"), json!(x), num(*x))),
            }).collect();
            d.codes().iter().map(|&c| ids[c as usize]).collect()
        }
        Data::Int(v) => v.iter().map(|x| Some(id(x.to_string(), json!(x), x.to_string()))).collect(),
        Data::Float(v) => v.iter().map(|x| (!x.is_nan()).then(|| id(x.to_string(), json!(x), num(*x)))).collect(),
        Data::Bool(v) => v.iter().map(|b| Some(id(b.to_string(), json!(b), py_bool(*b)))).collect(),
        Data::Time(v) => v.iter().map(|t| t.map(|ns| {
            let (day, secs) = (ns.div_euclid(DAY_NS), ns.rem_euclid(DAY_NS) / 1_000_000_000);
            let full = format!("{} {:02}:{:02}:{:02}", ymd(day), secs / 3600, secs % 3600 / 60, secs % 60);
            id(ns.to_string(), json!(ymd(day)), full)
        })).collect(),
    };
    Groups { of_row, labels, names }
}

/// Orden de pandas entre los valores de un grupo (números y sí/no entre sí, textos por código).
fn key_cmp(a: &Value, b: &Value) -> std::cmp::Ordering {
    match (sort_value(a), sort_value(b)) {
        (Some(x), Some(y)) => x.total_cmp(&y),
        _ => a.as_str().unwrap_or("").cmp(b.as_str().unwrap_or("")),
    }
}

/// Un valor de una tabla como número para ordenar (para pandas, sí/no es 1/0).
fn sort_value(v: &Value) -> Option<f64> {
    v.as_f64().or_else(|| v.as_bool().map(|b| b as u8 as f64))
}

/// `df[name].nunique()`.
fn nunique(f: &Frame, name: &str) -> usize {
    let g = groups(f, name);
    let mut seen = vec![false; g.labels.len()];
    g.of_row.iter().flatten().for_each(|&i| seen[i] = true);
    seen.iter().filter(|s| **s).count()
}

/// Un grupo con su número (cantidad de filas o promedio).
struct Stat {
    label: Value,
    name: String,
    value: f64,
}

impl Stat {
    /// El grupo como lo escribe Python al leerlo de una fila de promedios (`agg.iloc[0][col]`): esa
    /// fila mezcla el grupo con un decimal, así que un grupo entero sale como decimal ("0.0").
    fn row_name(&self) -> String {
        if self.label.is_i64() || self.label.is_u64() { obj_str(&Obj::Num(self.label.as_f64().unwrap())) } else { self.name.clone() }
    }
}

/// `value_counts()`: filas por grupo, de más a menos (empates en orden de aparición).
fn value_counts(f: &Frame, name: &str) -> Vec<Stat> {
    let g = groups(f, name);
    let mut n = vec![0usize; g.labels.len()];
    g.of_row.iter().flatten().for_each(|&i| n[i] += 1);
    let mut out: Vec<Stat> = g.labels.into_iter().zip(g.names).zip(n)
        .filter(|(_, n)| *n > 0)
        .map(|((label, name), n)| Stat { label, name, value: n as f64 })
        .collect();
    out.sort_by(|a, b| b.value.total_cmp(&a.value));
    out
}

/// `df.groupby(by)[col].mean()` de mayor a menor (los grupos sin datos al final) y después
/// `.round(decimals)`, en la precisión de la columna.
fn mean_by(f: &Frame, by: &str, col: &str, decimals: i32) -> Vec<Stat> {
    let g = groups(f, by);
    let vals = numbers(f, col).unwrap_or_default();
    let single = is_f32(f, col);
    let mut acc = vec![Kahan::default(); g.labels.len()];
    let mut present = vec![false; g.labels.len()];
    for (row, k) in g.of_row.iter().enumerate() {
        if let Some(k) = *k {
            present[k] = true;
            if !vals[row].is_nan() {
                acc[k].add(vals[row], single);
            }
        }
    }
    let mut out: Vec<Stat> = g.labels.into_iter().zip(g.names).enumerate()
        .filter(|(k, _)| present[*k])
        .map(|(k, (label, name))| Stat { label, name, value: acc[k].mean(single) })
        .collect();
    out.sort_by(|a, b| key_cmp(&a.label, &b.label)); // groupby ordena por grupo...
    out.sort_by(|a, b| match (a.value.is_nan(), b.value.is_nan()) {
        (false, false) => b.value.total_cmp(&a.value), // ...y después por el promedio, de mayor a menor
        (x, y) => x.cmp(&y),
    });
    out.iter_mut().for_each(|s| s.value = np_round(s.value, decimals, single));
    out
}

fn mean(v: &[f64]) -> f64 {
    v.iter().sum::<f64>() / v.len() as f64
}

/// Desvío estándar muestral (`std()`, sin vacíos).
fn std(v: &[f64]) -> f64 {
    let x: Vec<f64> = v.iter().copied().filter(|x| !x.is_nan()).collect();
    if x.len() < 2 {
        return f64::NAN;
    }
    let m = mean(&x);
    (x.iter().map(|a| (a - m).powi(2)).sum::<f64>() / (x.len() - 1) as f64).sqrt()
}

/// Correlación de Pearson con las filas donde están los dos valores (como `DataFrame.corr`).
fn pearson(x: &[f64], y: &[f64]) -> f64 {
    let (a, b): (Vec<f64>, Vec<f64>) = x.iter().zip(y).filter(|(p, q)| !p.is_nan() && !q.is_nan()).map(|(p, q)| (*p, *q)).unzip();
    if a.len() < 2 {
        return f64::NAN;
    }
    let (ma, mb) = (mean(&a), mean(&b));
    let (mut sab, mut saa, mut sbb) = (0.0, 0.0, 0.0);
    for (p, q) in a.iter().zip(&b) {
        sab += (p - ma) * (q - mb);
        saa += (p - ma).powi(2);
        sbb += (q - mb).powi(2);
    }
    (sab / (saa * sbb).sqrt()).clamp(-1.0, 1.0)
}

/// Asimetría de Fisher-Pearson (`scipy.stats.skew`).
fn skewness(v: &[f64]) -> f64 {
    let m = mean(v);
    let m2 = v.iter().map(|x| (x - m).powi(2)).sum::<f64>() / v.len() as f64;
    let m3 = v.iter().map(|x| (x - m).powi(3)).sum::<f64>() / v.len() as f64;
    m3 / m2.powf(1.5)
}

// El formato de cada gráfico ---------------------------------------------------------------------

/// Una tabla de un gráfico: columnas y filas, con los valores ya como los manda la web.
struct Source {
    dims: Vec<String>,
    rows: Vec<Vec<Value>>,
}

impl Source {
    fn records(&self) -> Vec<Value> {
        self.rows.iter().map(|r| Value::Object(self.dims.iter().cloned().zip(r.iter().cloned()).collect::<Map<_, _>>())).collect()
    }
}

/// Lo que dibuja el gráfico y lo que lo decide (`build_autoviz_payload`).
struct Spec<'a> {
    id: String,
    title: String,
    insight: String,
    kind: &'a str,
    /// Las columnas numéricas de la tabla de origen (si alguna es muy asimétrica y positiva, escala
    /// logarítmica) y las fechas (para los huecos).
    log_from: Vec<Vec<f64>>,
    gaps_from: Option<Vec<i64>>,
    is_time: bool,
    trendline: Option<Value>,
}

/// `_detect_time_gaps`: algún salto entre fechas más de 1,5 veces el salto más común.
fn time_gaps(mut t: Vec<i64>) -> bool {
    t.sort_unstable();
    let deltas: Vec<i64> = t.windows(2).map(|w| w[1] - w[0]).collect();
    let mut counts: FxHashMap<i64, usize> = FxHashMap::default();
    deltas.iter().for_each(|d| *counts.entry(*d).or_default() += 1);
    let top = counts.values().copied().max().unwrap_or(0);
    let Some(mode) = counts.iter().filter(|(_, n)| **n == top).map(|(d, _)| *d).min() else { return false };
    deltas.iter().any(|d| (*d as f64) > mode as f64 * 1.5)
}

fn payload(spec: Spec, mut src: Source) -> Value {
    let mut kind = spec.kind;
    let high_cardinality = matches!(kind, "Donut" | "HorizontalBar") && src.rows.len() >= 5;
    if high_cardinality && kind == "Donut" {
        kind = "HorizontalBar";
    }
    let log = kind != "Scatter" && spec.log_from.into_iter().any(|v| {
        let v: Vec<f64> = v.into_iter().filter(|x| !x.is_nan()).collect();
        !v.is_empty() && skewness(&v).abs() > 1.5 && v.iter().copied().fold(f64::INFINITY, f64::min) > 0.0
    });
    let gaps = spec.is_time && spec.gaps_from.map_or(false, time_gaps);
    let (x, y) = match kind {
        "HorizontalBar" => ("value", "category"),
        "Scatter" => ("value", "value"),
        _ if spec.is_time => ("time", "value"),
        _ => ("category", "value"),
    };
    if kind == "HorizontalBar" {
        // Por la primera columna numérica de la tabla (para pandas, sí/no también lo es).
        if let Some(j) = (0..src.dims.len()).find(|&j| !src.rows.is_empty() && src.rows.iter().all(|r| sort_value(&r[j]).is_some() || r[j].is_null())) {
            let key = |r: &Vec<Value>| sort_value(&r[j]).unwrap_or(f64::NEG_INFINITY);
            src.rows.sort_by(|a, b| key(b).total_cmp(&key(a)));
        }
    }
    let mut layout = json!({
        "chart_type": kind, "x_axis_type": x, "y_axis_type": y, "is_log_scale": log,
        "has_time_gaps": gaps, "high_cardinality": high_cardinality, "show_confidence_bands": false,
    });
    if let Some(t) = spec.trendline {
        layout["trendline"] = t;
    }
    json!({
        "chart_id": spec.id,
        "metadata": { "title": spec.title, "insight_subtitle": spec.insight, "source_metric": src.dims.last() },
        "layout_directives": layout,
        "dataset": { "dimensions": src.dims, "source": src.records() },
    })
}

/// Un gráfico de barras de (grupo, valor): los primeros `head` grupos.
fn bars(spec: Spec, by: &str, metric: &str, stats: &[Stat], head: usize) -> Value {
    let rows = stats.iter().take(head).map(|s| vec![s.label.clone(), if s.value.is_nan() { Value::Null } else { json!(s.value) }]).collect();
    payload(spec, Source { dims: vec![by.into(), metric.into()], rows })
}

/// Cantidad de filas por grupo (`value_counts`), en barras o torta según cuántos grupos hay.
fn volume(f: &Frame, col: &str, id: String, title: String, insight: impl FnOnce(&[Stat]) -> String, head: usize) -> Value {
    let vc = value_counts(f, col);
    let kind = if vc.len() < 6 { "Donut" } else { "HorizontalBar" };
    // Las columnas numéricas de la tabla de cantidades: los grupos (si son números) y las cantidades.
    let keys: Option<Vec<f64>> = vc.iter().map(|s| sort_value(&s.label)).collect();
    let counts: Vec<f64> = vc.iter().map(|s| s.value).collect();
    let rows = vc.iter().take(head).map(|s| vec![s.label.clone(), json!(s.value as usize)]).collect();
    let insight = insight(&vc);
    let log_from = keys.into_iter().chain([counts]).collect();
    payload(Spec { id, title, insight, kind, log_from, gaps_from: None, is_time: false, trendline: None }, Source { dims: vec![col.into(), "Cantidad".into()], rows })
}

fn spec(id: impl Into<String>, title: String, insight: String, kind: &str, log_from: Vec<Vec<f64>>) -> Spec<'_> {
    Spec { id: id.into(), title, insight, kind, log_from, gaps_from: None, is_time: false, trendline: None }
}

/// `_build_histogram`: 8 rangos iguales entre el mínimo y el máximo, como `np.histogram` (los bordes
/// y las cuentas, en la precisión de la columna).
fn histogram(f: &Frame, col: &str, id: &str) -> Option<Value> {
    let s: Vec<f64> = numbers(f, col)?.into_iter().filter(|x| !x.is_nan()).collect();
    if s.len() < 10 {
        return None;
    }
    let (edges, counts) = bins(&s, is_f32(f, col));
    let labels: Vec<String> = (0..BINS).map(|i| format!("{} - {}", label(edges[i]), label(edges[i + 1]))).collect();
    let top = counts.iter().enumerate().fold(0, |best, (i, n)| if *n > counts[best] { i } else { best });
    let rows = labels.iter().zip(counts).map(|(l, n)| vec![json!(l), json!(n)]).collect();
    let freq: Vec<f64> = counts.iter().map(|n| *n as f64).collect();
    Some(payload(
        spec(id, format!("Distribucion de {col}"), format!("La mayoria de registros se concentra en el rango {}.", labels[top]), "HorizontalBar", vec![freq]),
        Source { dims: vec!["Rango".into(), "Frecuencia".into()], rows },
    ))
}

const BINS: usize = 8;

/// Los bordes y las cuentas de `np.histogram(s, bins=8)`, en la precisión de la columna: cada valor
/// va al rango que da la cuenta, corregido si quedó justo sobre un borde.
fn bins(s: &[f64], single: bool) -> (Vec<f64>, [usize; BINS]) {
    let c = |x: f64| cast(x, single);
    let (mut lo, mut hi) = s.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), x| (a.min(*x), b.max(*x)));
    if lo == hi {
        (lo, hi) = (c(lo - 0.5), c(hi + 0.5));
    }
    // `np.linspace` calcula en f64 y pasa los bordes a la precisión de la columna.
    let step = (hi - lo) / BINS as f64;
    let mut edges: Vec<f64> = (0..=BINS).map(|i| c(lo + i as f64 * step)).collect();
    edges[BINS] = hi;
    let norm = c(BINS as f64 / c(hi - lo));
    let mut counts = [0usize; BINS];
    for x in s {
        let mut k = (c(c(x - lo) * norm) as usize).min(BINS - 1);
        if *x < edges[k] {
            k -= 1;
        } else if k + 1 < BINS && *x >= edges[k + 1] {
            k += 1;
        }
        counts[k] += 1;
    }
    (edges, counts)
}

/// Mínimo, cuartiles, mediana y máximo sin valores raros, y los raros (`_box_stats`).
fn box_stats(mut vals: Vec<f64>) -> Option<(Vec<f64>, Vec<f64>, f64, f64, f64)> {
    vals.retain(|x| !x.is_nan());
    if vals.len() < 3 {
        return None;
    }
    let mut v = vals.clone();
    let (q1, med, q3) = (quantile(&mut v, 0.25), quantile(&mut v, 0.5), quantile(&mut v, 0.75));
    let iqr = q3 - q1;
    let (mn, mx) = vals.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), x| (a.min(*x), b.max(*x)));
    let (low, high) = (mn.max(q1 - 1.5 * iqr), mx.min(q3 + 1.5 * iqr));
    let mut outliers: Vec<f64> = vals.iter().filter(|x| **x < low || **x > high).map(|x| py_round(*x, 4)).collect();
    if outliers.len() > 25 {
        let n = outliers.len();
        outliers = (0..25).map(|i| outliers[i * n / 25]).collect();
    }
    Some(([low, q1, med, q3, high].map(|x| py_round(x, 4)).to_vec(), outliers, med, q1, q3))
}

/// `build_boxplot_payload`: cajas de `num` por los 8 grupos más grandes de `by` (o una sola caja).
fn boxplot(f: &Frame, num: &str, by: Option<&str>, id: String) -> Option<Value> {
    let vals = numbers(f, num)?;
    if vals.iter().filter(|x| !x.is_nan()).count() < 5 {
        return None;
    }
    let mut rows = Vec::new();
    let (title, insight);
    let by = by.filter(|b| nunique_where(f, b, &vals) >= 2);
    if let Some(by) = by {
        let g = groups(f, by);
        let top = value_counts_where(&g, &vals);
        for k in top.into_iter().take(8) {
            let group: Vec<f64> = g.of_row.iter().zip(&vals).filter(|(r, x)| **r == Some(k) && !x.is_nan()).map(|(_, x)| *x).collect();
            if let Some((b, o, ..)) = box_stats(group) {
                rows.push((g.names[k].clone(), b, o));
            }
        }
        title = format!("Dispersion y Cuartiles: {num} por {by}");
        insight = match rows.iter().map(|r| r.1[2]).enumerate().fold(None, |best: Option<(usize, f64)>, (i, m)| match best {
            Some((_, bm)) if bm >= m => best,
            _ => Some((i, m)),
        }) {
            Some((i, m)) => format!("'{}' presenta la mediana mas alta ({}). Las cajas muestran el rango intercuartil (IQR) y los puntos rojos son valores atipicos.", rows[i].0, label(m)),
            None => format!("Distribucion de {num} por {by}."),
        };
    } else {
        let (b, o, med, q1, q3) = box_stats(vals)?;
        rows.push((num.to_string(), b, o));
        title = format!("Dispersion y Cuartiles: {num}");
        insight = format!("Mediana en {} con rango central (IQR) de {} a {}.", label(med), label(q1), label(q3));
    }
    if rows.is_empty() {
        return None;
    }
    let high = rows.len() > 5;
    Some(json!({
        "chart_id": id,
        "metadata": { "title": title, "insight_subtitle": insight, "source_metric": num },
        "layout_directives": { "chart_type": "BoxPlot", "x_axis_type": "category", "y_axis_type": "value", "is_log_scale": false,
            "has_time_gaps": false, "high_cardinality": high, "show_confidence_bands": false },
        "dataset": { "dimensions": ["categoria", "box", "outliers"], "source": rows.into_iter().map(|(c, b, o)| json!({ "categoria": c, "box": b, "outliers": o })).collect::<Vec<_>>() },
    }))
}

/// Grupos de las filas que tienen `vals` (`clean_df[by].nunique()` después de `dropna(subset=[num])`).
fn nunique_where(f: &Frame, by: &str, vals: &[f64]) -> usize {
    let g = groups(f, by);
    let mut seen = vec![false; g.labels.len()];
    g.of_row.iter().zip(vals).filter(|(_, x)| !x.is_nan()).filter_map(|(k, _)| *k).for_each(|k| seen[k] = true);
    seen.iter().filter(|s| **s).count()
}

/// Los grupos ordenados por cantidad de filas con `vals`, de más a menos.
fn value_counts_where(g: &Groups, vals: &[f64]) -> Vec<usize> {
    let mut n = vec![0usize; g.labels.len()];
    g.of_row.iter().zip(vals).filter(|(_, x)| !x.is_nan()).filter_map(|(k, _)| *k).for_each(|k| n[k] += 1);
    let mut order: Vec<usize> = (0..n.len()).filter(|&k| n[k] > 0).collect();
    order.sort_by(|a, b| n[*b].cmp(&n[*a]));
    order
}

/// `build_correlation_heatmap`: correlaciones entre las numéricas que se mueven.
fn heatmap(f: &Frame, nums: &[String]) -> Option<Value> {
    let data: Vec<(String, Vec<f64>)> = nums.iter().filter_map(|c| numbers(f, c).map(|v| (c.clone(), v))).filter(|(_, v)| std(v) > 1e-6).collect();
    if data.len() < 2 {
        return None;
    }
    let mut data = data;
    if data.len() > 20 {
        data.sort_by(|a, b| std(&b.1).total_cmp(&std(&a.1)));
        data.truncate(20);
    }
    let n = data.len();
    let r: Vec<Vec<f64>> = (0..n).map(|i| (0..n).map(|j| if i == j { 1.0 } else { pearson(&data[i].1, &data[j].1) }).collect()).collect();
    let mut keep: Vec<usize> = (0..n).filter(|&i| (0..n).any(|j| j != i && r[i][j].abs() > 0.3)).collect();
    if keep.len() < 2 {
        keep = (0..n.min(10)).collect();
    }
    let mut source = Vec::new();
    for &i in &keep {
        for &j in &keep {
            if !r[i][j].is_nan() {
                source.push(json!({ "x": data[i].0, "y": data[j].0, "value": py_round(r[i][j], 3) }));
            }
        }
    }
    if source.is_empty() {
        return None;
    }
    let mut best = (0, 0, 0.0f64);
    for &i in &keep {
        for &j in &keep {
            if data[i].0 < data[j].0 && !r[i][j].is_nan() && r[i][j].abs() > best.2.abs() {
                best = (i, j, r[i][j]);
            }
        }
    }
    let insight = if best.2 != 0.0 {
        let strength = if best.2.abs() >= 0.7 { "muy fuerte" } else if best.2.abs() >= 0.5 { "fuerte" } else { "moderada" };
        let dir = if best.2 >= 0.0 { "positiva" } else { "negativa" };
        format!("Relacion {strength} {dir} de {:+.2} entre {} y {}.", best.2, data[best.0].0, data[best.1].0)
    } else {
        "Matriz de correlaciones entre variables numericas.".into()
    };
    Some(json!({
        "chart_id": "correlation_heatmap",
        "metadata": { "title": "Mapa de Correlaciones", "insight_subtitle": insight, "source_metric": "correlacion" },
        "layout_directives": { "chart_type": "CorrelationHeatmap", "x_axis_type": "category", "y_axis_type": "category", "is_log_scale": false,
            "has_time_gaps": false, "high_cardinality": keep.len() > 8, "show_confidence_bands": false },
        "dataset": { "dimensions": ["x", "y", "value"], "source": source },
    }))
}

/// Las fechas de una columna, en días desde 1970 (como `pd.to_datetime(...).dt.normalize()`).
fn days(f: &Frame, name: &str) -> Vec<Option<i64>> {
    match &f.col(name).map(|c| &c.data) {
        Some(Data::Time(v)) => v.iter().map(|t| t.map(|ns| ns.div_euclid(DAY_NS))).collect(),
        Some(Data::Obj(d)) => to_datetime(d, false).into_iter().map(|t| t.map(|ns| ns.div_euclid(DAY_NS))).collect(),
        _ => vec![None; f.rows()],
    }
}

/// La evolución de `target` en el tiempo: promedio por día, semana (hasta el domingo) o mes.
fn time_series(f: &Frame, date: &str, target: &str) -> Option<Value> {
    let vals = numbers(f, target)?;
    let pts: Vec<(i64, f64)> = days(f, date).into_iter().zip(&vals).filter_map(|(d, v)| Some((d?, *v)).filter(|(_, v)| !v.is_nan())).collect();
    if pts.len() < 5 {
        return None;
    }
    let (first, last) = pts.iter().fold((i64::MAX, i64::MIN), |(a, b), (d, _)| (a.min(*d), b.max(*d)));
    let n_dates = pts.iter().map(|(d, _)| *d).collect::<rustc_hash::FxHashSet<_>>().len();
    let span = last - first;
    let (period, insight): (fn(i64) -> i64, String) = if span > 1095 {
        (|d| { let (y, m, _) = civil_from_days(d); days_from_civil(y, m, 1) }, format!("Promedio mensual de {target} en el tiempo."))
    } else if span > 90 || n_dates > 90 {
        (|d| d + (6 - (d + 3).rem_euclid(7)), format!("Promedio semanal de {target} para ver la tendencia."))
    } else {
        (|d| d, format!("Valores diarios de {target} registrados."))
    };
    let single = is_f32(f, target);
    let mut by: std::collections::BTreeMap<i64, Kahan> = std::collections::BTreeMap::new();
    for (d, v) in &pts {
        by.entry(period(*d)).or_default().add(*v, single);
    }
    if by.len() < 3 {
        return None;
    }
    // El promedio por período sale en la precisión de la columna y el resultado ya es float64.
    let rows = by.iter().map(|(d, k)| vec![json!(ymd(*d)), json!(np_round(k.mean(single), 2, false))]).collect();
    let gaps = pts.iter().map(|(d, _)| *d).collect();
    Some(payload(
        Spec { id: "time_evo".into(), title: format!("Evolucion Temporal de {target}"), insight, kind: "LineChart",
            log_from: vec![pts.iter().map(|(_, v)| *v).collect()], gaps_from: Some(gaps), is_time: true, trendline: None },
        Source { dims: vec![date.into(), target.into()], rows },
    ))
}

/// La numérica más relacionada con `target` y su gráfico de puntos con la recta (si |r| ≥ 0,18).
fn scatter(f: &Frame, target: &str, others: &[String]) -> Option<Value> {
    if others.is_empty() || f.rows() < 15 {
        return None;
    }
    let t = numbers(f, target)?;
    let cands: Vec<(String, Vec<f64>)> = others.iter().filter_map(|c| numbers(f, c).map(|v| (c.clone(), v))).filter(|(_, v)| std(v) > 1e-6).collect();
    // Las filas con todos los valores (`dropna()` sobre target y candidatas).
    let full: Vec<usize> = (0..f.rows()).filter(|&i| !t[i].is_nan() && cands.iter().all(|(_, v)| !v[i].is_nan())).collect();
    if cands.is_empty() || full.len() < 15 {
        return None;
    }
    let pick = |v: &[f64]| full.iter().map(|&i| v[i]).collect::<Vec<f64>>();
    let tt = pick(&t);
    let (best, r) = cands.iter().map(|(c, v)| (c, pearson(&pick(v), &tt))).filter(|(_, r)| !r.is_nan())
        .fold(None, |acc: Option<(&String, f64)>, (c, r)| match acc { Some((_, br)) if br.abs() >= r.abs() => acc, _ => Some((c, r)) })?;
    if r.abs() < 0.18 {
        return None;
    }
    let x = numbers(f, best)?;
    let mut pts: Vec<(f64, f64)> = x.iter().zip(&t).filter(|(a, b)| !a.is_nan() && !b.is_nan()).map(|(a, b)| (*a, *b)).collect();
    if pts.len() > 300 {
        let n = pts.len();
        pts = (0..300).map(|i| pts[i * n / 300]).collect();
    }
    let (mx, my) = (mean(&pts.iter().map(|p| p.0).collect::<Vec<_>>()), mean(&pts.iter().map(|p| p.1).collect::<Vec<_>>()));
    let (sxy, sxx) = pts.iter().fold((0.0, 0.0), |(a, b), (px, py)| (a + (px - mx) * (py - my), b + (px - mx).powi(2)));
    let trend = (sxx > 0.0).then(|| {
        let m = sxy / sxx;
        let (lo, hi) = pts.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), p| (a.min(p.0), b.max(p.0)));
        json!({ "slope": py_round(m, 4), "intercept": py_round(my - m * mx, 4), "r": py_round(r, 2), "min_x": py_round(lo, 4), "max_x": py_round(hi, 4) })
    });
    let (dir, kind) = if r > 0.0 { ("aumentar", "directa") } else { ("disminuir", "inversa") };
    let (xi, yi) = (is_int(f, best), is_int(f, target));
    let cell = |v: f64, int: bool| if int { json!(v as i64) } else { json!(v) };
    let rows = pts.iter().map(|(a, b)| vec![cell(*a, xi), cell(*b, yi)]).collect();
    Some(payload(
        Spec { id: "scatter_corr".into(), title: format!("Relacion: {target} vs {best}"),
            insight: format!("A mayor {best}, tiende a {dir} {target} (relacion {kind} r={r:+.2})."), kind: "Scatter",
            log_from: Vec::new(), gaps_from: None, is_time: false, trendline: trend },
        Source { dims: vec![best.clone(), target.into()], rows },
    ))
}

/// Todos los gráficos de la planilla para `target`, en el orden de `auto_charts`.
pub fn auto_charts(f: &Frame, p: &Profile, target: &str) -> Vec<Value> {
    let mut charts: Vec<Value> = Vec::new();
    let mut add = |c: Option<Value>| {
        if let Some(c) = c {
            if !charts.iter().any(|x| x["chart_id"] == c["chart_id"]) {
                charts.push(c);
            }
        }
    };
    let (dates, cats, nums) = (p.of_kind(DATE), p.of_kind(CATEGORICAL), p.of_kind(NUMERIC));
    let numeric_target = nums.iter().any(|n| n == target);
    if nums.len() >= 3 {
        add(heatmap(f, &nums));
    }
    if let (Some(dc), true) = (dates.first(), numeric_target) {
        add(time_series(f, dc, target));
    }
    let valid: Vec<&String> = cats.iter().filter(|c| (2..=30).contains(&nunique(f, c))).collect();
    let chosen = valid.first().copied().or(cats.first());
    let second = valid.get(1).copied().or(cats.get(1));
    // La tabla de origen de un gráfico por grupo es la planilla: cuentan el grupo (si es numérico) y el valor.
    let log_of = |by: &str, metric: &str| numbers(f, by).into_iter().chain(numbers(f, metric)).collect::<Vec<_>>();

    if !numeric_target {
        // A. Lo que se analiza es una categoría.
        add(Some(volume(f, target, "cat_dist".into(), format!("Distribucion de {target}"),
            |vc| vc.first().map_or(String::new(), |s| format!("'{}' es la opcion mas comun con {} registros.", s.name, count_label(s.value as usize))), 15)));
        let mut boxes = Vec::new();
        for (i, nc) in nums.iter().enumerate() {
            let agg = mean_by(f, target, nc, 4);
            let Some(top) = agg.first() else { continue };
            let insight = format!("'{}' tiene el promedio mas alto con {}.", top.row_name(), label(top.value));
            add(Some(bars(spec(format!("cat_num_{nc}"), format!("Promedio de {nc} por {target}"), insight, "HorizontalBar", log_of(target, nc)), target, nc, &agg, 15)));
            if i < 2 {
                boxes.push(boxplot(f, nc, Some(target), format!("boxplot_{nc}_{target}")));
            }
        }
        boxes.into_iter().for_each(&mut add);
        if let Some(sc) = second.filter(|s| *s != target) {
            add(Some(volume(f, sc, "cat2_dist".into(), format!("Distribucion de {sc}"), |_| format!("Concentracion de registros por {sc}."), 15)));
        }
        if let Some(n0) = nums.first() {
            add(histogram(f, n0, &format!("hist_{n0}")));
        }
        return charts;
    }

    // B. Lo que se analiza es un número.
    let leads = |agg: &[Stat]| agg.first().map_or(String::new(), |s| format!("'{}' lidera con un promedio de {}.", s.row_name(), label(s.value)));
    match chosen.filter(|c| nunique(f, c) >= 2) {
        Some(cc) => {
            let agg = mean_by(f, cc, target, 4);
            add(Some(bars(spec("num_cat", format!("Promedio de {target} por {cc}"), leads(&agg), "HorizontalBar", log_of(cc, target)), cc, target, &agg, 15)));
            add(histogram(f, target, "dist_hist"));
            add(boxplot(f, target, Some(cc), format!("boxplot_{target}")));
        }
        None => {
            add(histogram(f, target, "dist_hist"));
            add(boxplot(f, target, None, format!("boxplot_{target}")));
        }
    }
    let others: Vec<String> = nums.iter().filter(|c| *c != target).cloned().collect();
    add(scatter(f, target, &others));
    if let Some(cc) = chosen {
        add(Some(volume(f, cc, format!("vol_{cc}"), format!("Volumen por {cc}"), |_| format!("Distribucion de registros por categoria en {cc}."), 10)));
    }
    if let Some(sc) = second.filter(|s| Some(*s) != chosen) {
        let agg = mean_by(f, sc, target, 4);
        add(Some(bars(spec("num_cat_second", format!("{target} por {sc}"), leads(&agg), "HorizontalBar", log_of(sc, target)), sc, target, &agg, 10)));
    }
    let mut boxes = Vec::new();
    for (i, nc) in others.iter().take(3).enumerate() {
        if let Some(cc) = chosen {
            let agg = mean_by(f, cc, nc, 4);
            add(Some(bars(spec(format!("sec_mean_{nc}"), format!("Promedio de {nc} por {cc}"), format!("Comparativa de {nc} entre los grupos de {cc}."), "HorizontalBar", log_of(cc, nc)), cc, nc, &agg, 10)));
        }
        if i == 0 {
            boxes.push(boxplot(f, nc, second.or(chosen).map(String::as_str), format!("boxplot_sec_{nc}")));
        }
    }
    boxes.into_iter().for_each(&mut add);
    charts
}

#[cfg(test)]
mod tests {
    use super::bins;

    /// Con estos valores, 2.0 cae justo sobre un borde: numpy lo corrige al rango siguiente.
    #[test]
    fn el_histograma_cuenta_como_numpy() {
        let s = [7.7, 2.0, 3.0, 6.0, 3.6, 7.4, 5.9, 2.1, 6.1, 0.1, 1.1, 1.6];
        assert_eq!(bins(&s, false).1, [1, 2, 2, 2, 0, 0, 3, 2]);
    }
}
