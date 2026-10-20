//! La limpieza de la planilla, como `services/data_cleaning/pipeline.py` del motor de Python:
//! vacíos disfrazados, filas y columnas vacías, formato regional, textos, duplicados, montos,
//! números escritos como texto, fechas, tipo de cada columna, valores atípicos, imputación y
//! achicado de memoria. Se compara contra el resultado final de Python (ver `tests/`).

use crate::dict::Dict;
use crate::reader::{Column, Table};
use regex::Regex;
use rustc_hash::{FxHashMap, FxHashSet};
use std::collections::{BTreeMap, HashSet};
use std::sync::OnceLock;
use unicode_normalization::{is_nfc_quick, IsNormalized, UnicodeNormalization};

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
    /// object: valores mezclados, como diccionario (cada valor distinto una vez)
    Obj(Dict<Obj>),
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
    pub(crate) fn len(&self) -> usize {
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
            Data::Obj(d) => *d.get(i) == Obj::Null,
            Data::Time(v) => v[i].is_none(),
        }
    }
    pub(crate) fn null_count(&self) -> usize {
        match &self.data {
            Data::Obj(d) => d.values().iter().zip(d.counts()).filter(|(o, _)| **o == Obj::Null).map(|(_, n)| n).sum(),
            _ => (0..self.len()).filter(|&i| self.is_null(i)).count(),
        }
    }
    fn keep(&mut self, rows: &[usize]) {
        self.data = match &self.data {
            Data::Int(v) => Data::Int(rows.iter().map(|&i| v[i]).collect()),
            Data::Float(v) => Data::Float(rows.iter().map(|&i| v[i]).collect()),
            Data::Bool(v) => Data::Bool(rows.iter().map(|&i| v[i]).collect()),
            Data::Obj(d) => Data::Obj(d.keep(rows)),
            Data::Time(v) => Data::Time(rows.iter().map(|&i| v[i]).collect()),
        };
    }
    pub(crate) fn is_numeric(&self) -> bool {
        matches!(self.data, Data::Int(_) | Data::Float(_) | Data::Bool(_))
    }
    /// Cantidad de valores distintos sin contar vacíos (`nunique`).
    pub(crate) fn nunique(&self) -> usize {
        match &self.data {
            Data::Int(v) => v.iter().collect::<FxHashSet<_>>().len(),
            Data::Float(v) => v.iter().filter(|x| !x.is_nan()).map(|x| x.to_bits()).collect::<FxHashSet<_>>().len(),
            Data::Bool(v) => v.iter().collect::<FxHashSet<_>>().len(),
            Data::Obj(d) => equal_to(d).iter().enumerate().filter(|&(u, &e)| u == e && d.values()[u] != Obj::Null).count(),
            Data::Time(v) => v.iter().flatten().collect::<FxHashSet<_>>().len(),
        }
    }
}

/// Identidad exacta de un objeto (para guardarlo una sola vez en el diccionario).
#[derive(Hash, PartialEq, Eq)]
enum Ident {
    Null,
    Str(String),
    Bool(bool),
    Num(u64),
}

fn ident(o: &Obj) -> Ident {
    match o {
        Obj::Null => Ident::Null,
        Obj::Str(s) => Ident::Str(s.clone()),
        Obj::Bool(b) => Ident::Bool(*b),
        Obj::Num(x) => Ident::Num(x.to_bits()),
    }
}

fn obj_dict(rows: impl IntoIterator<Item = Obj>) -> Dict<Obj> {
    Dict::build(rows, ident)
}

/// Para cada valor distinto del diccionario, el primero que Python considera igual (True == 1,
/// 1.0 == 1). Los textos ya son todos distintos entre sí; solo se juntan números y sí/no.
fn equal_to(d: &Dict<Obj>) -> Vec<usize> {
    let mut first: FxHashMap<u64, usize> = FxHashMap::default();
    d.values().iter().enumerate().map(|(u, o)| match o {
        Obj::Num(x) => *first.entry(x.to_bits()).or_insert(u),
        Obj::Bool(b) => *first.entry(if *b { 1.0f64 } else { 0.0 }.to_bits()).or_insert(u),
        Obj::Null | Obj::Str(_) => u,
    }).collect()
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
pub(crate) fn obj_str(o: &Obj) -> String {
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
    pub fn from_table(t: Table) -> Frame {
        let rows = t.rows();
        let cols = t.names.into_iter().zip(t.columns).map(|(name, c)| {
            let (dtype, data) = match c {
                Column::Int(v) => ("int64", Data::Int(v)),
                Column::Float(v) => ("float64", Data::Float(v)),
                Column::Bool(v) if v.iter().all(Option::is_some) => ("bool", Data::Bool(v.into_iter().flatten().collect())),
                Column::Bool(v) => ("object", Data::Obj(obj_dict(v.into_iter().map(|x| x.map_or(Obj::Null, Obj::Bool))))),
                Column::Text(d) => ("object", Data::Obj(d.convert(|x| x.map_or(Obj::Null, Obj::Str)))),
                Column::Time(v) => ("datetime64[ns]", Data::Time(v)),
            };
            Col { name, dtype: dtype.into(), data }
        }).collect();
        // Si pandas usó la primera columna como índice y son números, esos son los rótulos.
        let index = match t.index {
            Some(l) if l.iter().all(|s| s.trim().parse::<usize>().is_ok()) => l.iter().map(|s| s.trim().parse().unwrap()).collect(),
            _ => (0..rows).collect(),
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
    /// Lo que hizo cada paso, con las mismas frases que el motor de la web (`actions`).
    pub actions: Vec<String>,
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
pub fn clean(table: Table) -> (Frame, Report) {
    clean_with(table, &mut |_, _| {})
}

/// La limpieza, avisando después de cada paso que cambia la tabla (nombre del paso como en las
/// fotos de Python: "1_nulos", "2_vacias", "4_textos"...). Sirve para encontrar dónde difiere.
pub fn clean_with(table: Table, snap: &mut dyn FnMut(&str, &Frame)) -> (Frame, Report) {
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
    step12_downcast(&mut f, &mut r);
    snap("12_memoria", &f);
    (f, r)
}

// 1. Encabezados y vacíos disfrazados ------------------------------------------------------------

fn step01_nulls(f: &mut Frame, r: &mut Report) {
    let hw = re(&RE_HEADER_WS, r"[\r\n\t]+");
    let mut renamed = Vec::new();
    for c in &mut f.cols {
        let name = hw.replace_all(&c.name, " ").trim().to_string();
        if name != c.name {
            renamed.push(format!("'{}' -> '{name}'", c.name));
            c.name = name;
        }
        let Data::Obj(d) = &mut c.data else { continue };
        let null_like = |o: &Obj| {
            let s = obj_str(o);
            let t = s.trim();
            t.is_empty() || NULL_TOKENS.contains(&t.to_lowercase().as_str())
        };
        let new_nulls: usize = d.values().iter().zip(d.counts()).filter(|(o, _)| **o != Obj::Null && null_like(o)).map(|(_, n)| n).sum();
        if new_nulls > 0 {
            r.nulls_detected.insert(c.name.clone(), new_nulls);
            // los demás quedan como estaban (pandas no los recorta en este caso)
            d.update(|o| (*o != Obj::Null && null_like(o)).then_some(Obj::Null), ident);
        } else {
            // recortados, y los True/False pasan a texto, como en pandas
            d.update(|o| match o {
                Obj::Null => None,
                Obj::Str(s) => (s.trim().len() != s.len()).then(|| Obj::Str(s.trim().to_string())),
                other => Some(Obj::Str(obj_str(other).trim().to_string())),
            }, ident);
        }
    }
    if !renamed.is_empty() {
        r.actions.push(format!("Se normalizaron encabezados con espacios o saltos: {}", renamed[..renamed.len().min(5)].join(", ")));
    }
    let total: usize = r.nulls_detected.values().sum();
    if total > 0 {
        r.actions.push(format!("Se convirtieron {total} celdas con valores 'N/A', '-', 's/d' o vacíos a NaN real."));
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
    if r.rows_dropped > 0 {
        r.actions.push(format!("Se eliminaron {} filas completamente vacías.", r.rows_dropped));
    }
    if !r.empty_cols.is_empty() {
        let list: Vec<String> = r.empty_cols.iter().map(|c| format!("'{c}'")).collect();
        r.actions.push(format!("Se eliminaron {} columna(s) completamente vacías: [{}].", r.empty_cols.len(), list.join(", ")));
    }
}

// 3. Formato regional ----------------------------------------------------------------------------

fn step03_locale(f: &Frame, r: &mut Report) {
    let (latam_re, us_re) = (re(&RE_LATAM, LATAM), re(&RE_US, US));
    let dmy = re(&RE_DMY, r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})");
    let (mut latam, mut us, mut dayfirst_ev, mut monthfirst_ev) = (0, 0, 0, 0);
    let sample = f.rows().min(200);
    for c in &f.cols {
        let Data::Obj(d) = &c.data else { continue };
        for o in d.iter().take(sample).filter(|o| **o != Obj::Null).take(30) {
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
    let thousands = if dec == ',' { '.' } else { ',' };
    r.actions.push(format!("Locale detectado: {locale} (decimal: '{dec}', miles: '{thousands}', dayfirst: {}).", py_bool(r.dayfirst)));
}

// 4. Textos: acentos (NFC) y espacios ------------------------------------------------------------

fn step04_strings(f: &mut Frame) {
    let ws = re(&RE_SPACES, r"[ \t]+");
    for c in &mut f.cols {
        let Data::Obj(d) = &mut c.data else { continue };
        d.update(|o| {
            let Obj::Str(s) = o else { return None };
            // Lo común es un texto ya prolijo: se revisa sin copiarlo.
            let tidy = is_nfc_quick(s.chars()) == IsNormalized::Yes && !s.contains("  ") && !s.contains('\t') && s.trim().len() == s.len();
            if tidy {
                return None;
            }
            let new = ws.replace_all(&s.nfc().collect::<String>(), " ").trim().to_string();
            (new != *s).then_some(Obj::Str(new))
        }, ident);
    }
}

// 5. Duplicados exactos --------------------------------------------------------------------------

/// Una columna lista para comparar filas: cada valor da un número, igual para dos valores que
/// pandas considera iguales (en objetos, el del primer valor igual: `equal_to`). Una fecha vacía es
/// `u64::MAX`, que sería 1 ns antes de 1970: ninguna fecha leída tiene esa precisión.
struct Comparable<'a> {
    col: &'a Col,
    ids: Vec<usize>,
}

impl<'a> Comparable<'a> {
    fn new(col: &'a Col) -> Self {
        let ids = match &col.data {
            Data::Obj(d) => equal_to(d),
            _ => Vec::new(),
        };
        Comparable { col, ids }
    }

    fn key(&self, i: usize) -> u64 {
        match &self.col.data {
            Data::Int(v) => (v[i] as f64).to_bits(),
            Data::Float(v) => if v[i].is_nan() { f64::NAN.to_bits() } else { v[i].to_bits() },
            Data::Bool(v) => v[i] as u64,
            Data::Time(v) => v[i].map_or(u64::MAX, |x| x as u64),
            Data::Obj(d) => self.ids[d.codes()[i] as usize] as u64,
        }
    }
}

/// Una fila, comparada columna por columna sin copiarla.
struct Row<'a> {
    cols: &'a [Comparable<'a>],
    i: usize,
}

impl std::hash::Hash for Row<'_> {
    fn hash<H: std::hash::Hasher>(&self, h: &mut H) {
        self.cols.iter().for_each(|c| c.key(self.i).hash(h));
    }
}

impl PartialEq for Row<'_> {
    fn eq(&self, other: &Self) -> bool {
        self.cols.iter().all(|c| c.key(self.i) == c.key(other.i))
    }
}

impl Eq for Row<'_> {}

/// Las filas que no repiten a una anterior (`~duplicated()`).
pub(crate) fn first_rows(f: &Frame) -> Vec<usize> {
    let cols: Vec<Comparable> = f.cols.iter().map(Comparable::new).collect();
    let mut seen = FxHashSet::default();
    (0..f.rows()).filter(|&i| seen.insert(Row { cols: &cols, i })).collect()
}

fn step05_dedupe(f: &mut Frame, r: &mut Report) {
    let keep = first_rows(f);
    r.duplicates_removed = f.rows() - keep.len();
    if r.duplicates_removed > 0 {
        f.keep_rows(&keep);
        r.actions.push(format!("Se eliminaron {} filas duplicadas exactas.", r.duplicates_removed));
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
        let Data::Obj(d) = &c.data else { continue };
        let sample: Vec<String> = d.iter().filter(|o| **o != Obj::Null).take(40).map(|o| obj_str(o).trim().to_string()).collect();
        if sample.is_empty() {
            continue;
        }
        let has_symbol = sample.iter().any(|s| s.contains(['$', '€', '£', '¥']));
        let has_pct = sample.iter().any(|s| s.contains('%'));
        let matches = sample.iter().filter(|s| pat.is_match(s)).count() as f64 / sample.len() as f64;
        if !(has_symbol || has_pct || matches > 0.6) {
            continue;
        }
        let converted: Vec<f64> = d.per_row(|o| {
            if *o == Obj::Null {
                return f64::NAN;
            }
            let mut s: String = obj_str(o).trim().chars().filter(|ch| !(matches!(ch, '$' | '€' | '£' | '¥') || ch.is_whitespace())).collect();
            s = s.replace('%', "");
            s = if r.dec_sep == ',' { s.replace('.', "").replace(',', ".") } else { s.replace(',', "") };
            py_float(&s).unwrap_or(f64::NAN)
        });
        let present = (c.len() - c.null_count()).max(1);
        let valid = converted.iter().filter(|x| !x.is_nan()).count();
        if valid as f64 / present as f64 > 0.6 {
            r.monetary.push(c.name.clone());
            r.actions.push(format!("Columna '{}': convertida de moneda/porcentaje a float64 usando separador decimal '{}'.", c.name, r.dec_sep));
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
        let non_null = c.len() - c.null_count();
        let Data::Obj(d) = &c.data else { continue };
        if non_null == 0 {
            continue;
        }
        let text = |o: &Obj| {
            let s = obj_str(o);
            if r.dec_sep == ',' { s.replace('.', "").replace(',', ".") } else { s.replace(',', "") }
        };
        let valid: usize = d.values().iter().zip(d.counts()).filter(|(o, _)| to_numeric(&text(o)).is_some()).map(|(_, n)| n).sum();
        if (valid as f64) / (non_null as f64) >= 0.75 {
            r.coerced.push(c.name.clone());
            r.actions.push(format!("Columna '{}': convertida exitosamente a numérico ({:.1}% de valores parseables).", c.name, valid as f64 / non_null as f64 * 100.0));
            let all_int = d.values().iter().all(|o| {
                let s = text(o);
                to_numeric(&s).is_some() && is_int_text(&s) && s.trim().parse::<i64>().is_ok()
            });
            (c.data, c.dtype) = if all_int {
                (Data::Int(d.per_row(|o| text(o).trim().parse::<i64>().unwrap_or(0))), "int64".into())
            } else {
                (Data::Float(d.per_row(|o| to_numeric(&text(o)).unwrap_or(f64::NAN))), "float64".into())
            };
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

pub(crate) fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

/// Año, mes y día de un día contado desde 1970-01-01 (la inversa de `days_from_civil`).
pub fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (yoe + era * 400 + i64::from(m <= 2), m, d)
}

type Fmt = (char, Vec<Part>, Option<usize>);

/// Si el texto se lee como fecha con alguno de los formatos comunes (día o mes primero, con hora o sin).
pub(crate) fn parses_as_date(s: &str) -> bool {
    [true, false].iter().any(|&dayfirst| {
        formats(dayfirst).iter().any(|(sep, parts, _)| [None, Some(2), Some(3)].iter().any(|&t| parse_with(s.trim(), *sep, parts, t).is_some()))
    })
}

/// Como `pd.to_datetime(..., dayfirst)`: el formato se adivina con la primera fecha y se aplica
/// estricto a todas (las que no encajan quedan vacías).
pub(crate) fn to_datetime(d: &Dict<Obj>, dayfirst: bool) -> Vec<Option<i64>> {
    let first = d.iter().find(|o| **o != Obj::Null).map(obj_str);
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
    d.per_row(|o| match (&guess, o) {
        (Some((sep, parts, time)), o) if *o != Obj::Null => parse_with(&obj_str(o), *sep, parts, *time),
        _ => None,
    })
}

fn step08_dates(f: &mut Frame, r: &mut Report) {
    let any = re(&RE_DATE_ANY, r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}");
    let amb = re(&RE_AMBIG, r"^(0?[1-9]|1[0-2])[/-](0?[1-9]|1[0-2])[/-]\d{2,4}");
    for c in &mut f.cols {
        if matches!(c.data, Data::Time(_)) {
            r.dates_parsed.push(c.name.clone());
            continue;
        }
        let non_null = c.len() - c.null_count();
        let Data::Obj(d) = &c.data else { continue };
        if non_null == 0 {
            continue;
        }
        let sample: Vec<String> = d.iter().filter(|o| **o != Obj::Null).take(30).map(|o| obj_str(o).trim().to_string()).collect();
        let hits = sample.iter().filter(|s| any.is_match(s)).count();
        if (hits as f64) / (sample.len() as f64) < 0.6 {
            continue;
        }
        let n_amb = sample.iter().filter(|s| amb.is_match(s)).count();
        if n_amb > 0 {
            r.ambiguous_dates.insert(c.name.clone(), n_amb);
        }
        let parsed = to_datetime(d, r.dayfirst);
        let valid = parsed.iter().filter(|x| x.is_some()).count();
        if (valid as f64) / (non_null as f64) >= 0.7 {
            c.data = Data::Time(parsed);
            c.dtype = "datetime64[ns]".into();
            r.dates_parsed.push(c.name.clone());
            let df = py_bool(r.dayfirst);
            let amb = if n_amb > 0 { format!(" ({n_amb} fechas potencialmente ambiguas tratadas con dayfirst={df})") } else { String::new() };
            r.actions.push(format!("Columna '{}': parseada como fecha con dayfirst={df}{amb}.", c.name));
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

/// El valor que quedaría en la posición `k` si `v` estuviera ordenado, sin ordenarlo todo.
fn nth(v: &mut [f64], k: usize) -> f64 {
    *v.select_nth_unstable_by(k, f64::total_cmp).1
}

/// Cuantil con interpolación lineal (como `Series.quantile`), de valores sin vacíos.
pub(crate) fn quantile(v: &mut [f64], q: f64) -> f64 {
    let pos = q * (v.len() - 1) as f64;
    let (lo, hi) = (pos.floor() as usize, pos.ceil() as usize);
    let a = nth(v, lo);
    let b = if hi == lo { a } else { nth(v, hi) };
    a + (b - a) * (pos - lo as f64)
}

fn floats_of(c: &Col) -> Vec<f64> {
    match &c.data {
        Data::Int(v) => v.iter().map(|x| *x as f64).collect(),
        Data::Float(v) => v.clone(),
        Data::Bool(v) => v.iter().map(|b| if *b { 1.0 } else { 0.0 }).collect(),
        Data::Obj(d) => d.per_row(|o| match o { Obj::Num(x) => *x, _ => f64::NAN }),
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
        let (q1, q3) = (quantile(&mut clean, 0.25), quantile(&mut clean, 0.75));
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

pub(crate) fn median(mut v: Vec<f64>) -> f64 {
    v.retain(|x| !x.is_nan());
    if v.is_empty() {
        return f64::NAN;
    }
    let n = v.len();
    if n % 2 == 1 { nth(&mut v, n / 2) } else { (nth(&mut v, n / 2 - 1) + nth(&mut v, n / 2)) / 2.0 }
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
                r.actions.push(format!("Columna '{}': {nulls} nulos imputados con la mediana ({}).", c.name, py_float_str(med)));
            }
            CATEGORICAL => {
                let fill = fill_mode(c);
                r.imputed.insert(c.name.clone(), nulls);
                r.actions.push(format!("Columna '{}': {nulls} nulos imputados con la moda ('{fill}').", c.name));
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
                    r.actions.push(format!("Columna '{}': {nulls} fechas nulas imputadas mediante forward-fill (serie temporal cronológica confirmada).", c.name));
                } else {
                    r.actions.push(format!("Columna '{}': {nulls} fechas nulas preservadas (dataset no cronológico / sin orden temporal comprobado).", c.name));
                }
            }
            _ => {
                // texto o identificador: el vacío pasa a "" (si era numérica, la columna queda mezclada)
                match &mut c.data {
                    Data::Obj(d) => d.update(|o| (*o == Obj::Null).then(|| Obj::Str(String::new())), ident),
                    Data::Float(v) => c.data = Data::Obj(obj_dict(v.iter().map(|x| if x.is_nan() { Obj::Str(String::new()) } else { Obj::Num(*x) }))),
                    _ => continue,
                }
                c.dtype = "object".into();
                r.imputed.insert(c.name.clone(), nulls);
            }
        }
    }
}

/// Llena los vacíos con la moda (la menor si hay empate, como `Series.mode()[0]`) y la devuelve
/// como la escribe Python.
fn fill_mode(c: &mut Col) -> String {
    match &mut c.data {
        Data::Float(v) => {
            let mut counts: FxHashMap<u64, usize> = FxHashMap::default();
            for x in v.iter().filter(|x| !x.is_nan()) {
                *counts.entry(x.to_bits()).or_default() += 1;
            }
            let top = counts.values().copied().max().unwrap_or(0);
            let mode = counts.iter().filter(|(_, n)| **n == top).map(|(b, _)| f64::from_bits(*b)).fold(f64::INFINITY, f64::min);
            v.iter_mut().filter(|x| x.is_nan()).for_each(|x| *x = mode);
            py_float_str(mode)
        }
        Data::Obj(d) => {
            // Conteo por valor como lo compara Python (True == 1); cada grupo, con su primer valor.
            let mut counts = vec![0; d.values().len()];
            for ((u, n), e) in d.counts().into_iter().enumerate().zip(equal_to(d)) {
                if d.values()[u] != Obj::Null {
                    counts[e] += n;
                }
            }
            let top = counts.iter().copied().max().unwrap_or(0);
            let mut modes: Vec<Obj> = (0..counts.len()).filter(|&u| top > 0 && counts[u] == top).map(|u| d.values()[u].clone()).collect();
            modes.sort_by(obj_cmp);
            let fill = modes.into_iter().next().unwrap_or(Obj::Str("Desconocido".into()));
            d.update(|o| (*o == Obj::Null).then(|| fill.clone()), ident);
            obj_str(&fill)
        }
        _ => String::new(),
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

fn step12_downcast(f: &mut Frame, r: &mut Report) {
    let mut shrunk = 0;
    for c in &mut f.cols {
        if r.monetary.contains(&c.name) || r.type_of(&c.name) == Some(ID) {
            continue;
        }
        match &mut c.data {
            Data::Float(v) => {
                // `to_numeric(downcast="float")`: a float32 solo si ningún valor cambia más de 5e-4.
                if v.iter().all(|x| x.is_nan() || (*x as f32 as f64 - x).abs() <= 5e-4 || (*x as f32 as f64) == *x) {
                    v.iter_mut().for_each(|x| *x = (*x as f32) as f64);
                    c.dtype = "float32".into();
                }
                shrunk += 1;
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
                shrunk += 1;
            }
            _ => {}
        }
    }
    if shrunk > 0 {
        r.actions.push(format!("Se optimizó memoria mediante downcasting selectivo en {shrunk} columnas continuas no-sensibles (columnas monetarias e IDs blindadas en float64)."));
    }
}

/// `str(bool)` de Python.
fn py_bool(b: bool) -> &'static str {
    if b { "True" } else { "False" }
}

#[cfg(test)]
mod tests {
    use super::{equal_to, obj_dict, Obj};

    #[test]
    fn los_objetos_se_comparan_como_en_python() {
        let d = obj_dict([Obj::Bool(true), Obj::Num(1.0), Obj::Str("1".into()), Obj::Null, Obj::Num(0.0), Obj::Bool(false)]);
        assert_eq!(equal_to(&d), vec![0, 0, 2, 3, 4, 4]); // True == 1 y False == 0; el texto "1" es otro valor
    }
}
