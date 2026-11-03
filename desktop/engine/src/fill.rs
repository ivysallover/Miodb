//! Completar vacíos con lo que dice la misma planilla, antes de caer en la mediana o el valor más común.
//! No se supone nada por los nombres: cada relación se mide en los datos de esta planilla y se usa solo
//! si se cumple. De más a menos seguro:
//!
//! 1. **Cuentas**: una columna sale de otras (`subtotal` = `cantidad` × `precio` − descuento; `neto` =
//!    `bruto` − `descuento`). Sirve también al revés: falta el precio, se despeja.
//! 2. **Un valor determina a otro**: cada `sku` tiene una sola `marca`.
//! 3. **Grupo y período**: la mediana del mismo producto en el mismo mes.
//!
//! Lo que nada de esto resuelve queda para la imputación de siempre. Todo es determinista: las muestras
//! son fijas y lo que se recorre tiene un orden fijo, así el mismo archivo da siempre lo mismo.

use crate::clean::{median, month_number, obj_dict, py_float_str, Col, Data, Frame, Obj, Report, NUMERIC};
use rustc_hash::FxHashMap;
use std::collections::BTreeMap;

/// Desde cuántas filas se buscan relaciones: con menos, cualquier cosa parece una regla.
const MIN_ROWS: usize = 500;
/// Cuántas filas se miran para decidir.
const SAMPLE: usize = 50_000;
/// Una cuenta vale si da lo mismo (con este margen) en al menos esta parte de las filas…
const FORMULA_MARGIN: f64 = 0.01;
const FORMULA_HITS: f64 = 0.95;
/// …probada en al menos estas filas, y si cada parte aporta en al menos esta parte de ellas (si no, es casi otra columna igual).
const FORMULA_MIN_TESTED: usize = 200;
const FORMULA_CONTRIBUTES: f64 = 0.2;
/// Un valor determina a otro si coincide en al menos esta parte de las filas, con grupos de al menos estas filas en promedio.
const DEPENDENCY_PURITY: f64 = 0.98;
const DEPENDENCY_GROUP: f64 = 2.0;
/// …y si explica de verdad: de lo que erraría decir siempre el valor más común, tiene que errar a lo sumo esta parte
/// (si casi todos son "Cajero", cualquier columna parece determinarlo).
const DEPENDENCY_GAIN: f64 = 0.2;
/// Una columna vacía en más de esta parte de las filas no está incompleta: su vacío dice algo (sin promoción,
/// sin tarjeta), y ninguna otra columna lo puede deducir.
const MEANINGFUL_EMPTY: f64 = 0.5;
/// Por grupo y período: se esconden valores conocidos; tiene que quedar cerca de esta parte de las veces…
const GROUP_CLOSE: f64 = 0.10;
const GROUP_MIN_HITS: f64 = 0.8;
/// …y ganarle por esto a la mediana general.
const GROUP_GAIN: f64 = 0.2;
const GROUP_MIN_VALUES: usize = 3;
/// Cuántas columnas de números se prueban en las cuentas.
const MAX_FACTORS: usize = 25;
/// Una cuenta que falla en más de la mitad de estas primeras filas se descarta sin mirar el resto.
const QUICK_LOOK: usize = 300;
/// Cuántas columnas se prueban como grupo.
const MAX_KEYS: usize = 40;

/// Hasta `max` filas de `rows`, repartidas parejo.
fn spread(rows: Vec<usize>, max: usize) -> Vec<usize> {
    if rows.len() <= max { rows } else { (0..max).map(|i| rows[i * rows.len() / max]).collect() }
}

/// Una relación entre columnas, ya medida. `a` y `b` son columnas; `d`, un descuento en porcentaje.
#[derive(Clone, Copy, PartialEq, Debug)]
pub enum Form {
    Product,
    Sum,
    Difference,
}

struct Relation {
    t: usize,
    a: usize,
    b: usize,
    d: Option<usize>,
    form: Form,
    hits: f64,
}

fn apply(form: Form, a: f64, b: f64, d: f64) -> f64 {
    match form {
        Form::Product => a * b * (1.0 - d / 100.0),
        Form::Sum => a + b,
        Form::Difference => a - b,
    }
}

/// Una cuenta que se cumple en la planilla (`t` = `a` × `b` menos `d` %, …), por nombre de columna: lo que no
/// la cumple es un error de carga casi seguro (`problems.rs`).
#[derive(Clone, Debug)]
pub struct Cuenta {
    pub t: String,
    pub a: String,
    pub b: String,
    pub d: Option<String>,
    pub form: Form,
    /// Cómo se dice: "cantidad × precio menos descuento".
    pub text: String,
}

impl Cuenta {
    pub fn apply(&self, a: f64, b: f64, d: f64) -> f64 {
        apply(self.form, a, b, d)
    }

    /// Si `t` da la cuenta, con el mismo margen con que se aceptó.
    pub fn holds(&self, t: f64, a: f64, b: f64, d: f64) -> bool {
        (self.apply(a, b, d) - t).abs() <= FORMULA_MARGIN * t.abs().max(1.0)
    }
}

impl Relation {
    fn apply(&self, a: f64, b: f64, d: f64) -> f64 {
        apply(self.form, a, b, d)
    }

    fn say(&self, f: &Frame) -> String {
        let (a, b) = (&f.cols[self.a].name, &f.cols[self.b].name);
        match (self.form, self.d) {
            (Form::Product, Some(d)) => format!("{a} × {b} menos {}", f.cols[d].name),
            (Form::Product, None) => format!("{a} × {b}"),
            (Form::Sum, _) => format!("{a} + {b}"),
            (Form::Difference, _) => format!("{a} − {b}"),
        }
    }
}

fn is_discount(name: &str) -> bool {
    let n = name.to_lowercase();
    ["desc", "dto", "bonif"].iter().any(|k| n.contains(k))
}

/// Las cuentas que se cumplen en la planilla: para cada columna que se podría calcular, la mejor.
fn formulas(f: &Frame, values: &BTreeMap<usize, Vec<f64>>, sample: &[usize], kinds: &[bool]) -> Vec<Relation> {
    let discounts: Vec<usize> = values.keys().copied().filter(|&j| is_discount(&f.cols[j].name) && values[&j].iter().all(|x| x.is_nan() || (0.0..=100.0).contains(x))).collect();
    // Una cantidad con pocos valores cuenta como factor aunque parezca una categoría; el resultado, no.
    let factors: Vec<usize> = values.keys().copied().filter(|j| !discounts.contains(j)).take(MAX_FACTORS).collect();
    let mut found = Vec::new();
    for &t in factors.iter().filter(|&&t| kinds[t]) {
        let mut best: Option<Relation> = None;
        for (i, &a) in factors.iter().enumerate() {
            if a == t {
                continue;
            }
            for &b in &factors[i + 1..] {
                if b == t {
                    continue;
                }
                let tries = [(Form::Product, None)].into_iter().chain(discounts.iter().map(|&d| (Form::Product, Some(d)))).chain([(Form::Sum, None), (Form::Difference, None)]);
                for (form, d) in tries {
                    let r = Relation { t, a, b, d, form, hits: 0.0 };
                    if let Some(hits) = measure(&r, values, sample) {
                        if best.as_ref().map_or(true, |x| hits > x.hits + 1e-3) {
                            best = Some(Relation { hits, ..r });
                        }
                    }
                }
            }
        }
        found.extend(best);
    }
    found
}

/// En qué parte de las filas se cumple una cuenta, si llega a valer.
fn measure(r: &Relation, values: &BTreeMap<usize, Vec<f64>>, sample: &[usize]) -> Option<f64> {
    let (vt, va, vb) = (&values[&r.t], &values[&r.a], &values[&r.b]);
    let vd = r.d.map(|d| &values[&d]);
    let (mut tested, mut hits, mut adds, mut cuts) = (0usize, 0usize, 0usize, 0usize);
    for &i in sample {
        let (t, a, b, d) = (vt[i], va[i], vb[i], vd.map_or(0.0, |v| v[i]));
        if t.is_nan() || a.is_nan() || b.is_nan() || d.is_nan() || t == 0.0 {
            continue;
        }
        tested += 1;
        if (r.apply(a, b, d) - t).abs() <= FORMULA_MARGIN * t.abs() {
            hits += 1;
        }
        // ¿Cada parte aporta, o la cuenta es casi la otra columna sola?
        let matters = match r.form {
            Form::Product => (b - 1.0).abs() > FORMULA_MARGIN && (a - 1.0).abs() > FORMULA_MARGIN,
            _ => b.abs() > FORMULA_MARGIN * t.abs() && a.abs() > FORMULA_MARGIN * t.abs(),
        };
        adds += usize::from(matters);
        cuts += usize::from(d != 0.0);
        if tested == QUICK_LOOK && hits * 2 < tested {
            return None;
        }
    }
    let share = hits as f64 / tested.max(1) as f64;
    // Un producto con una columna casi siempre en 1 (`cantidad`) sigue siendo la cuenta, si la otra parte varía.
    let contributes = r.form == Form::Product || adds as f64 >= FORMULA_CONTRIBUTES * tested as f64;
    let product_real = r.form != Form::Product || adds > 0;
    let discount_real = r.d.is_none() || cuts > 0;
    (tested >= FORMULA_MIN_TESTED && share >= FORMULA_HITS && contributes && product_real && discount_real).then_some(share)
}

/// Completa con cuentas, también despejando: lo que falte de una cuenta sale de las otras partes.
fn fill_with_formulas(f: &mut Frame, r: &mut Report, values: &mut BTreeMap<usize, Vec<f64>>, sample: &[usize], kinds: &[bool]) {
    for rel in formulas(f, values, sample, kinds) {
        let name = |j: usize| f.cols[j].name.clone();
        r.cuentas.push(Cuenta { t: name(rel.t), a: name(rel.a), b: name(rel.b), d: rel.d.map(name), form: rel.form, text: rel.say(f) });
        for target in [rel.t, rel.a, rel.b] {
            let holes: Vec<usize> = (0..f.rows()).filter(|&i| values[&target][i].is_nan()).collect();
            if holes.is_empty() {
                continue;
            }
            let mut filled = 0;
            for &i in &holes {
                let (t, a, b) = (values[&rel.t][i], values[&rel.a][i], values[&rel.b][i]);
                let d = rel.d.map_or(0.0, |d| values[&d][i]);
                if d.is_nan() {
                    continue;
                }
                let got = if target == rel.t {
                    rel.apply(a, b, d)
                } else {
                    let other = if target == rel.a { b } else { a };
                    match rel.form {
                        Form::Product => t / (other * (1.0 - d / 100.0)),
                        Form::Sum => t - other,
                        Form::Difference if target == rel.a => t + other,
                        Form::Difference => other - t,
                    }
                };
                if got.is_finite() {
                    values.get_mut(&target).expect("columna")[i] = got;
                    mark(r, &f.cols[target].name, i, f.rows());
                    filled += 1;
                }
            }
            if filled > 0 {
                let name = f.cols[target].name.clone();
                let how = if target == rel.t { format!("calculadas como {}", rel.say(f)) } else { format!("despejadas de {} = {}", f.cols[rel.t].name, rel.say(f)) };
                note(r, &name, filled, how, rel.hits);
                write_numbers(&mut f.cols[target], &values[&target]);
            }
        }
    }
}

fn write_numbers(c: &mut Col, v: &[f64]) {
    if let Data::Float(x) = &mut c.data {
        x.copy_from_slice(v);
    }
}

fn mark(r: &mut Report, name: &str, row: usize, rows: usize) {
    let bits = r.filled_rows.entry(name.to_string()).or_insert_with(|| vec![0u64; rows / 64 + 1]);
    bits[row / 64] |= 1 << (row % 64);
}

fn note(r: &mut Report, name: &str, filled: usize, how: String, accuracy: f64) {
    let shown = py_float_str((accuracy * 1000.0).round() / 10.0);
    r.actions.push(format!("Columna '{name}': {filled} vacías {how}, que acierta el {shown} % de las veces."));
    r.inferred.insert(name.to_string(), (filled, how, accuracy));
}

/// El valor de una celda para comparar (`None` si está vacía), sin armar textos.
fn key_of(c: &Col, null_codes: &[bool], i: usize) -> Option<u64> {
    match &c.data {
        Data::Obj(d) => {
            let code = d.codes()[i] as usize;
            (!null_codes[code]).then_some(code as u64)
        }
        Data::Float(v) => (!v[i].is_nan()).then(|| v[i].to_bits()),
        Data::Int(v) => Some(v[i] as u64),
        Data::Bool(v) => Some(u64::from(v[i])),
        Data::Time(v) => v[i].map(|x| x as u64),
    }
}

fn null_codes(c: &Col) -> Vec<bool> {
    match &c.data {
        Data::Obj(d) => d.values().iter().map(|o| *o == Obj::Null).collect(),
        _ => Vec::new(),
    }
}

/// Las columnas que pueden servir de grupo: categorías y códigos con valores repetidos.
fn key_columns(f: &Frame, r: &Report) -> Vec<usize> {
    let n = f.rows();
    f.cols.iter().enumerate().filter(|(_, c)| {
        !c.name.starts_with('_') && !matches!(c.data, Data::Time(_)) && r.type_of(&c.name) != Some(NUMERIC) && (2..n / 2).contains(&c.nunique())
    }).map(|(j, _)| j).take(MAX_KEYS).collect()
}

/// De qué columna depende `x`: la que más vacíos puede resolver, entre las que lo determinan.
fn best_dependency(f: &Frame, x: usize, keys: &[usize], known: &[usize], holes: &[usize]) -> Option<(usize, f64)> {
    let cx = &f.cols[x];
    let nx = null_codes(cx);
    let mut best: Option<(usize, usize, f64)> = None;
    for &k in keys.iter().filter(|&&k| k != x) {
        let ck = &f.cols[k];
        let nk = null_codes(ck);
        let mut groups: FxHashMap<u64, FxHashMap<u64, u32>> = FxHashMap::default();
        for &i in known {
            if let (Some(a), Some(b)) = (key_of(ck, &nk, i), key_of(cx, &nx, i)) {
                *groups.entry(a).or_default().entry(b).or_default() += 1;
            }
        }
        let reach = holes.iter().filter(|&&i| key_of(ck, &nk, i).is_some_and(|a| groups.contains_key(&a))).count();
        if reach == 0 || groups.len() < 2 {
            continue;
        }
        let total: u32 = groups.values().flat_map(|g| g.values()).sum();
        let right: u32 = groups.values().map(|g| g.values().copied().max().unwrap_or(0)).sum();
        let purity = f64::from(right) / f64::from(total.max(1));
        let enough = f64::from(total) / groups.len() as f64 >= DEPENDENCY_GROUP;
        let mut overall: FxHashMap<u64, u32> = FxHashMap::default();
        for g in groups.values() {
            for (v, n) in g {
                *overall.entry(*v).or_default() += n;
            }
        }
        let common = f64::from(overall.values().copied().max().unwrap_or(0)) / f64::from(total.max(1));
        let explains = 1.0 - purity <= DEPENDENCY_GAIN * (1.0 - common) && common < 1.0;
        if purity >= DEPENDENCY_PURITY && enough && explains && best.as_ref().map_or(true, |b| reach > b.1) {
            best = Some((k, reach, purity));
        }
    }
    best.map(|(k, _, purity)| (k, purity))
}

/// Completa cada vacío con el valor que tiene su grupo.
fn fill_with_dependency(f: &mut Frame, r: &mut Report, x: usize, k: usize, purity: f64) {
    let n = f.rows();
    let (ck, cx) = (&f.cols[k], &f.cols[x]);
    let (nk, nx) = (null_codes(ck), null_codes(cx));
    let mut counts: FxHashMap<u64, FxHashMap<u64, u32>> = FxHashMap::default();
    let mut example: FxHashMap<u64, usize> = FxHashMap::default();
    for i in 0..n {
        if let (Some(a), Some(b)) = (key_of(ck, &nk, i), key_of(cx, &nx, i)) {
            *counts.entry(a).or_default().entry(b).or_default() += 1;
            example.entry(b).or_insert(i);
        }
    }
    // El valor más común de cada grupo; a igual cantidad, el de menor clave (siempre el mismo).
    let modal: FxHashMap<u64, usize> = counts.iter().filter_map(|(a, g)| {
        let (b, _) = g.iter().max_by_key(|(b, n)| (**n, std::cmp::Reverse(**b)))?;
        Some((*a, example[b]))
    }).collect();
    let source: Vec<(usize, usize)> = (0..n).filter(|&i| key_of(cx, &nx, i).is_none()).filter_map(|i| Some((i, *modal.get(&key_of(ck, &nk, i)?)?))).collect();
    if source.is_empty() {
        return;
    }
    let (name, key) = (cx.name.clone(), ck.name.clone());
    match &mut f.cols[x].data {
        Data::Float(v) => source.iter().for_each(|&(i, from)| v[i] = v[from]),
        Data::Obj(d) => {
            let mut rows: Vec<Obj> = d.iter().cloned().collect();
            source.iter().for_each(|&(i, from)| rows[i] = rows[from].clone());
            *d = obj_dict(rows);
        }
        _ => return,
    }
    source.iter().for_each(|&(i, _)| mark(r, &name, i, n));
    note(r, &name, source.len(), format!("completadas con el valor de su «{key}»"), purity);
}

/// Sobre filas escondidas, en qué parte queda cerca la mediana de su grupo y mes, y la mediana general.
fn hold_out(values: &[f64], rows: &[usize], key: impl Fn(usize) -> Option<(u64, i64)>, global: f64) -> (f64, f64) {
    let mut train: FxHashMap<(u64, i64), Vec<f64>> = FxHashMap::default();
    let mut test = Vec::new();
    for (at, &i) in rows.iter().enumerate() {
        if at % 10 == 0 {
            test.push(i);
        } else if let Some(k) = key(i) {
            train.entry(k).or_default().push(values[i]);
        }
    }
    let medians: FxHashMap<(u64, i64), f64> = train.into_iter().filter(|(_, v)| v.len() >= GROUP_MIN_VALUES).map(|(k, v)| (k, median(v))).collect();
    let close = |pred: f64, real: f64| (pred - real).abs() <= GROUP_CLOSE * real.abs();
    let tested: Vec<bool> = test.iter().filter_map(|&i| Some(close(*medians.get(&key(i)?)?, values[i]))).collect();
    if tested.len() * 2 < test.len() {
        return (0.0, 1.0);
    }
    let share = |hits: usize, of: usize| hits as f64 / of.max(1) as f64;
    (share(tested.iter().filter(|h| **h).count(), tested.len()), share(test.iter().filter(|&&i| close(global, values[i])).count(), test.len()))
}

/// Completa una columna de números con la mediana de su grupo en el mismo mes, si se comprueba que acierta.
fn fill_with_group(f: &mut Frame, r: &mut Report, x: usize, keys: &[usize], date: Option<usize>, sample: &[usize]) {
    let n = f.rows();
    let Data::Float(values) = &f.cols[x].data else { return };
    let values = values.clone();
    let known: Vec<usize> = sample.iter().copied().filter(|&i| !values[i].is_nan() && values[i] != 0.0).collect();
    if known.len() < FORMULA_MIN_TESTED {
        return;
    }
    let global = median(known.iter().map(|&i| values[i]).collect());
    let month = |i: usize| -> Option<i64> {
        date.map_or(Some(0), |d| match &f.cols[d].data {
            Data::Time(t) => t[i].map(month_number),
            _ => Some(0),
        })
    };
    let mut best: Option<(usize, f64)> = None;
    for &k in keys.iter().filter(|&&k| k != x) {
        let ck = &f.cols[k];
        let nk = null_codes(ck);
        let (hits, baseline) = hold_out(&values, &known, |i| Some((key_of(ck, &nk, i)?, month(i)?)), global);
        if hits >= GROUP_MIN_HITS && hits >= baseline + GROUP_GAIN && best.map_or(true, |(_, h)| hits > h) {
            best = Some((k, hits));
        }
    }
    let Some((k, hits)) = best else { return };
    let ck = &f.cols[k];
    let nk = null_codes(ck);
    let mut groups: FxHashMap<(u64, i64), Vec<f64>> = FxHashMap::default();
    for i in (0..n).filter(|&i| !values[i].is_nan()) {
        if let (Some(a), Some(m)) = (key_of(ck, &nk, i), month(i)) {
            groups.entry((a, m)).or_default().push(values[i]);
        }
    }
    let medians: FxHashMap<(u64, i64), f64> = groups.into_iter().filter(|(_, v)| v.len() >= GROUP_MIN_VALUES).map(|(g, v)| (g, median(v))).collect();
    let fills: Vec<(usize, f64)> = (0..n).filter(|&i| values[i].is_nan()).filter_map(|i| Some((i, *medians.get(&(key_of(ck, &nk, i)?, month(i)?))?))).collect();
    if fills.is_empty() {
        return;
    }
    let (name, key, dated) = (f.cols[x].name.clone(), ck.name.clone(), date.is_some());
    if let Data::Float(v) = &mut f.cols[x].data {
        fills.iter().for_each(|&(i, m)| v[i] = m);
    }
    fills.iter().for_each(|&(i, _)| mark(r, &name, i, n));
    note(r, &name, fills.len(), format!("completadas con la mediana de su «{key}»{}", if dated { " en el mismo mes" } else { "" }), hits);
}

/// Completa lo que la planilla permite deducir. Lo que queda vacío sigue a la imputación.
pub(crate) fn infer(f: &mut Frame, r: &mut Report) {
    let n = f.rows();
    if n < MIN_ROWS {
        return;
    }
    let all: Vec<usize> = (0..n).collect();
    let sample = spread(all, SAMPLE);
    let kinds: Vec<bool> = f.cols.iter().map(|c| r.type_of(&c.name) == Some(NUMERIC) && !c.name.starts_with('_')).collect();

    // 1. Cuentas.
    let mut values: BTreeMap<usize, Vec<f64>> = f.cols.iter().enumerate().filter(|(_, c)| !c.name.starts_with('_')).filter_map(|(j, c)| Some((j, c.numbers()?.into_owned()))).collect();
    fill_with_formulas(f, r, &mut values, &sample, &kinds);
    drop(values);

    // 2. Un valor determina a otro, y 3. grupo y período.
    let keys = key_columns(f, r);
    let date = f.cols.iter().position(|c| r.type_of(&c.name) == Some(crate::clean::DATE));
    for x in 0..f.cols.len() {
        let c = &f.cols[x];
        if c.name.starts_with('_') || c.null_count() == 0 || c.null_count() as f64 > MEANINGFUL_EMPTY * n as f64 || matches!(c.data, Data::Time(_)) {
            continue;
        }
        let nulls = null_codes(c);
        let (mut known, mut holes) = (Vec::new(), Vec::new());
        for &i in &sample {
            if key_of(c, &nulls, i).is_some() { known.push(i) } else { holes.push(i) }
        }
        // La muestra puede no tocar los vacíos sueltos.
        if holes.is_empty() {
            holes = spread((0..n).filter(|&i| key_of(c, &nulls, i).is_none()).collect(), SAMPLE / 10);
        }
        if known.is_empty() {
            continue;
        }
        if let Some((k, purity)) = best_dependency(f, x, &keys, &known, &holes) {
            fill_with_dependency(f, r, x, k, purity);
        }
        if kinds[x] && f.cols[x].null_count() > 0 {
            fill_with_group(f, r, x, &keys, date, &sample);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::clean::clean;
    use crate::progress::Progress;
    use crate::reader::read_csv;

    fn cleaned(csv: &str, name: &str) -> (Frame, Report) {
        let dir = std::env::temp_dir().join("mio_relleno_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join(name);
        std::fs::write(&path, csv).unwrap();
        clean(read_csv(&path, &Progress::NONE).unwrap().1)
    }
    fn numbers(f: &Frame, name: &str) -> Vec<f64> {
        f.col(name).unwrap().numbers().unwrap().into_owned()
    }

    /// Ventas con cuentas, un catálogo y precios que suben mes a mes.
    fn sales(rows: usize, hole: impl Fn(usize, &str) -> bool) -> String {
        let mut csv = String::from("id,mes,sku,marca,cantidad,precio,dto_pct,subtotal,flete\n");
        for i in 0..rows {
            let sku = i % 10;
            let month = 1 + i % 12;
            let price = (100.0 + sku as f64 * 50.0) * (1.0 + month as f64 * 0.1);
            let qty = 1 + (i * 7) % 5;
            let dto = if i % 5 == 0 { 10 } else { 0 };
            let subtotal = qty as f64 * price * (1.0 - dto as f64 / 100.0);
            let flete = (20.0 + sku as f64 * 30.0) * (1.0 + month as f64 * 0.1);
            let cell = |col: &str, v: String| if hole(i, col) { String::new() } else { v };
            csv.push_str(&format!(
                "T{i},2024-{month:02}-15,S{sku},{},{qty},{},{dto},{},{}\n",
                cell("marca", format!("Marca{}", sku % 3)),
                cell("precio", format!("{price:.2}")),
                cell("subtotal", format!("{subtotal:.2}")),
                cell("flete", format!("{flete:.2}")),
            ));
        }
        csv
    }

    /// Cuentas: el subtotal se calcula y el precio se despeja, exactos, y se cuenta cómo.
    #[test]
    fn calcula_lo_que_sale_de_una_cuenta() {
        let (f, r) = cleaned(&sales(2000, |i, c| (c == "subtotal" && i % 50 == 3) || (c == "precio" && i % 50 == 7)), "cuentas.csv");
        let (sub, price, qty) = (numbers(&f, "subtotal"), numbers(&f, "precio"), numbers(&f, "cantidad"));
        for i in (3..2000).step_by(50) {
            let dto = if i % 5 == 0 { 0.9 } else { 1.0 };
            assert!((sub[i] - qty[i] * price[i] * dto).abs() < 0.02, "fila {i}: {} y {}", sub[i], qty[i] * price[i] * dto);
        }
        for i in (7..2000).step_by(50) {
            let month = 1 + i % 12;
            let want = (100.0 + (i % 10) as f64 * 50.0) * (1.0 + month as f64 * 0.1);
            assert!((price[i] - want).abs() < 0.02, "fila {i}: {} y {want}", price[i]);
        }
        assert!(r.actions.iter().any(|a| a.contains("'subtotal'") && a.contains("calculadas como") && a.contains("cantidad") && a.contains("precio")), "{:?}", r.actions);
        assert!(r.actions.iter().any(|a| a.contains("'precio'") && a.contains("despejadas")), "{:?}", r.actions);
        assert!(r.was_filled("subtotal", 3) && !r.was_filled("subtotal", 4), "se sabe qué se completó");
        assert!(!r.imputed.contains_key("subtotal"), "no queda nada para la mediana");
    }

    /// Un valor determina a otro: la marca sale del sku, con el valor correcto y no el más común.
    #[test]
    fn copia_lo_que_determina_otra_columna() {
        let (f, r) = cleaned(&sales(2000, |i, c| c == "marca" && i % 40 == 4), "marca.csv");
        let Data::Obj(d) = &f.col("marca").unwrap().data else { panic!() };
        for i in (4..2000).step_by(40) {
            let want = format!("Marca{}", (i % 10) % 3);
            assert_eq!(*d.get(i), Obj::Str(want), "fila {i}");
        }
        assert!(r.actions.iter().any(|a| a.contains("'marca'") && a.contains("«sku»")), "{:?}", r.actions);
    }

    /// Grupo y período: el flete de ese sku en ese mes, no la mediana de todo.
    #[test]
    fn usa_el_grupo_y_el_mes() {
        let (f, r) = cleaned(&sales(3000, |i, c| c == "flete" && i % 37 == 11), "flete.csv");
        let flete = numbers(&f, "flete");
        for i in (11..3000).step_by(37) {
            let want = (20.0 + (i % 10) as f64 * 30.0) * (1.0 + (1 + i % 12) as f64 * 0.1);
            assert!((flete[i] - want).abs() / want < 0.02, "fila {i}: {} y {want}", flete[i]);
        }
        assert!(r.actions.iter().any(|a| a.contains("'flete'") && a.contains("mediana de su") && a.contains("mismo mes")), "{:?}", r.actions);
    }

    /// Sin relación, sigue la imputación de siempre: no se inventan reglas.
    #[test]
    fn sin_relacion_no_inventa_reglas() {
        let mut csv = String::from("fila,zona,azar,otro\n");
        let mut x = 7u64;
        let mut next = move || {
            x = x.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            (x >> 33) % 1000
        };
        for i in 0..2000 {
            let (a, b) = (next(), next());
            csv.push_str(&format!("F{i},Z{},{},{}\n", i % 4, if i % 20 == 0 { String::new() } else { a.to_string() }, b));
        }
        let (_, r) = cleaned(&csv, "azar.csv");
        assert!(r.inferred.is_empty(), "{:?}", r.inferred);
        assert_eq!(r.imputed.get("azar"), Some(&100));
    }

    /// Una columna casi siempre igual no se "deduce", y un vacío que dice algo tampoco.
    #[test]
    fn no_confunde_casi_iguales_ni_vacios_con_sentido() {
        let mut csv = String::from("fila,zona,puesto,promo\n");
        for i in 0..3000 {
            let puesto = if i % 100 == 0 { String::new() } else if i % 53 == 0 { "Gerente".to_string() } else { "Cajero".to_string() };
            let promo = if i % 4 == 0 { format!("Promo Z{}", i % 3) } else { String::new() };
            csv.push_str(&format!("F{i},Z{},{puesto},{promo}\n", i % 3));
        }
        let (_, r) = cleaned(&csv, "casi.csv");
        assert!(r.inferred.is_empty(), "{:?}", r.inferred);
        assert!(r.imputed.contains_key("puesto") && r.imputed.contains_key("promo"), "siguen con lo de siempre");
    }

    /// Con pocas filas no se busca nada, como siempre.
    #[test]
    fn con_pocas_filas_no_busca() {
        let (_, r) = cleaned(&sales(100, |i, c| c == "subtotal" && i % 10 == 3), "poco.csv");
        assert!(r.inferred.is_empty());
    }
}
