//! La limpieza de la planilla, como `services/data_cleaning/pipeline.py` del motor de Python:
//! vacíos disfrazados, filas y columnas vacías, formato regional, textos, duplicados, montos,
//! números escritos como texto, fechas, tipo de cada columna, valores atípicos, imputación y
//! achicado de memoria. Se compara contra el resultado final de Python (ver `tests/`).

use crate::reader::{Column, Table};
use regex::Regex;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::OnceLock;
use unicode_normalization::UnicodeNormalization;

/// Un valor de una columna de texto ("object" en pandas), que puede mezclar cosas.
#[derive(Debug, Clone, PartialEq)]
pub enum Obj {
    Null,
    Str(String),
    Bool(bool),
    Num(f64),
}

#[derive(Debug, Clone)]
pub enum Data {
    /// int64 (y los enteros achicados: int8/16/32). Sin vacíos.
    Int(Vec<i64>),
    /// float64 o float32; `NaN` = vacío
    Float(Vec<f64>),
    Bool(Vec<bool>),
    Obj(Vec<Obj>),
    /// datetime64[ns]: nanosegundos desde 1970-01-01
    Time(Vec<Option<i64>>),
}

#[derive(Debug, Clone)]
pub struct Col {
    pub name: String,
    /// El tipo como lo escribe pandas ("int64", "float32", "object", "datetime64[ns]"...).
    pub dtype: String,
    pub data: Data,
}

impl Col {
    fn len(&self) -> usize {
        match &self.data {
            Data::Int(v) => v.len(),
            Data::Float(v) => v.len(),
            Data::Bool(v) => v.len(),
            Data::Obj(v) => v.len(),
            Data::Time(v) => v.len(),
        }
    }
    fn is_null(&self, i: usize) -> bool {
        match &self.data {
            Data::Int(_) | Data::Bool(_) => false,
            Data::Float(v) => v[i].is_nan(),
            Data::Obj(v) => v[i] == Obj::Null,
            Data::Time(v) => v[i].is_none(),
        }
    }
    fn null_count(&self) -> usize {
        (0..self.len()).filter(|&i| self.is_null(i)).count()
    }
    fn keep(&mut self, rows: &[usize]) {
        self.data = match &self.data {
            Data::Int(v) => Data::Int(rows.iter().map(|&i| v[i]).collect()),
            Data::Float(v) => Data::Float(rows.iter().map(|&i| v[i]).collect()),
            Data::Bool(v) => Data::Bool(rows.iter().map(|&i| v[i]).collect()),
            Data::Obj(v) => Data::Obj(rows.iter().map(|&i| v[i].clone()).collect()),
            Data::Time(v) => Data::Time(rows.iter().map(|&i| v[i]).collect()),
        };
    }
    fn is_numeric(&self) -> bool {
        matches!(self.data, Data::Int(_) | Data::Float(_) | Data::Bool(_))
    }
    /// Cantidad de valores distintos sin contar vacíos (`nunique`).
    fn nunique(&self) -> usize {
        match &self.data {
            Data::Int(v) => v.iter().collect::<HashSet<_>>().len(),
            Data::Float(v) => v.iter().filter(|x| !x.is_nan()).map(|x| x.to_bits()).collect::<HashSet<_>>().len(),
            Data::Bool(v) => v.iter().collect::<HashSet<_>>().len(),
            Data::Obj(v) => v.iter().filter(|o| **o != Obj::Null).map(obj_key).collect::<HashSet<_>>().len(),
            Data::Time(v) => v.iter().flatten().collect::<HashSet<_>>().len(),
        }
    }
}

/// Clave para comparar objetos como Python (True == 1, 1.0 == 1).
fn obj_key(o: &Obj) -> String {
    match o {
        Obj::Null => "\u{0}null".into(),
        Obj::Str(s) => format!("s{s}"),
        Obj::Bool(b) => format!("n{}", if *b { 1.0f64 } else { 0.0 }.to_bits()),
        Obj::Num(x) => format!("n{}", x.to_bits()),
    }
}

/// `str(x)` de Python para un número decimal.
fn py_float_str(x: f64) -> String {
    if x.is_nan() {
        "nan".into()
    } else if x.is_infinite() {
        if x > 0.0 { "inf".into() } else { "-inf".into() }
    } else if x.fract() == 0.0 && x.abs() < 1e16 {
        format!("{:.1}", x)
    } else {
        format!("{}", x)
    }
}

/// `astype(str)` de pandas sobre un objeto.
fn obj_str(o: &Obj) -> String {
    match o {
        Obj::Null => "nan".into(),
        Obj::Str(s) => s.clone(),
        Obj::Bool(b) => if *b { "True".into() } else { "False".into() },
        Obj::Num(x) => py_float_str(*x),
    }
}

/// La tabla en limpieza: columnas y el índice original de cada fila (como el de pandas).
#[derive(Debug, Clone)]
pub struct Frame {
    pub cols: Vec<Col>,
    pub index: Vec<usize>,
}

impl Frame {
    pub fn from_table(t: &Table) -> Frame {
        let cols = t.names.iter().zip(&t.columns).map(|(n, c)| {
            let (dtype, data) = match c {
                Column::Int(v) => ("int64", Data::Int(v.clone())),
                Column::Float(v) => ("float64", Data::Float(v.clone())),
                Column::Bool(v) if v.iter().all(|x| x.is_some()) => ("bool", Data::Bool(v.iter().map(|x| x.unwrap()).collect())),
                Column::Bool(v) => ("object", Data::Obj(v.iter().map(|x| x.map_or(Obj::Null, Obj::Bool)).collect())),
                Column::Text(v) => ("object", Data::Obj(v.iter().map(|x| x.as_ref().map_or(Obj::Null, |s| Obj::Str(s.clone()))).collect())),
            };
            Col { name: n.clone(), dtype: dtype.into(), data }
        }).collect();
        // Si pandas usó la primera columna como índice y son números, esos son los rótulos.
        let index = match &t.index {
            Some(l) if l.iter().all(|s| s.trim().parse::<usize>().is_ok()) => l.iter().map(|s| s.trim().parse().unwrap()).collect(),
            _ => (0..t.rows()).collect(),
        };
        Frame { cols, index }
    }
    pub fn rows(&self) -> usize {
        self.index.len()
    }
    fn keep_rows(&mut self, rows: &[usize]) {
        for c in &mut self.cols {
            c.keep(rows);
        }
        self.index = rows.iter().map(|&i| self.index[i]).collect();
    }
    pub fn col(&self, name: &str) -> Option<&Col> {
        self.cols.iter().find(|c| c.name == name)
    }
}

fn re(cell: &'static OnceLock<Regex>, pat: &str) -> &'static Regex {
    cell.get_or_init(|| Regex::new(pat).unwrap())
}

// Patrones de `step03_locale_detector.py` / `step06_currency_sanitizer.py`.
const LATAM: &str = r"^[$€£¥]?\s*-?\d{1,3}(\.\d{3})*,\d{1,4}\s*%?$|^[$€£¥]?\s*-?\d+,\d{1,4}\s*%?$";
const US: &str = r"^[$€£¥]?\s*-?\d{1,3}(,\d{3})*\.\d{1,4}\s*%?$|^[$€£¥]?\s*-?\d+\.\d{1,4}\s*%?$";
static RE_LATAM: OnceLock<Regex> = OnceLock::new();
static RE_US: OnceLock<Regex> = OnceLock::new();
static RE_DMY: OnceLock<Regex> = OnceLock::new();
static RE_DATE_ANY: OnceLock<Regex> = OnceLock::new();
static RE_AMBIG: OnceLock<Regex> = OnceLock::new();
static RE_SPACES: OnceLock<Regex> = OnceLock::new();
static RE_HEADER_WS: OnceLock<Regex> = OnceLock::new();
static RE_SPLIT: OnceLock<Regex> = OnceLock::new();

const NULL_TOKENS: [&str; 22] = [
    "n/a", "na", "n.a.", "n/d", "s/d", "s.d.", "sin dato", "sin datos", "null", "none", "nan", "-", "--", "---", "?",
    "#n/a", "#na", "undefined", "desconocido", "vacio", "vacío", "",
];

/// Lo que la limpieza informa además de la tabla.
#[derive(Debug, Clone, Default)]
pub struct Report {
    pub original_rows: usize,
    pub nulls_detected: BTreeMap<String, usize>,
    pub rows_dropped: usize,
    pub empty_cols: Vec<String>,
    pub locale: String,
    pub dec_sep: char,
    pub dayfirst: bool,
    pub duplicates_removed: usize,
    pub monetary: Vec<String>,
    pub coerced: Vec<String>,
    pub dates_parsed: Vec<String>,
    pub ambiguous_dates: BTreeMap<String, usize>,
    pub types: Vec<(String, String)>,
    pub outliers: BTreeMap<String, usize>,
    pub imputed: BTreeMap<String, usize>,
}

impl Report {
    pub fn type_of(&self, col: &str) -> Option<&str> {
        self.types.iter().find(|(c, _)| c == col).map(|(_, t)| t.as_str())
    }
}

pub const NUMERIC: &str = "numérica";
pub const DATE: &str = "fecha";
pub const CATEGORICAL: &str = "categórica";
pub const TEXT: &str = "texto";
pub const ID: &str = "identificador";

/// Corre la limpieza completa.
pub fn clean(table: &Table) -> (Frame, Report) {
    clean_with(table, &mut |_, _| {})
}

/// La limpieza, avisando después de cada paso que cambia la tabla (nombre del paso como en las
/// fotos de Python: "1_nulos", "2_vacias", "4_textos"...). Sirve para encontrar dónde difiere.
pub fn clean_with(table: &Table, snap: &mut dyn FnMut(&str, &Frame)) -> (Frame, Report) {
    let mut f = Frame::from_table(table);
    let mut r = Report { original_rows: f.rows(), ..Default::default() };
    step01_nulls(&mut f, &mut r);
    snap("1_nulos", &f);
    step02_empty(&mut f, &mut r);
    snap("2_vacias", &f);
    if f.rows() == 0 || f.cols.is_empty() {
        return (f, r);
    }
    step03_locale(&f, &mut r);
    step04_strings(&mut f);
    snap("4_textos", &f);
    step05_dedupe(&mut f, &mut r);
    snap("5_duplicados", &f);
    step06_currency(&mut f, &mut r);
    snap("6_montos", &f);
    step07_numeric(&mut f, &mut r);
    snap("7_numeros", &f);
    step08_dates(&mut f, &mut r);
    snap("8_fechas", &f);
    step09_types(&f, &mut r);
    step10_outliers(&mut f, &mut r);
    snap("10_atipicos", &f);
    step11_impute(&mut f, &mut r);
    snap("11_imputacion", &f);
    step12_downcast(&mut f, &r);
    snap("12_memoria", &f);
    (f, r)
}

// 1. Encabezados y vacíos disfrazados ------------------------------------------------------------

fn step01_nulls(f: &mut Frame, r: &mut Report) {
    let hw = re(&RE_HEADER_WS, r"[\r\n\t]+");
    for c in &mut f.cols {
        c.name = hw.replace_all(&c.name, " ").trim().to_string();
        let Data::Obj(vals) = &mut c.data else { continue };
        let stripped: Vec<String> = vals.iter().map(|o| obj_str(o).trim().to_string()).collect();
        let token: Vec<bool> = stripped.iter().map(|s| s.is_empty() || NULL_TOKENS.contains(&s.to_lowercase().as_str())).collect();
        let new_nulls = vals.iter().zip(&token).filter(|(o, t)| **t && **o != Obj::Null).count();
        if new_nulls > 0 {
            r.nulls_detected.insert(c.name.clone(), new_nulls);
            for (o, t) in vals.iter_mut().zip(&token) {
                if *t {
                    *o = Obj::Null; // los demás quedan como estaban (pandas no los recorta en este caso)
                }
            }
        } else {
            for (o, s) in vals.iter_mut().zip(stripped) {
                if *o != Obj::Null {
                    *o = Obj::Str(s); // recortados, y los True/False pasan a texto, como en pandas
                }
            }
        }
    }
}

// 2. Filas y columnas vacías ---------------------------------------------------------------------

fn step02_empty(f: &mut Frame, r: &mut Report) {
    let n = f.rows();
    let keep: Vec<usize> = (0..n).filter(|&i| !f.cols.iter().all(|c| c.is_null(i))).collect();
    r.rows_dropped = n - keep.len();
    if keep.len() != n {
        f.keep_rows(&keep);
    }
    let n = f.rows();
    r.empty_cols = f.cols.iter().filter(|c| c.null_count() == n).map(|c| c.name.clone()).collect();
    f.cols.retain(|c| c.null_count() != n);
}

// 3. Formato regional ----------------------------------------------------------------------------

fn step03_locale(f: &Frame, r: &mut Report) {
    let (latam_re, us_re) = (re(&RE_LATAM, LATAM), re(&RE_US, US));
    let dmy = re(&RE_DMY, r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})");
    let (mut latam, mut us, mut dayfirst_ev, mut monthfirst_ev) = (0, 0, 0, 0);
    let sample = f.rows().min(200);
    for c in &f.cols {
        let Data::Obj(vals) = &c.data else { continue };
        for o in vals[..sample].iter().filter(|o| **o != Obj::Null).take(30) {
            let v = obj_str(o).trim().to_string();
            if latam_re.is_match(&v) {
                latam += 1;
            } else if us_re.is_match(&v) {
                us += 1;
            }
            if let Some(m) = dmy.captures(&v) {
                let (p1, p2): (i64, i64) = (m[1].parse().unwrap(), m[2].parse().unwrap());
                if p1 > 12 && p2 <= 12 {
                    dayfirst_ev += 1;
                } else if p2 > 12 && p1 <= 12 {
                    monthfirst_ev += 1;
                }
            }
        }
    }
    let (locale, dec) = if us > latam { ("en-US", '.') } else { ("es-AR", ',') };
    r.locale = locale.into();
    r.dec_sep = dec;
    r.dayfirst = if monthfirst_ev > dayfirst_ev { false } else { locale == "es-AR" };
}

// 4. Textos: acentos (NFC) y espacios ------------------------------------------------------------

fn step04_strings(f: &mut Frame) {
    let ws = re(&RE_SPACES, r"[ \t]+");
    for c in &mut f.cols {
        let Data::Obj(vals) = &mut c.data else { continue };
        for o in vals.iter_mut() {
            if let Obj::Str(s) = o {
                let nfc: String = s.nfc().collect();
                *s = ws.replace_all(&nfc, " ").trim().to_string();
            }
        }
    }
}

// 5. Duplicados exactos --------------------------------------------------------------------------

fn row_key(f: &Frame, i: usize) -> String {
    let mut k = String::new();
    for c in &f.cols {
        let part = match &c.data {
            Data::Int(v) => format!("n{}", (v[i] as f64).to_bits()),
            Data::Float(v) => if v[i].is_nan() { "\u{0}null".into() } else { format!("n{}", v[i].to_bits()) },
            Data::Bool(v) => format!("n{}", if v[i] { 1.0f64 } else { 0.0 }.to_bits()),
            Data::Obj(v) => obj_key(&v[i]),
            Data::Time(v) => v[i].map_or("\u{0}null".into(), |t| format!("t{t}")),
        };
        k.push_str(&part);
        k.push('\u{1}');
    }
    k
}

fn step05_dedupe(f: &mut Frame, r: &mut Report) {
    let mut seen = HashSet::new();
    let keep: Vec<usize> = (0..f.rows()).filter(|&i| seen.insert(row_key(f, i))).collect();
    r.duplicates_removed = f.rows() - keep.len();
    if r.duplicates_removed > 0 {
        f.keep_rows(&keep);
    }
}

// 6. Montos y porcentajes ------------------------------------------------------------------------

/// `float(s)` de Python (acepta signo, exponente, inf, nan y guiones bajos entre dígitos).
fn py_float(s: &str) -> Option<f64> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    let lower = t.to_ascii_lowercase();
    let body = lower.trim_start_matches(['+', '-']);
    if ["inf", "infinity", "nan"].contains(&body) {
        let v = if body == "nan" { f64::NAN } else { f64::INFINITY };
        return Some(if lower.starts_with('-') { -v } else { v });
    }
    let no_us = t.replace('_', "");
    if t.contains('_') && (t.starts_with('_') || t.ends_with('_') || t.contains("__")) {
        return None;
    }
    if !no_us.bytes().all(|b| b.is_ascii_digit() || matches!(b, b'.' | b'e' | b'E' | b'+' | b'-')) {
        return None;
    }
    no_us.parse::<f64>().ok()
}

fn step06_currency(f: &mut Frame, r: &mut Report) {
    let pat = if r.dec_sep == ',' { re(&RE_LATAM, LATAM) } else { re(&RE_US, US) };
    for c in &mut f.cols {
        let Data::Obj(vals) = &c.data else { continue };
        let sample: Vec<String> = vals.iter().filter(|o| **o != Obj::Null).take(40).map(|o| obj_str(o).trim().to_string()).collect();
        if sample.is_empty() {
            continue;
        }
        let has_symbol = sample.iter().any(|s| s.contains(['$', '€', '£', '¥']));
        let has_pct = sample.iter().any(|s| s.contains('%'));
        let matches = sample.iter().filter(|s| pat.is_match(s)).count() as f64 / sample.len() as f64;
        if !(has_symbol || has_pct || matches > 0.6) {
            continue;
        }
        let converted: Vec<f64> = vals.iter().map(|o| {
            if *o == Obj::Null {
                return f64::NAN;
            }
            let mut s: String = obj_str(o).trim().chars().filter(|ch| !(matches!(ch, '$' | '€' | '£' | '¥') || ch.is_whitespace())).collect();
            s = s.replace('%', "");
            s = if r.dec_sep == ',' { s.replace('.', "").replace(',', ".") } else { s.replace(',', "") };
            py_float(&s).unwrap_or(f64::NAN)
        }).collect();
        let present = vals.iter().filter(|o| **o != Obj::Null).count().max(1);
        let valid = converted.iter().filter(|x| !x.is_nan()).count();
        if valid as f64 / present as f64 > 0.6 {
            r.monetary.push(c.name.clone());
            c.data = Data::Float(converted);
            c.dtype = "float64".into();
        }
    }
    r.monetary.sort();
}

// 7. Números escritos como texto -----------------------------------------------------------------

/// `pd.to_numeric(errors="coerce")` sobre un texto: entero, decimal, inf o nada.
fn to_numeric(s: &str) -> Option<f64> {
    let t = s.trim();
    let lower = t.to_ascii_lowercase();
    let body = lower.trim_start_matches(['+', '-']);
    if ["inf", "infinity"].contains(&body) {
        return Some(if lower.starts_with('-') { f64::NEG_INFINITY } else { f64::INFINITY });
    }
    if body.is_empty() || !t.bytes().all(|b| b.is_ascii_digit() || matches!(b, b'.' | b'e' | b'E' | b'+' | b'-')) {
        return None;
    }
    t.parse::<f64>().ok().filter(|x| !x.is_nan())
}

fn is_int_text(s: &str) -> bool {
    let t = s.trim();
    let d = t.strip_prefix(['+', '-']).unwrap_or(t);
    !d.is_empty() && d.bytes().all(|b| b.is_ascii_digit())
}

fn step07_numeric(f: &mut Frame, r: &mut Report) {
    for c in &mut f.cols {
        if r.monetary.contains(&c.name) {
            continue;
        }
        let Data::Obj(vals) = &c.data else { continue };
        let non_null = vals.iter().filter(|o| **o != Obj::Null).count();
        if non_null == 0 {
            continue;
        }
        let texts: Vec<String> = vals.iter().map(|o| {
            let s = obj_str(o);
            if r.dec_sep == ',' { s.replace('.', "").replace(',', ".") } else { s.replace(',', "") }
        }).collect();
        let nums: Vec<Option<f64>> = texts.iter().map(|s| to_numeric(s)).collect();
        let valid = nums.iter().filter(|x| x.is_some()).count();
        if (valid as f64) / (non_null as f64) >= 0.75 {
            r.coerced.push(c.name.clone());
            let all_int = nums.iter().all(|x| x.is_some())
                && texts.iter().all(|s| is_int_text(s) && s.trim().parse::<i64>().is_ok());
            if all_int {
                c.data = Data::Int(texts.iter().map(|s| s.trim().parse::<i64>().unwrap_or(0)).collect());
                c.dtype = "int64".into();
            } else {
                c.data = Data::Float(nums.iter().map(|x| x.unwrap_or(f64::NAN)).collect());
                c.dtype = "float64".into();
            }
        }
    }
}

// 8. Fechas --------------------------------------------------------------------------------------

#[derive(Clone, Copy, Debug, PartialEq)]
enum Part {
    Y,
    Y2,
    M,
    D,
}

/// Formatos que reconoce pandas al adivinar (los comunes en planillas).
fn formats(dayfirst: bool) -> Vec<(char, Vec<Part>, char)> {
    use Part::*;
    let dm = if dayfirst { vec![D, M] } else { vec![M, D] };
    let md = if dayfirst { vec![M, D] } else { vec![D, M] };
    let mut v = Vec::new();
    for sep in ['-', '/'] {
        v.push((sep, vec![Y, M, D], ' '));
        for order in [&dm, &md] {
            v.push((sep, [order.clone(), vec![Y]].concat(), ' '));
            v.push((sep, [order.clone(), vec![Y2]].concat(), ' '));
        }
    }
    v
}

/// Lee "AAAA-MM-DD", "DD/MM/AAAA" y similares con hora opcional "HH:MM[:SS]", con un formato dado.
fn parse_with(s: &str, sep: char, parts: &[Part], time: Option<usize>) -> Option<i64> {
    let (date, rest) = match s.split_once([' ', 'T']) {
        Some((d, r)) => (d, Some(r)),
        None => (s, None),
    };
    let fields: Vec<&str> = date.split(sep).collect();
    if fields.len() != 3 || date.contains(if sep == '-' { '/' } else { '-' }) {
        return None;
    }
    let (mut y, mut m, mut d) = (0i64, 0i64, 0i64);
    for (p, txt) in parts.iter().zip(&fields) {
        if txt.is_empty() || !txt.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        let n: i64 = txt.parse().ok()?;
        match p {
            Part::Y if txt.len() == 4 => y = n,
            Part::Y2 if txt.len() == 2 => y = if n < 69 { 2000 + n } else { 1900 + n },
            Part::M if txt.len() <= 2 => m = n,
            Part::D if txt.len() <= 2 => d = n,
            _ => return None,
        }
    }
    let (mut h, mut mi, mut se) = (0i64, 0i64, 0i64);
    match (time, rest) {
        (None, None) => {}
        (Some(k), Some(t)) => {
            let tp: Vec<&str> = t.split(':').collect();
            if tp.len() != k || tp.iter().any(|x| x.is_empty() || x.len() > 2 || !x.bytes().all(|b| b.is_ascii_digit())) {
                return None;
            }
            h = tp[0].parse().ok()?;
            mi = tp[1].parse().ok()?;
            if k == 3 {
                se = tp[2].parse().ok()?;
            }
            if h > 23 || mi > 59 || se > 59 {
                return None;
            }
        }
        _ => return None,
    }
    if !(1..=12).contains(&m) || d < 1 || d > days_in_month(y, m) {
        return None;
    }
    Some(((days_from_civil(y, m, d) * 86_400) + h * 3600 + mi * 60 + se) * 1_000_000_000)
}

fn days_in_month(y: i64, m: i64) -> i64 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ if (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 => 29,
        _ => 28,
    }
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

type Fmt = (char, Vec<Part>, Option<usize>);

/// Como `pd.to_datetime(..., dayfirst)`: el formato se adivina con la primera fecha y se aplica
/// estricto a todas (las que no encajan quedan vacías).
fn to_datetime(vals: &[Obj], dayfirst: bool) -> Vec<Option<i64>> {
    let first = vals.iter().find(|o| **o != Obj::Null).map(obj_str);
    let guess: Option<Fmt> = first.as_deref().and_then(|s| {
        for (sep, parts, _) in formats(dayfirst) {
            for time in [None, Some(2), Some(3)] {
                if parse_with(s, sep, &parts, time).is_some() {
                    return Some((sep, parts, time));
                }
            }
        }
        None
    });
    vals.iter().map(|o| {
        if *o == Obj::Null {
            return None;
        }
        let s = obj_str(o);
        match &guess {
            Some((sep, parts, time)) => parse_with(&s, *sep, parts, *time),
            None => None,
        }
    }).collect()
}

fn step08_dates(f: &mut Frame, r: &mut Report) {
    let any = re(&RE_DATE_ANY, r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}");
    let amb = re(&RE_AMBIG, r"^(0?[1-9]|1[0-2])[/-](0?[1-9]|1[0-2])[/-]\d{2,4}");
    for c in &mut f.cols {
        if matches!(c.data, Data::Time(_)) {
            r.dates_parsed.push(c.name.clone());
            continue;
        }
        let Data::Obj(vals) = &c.data else { continue };
        let non_null = vals.iter().filter(|o| **o != Obj::Null).count();
        if non_null == 0 {
            continue;
        }
        let sample: Vec<String> = vals.iter().filter(|o| **o != Obj::Null).take(30).map(|o| obj_str(o).trim().to_string()).collect();
        let hits = sample.iter().filter(|s| any.is_match(s)).count();
        if (hits as f64) / (sample.len() as f64) < 0.6 {
            continue;
        }
        let n_amb = sample.iter().filter(|s| amb.is_match(s)).count();
        if n_amb > 0 {
            r.ambiguous_dates.insert(c.name.clone(), n_amb);
        }
        let parsed = to_datetime(vals, r.dayfirst);
        let valid = parsed.iter().filter(|x| x.is_some()).count();
        if (valid as f64) / (non_null as f64) >= 0.7 {
            c.data = Data::Time(parsed);
            c.dtype = "datetime64[ns]".into();
            r.dates_parsed.push(c.name.clone());
        }
    }
}

// 9. Tipo de cada columna ------------------------------------------------------------------------

fn semantic_type(c: &Col, n_rows: usize, monetary: bool) -> &'static str {
    if monetary {
        return NUMERIC;
    }
    let name = c.name.to_lowercase();
    let tokens: HashSet<&str> = re(&RE_SPLIT, r"[\s_]+").split(&name).collect();
    const POSTAL: [&str; 16] = ["postal", "zip", "zipcode", "postcode", "cp", "cod_postal", "codigo_postal", "phone", "telefono",
        "teléfono", "celular", "fax", "dni", "ssn", "cuit", "cuil"];
    if POSTAL.iter().any(|k| name.contains(k)) || POSTAL.iter().any(|k| tokens.contains(k)) {
        return CATEGORICAL;
    }
    const IDS: [&str; 8] = ["id", "cod", "codigo", "código", "code", "key", "uuid", "hash"];
    let n_unique = c.nunique();
    if IDS.iter().any(|k| tokens.contains(k)) && (n_unique as f64 / n_rows.max(1) as f64) > 0.90 {
        return ID;
    }
    if matches!(c.data, Data::Time(_)) {
        return DATE;
    }
    if matches!(c.data, Data::Bool(_)) {
        return CATEGORICAL; // sí/no es una categoría (arreglo también hecho en Python)
    }
    if c.is_numeric() {
        return if n_unique <= 5 && n_rows > 30 { CATEGORICAL } else { NUMERIC };
    }
    let present = c.len() - c.null_count();
    if present == 0 {
        return TEXT;
    }
    if (n_unique as f64 / present.max(1) as f64) < 0.40 || n_unique <= 40 { CATEGORICAL } else { TEXT }
}

fn step09_types(f: &Frame, r: &mut Report) {
    let n = f.rows();
    r.types = f.cols.iter().map(|c| (c.name.clone(), semantic_type(c, n, r.monetary.contains(&c.name)).to_string())).collect();
}

// 10. Valores atípicos (Tukey: se marcan, no se tocan) -------------------------------------------

/// Cuantil con interpolación lineal (como `Series.quantile`).
fn quantile(sorted: &[f64], q: f64) -> f64 {
    let pos = q * (sorted.len() - 1) as f64;
    let lo = pos.floor() as usize;
    let hi = pos.ceil() as usize;
    sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo as f64)
}

fn floats_of(c: &Col) -> Vec<f64> {
    match &c.data {
        Data::Int(v) => v.iter().map(|x| *x as f64).collect(),
        Data::Float(v) => v.clone(),
        Data::Bool(v) => v.iter().map(|b| if *b { 1.0 } else { 0.0 }).collect(),
        Data::Obj(v) => v.iter().map(|o| match o { Obj::Num(x) => *x, _ => f64::NAN }).collect(),
        Data::Time(v) => v.iter().map(|t| t.map_or(f64::NAN, |x| x as f64)).collect(),
    }
}

fn step10_outliers(f: &mut Frame, r: &mut Report) {
    let mut any = vec![false; f.rows()];
    for c in &f.cols {
        if r.type_of(&c.name) != Some(NUMERIC) {
            continue;
        }
        let vals = floats_of(c);
        let mut clean: Vec<f64> = vals.iter().copied().filter(|x| !x.is_nan()).collect();
        if clean.len() < 4 {
            continue;
        }
        clean.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let (q1, q3) = (quantile(&clean, 0.25), quantile(&clean, 0.75));
        let iqr = q3 - q1;
        if iqr == 0.0 {
            continue;
        }
        let (lo, hi) = (q1 - 1.5 * iqr, q3 + 1.5 * iqr);
        let mut n = 0;
        for (i, x) in vals.iter().enumerate() {
            if *x < lo || *x > hi {
                any[i] = true;
                n += 1;
            }
        }
        if n > 0 {
            r.outliers.insert(c.name.clone(), n);
        }
    }
    f.cols.push(Col { name: "_is_outlier".into(), dtype: "bool".into(), data: Data::Bool(any) });
}

// 11. Imputación ---------------------------------------------------------------------------------

fn median(mut v: Vec<f64>) -> f64 {
    v.retain(|x| !x.is_nan());
    if v.is_empty() {
        return f64::NAN;
    }
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    let n = v.len();
    if n % 2 == 1 { v[n / 2] } else { (v[n / 2 - 1] + v[n / 2]) / 2.0 }
}

fn step11_impute(f: &mut Frame, r: &mut Report) {
    let primary_date = f.cols.iter().find(|c| r.type_of(&c.name) == Some(DATE)).map(|c| c.name.clone());
    let monotonic = primary_date.as_ref().and_then(|n| f.col(n)).map_or(false, |c| match &c.data {
        Data::Time(v) => {
            let s: Vec<i64> = v.iter().flatten().copied().collect();
            s.len() >= 5 && s.windows(2).all(|w| w[0] <= w[1])
        }
        _ => false,
    });
    let types = r.types.clone();
    for c in &mut f.cols {
        if c.name.starts_with('_') {
            continue;
        }
        let nulls = c.null_count();
        if nulls == 0 {
            continue;
        }
        let kind = types.iter().find(|(n, _)| *n == c.name).map_or(TEXT, |(_, t)| t.as_str());
        match kind {
            NUMERIC => {
                let med = median(floats_of(c));
                if let Data::Float(v) = &mut c.data {
                    v.iter_mut().filter(|x| x.is_nan()).for_each(|x| *x = med);
                }
                r.imputed.insert(c.name.clone(), nulls);
            }
            CATEGORICAL => {
                fill_mode(c);
                r.imputed.insert(c.name.clone(), nulls);
            }
            DATE => {
                if monotonic {
                    if let Data::Time(v) = &mut c.data {
                        let mut last = None;
                        for x in v.iter_mut() {
                            if x.is_some() { last = *x } else { *x = last }
                        }
                        let mut next = None;
                        for x in v.iter_mut().rev() {
                            if x.is_some() { next = *x } else { *x = next }
                        }
                    }
                    r.imputed.insert(c.name.clone(), nulls);
                }
            }
            _ => {
                // texto o identificador: el vacío pasa a "" (si era numérica, la columna queda mezclada)
                let filled: Vec<Obj> = match &c.data {
                    Data::Obj(v) => v.iter().map(|o| if *o == Obj::Null { Obj::Str(String::new()) } else { o.clone() }).collect(),
                    Data::Float(v) => v.iter().map(|x| if x.is_nan() { Obj::Str(String::new()) } else { Obj::Num(*x) }).collect(),
                    _ => continue,
                };
                c.data = Data::Obj(filled);
                c.dtype = "object".into();
                r.imputed.insert(c.name.clone(), nulls);
            }
        }
    }
}

/// Llena los vacíos con la moda (la menor si hay empate, como `Series.mode()[0]`).
fn fill_mode(c: &mut Col) {
    match &mut c.data {
        Data::Float(v) => {
            let mut counts: HashMap<u64, usize> = HashMap::new();
            for x in v.iter().filter(|x| !x.is_nan()) {
                *counts.entry(x.to_bits()).or_default() += 1;
            }
            let top = counts.values().copied().max().unwrap_or(0);
            let mode = counts.iter().filter(|(_, n)| **n == top).map(|(b, _)| f64::from_bits(*b)).fold(f64::INFINITY, f64::min);
            v.iter_mut().filter(|x| x.is_nan()).for_each(|x| *x = mode);
        }
        Data::Obj(v) => {
            let mut counts: Vec<(Obj, usize)> = Vec::new();
            for o in v.iter().filter(|o| **o != Obj::Null) {
                match counts.iter_mut().find(|(k, _)| obj_key(k) == obj_key(o)) {
                    Some(e) => e.1 += 1,
                    None => counts.push((o.clone(), 1)),
                }
            }
            let top = counts.iter().map(|(_, n)| *n).max().unwrap_or(0);
            let mut modes: Vec<Obj> = counts.into_iter().filter(|(_, n)| *n == top).map(|(o, _)| o).collect();
            modes.sort_by(obj_cmp);
            let fill = modes.into_iter().next().unwrap_or(Obj::Str("Desconocido".into()));
            v.iter_mut().filter(|o| **o == Obj::Null).for_each(|o| *o = fill.clone());
        }
        _ => {}
    }
}

/// Orden de Python entre objetos del mismo tipo (números entre sí, textos por código).
fn obj_cmp(a: &Obj, b: &Obj) -> std::cmp::Ordering {
    let num = |o: &Obj| match o {
        Obj::Num(x) => Some(*x),
        Obj::Bool(b) => Some(if *b { 1.0 } else { 0.0 }),
        _ => None,
    };
    match (a, b, num(a), num(b)) {
        (_, _, Some(x), Some(y)) => x.partial_cmp(&y).unwrap(),
        (Obj::Str(x), Obj::Str(y), _, _) => x.cmp(y),
        _ => std::cmp::Ordering::Equal,
    }
}

// 12. Achicar memoria ----------------------------------------------------------------------------

fn step12_downcast(f: &mut Frame, r: &Report) {
    for c in &mut f.cols {
        if r.monetary.contains(&c.name) || r.type_of(&c.name) == Some(ID) {
            continue;
        }
        match &mut c.data {
            Data::Float(v) => {
                v.iter_mut().for_each(|x| *x = (*x as f32) as f64);
                c.dtype = "float32".into();
            }
            Data::Int(v) => {
                let (lo, hi) = (v.iter().min().copied().unwrap_or(0), v.iter().max().copied().unwrap_or(0));
                c.dtype = if lo >= i8::MIN as i64 && hi <= i8::MAX as i64 {
                    "int8"
                } else if lo >= i16::MIN as i64 && hi <= i16::MAX as i64 {
                    "int16"
                } else if lo >= i32::MIN as i64 && hi <= i32::MAX as i64 {
                    "int32"
                } else {
                    "int64"
                }.into();
            }
            _ => {}
        }
    }
}

// Qué columna analizar -------------------------------------------------------------------------

/// Puntaje por el nombre, como `target_score` en `core/data_profiler.py`: ventas primero; costos,
/// descuentos, edades, ratings y porcentajes al final.
pub fn target_score(name: &str) -> f64 {
    const STRONG: [&str; 7] = ["venta", "sales", "revenue", "ingreso", "factur", "importe", "total"];
    const MEDIUM: [&str; 7] = ["ganancia", "profit", "margen", "beneficio", "monto", "valor", "amount"];
    const WEAK: [&str; 10] = ["precio", "price", "cantidad", "quantity", "units", "unidades", "churn", "baja", "cancelacion", "score"];
    const PENALTY_SUB: [&str; 11] = ["costo", "cost", "descuento", "discount", "impuesto", "envio", "envío", "shipping", "porcentaje", "percentage", "lifetime"];
    const PENALTY_TOKENS: [&str; 18] = ["age", "edad", "rate", "tasa", "pct", "days", "dias", "días", "dia", "día", "year", "año", "month", "mes", "points", "puntos", "stock", "rating"];
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
    if PENALTY_SUB.iter().any(|k| n.contains(k)) || tokens.iter().any(|t| PENALTY_TOKENS.contains(t) || *t == "tax") {
        score -= 80.0;
    }
    score
}

/// Las columnas numéricas ordenadas por cuán probable es que sean lo que se quiere entender
/// (como `suggested_targets` del perfil de Python).
pub fn suggest_targets(f: &Frame, r: &Report) -> Vec<String> {
    let mut scored: Vec<(f64, String)> = f.cols.iter()
        .filter(|c| r.type_of(&c.name) == Some(NUMERIC))
        .map(|c| {
            let (u, nulls) = (c.nunique() as f64, c.null_count() as f64);
            (target_score(&c.name) + u / (u + nulls).max(1.0), c.name.clone())
        })
        .collect();
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap().then(a.1.cmp(&b.1)));
    scored.into_iter().map(|(_, n)| n).take(5).collect()
}

#[cfg(test)]
mod tests {
    use super::target_score;

    #[test]
    fn la_columna_sugerida_es_la_de_ventas() {
        let pyme = ["cantidad", "precio_unitario", "monto_descuento", "subtotal", "total_venta", "costo_unitario", "costo_total", "ganancia", "margen_porcentaje", "stock_disponible"];
        let best = pyme.iter().max_by(|a, b| target_score(a).partial_cmp(&target_score(b)).unwrap()).unwrap();
        assert_eq!(*best, "total_venta");
        let shop = ["customer_age", "delivery_days", "customer_rating", "quantity", "gross_sales", "discount_amount", "tax_amount", "shipping_cost", "net_sales", "product_cost", "profit", "profit_margin_percentage", "customer_lifetime_value"];
        let best = shop.iter().max_by(|a, b| target_score(a).partial_cmp(&target_score(b)).unwrap()).unwrap();
        assert_eq!(*best, "net_sales");
    }
}
