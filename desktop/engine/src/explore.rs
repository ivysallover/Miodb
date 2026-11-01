//! Mirar la planilla por partes: qué se puede elegir de cada columna, quedarse con algunas filas
//! (`Condition`, `Sheet::filtered` las usa para volver a analizar), comparar dos grupos y armar una
//! tabla dinámica, con las fechas agrupadas por día, semana, mes, trimestre o año. Los valores se
//! comparan como texto, como los muestran los gráficos (un 7.0 es "7").

use crate::anomalies::cell_text;
use crate::clean::{median, Col, Data, Obj, DATE, NUMERIC};
use crate::export::Grid;
use crate::dates::{civil_from_days, days_from_civil, month_start, next_month_start, week_end, ymd, DAY_NS};
use crate::sheet::Sheet;
use serde_json::{json, Value};
use std::collections::{BTreeMap, HashMap, HashSet};

/// Hasta cuántos valores distintos se pueden elegir de una columna (más que eso no es un grupo).
const MAX_VALUES: usize = 300;
/// Hasta cuántas filas y columnas muestra una tabla dinámica; las demás se juntan en "Otros".
const MAX_ROWS: usize = 300;
const MAX_COLUMNS: usize = 30;
/// Cuántos valores trae una comparación de lo que más separa a los dos grupos, y cuántos números.
const MAX_GAPS: usize = 6;
const MAX_NUMBERS: usize = 8;
/// El nombre de lo que no tiene dato, en una tabla, y el de lo que no entra.
const NO_DATA: &str = "Sin dato";
const OTHERS: &str = "Otros";
const MONTHS: [&str; 12] = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/// Un valor como lo muestra la tabla; lo vacío, `None`.
fn text_of(c: &Col, i: usize) -> Option<String> {
    Some(cell_text(c, i)).filter(|t| t != "null" && !t.is_empty())
}

/// Los valores de una columna como texto: cada distinto una vez, y cuál tiene cada fila. Lo usa todo lo
/// que agrupa, así no se arma un texto por fila: las categorías ya vienen como diccionario.
struct Labels {
    of_row: Vec<u32>,
    names: Vec<Option<String>>,
}

fn labels(c: &Col) -> Labels {
    if let Data::Obj(d) = &c.data {
        let names = d.values().iter().map(|o| match o {
            Obj::Str(s) if !s.is_empty() => Some(s.clone()),
            Obj::Bool(b) => Some(b.to_string()),
            Obj::Num(x) if x.fract() == 0.0 && x.abs() < 1e15 => Some(format!("{x:.0}")),
            Obj::Num(x) if !x.is_nan() => Some(json!(x).to_string()),
            _ => None,
        }).collect();
        return Labels { of_row: d.codes().to_vec(), names };
    }
    let mut place: HashMap<Option<String>, u32> = HashMap::new();
    let mut names = Vec::new();
    let of_row = (0..c.len()).map(|i| {
        *place.entry(text_of(c, i)).or_insert_with_key(|t| {
            names.push(t.clone());
            names.len() as u32 - 1
        })
    }).collect();
    Labels { of_row, names }
}

impl Labels {
    /// Las filas de `rows` que tienen alguno de los valores.
    fn rows_with(&self, wanted: &HashSet<&str>, rows: impl Iterator<Item = usize>) -> Vec<usize> {
        let hit: Vec<bool> = self.names.iter().map(|n| n.as_deref().is_some_and(|t| wanted.contains(t))).collect();
        rows.filter(|&i| hit[self.of_row[i] as usize]).collect()
    }
}

fn column<'a>(s: &'a Sheet, name: &str) -> Result<&'a Col, String> {
    s.frame.col(name).ok_or_else(|| format!("La planilla no tiene la columna {name}."))
}

/// El día (desde 1970-01-01) de "AAAA-MM-DD".
fn day_of(text: &str) -> Option<i64> {
    let mut parts = text.split('-').map(|p| p.parse::<i64>().ok());
    let (y, m, d) = (parts.next()??, parts.next()??, parts.next()??);
    ((1..=12).contains(&m) && (1..=31).contains(&d)).then(|| days_from_civil(y, m, d))
}

/// "DD/MM/AAAA".
fn date_text(day: i64) -> String {
    let (y, m, d) = civil_from_days(day);
    format!("{d:02}/{m:02}/{y}")
}

/// Una condición de un filtro: la columna vale alguno de estos valores, o la fecha cae en este tramo
/// (con cualquiera de las dos puntas).
#[derive(Debug, Clone, PartialEq)]
pub enum Condition {
    Values { column: String, values: Vec<String> },
    Dates { column: String, from: Option<i64>, to: Option<i64> },
}

impl Condition {
    /// Como la manda la pantalla: `{columna, valores}` o `{columna, desde, hasta}`.
    pub fn from_json(v: &Value) -> Result<Condition, String> {
        let column = v["columna"].as_str().ok_or("Falta la columna del filtro.")?.to_string();
        if let Some(values) = v["valores"].as_array() {
            return Ok(Condition::Values { column, values: values.iter().filter_map(|x| x.as_str().map(String::from)).collect() });
        }
        let day = |key: &str| v[key].as_str().filter(|t| !t.is_empty()).map(|t| day_of(t).ok_or(format!("La fecha {t} no se entiende."))).transpose();
        Ok(Condition::Dates { column, from: day("desde")?, to: day("hasta")? })
    }

    /// En palabras, para el título: "Norte y Sur", "3 de región", "desde el 01/02/2025".
    fn label(&self) -> String {
        match self {
            Condition::Values { values, .. } if values.len() == 1 => values[0].clone(),
            Condition::Values { values, .. } if values.len() == 2 => format!("{} y {}", values[0], values[1]),
            Condition::Values { column, values } => format!("{} de {column}", values.len()),
            Condition::Dates { from: Some(a), to: Some(b), .. } => format!("del {} al {}", date_text(*a), date_text(*b)),
            Condition::Dates { from: Some(a), .. } => format!("desde el {}", date_text(*a)),
            Condition::Dates { to: Some(b), .. } => format!("hasta el {}", date_text(*b)),
            Condition::Dates { column, .. } => column.clone(),
        }
    }

    /// Las filas de `rows` que la cumplen.
    fn keep(&self, s: &Sheet, rows: Vec<usize>) -> Result<Vec<usize>, String> {
        match self {
            Condition::Values { column: name, values } => {
                let wanted: HashSet<&str> = values.iter().map(String::as_str).collect();
                Ok(labels(column(s, name)?).rows_with(&wanted, rows.into_iter()))
            }
            Condition::Dates { column: name, from, to } => {
                let Data::Time(t) = &column(s, name)?.data else { return Err(format!("«{name}» no es una columna de fechas.")) };
                let inside = |d: i64| from.map_or(true, |a| d >= a) && to.map_or(true, |b| d <= b);
                Ok(rows.into_iter().filter(|&i| t[i].is_some_and(|ns| inside(ns.div_euclid(DAY_NS)))).collect())
            }
        }
    }
}

/// Las filas que cumplen todas las condiciones.
pub fn matching(s: &Sheet, conditions: &[Condition]) -> Result<Vec<usize>, String> {
    conditions.iter().try_fold((0..s.frame.rows()).collect(), |rows, c| c.keep(s, rows))
}

/// Las condiciones en palabras: "Norte, del 01/01/2025 al 31/03/2025".
pub fn label(conditions: &[Condition]) -> String {
    conditions.iter().map(Condition::label).collect::<Vec<_>>().join(", ")
}

/// Cuántas filas tiene cada valor de una columna, de la más común a la menos (sin los vacíos).
fn counts(c: &Col) -> Vec<(String, usize)> {
    let l = labels(c);
    let mut per = vec![0usize; l.names.len()];
    for &g in &l.of_row {
        per[g as usize] += 1;
    }
    let mut by_value: HashMap<String, usize> = HashMap::new();
    for (name, k) in l.names.into_iter().zip(per) {
        if let Some(t) = name {
            *by_value.entry(t).or_default() += k;
        }
    }
    let mut out: Vec<(String, usize)> = by_value.into_iter().collect();
    out.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    out
}

/// Lo que se puede elegir de cada columna, para filtrar, comparar o armar una tabla: las fechas con su
/// primera y última, los números si lo son, y los valores (con cuántas filas) si son pocos.
pub fn fields(s: &Sheet) -> Value {
    let columns: Vec<Value> = s.columns().map(|c| {
        let kind = s.profile.kind(&c.name).unwrap_or_default();
        let mut out = json!({ "nombre": c.name, "tipo": kind });
        if let Data::Time(t) = &c.data {
            let days = t.iter().flatten().map(|ns| ns.div_euclid(DAY_NS));
            if let (Some(from), Some(to)) = (days.clone().min(), days.max()) {
                out["desde"] = json!(ymd(from));
                out["hasta"] = json!(ymd(to));
            }
        } else if c.nunique() <= MAX_VALUES {
            out["valores"] = json!(counts(c));
        }
        out
    }).collect();
    json!({ "filas": s.frame.rows(), "columnas": columns })
}

/// Cómo se agrupan las fechas.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Period { Day, Week, Month, Quarter, Year }

impl Period {
    pub fn from_id(id: &str) -> Period {
        match id {
            "dia" => Period::Day,
            "semana" => Period::Week,
            "trimestre" => Period::Quarter,
            "anio" => Period::Year,
            _ => Period::Month,
        }
    }

    /// El día que representa al período de `day` (el domingo que cierra la semana; el primero de lo demás).
    fn start(self, day: i64) -> i64 {
        let (y, m, _) = civil_from_days(day);
        match self {
            Period::Day => day,
            Period::Week => week_end(day),
            Period::Month => month_start(day),
            Period::Quarter => days_from_civil(y, (m - 1) / 3 * 3 + 1, 1),
            Period::Year => days_from_civil(y, 1, 1),
        }
    }

    fn next(self, key: i64) -> i64 {
        match self {
            Period::Day => key + 1,
            Period::Week => key + 7,
            Period::Month => next_month_start(key),
            Period::Quarter => next_month_start(next_month_start(next_month_start(key))),
            Period::Year => days_from_civil(civil_from_days(key).0 + 1, 1, 1),
        }
    }

    fn label(self, key: i64) -> String {
        let (y, m, _) = civil_from_days(key);
        match self {
            Period::Day => date_text(key),
            Period::Week => format!("sem. al {}", date_text(key)),
            Period::Month => format!("{} {y}", MONTHS[m as usize - 1]),
            Period::Quarter => format!("T{} {y}", (m - 1) / 3 + 1),
            Period::Year => y.to_string(),
        }
    }
}

/// Lo que se junta de un grupo de filas para calcular cualquier valor de la tabla.
#[derive(Clone, Copy, Default)]
struct Tally { rows: usize, n: usize, sum: f64, min: f64, max: f64 }

impl Tally {
    fn add(&mut self, x: Option<f64>) {
        self.rows += 1;
        if let Some(x) = x.filter(|x| !x.is_nan()) {
            self.min = if self.n == 0 { x } else { self.min.min(x) };
            self.max = if self.n == 0 { x } else { self.max.max(x) };
            self.n += 1;
            self.sum += x;
        }
    }
    /// El valor según el cálculo; sin datos, ninguno.
    fn value(&self, how: Calc) -> Option<f64> {
        match how {
            Calc::Count => (self.rows > 0).then_some(self.rows as f64),
            _ if self.n == 0 => None,
            Calc::Sum => Some(self.sum),
            Calc::Mean => Some(self.sum / self.n as f64),
            Calc::Max => Some(self.max),
            Calc::Min => Some(self.min),
        }
    }
}

/// Qué calcula una tabla dinámica.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Calc { Sum, Mean, Count, Max, Min }

/// Lo que pide la pantalla: qué va en las filas, en las columnas (si algo), qué se calcula y sobre qué.
#[derive(Debug, Clone)]
pub struct Pivot { pub rows: String, pub columns: Option<String>, pub value: Option<String>, pub calc: Calc, pub period: Period }

impl Pivot {
    /// `{filas, columnas, valor, calculo, periodo}`.
    pub fn from_json(v: &Value) -> Result<Pivot, String> {
        let text = |key: &str| v[key].as_str().filter(|t| !t.is_empty()).map(String::from);
        let value = text("valor");
        let calc = match (v["calculo"].as_str(), &value) {
            (_, None) | (Some("cuenta"), _) => Calc::Count,
            (Some("promedio"), _) => Calc::Mean,
            (Some("maximo"), _) => Calc::Max,
            (Some("minimo"), _) => Calc::Min,
            _ => Calc::Sum,
        };
        Ok(Pivot { rows: text("filas").ok_or("Elegí qué va en las filas.")?, columns: text("columnas"), value, calc, period: Period::from_id(v["periodo"].as_str().unwrap_or_default()) })
    }
}

/// Un eje de la tabla: de qué grupo es cada fila de la planilla, y cómo se llama cada grupo.
struct Axis {
    /// El grupo de cada fila.
    of_row: Vec<usize>,
    labels: Vec<String>,
    /// Con fechas, el día de cada período (el mismo orden que `labels`), para dibujarlo en el tiempo.
    days: Option<Vec<i64>>,
}

/// Agrupa una columna: las fechas por período y de punta a punta, también los períodos sin filas; lo
/// demás, por valor. Lo vacío va al último, como "Sin dato".
fn axis(c: &Col, period: Period, limit: usize) -> Result<Axis, String> {
    if let Data::Time(t) = &c.data {
        let keys: Vec<Option<i64>> = t.iter().map(|x| x.map(|ns| period.start(ns.div_euclid(DAY_NS)))).collect();
        let (first, last) = keys.iter().flatten().fold((i64::MAX, i64::MIN), |(a, b), &k| (a.min(k), b.max(k)));
        let mut all = Vec::new();
        let mut key = first;
        while key <= last {
            all.push(key);
            if all.len() > limit {
                return Err(format!("«{}» tiene más de {limit} períodos así: agrupala por uno más largo.", c.name));
            }
            key = period.next(key);
        }
        let place: HashMap<i64, usize> = all.iter().enumerate().map(|(g, &k)| (k, g)).collect();
        let missing = all.len();
        let of_row = keys.iter().map(|k| k.map_or(missing, |k| place[&k])).collect::<Vec<_>>();
        let mut labels: Vec<String> = all.iter().map(|&k| period.label(k)).collect();
        if of_row.contains(&missing) {
            labels.push(NO_DATA.into());
        }
        return Ok(Axis { of_row, labels, days: Some(all) });
    }
    let l = labels(c);
    let mut place: HashMap<String, usize> = HashMap::new();
    let mut names = Vec::new();
    let group: Vec<usize> = l.names.into_iter().map(|name| {
        *place.entry(name.unwrap_or_else(|| NO_DATA.into())).or_insert_with_key(|t| {
            names.push(t.clone());
            names.len() - 1
        })
    }).collect();
    Ok(Axis { of_row: l.of_row.iter().map(|&g| group[g as usize]).collect(), labels: names, days: None })
}

/// Los grupos de un eje, ordenados y recortados: en el tiempo van en orden y enteros; lo demás, de
/// mayor a menor y hasta `limit` (el resto en "Otros", al final). Devuelve el lugar de cada grupo, los
/// nombres y cuántos se juntaron.
fn arrange(a: &Axis, totals: &[Tally], how: Calc, limit: usize) -> (Vec<usize>, Vec<String>, usize) {
    if a.days.is_some() {
        return ((0..a.labels.len()).collect(), a.labels.clone(), 0);
    }
    let score = |g: usize| totals[g].value(how).unwrap_or(f64::NEG_INFINITY);
    let mut order: Vec<usize> = (0..a.labels.len()).collect();
    order.sort_by(|&x, &y| (a.labels[x] == NO_DATA).cmp(&(a.labels[y] == NO_DATA)).then(score(y).total_cmp(&score(x))).then_with(|| a.labels[x].cmp(&a.labels[y])));
    let kept = order.len().min(limit);
    let others = order.len() - kept;
    let mut place = vec![kept; a.labels.len()];
    for (at, &g) in order.iter().take(kept).enumerate() {
        place[g] = at;
    }
    let mut labels: Vec<String> = order[..kept].iter().map(|&g| a.labels[g].clone()).collect();
    if others > 0 {
        labels.push(OTHERS.into());
    }
    (place, labels, others)
}

fn number(x: Option<f64>) -> Value {
    x.filter(|x| x.is_finite()).map_or(Value::Null, |x| json!(x))
}

/// La tabla dinámica: el valor de cada cruce y los totales, calculados de las filas (el promedio total
/// es el de todas las filas, no el promedio de los promedios).
pub fn pivot(s: &Sheet, p: &Pivot) -> Result<Value, String> {
    let n = s.frame.rows();
    let values: Option<Vec<f64>> = match &p.value {
        Some(name) => Some(column(s, name)?.numbers().ok_or_else(|| format!("«{name}» no es una columna de números."))?.into_owned()),
        None => None,
    };
    let at = |i: usize| values.as_ref().map(|v| v[i]);
    let rows = axis(column(s, &p.rows)?, p.period, MAX_ROWS)?;
    let columns = p.columns.as_ref().map(|name| axis(column(s, name)?, p.period, MAX_COLUMNS)).transpose()?;

    let totals_of = |a: &Axis| {
        let mut t = vec![Tally::default(); a.labels.len()];
        for i in 0..n {
            t[a.of_row[i]].add(at(i));
        }
        t
    };
    let (row_place, row_labels, row_others) = arrange(&rows, &totals_of(&rows), p.calc, MAX_ROWS);
    let (col_place, col_labels, col_others) = columns.as_ref().map_or((Vec::new(), Vec::new(), 0), |c| arrange(c, &totals_of(c), p.calc, MAX_COLUMNS));

    let mut row_totals = vec![Tally::default(); row_labels.len()];
    let mut col_totals = vec![Tally::default(); col_labels.len()];
    let mut cells = vec![Tally::default(); row_labels.len() * col_labels.len()];
    let mut all = Tally::default();
    for i in 0..n {
        let x = at(i);
        let r = row_place[rows.of_row[i]];
        row_totals[r].add(x);
        all.add(x);
        if let Some(c) = &columns {
            let k = col_place[c.of_row[i]];
            col_totals[k].add(x);
            cells[r * col_labels.len() + k].add(x);
        }
    }
    let values_of = |t: &[Tally]| t.iter().map(|x| number(x.value(p.calc))).collect::<Vec<_>>();
    Ok(json!({
        "filas": p.rows,
        "columnas": p.columns,
        "valor": p.value,
        "etiquetas_filas": row_labels,
        "dias_filas": rows.days.as_ref().map(|d| d.iter().map(|&x| ymd(x)).collect::<Vec<_>>()),
        "etiquetas_columnas": col_labels,
        "celdas": (0..row_labels.len()).map(|r| values_of(&cells[r * col_labels.len()..(r + 1) * col_labels.len()])).collect::<Vec<_>>(),
        "total_filas": values_of(&row_totals),
        "total_columnas": values_of(&col_totals),
        "total": number(all.value(p.calc)),
        "otras_filas": row_others,
        "otras_columnas": col_others,
    }))
}

/// Una tabla dinámica (`pivot`) para guardarla: cada fila con sus celdas y su total, y una última fila de totales.
pub fn grid(t: &Value) -> Grid {
    let list = |v: &Value| v.as_array().cloned().unwrap_or_default();
    let values = |v: &Value| list(v).iter().map(Value::as_f64).collect::<Vec<_>>();
    let cols = list(&t["etiquetas_columnas"]);
    let names = |v: &Value| v.as_str().unwrap_or_default().to_string();
    let mut head = vec![names(&t["filas"])];
    head.extend(cols.iter().map(names));
    head.push("Total".into());
    let cells = list(&t["celdas"]);
    let mut rows: Vec<(String, Vec<Option<f64>>)> = list(&t["etiquetas_filas"]).iter().zip(list(&t["total_filas"])).enumerate().map(|(r, (name, total))| {
        let mut line = if cols.is_empty() { Vec::new() } else { values(&cells[r]) };
        line.push(total.as_f64());
        (names(name), line)
    }).collect();
    let mut totals = values(&t["total_columnas"]);
    totals.push(t["total"].as_f64());
    rows.push(("Total".into(), totals));
    Grid { head, rows }
}

/// Los números de un grupo de filas.
fn side(s: &Sheet, value: &str, rows: &[usize], target: Option<&[f64]>) -> Value {
    let v: Vec<f64> = target.map_or(Vec::new(), |t| rows.iter().map(|&i| t[i]).filter(|x| !x.is_nan()).collect());
    let empty = v.is_empty();
    let sum: f64 = v.iter().sum();
    let (lo, hi) = v.iter().fold((f64::INFINITY, f64::NEG_INFINITY), |(a, b), &x| (a.min(x), b.max(x)));
    let share = rows.len() as f64 / s.frame.rows().max(1) as f64;
    let some = |x: f64| number((!empty).then_some(x));
    json!({
        "valor": value, "filas": rows.len(), "parte": share,
        "suma": some(sum), "promedio": some(sum / v.len().max(1) as f64), "mediana": some(median(v.clone())), "minimo": some(lo), "maximo": some(hi),
    })
}

/// Los dos grupos mes a mes (la suma de `target` o las filas), de punta a punta, si hay una fecha.
fn over_time(s: &Sheet, a: &[usize], b: &[usize], target: Option<&[f64]>) -> Value {
    let dates = s.profile.of_kind(DATE);
    let Some((name, Data::Time(t))) = dates.first().and_then(|d| Some((d, &s.frame.col(d)?.data))) else { return Value::Null };
    let tally = |rows: &[usize]| {
        let mut out: BTreeMap<i64, f64> = BTreeMap::new();
        for &i in rows {
            if let Some(ns) = t[i] {
                let x = target.map_or(1.0, |v| v[i]);
                if !x.is_nan() {
                    *out.entry(month_start(ns.div_euclid(DAY_NS))).or_default() += x;
                }
            }
        }
        out
    };
    let (ta, tb) = (tally(a), tally(b));
    let (Some(first), Some(last)) = (ta.keys().chain(tb.keys()).min().copied(), ta.keys().chain(tb.keys()).max().copied()) else { return Value::Null };
    let mut months = Vec::new();
    let mut m = first;
    while m <= last {
        months.push(m);
        m = next_month_start(m);
    }
    if months.len() < 2 {
        return Value::Null;
    }
    let line = |t: &BTreeMap<i64, f64>| months.iter().map(|m| number(t.get(m).copied())).collect::<Vec<_>>();
    json!({ "columna": name, "dias": months.iter().map(|&m| ymd(m)).collect::<Vec<_>>(), "a": line(&ta), "b": line(&tb) })
}

/// De las otras categorías, los valores que más separan a los dos grupos: qué parte del total de cada
/// uno (o de sus filas) está en ese valor, de la diferencia más grande a la más chica.
fn gaps(s: &Sheet, compared: &str, a: &[usize], b: &[usize], target: Option<&[f64]>) -> Vec<Value> {
    let weight = |i: usize| target.map_or(1.0, |t| if t[i].is_nan() { 0.0 } else { t[i] });
    let total = |rows: &[usize]| rows.iter().map(|&i| weight(i)).sum::<f64>();
    let (ta, tb) = (total(a), total(b));
    if ta <= 0.0 || tb <= 0.0 {
        return Vec::new();
    }
    let mut out: Vec<(f64, Value)> = Vec::new();
    for c in s.columns().filter(|c| c.name != compared && !matches!(c.data, Data::Time(_)) && s.profile.kind(&c.name) != Some(NUMERIC) && (2..=MAX_VALUES).contains(&c.nunique())) {
        let l = labels(c);
        let mut parts = vec![(0.0, 0.0); l.names.len()];
        for &i in a {
            parts[l.of_row[i] as usize].0 += weight(i) / ta;
        }
        for &i in b {
            parts[l.of_row[i] as usize].1 += weight(i) / tb;
        }
        out.extend(l.names.into_iter().zip(parts).filter_map(|(name, (pa, pb))| {
            Some(((pa - pb).abs(), json!({ "columna": c.name, "valor": name?, "a": pa, "b": pb })))
        }));
    }
    // Dos columnas que dicen lo mismo (un cliente y su código) dan las mismas partes: va una sola, la que tiene un nombre.
    let code = |v: &Value| v["valor"].as_str().is_some_and(|t| t.parse::<f64>().is_ok());
    out.sort_by(|x, y| y.0.total_cmp(&x.0).then_with(|| code(&x.1).cmp(&code(&y.1))).then_with(|| x.1["valor"].as_str().cmp(&y.1["valor"].as_str())));
    let per_thousand = |v: &Value, side: &str| (v[side].as_f64().unwrap_or(0.0) * 1000.0).round() as i64;
    let mut seen = HashSet::new();
    out.into_iter().map(|(_, v)| v).filter(|v| seen.insert((per_thousand(v, "a"), per_thousand(v, "b")))).take(MAX_GAPS).collect()
}

/// Dos valores de una columna, lado a lado: sus números (de `target`, si es numérica), los dos en el
/// tiempo, sus otros números y lo que más los separa en las demás categorías.
pub fn compare(s: &Sheet, name: &str, a: &str, b: &str, target: Option<&str>) -> Result<Value, String> {
    let c = column(s, name)?;
    let l = labels(c);
    let of = |value: &str| l.rows_with(&HashSet::from([value]), 0..s.frame.rows());
    let (ra, rb) = (of(a), of(b));
    if let Some(gone) = [(a, &ra), (b, &rb)].iter().find(|(_, r)| r.is_empty()) {
        return Err(format!("No hay filas con {} en «{name}».", gone.0));
    }
    let values = match target {
        Some(t) => Some(column(s, t)?.numbers().ok_or_else(|| format!("«{t}» no es una columna de números."))?.into_owned()),
        None => None,
    };
    let v = values.as_deref();
    let others: Vec<Value> = s.profile.of_kind(NUMERIC).iter().filter(|n| Some(n.as_str()) != target && n.as_str() != name).take(MAX_NUMBERS).filter_map(|n| {
        let x = s.frame.col(n)?.numbers()?;
        Some(json!({ "nombre": n, "a": side(s, a, &ra, Some(&x)), "b": side(s, b, &rb, Some(&x)) }))
    }).collect();
    Ok(json!({
        "columna": name,
        "objetivo": target,
        "a": side(s, a, &ra, v),
        "b": side(s, b, &rb, v),
        "tiempo": over_time(s, &ra, &rb, v),
        "numeros": others,
        "diferencias": gaps(s, name, &ra, &rb, v),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::progress::Progress;
    use std::path::Path;

    fn example() -> Sheet {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../src-tauri/ejemplos");
        let paths: Vec<_> = ["ventas_2025_1er_semestre.csv", "ventas_2025_2do_semestre.csv", "clientes.csv", "productos.csv"].iter().map(|f| dir.join(f)).collect();
        Sheet::open_many(&paths.iter().map(|p| p.as_path()).collect::<Vec<_>>(), &Progress::NONE).unwrap()
    }
    fn values(c: &str, v: &[&str]) -> Condition {
        Condition::Values { column: c.into(), values: v.iter().map(|x| x.to_string()).collect() }
    }
    fn close(a: f64, b: f64) {
        assert!((a - b).abs() < 1e-6, "{a} y {b}");
    }

    /// Agrupar por diccionario da lo mismo que mirar celda por celda, con textos y con números.
    #[test]
    fn los_grupos_coinciden_con_las_celdas() {
        let s = example();
        for c in s.columns().filter(|c| !matches!(c.data, Data::Time(_))) {
            let l = labels(c);
            for i in 0..s.frame.rows() {
                assert_eq!(l.names[l.of_row[i] as usize], text_of(c, i), "{} fila {i}", c.name);
            }
        }
    }

    /// Filtrar: lo que queda más lo que no queda es toda la planilla, el análisis corre sobre lo que
    /// quedó, y el título dice qué se está mirando. Sin filas, lo dice.
    #[test]
    fn filtra_y_vuelve_a_analizar() {
        let s = example();
        let fields = fields(&s);
        let segmento = fields["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == "segmento").unwrap();
        let (first, others): (Vec<&Value>, Vec<&Value>) = segmento["valores"].as_array().unwrap().iter().partition(|v| v == &&segmento["valores"][0]);
        let name = first[0][0].as_str().unwrap();
        let f = s.filtered(&[values("segmento", &[name])]).unwrap();
        assert_eq!(f.frame.rows() as u64, first[0][1].as_u64().unwrap());
        let rest: Vec<&str> = others.iter().map(|v| v[0].as_str().unwrap()).collect();
        let g = s.filtered(&[values("segmento", &rest)]).unwrap();
        assert!(f.frame.rows() + g.frame.rows() <= s.frame.rows(), "las filas sin segmento no están en ninguno");
        assert!(f.file.contains(name), "{}", f.file);
        assert_eq!(f.report.original_rows, f.frame.rows(), "la vista general no cuenta el filtro como filas perdidas");

        let a = f.analysis(Some("monto"), &Progress::NONE).unwrap();
        assert_eq!(a["profile"]["n_rows"].as_u64().unwrap() as usize, f.frame.rows());
        assert_eq!(a["target_col"], "monto");
        assert_eq!(a["filename"], json!(f.file));

        let q1 = s.filtered(&[Condition::Dates { column: "fecha".into(), from: day_of("2025-01-01"), to: day_of("2025-03-31") }]).unwrap();
        assert!(q1.frame.rows() > 0 && q1.frame.rows() < s.frame.rows());
        assert!(q1.file.contains("del 01/01/2025 al 31/03/2025"), "{}", q1.file);
        assert!(s.filtered(&[values("segmento", &["No existe"])]).is_err_and(|e| e.contains("Ninguna fila")));
        assert!(s.filtered(&[values("no_existe", &["x"])]).is_err());
        assert!(s.filtered(&[Condition::Dates { column: "monto".into(), from: None, to: None }]).is_err());
    }

    /// Un filtro que deja una sola fila o dos también se analiza (no se puede predecir nada, pero no se rompe).
    #[test]
    fn un_filtro_chiquito_no_rompe_el_analisis() {
        let s = example();
        let day = Condition::Dates { column: "fecha".into(), from: day_of("2025-03-10"), to: day_of("2025-03-10") };
        let f = s.filtered(&[day.clone()]).unwrap();
        assert!(f.analysis(Some("monto"), &Progress::NONE).is_ok());
        let product = cell_text(f.frame.col("producto").unwrap(), 0);
        let few = f.filtered(&[values("producto", &[&product])]).unwrap();
        assert!(few.analysis(Some("monto"), &Progress::NONE).is_ok());
    }

    /// La tabla: las celdas suman su total, el total coincide con la planilla, y el promedio total es
    /// el de las filas.
    #[test]
    fn la_tabla_dinamica_cierra_con_la_planilla() {
        let s = example();
        let t = pivot(&s, &Pivot { rows: "segmento".into(), columns: Some("categoria".into()), value: Some("monto".into()), calc: Calc::Sum, period: Period::Month }).unwrap();
        close(t["total"].as_f64().unwrap(), s.total("monto").unwrap());
        let by_row: f64 = t["total_filas"].as_array().unwrap().iter().filter_map(Value::as_f64).sum();
        close(by_row, s.total("monto").unwrap());
        for (row, total) in t["celdas"].as_array().unwrap().iter().zip(t["total_filas"].as_array().unwrap()) {
            let sum: f64 = row.as_array().unwrap().iter().filter_map(Value::as_f64).sum();
            close(sum, total.as_f64().unwrap());
        }
        let totals: Vec<f64> = t["total_filas"].as_array().unwrap().iter().filter_map(Value::as_f64).collect();
        let labels = t["etiquetas_filas"].as_array().unwrap();
        let sorted = labels.iter().position(|l| l == NO_DATA).map_or(totals.len(), |p| p);
        assert!(totals[..sorted.min(totals.len())].windows(2).all(|w| w[0] >= w[1]), "de mayor a menor: {totals:?}");

        let mean = pivot(&s, &Pivot { rows: "segmento".into(), columns: None, value: Some("monto".into()), calc: Calc::Mean, period: Period::Month }).unwrap();
        let v = s.frame.col("monto").unwrap().numbers().unwrap();
        close(mean["total"].as_f64().unwrap(), v.iter().filter(|x| !x.is_nan()).sum::<f64>() / v.iter().filter(|x| !x.is_nan()).count() as f64);
        let rows = pivot(&s, &Pivot { rows: "segmento".into(), columns: None, value: None, calc: Calc::Count, period: Period::Month }).unwrap();
        assert_eq!(rows["total"].as_f64().unwrap() as usize, s.frame.rows());
        assert_eq!(rows["celdas"].as_array().unwrap().len(), rows["etiquetas_filas"].as_array().unwrap().len(), "sin columnas, cada fila igual tiene su lista de celdas");
        assert!(rows["celdas"][0].as_array().unwrap().is_empty());
        assert!(pivot(&s, &Pivot { rows: "segmento".into(), columns: None, value: Some("producto".into()), calc: Calc::Sum, period: Period::Month }).is_err());
    }

    /// La tabla se lleva a Excel y a CSV con sus totales.
    #[test]
    fn la_tabla_se_guarda_con_sus_totales() {
        let s = example();
        let t = pivot(&s, &Pivot { rows: "segmento".into(), columns: Some("categoria".into()), value: Some("monto".into()), calc: Calc::Sum, period: Period::Month }).unwrap();
        let g = grid(&t);
        assert_eq!(g.head.last().unwrap(), "Total");
        let (name, totals) = g.rows.last().unwrap();
        assert_eq!(name, "Total");
        close(totals.last().unwrap().unwrap(), s.total("monto").unwrap());
        assert!(g.rows.iter().all(|(_, v)| v.len() == g.head.len() - 1));
        let dir = std::env::temp_dir().join("mio_tabla_guardar_test");
        std::fs::create_dir_all(&dir).unwrap();
        crate::export::write_grid(&g, false, &dir.join("t.csv")).unwrap();
        crate::export::write_grid(&g, true, &dir.join("t.xlsx")).unwrap();
        let book = crate::reader::read_excel(&dir.join("t.xlsx"), None).unwrap();
        assert_eq!(book.table.rows(), g.rows.len());
        assert!(std::fs::read_to_string(dir.join("t.csv")).unwrap().starts_with("segmento,"));
    }

    /// Las fechas se agrupan por período, en orden y sin saltear ninguno.
    #[test]
    fn agrupa_las_fechas_por_periodo() {
        let s = example();
        let of = |period| pivot(&s, &Pivot { rows: "fecha".into(), columns: None, value: Some("monto".into()), calc: Calc::Sum, period }).unwrap();
        let count = |t: &Value| t["etiquetas_filas"].as_array().unwrap().len();
        let month = of(Period::Month);
        assert_eq!(count(&month), 12);
        assert_eq!((&month["etiquetas_filas"][0], &month["etiquetas_filas"][11]), (&json!("ene 2025"), &json!("dic 2025")));
        assert_eq!(month["dias_filas"][1], "2025-02-01");
        assert_eq!(count(&of(Period::Quarter)), 4);
        assert_eq!(of(Period::Quarter)["etiquetas_filas"][3], "T4 2025");
        assert_eq!(count(&of(Period::Year)), 1);
        assert!((52..=54).contains(&count(&of(Period::Week))));
        for period in [Period::Week, Period::Month, Period::Quarter, Period::Year] {
            let sum: f64 = of(period)["total_filas"].as_array().unwrap().iter().filter_map(Value::as_f64).sum();
            close(sum, s.total("monto").unwrap());
        }
        // Un año entero por día no entra en la tabla: lo dice, en lugar de cortarla.
        assert!(pivot(&s, &Pivot { rows: "fecha".into(), columns: None, value: None, calc: Calc::Count, period: Period::Day }).is_err_and(|e| e.contains("períodos")));
    }

    /// Muchos valores: los que no entran van a "Otros", y el total no pierde nada.
    #[test]
    fn lo_que_no_entra_va_a_otros() {
        let dir = std::env::temp_dir().join("mio_tabla_otros_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("muchos.csv");
        let mut csv = String::from("cliente;ventas;zona\n");
        for i in 0..800 {
            csv.push_str(&format!("C{};{};{}\n", i % 400, i + 1, if i % 2 == 0 { "A" } else { "B" }));
        }
        std::fs::write(&path, csv).unwrap();
        let s = Sheet::open(&path, None, &Progress::NONE).unwrap();
        let t = pivot(&s, &Pivot { rows: "cliente".into(), columns: Some("zona".into()), value: Some("ventas".into()), calc: Calc::Sum, period: Period::Month }).unwrap();
        assert_eq!(t["etiquetas_filas"].as_array().unwrap().len(), MAX_ROWS + 1);
        assert_eq!(t["otras_filas"].as_u64().unwrap() as usize, 400 - MAX_ROWS);
        assert_eq!(t["etiquetas_filas"][MAX_ROWS], OTHERS);
        close(t["total_filas"].as_array().unwrap().iter().filter_map(Value::as_f64).sum(), s.total("ventas").unwrap());
    }

    /// La comparación: cada grupo con sus números, los dos meses que cierran con el total y lo que los separa.
    #[test]
    fn compara_dos_grupos() {
        let s = example();
        let f = fields(&s);
        let seg = f["columnas"].as_array().unwrap().iter().find(|c| c["nombre"] == "segmento").unwrap();
        let (a, b) = (seg["valores"][0][0].as_str().unwrap(), seg["valores"][1][0].as_str().unwrap());
        let c = compare(&s, "segmento", a, b, Some("monto")).unwrap();
        let of = |side: &str| {
            let name = c[side]["valor"].as_str().unwrap();
            s.rows_where("segmento", &[name.to_string()], "monto", 0).unwrap()["grupos"][0].clone()
        };
        for side in ["a", "b"] {
            let real = of(side);
            assert_eq!(c[side]["filas"], real["filas"]);
            close(c[side]["suma"].as_f64().unwrap(), real["suma"].as_f64().unwrap());
            let months: f64 = c["tiempo"][side].as_array().unwrap().iter().filter_map(Value::as_f64).sum();
            close(months, real["suma"].as_f64().unwrap());
        }
        assert_eq!(c["tiempo"]["dias"][0], "2025-01-01");
        assert!(c["numeros"].as_array().unwrap().iter().any(|n| n["nombre"] == "unidades"));
        let gaps = c["diferencias"].as_array().unwrap();
        assert!(!gaps.is_empty() && gaps.len() <= MAX_GAPS);
        assert!(gaps.iter().all(|g| g["columna"] != "segmento"));
        assert!(gaps.iter().all(|g| g["valor"].as_str().unwrap().parse::<f64>().is_err()), "el nombre del cliente antes que su código: {gaps:?}");
        let pairs: HashSet<String> = gaps.iter().map(|g| format!("{:.3}-{:.3}", g["a"].as_f64().unwrap(), g["b"].as_f64().unwrap())).collect();
        assert_eq!(pairs.len(), gaps.len(), "lo que dice lo mismo va una sola vez");
        let spread = |g: &Value| (g["a"].as_f64().unwrap() - g["b"].as_f64().unwrap()).abs();
        assert!(gaps.windows(2).all(|w| spread(&w[0]) >= spread(&w[1])));

        let rows = compare(&s, "segmento", a, b, None).unwrap();
        assert!(rows["a"]["suma"].is_null());
        assert!(compare(&s, "segmento", "No existe", "Tampoco", None).is_err_and(|e| e.contains("No hay filas")));
    }
}
