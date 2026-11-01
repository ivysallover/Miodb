//! Varias planillas en una, antes de limpiar (así la limpieza, el perfil y los modelos corren sobre el
//! resultado igual que con una sola). Dos maneras de unirlas, como las une una persona:
//!
//! - **Apilar**: las que tienen las mismas columnas (enero, febrero, marzo…) van una debajo de la
//!   otra, con la columna `archivo` para saber de dónde salió cada fila.
//! - **Cruzar**: a la más grande (las ventas, los movimientos) se le suman las columnas de las otras
//!   (clientes, productos) por una columna en común, aunque se llame distinto (`cliente_id` ↔ `id`).
//!   La clave se elige por los valores, no solo por el nombre: en la otra tabla tiene que ser única y
//!   los valores de la grande tienen que encontrarse ahí. Nunca se pierden filas: una venta sin su
//!   cliente queda, con los datos del cliente vacíos.
//!
//! Lo que no se puede unir se dice, con el motivo. Cada paso queda en `steps` para la pantalla.

use crate::dates::timestamp;
use crate::dict::TextBuilder;
use crate::reader::{Column, Table};
use rustc_hash::{FxHashMap, FxHashSet};
use serde_json::{json, Value};
use unicode_normalization::char::is_combining_mark;
use unicode_normalization::UnicodeNormalization;

/// Una planilla leída y el nombre de su archivo.
#[derive(Clone)]
pub struct Part {
    pub file: String,
    pub table: Table,
}

/// Lo que se hizo con cada planilla.
#[derive(Debug, Clone, PartialEq)]
pub enum Step {
    /// Estas planillas tenían las mismas columnas y se apilaron; `renamed`: `(archivo, como venía, como quedó)`,
    /// las columnas que en algún archivo se llamaban distinto.
    Stacked { files: Vec<String>, rows: usize, renamed: Vec<(String, String, String)> },
    /// Esta planilla se cruzó con la principal por `key` (en la principal) = `other_key` (en esta).
    Joined { file: String, key: String, other_key: String, matched: f64, added: Vec<String> },
    /// Esta planilla no se pudo unir.
    Skipped { file: String, reason: String },
}

impl Step {
    pub fn json(&self) -> Value {
        match self {
            Step::Stacked { files, rows, renamed } => json!({
                "tipo": "apilado", "archivos": files, "filas": rows,
                "renombradas": renamed.iter().map(|(f, from, to)| json!({ "archivo": f, "de": from, "a": to })).collect::<Vec<_>>(),
            }),
            Step::Joined { file, key, other_key, matched, added } => {
                json!({ "tipo": "cruzado", "archivo": file, "clave": key, "clave_otra": other_key, "encontradas": matched, "columnas": added })
            }
            Step::Skipped { file, reason } => json!({ "tipo": "omitido", "archivo": file, "motivo": reason }),
        }
    }
}

pub struct Combined {
    pub table: Table,
    pub steps: Vec<Step>,
    /// La planilla principal (la primera de las apiladas, si se apilaron).
    pub main: String,
    /// Qué pasó con cada planilla y con qué claves se puede cruzar, para revisarlo.
    pub files: Vec<FileInfo>,
}

/// Coinciden las columnas de dos planillas si comparten al menos esta parte de los nombres…
const SAME_COLUMNS: f64 = 0.8;
/// …o esta, si además son del mismo reporte (`ventas_2023.csv`, `ventas_2024.csv`): el formato cambia con los años.
const SAME_REPORT_COLUMNS: f64 = 0.5;
/// Qué tan parecidos tienen que ser dos nombres para tomar una columna por la otra.
const SAME_NAME: f64 = 0.5;
/// En la otra tabla, la clave tiene que ser única (casi: se toleran repetidos sueltos).
const UNIQUE_KEY: f64 = 0.98;
/// Al menos esta parte de las filas de la principal tiene que encontrar su pareja para cruzar…
const MIN_MATCH: f64 = 0.5;
/// …o esta, si los nombres de las columnas no se parecen.
const MIN_MATCH_UNNAMED: f64 = 0.9;
/// Los nombres que suelen tener las claves de una tabla de referencia.
const ID_WORDS: [&str; 9] = ["id", "codigo", "cod", "code", "key", "clave", "nro", "numero", "sku"];

/// El nombre para comparar: sin tildes, en minúscula y con `_` entre palabras ("Código Cliente" → "codigo_cliente").
fn norm(s: &str) -> String {
    let plain: String = s.nfd().filter(|c| !is_combining_mark(*c)).collect::<String>().to_lowercase();
    plain.split(|c: char| !c.is_alphanumeric()).filter(|w| !w.is_empty()).collect::<Vec<_>>().join("_")
}

/// El nombre del archivo sin extensión, para comparar ("Clientes 2025.csv" → "clientes_2025").
fn base(file: &str) -> String {
    norm(file.rsplit_once('.').map_or(file, |(b, _)| b))
}

/// Si la palabra nombra a la tabla: igual o en plural ("cliente" con clientes.csv, "sucursal" con sucursales.csv).
fn names_table(word: &str, table: &str) -> bool {
    table.split('_').any(|t| t == word || t == format!("{word}s") || t == format!("{word}es"))
}

fn names(t: &Table) -> FxHashSet<String> {
    t.names.iter().map(|n| norm(n)).collect()
}

fn shared(a: &FxHashSet<String>, b: &FxHashSet<String>) -> f64 {
    a.intersection(b).count() as f64 / (a.len().max(b.len()).max(1) as f64)
}

/// De qué reporte es un archivo: su nombre sin años ni números ("ventas_detalle_2023" → "ventas_detalle").
fn report_of(file: &str) -> String {
    base(file).split('_').filter(|w| !w.chars().any(|c| c.is_ascii_digit())).collect::<Vec<_>>().join("_")
}

/// Cuánto se parecen dos nombres: uno es el principio del otro (`precio_unit`, `precio_unitario`) o
/// comparten palabras (`stock_final`, `stock_cierre`).
fn name_likeness(a: &str, b: &str) -> f64 {
    if a.starts_with(b) || b.starts_with(a) {
        return 1.0;
    }
    let (wa, wb): (FxHashSet<&str>, FxHashSet<&str>) = (a.split('_').collect(), b.split('_').collect());
    wa.intersection(&wb).count() as f64 / wa.len().max(wb.len()).max(1) as f64
}

/// A la planilla de un mismo reporte le pone los nombres de `group` a las columnas que se llaman distinto
/// y se parecen; devuelve `(como venía, como quedó)`. Las que no tienen pareja siguen siendo columnas aparte.
fn align_names(p: &mut Part, group: &FxHashSet<String>) -> Vec<(String, String)> {
    let mine: FxHashSet<String> = names(&p.table);
    let mut free: Vec<&String> = group.iter().filter(|g| !mine.contains(*g)).collect();
    free.sort();
    let mut out = Vec::new();
    for name in &mut p.table.names {
        let k = norm(name);
        if group.contains(&k) {
            continue;
        }
        let best = free.iter().enumerate().map(|(i, g)| (i, name_likeness(&k, g))).filter(|(_, s)| *s >= SAME_NAME).max_by(|a, b| a.1.total_cmp(&b.1));
        if let Some((i, _)) = best {
            let to = free.remove(i).clone();
            out.push((name.clone(), to.clone()));
            *name = to;
        }
    }
    out
}

/// El valor de una celda como texto (para apilar columnas de tipos distintos); `None` = vacía.
fn cell_text(c: &Column, i: usize) -> Option<String> {
    match c {
        Column::Int(v) => Some(v[i].to_string()),
        Column::Float(v) => (!v[i].is_nan()).then(|| v[i].to_string()),
        Column::Bool(v) => v[i].map(|b| if b { "True" } else { "False" }.to_string()),
        Column::Text(d) => d.get(i).clone(),
        Column::Time(v) => v[i].map(timestamp),
    }
}

#[derive(PartialEq, Clone, Copy)]
enum Kind {
    Int,
    Float,
    Bool,
    Time,
    Text,
}

fn kind(c: &Column) -> Kind {
    match c {
        Column::Int(_) => Kind::Int,
        Column::Float(_) => Kind::Float,
        Column::Bool(_) => Kind::Bool,
        Column::Time(_) => Kind::Time,
        Column::Text(_) => Kind::Text,
    }
}

/// Una columna hecha de pedazos (uno por planilla, `None` si esa planilla no la tiene), con el tipo
/// que les sirve a todos: enteros con decimales o vacíos pasan a decimales; tipos que no se mezclan, a texto.
fn concat(pieces: &[(Option<&Column>, usize)]) -> Column {
    let kinds: Vec<Kind> = pieces.iter().filter_map(|(c, _)| c.map(kind)).collect();
    let missing = pieces.iter().any(|(c, _)| c.is_none());
    let all = |k: Kind| kinds.iter().all(|&x| x == k);
    let target = if all(Kind::Int) && !missing {
        Kind::Int
    } else if kinds.iter().all(|&k| k == Kind::Int || k == Kind::Float) {
        Kind::Float
    } else if all(Kind::Bool) {
        Kind::Bool
    } else if all(Kind::Time) {
        Kind::Time
    } else {
        Kind::Text
    };
    match target {
        Kind::Int => Column::Int(pieces.iter().flat_map(|(c, _)| match c {
            Some(Column::Int(v)) => v.clone(),
            _ => unreachable!("todas enteras"),
        }).collect()),
        Kind::Float => Column::Float(pieces.iter().flat_map(|&(c, n)| match c {
            Some(Column::Int(v)) => v.iter().map(|&x| x as f64).collect(),
            Some(Column::Float(v)) => v.clone(),
            _ => vec![f64::NAN; n],
        }).collect()),
        Kind::Bool => Column::Bool(pieces.iter().flat_map(|&(c, n)| match c {
            Some(Column::Bool(v)) => v.clone(),
            _ => vec![None; n],
        }).collect()),
        Kind::Time => Column::Time(pieces.iter().flat_map(|&(c, n)| match c {
            Some(Column::Time(v)) => v.clone(),
            _ => vec![None; n],
        }).collect()),
        Kind::Text => {
            let mut b = TextBuilder::default();
            for &(c, n) in pieces {
                for i in 0..n {
                    b.push(c.and_then(|c| cell_text(c, i)).as_deref());
                }
            }
            Column::Text(b.finish())
        }
    }
}

/// El nombre de la columna que dice de dónde salió cada fila (sin pisar una que ya exista).
fn origin_name(t: &Table) -> String {
    ["archivo", "archivo_origen"].into_iter().find(|n| !t.names.iter().any(|x| norm(x) == *n)).unwrap_or("archivo_de_origen").to_string()
}

/// Apila planillas con las mismas columnas (en el orden en que llegaron), más la columna de origen.
fn stack(parts: Vec<Part>) -> Table {
    let mut order: Vec<(String, String)> = Vec::new(); // (normalizado, como se muestra)
    for p in &parts {
        for n in &p.table.names {
            let k = norm(n);
            if !order.iter().any(|(o, _)| *o == k) {
                order.push((k, n.clone()));
            }
        }
    }
    fn col<'a>(p: &'a Part, k: &str) -> Option<&'a Column> {
        p.table.names.iter().position(|n| norm(n) == k).map(|j| &p.table.columns[j])
    }
    let mut names: Vec<String> = order.iter().map(|(_, n)| n.clone()).collect();
    let mut columns: Vec<Column> = order.iter().map(|(k, _)| concat(&parts.iter().map(|p| (col(p, k), p.table.rows())).collect::<Vec<_>>())).collect();
    let mut origin = TextBuilder::default();
    for p in &parts {
        for _ in 0..p.table.rows() {
            origin.push(Some(&p.file));
        }
    }
    let first = Table { names: names.clone(), columns: Vec::new(), index: None };
    names.push(origin_name(&first));
    columns.push(Column::Text(origin.finish()));
    Table { names, columns, index: None }
}

/// Una columna lista para buscar claves: sus valores distintos (solo letras y números, en minúscula; los
/// enteros como enteros, también si vienen como decimales sin parte decimal), cuántas filas tiene cada uno
/// y cuál tiene cada fila (`NO_KEY` si está vacía). Se arma una vez por columna: con varias planillas se
/// prueban todas contra todas. Fechas, sí/no y decimales de verdad no sirven de clave.
struct Keys {
    of_row: Vec<u32>,
    values: Vec<String>,
    rows: Vec<usize>,
    present: usize,
}
const NO_KEY: u32 = u32::MAX;

impl Keys {
    fn of(c: &Column) -> Option<Keys> {
        let (of_row, values): (Vec<u32>, Vec<String>) = match c {
            Column::Int(v) => numbers_as_keys(v.iter().map(|x| Some(*x))),
            Column::Float(v) if v.iter().all(|x| x.is_nan() || x.fract() == 0.0) => numbers_as_keys(v.iter().map(|x| (!x.is_nan()).then_some(*x as i64))),
            Column::Text(d) => {
                let mut texts = Vec::new();
                let map: Vec<u32> = d.values().iter().map(|s| {
                    let k: String = s.as_deref().unwrap_or("").chars().filter(|c| c.is_alphanumeric()).flat_map(char::to_lowercase).collect();
                    if k.is_empty() {
                        return NO_KEY;
                    }
                    texts.push(k);
                    texts.len() as u32 - 1
                }).collect();
                (d.codes().iter().map(|&c| map[c as usize]).collect(), texts)
            }
            _ => return None,
        };
        let mut rows = vec![0; values.len()];
        let mut present = 0;
        for &k in of_row.iter().filter(|k| **k != NO_KEY) {
            rows[k as usize] += 1;
            present += 1;
        }
        Some(Keys { of_row, values, rows, present })
    }
}

fn numbers_as_keys(v: impl Iterator<Item = Option<i64>>) -> (Vec<u32>, Vec<String>) {
    let mut place: FxHashMap<i64, u32> = FxHashMap::default();
    let mut values = Vec::new();
    let of_row = v.map(|x| x.map_or(NO_KEY, |x| *place.entry(x).or_insert_with(|| {
        values.push(x.to_string());
        values.len() as u32 - 1
    }))).collect();
    (of_row, values)
}

/// Cuánto se parecen los nombres de una posible clave: igual (2), la otra se llama "id" y esta nombra a
/// la tabla ("cliente_id" con "id" de clientes.csv, 2), o una contiene a la otra (1).
fn name_score(main: &str, other: &str, other_table: &str) -> f64 {
    let (m, o) = (norm(main), norm(other));
    if m == o || (ID_WORDS.contains(&o.as_str()) && m.split('_').any(|w| names_table(w, other_table))) {
        2.0
    } else if (m.contains(&o) || o.contains(&m)) && m.split('_').chain(o.split('_')).any(|w| ID_WORDS.contains(&w)) {
        1.0
    } else {
        0.0
    }
}

struct Match {
    main: usize,
    other: usize,
    matched: f64,
    score: f64,
    /// Si pasa las reglas para cruzar sola (sin que la persona la elija).
    auto: bool,
}

/// Lo mínimo para ofrecer una clave a mano: que alguna fila encuentre su pareja.
const MIN_MATCH_OFFERED: f64 = 0.2;
/// Cuántas claves posibles se ofrecen por planilla.
const OFFERED: usize = 6;

/// Las claves con las que se puede cruzar `main` con `other`, de la mejor a la peor: las que la otra
/// tabla tiene sin repetir y con alguna coincidencia. `auto` marca las que pasan las reglas para
/// cruzar sin preguntar; las otras solo se usan si la persona las elige.
fn candidates(main: &Table, main_keys: &[Option<Keys>], other: &Table, other_table: &str, skip: &str) -> Vec<Match> {
    let mut found = Vec::new();
    for (j, oc) in other.columns.iter().enumerate() {
        let Some(ok) = Keys::of(oc) else { continue };
        // Sin repetir en la otra tabla (casi): si no, cruzar repetiría filas.
        let known: FxHashSet<&str> = ok.values.iter().map(String::as_str).collect();
        if ok.present == 0 || (known.len() as f64) < UNIQUE_KEY * ok.present as f64 {
            continue;
        }
        for (i, mk) in main_keys.iter().enumerate() {
            let Some(mk) = mk.as_ref().filter(|m| m.present > 0 && main.names[i] != skip) else { continue };
            let hits: usize = mk.values.iter().zip(&mk.rows).filter(|(v, _)| known.contains(v.as_str())).map(|(_, n)| n).sum();
            let matched = hits as f64 / mk.present as f64;
            if matched < MIN_MATCH_OFFERED {
                continue;
            }
            let named = name_score(&main.names[i], &other.names[j], other_table);
            // Sin nombres parecidos, solo códigos de texto: dos columnas de números chicos coinciden por casualidad.
            let unnamed_ok = matched >= MIN_MATCH_UNNAMED && matches!(main.columns[i], Column::Text(_));
            let auto = matched >= MIN_MATCH && (named > 0.0 || unnamed_ok);
            found.push(Match { main: i, other: j, matched, score: named + 3.0 * matched, auto });
        }
    }
    found.sort_by(|a, b| b.auto.cmp(&a.auto).then(b.score.total_cmp(&a.score)));
    found.truncate(OFFERED);
    found
}

/// Para cada fila de la principal, su fila en la otra tabla (la primera con esa clave).
fn rows_of(mk: &Keys, other: &Column) -> Vec<Option<usize>> {
    let ok = Keys::of(other).expect("una columna que ya sirvió de clave");
    let mut at: FxHashMap<&str, usize> = FxHashMap::default();
    for (r, &k) in ok.of_row.iter().enumerate() {
        if k != NO_KEY {
            at.entry(ok.values[k as usize].as_str()).or_insert(r);
        }
    }
    let by_value: Vec<Option<usize>> = mk.values.iter().map(|v| at.get(v.as_str()).copied()).collect();
    mk.of_row.iter().map(|&k| if k == NO_KEY { None } else { by_value[k as usize] }).collect()
}

/// Una columna con las filas `rows` de `c` (vacía donde no hay pareja).
fn gather(c: &Column, rows: &[Option<usize>]) -> Column {
    let all = rows.iter().all(Option::is_some);
    match c {
        Column::Int(v) if all => Column::Int(rows.iter().map(|r| v[r.expect("todas")]).collect()),
        Column::Int(v) => Column::Float(rows.iter().map(|r| r.map_or(f64::NAN, |r| v[r] as f64)).collect()),
        Column::Float(v) => Column::Float(rows.iter().map(|r| r.map_or(f64::NAN, |r| v[r])).collect()),
        Column::Bool(v) => Column::Bool(rows.iter().map(|r| r.and_then(|r| v[r])).collect()),
        Column::Time(v) => Column::Time(rows.iter().map(|r| r.and_then(|r| v[r])).collect()),
        Column::Text(d) => {
            let mut b = TextBuilder::default();
            for r in rows {
                b.push(r.and_then(|r| d.get(r).as_deref()));
            }
            Column::Text(b.finish())
        }
    }
}

/// Lo que la persona eligió al revisar la unión: planillas que quedan afuera y, por planilla, con qué
/// claves cruzarla (`(columna de la principal, columna de esa planilla)`) o `None` para no cruzarla.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct Choices {
    pub out: Vec<String>,
    pub keys: Vec<(String, Option<(String, String)>)>,
}

impl Choices {
    /// Desde lo que manda la pantalla: `{ "fuera": [archivo], "claves": { archivo: [principal, otra] | null } }`.
    pub fn from_json(v: &Value) -> Choices {
        let out = v["fuera"].as_array().map_or_else(Vec::new, |a| a.iter().filter_map(|x| x.as_str().map(str::to_string)).collect());
        let keys = v["claves"].as_object().map_or_else(Vec::new, |o| {
            o.iter()
                .map(|(file, k)| {
                    let pair = k.as_array().and_then(|a| Some((a.first()?.as_str()?.to_string(), a.get(1)?.as_str()?.to_string())));
                    (file.clone(), pair)
                })
                .collect()
        });
        Choices { out, keys }
    }

    pub fn json(&self) -> Value {
        let keys: serde_json::Map<String, Value> = self.keys.iter().map(|(f, k)| (f.clone(), k.as_ref().map_or(Value::Null, |(m, o)| json!([m, o])))).collect();
        json!({ "fuera": self.out, "claves": keys })
    }

    fn key(&self, file: &str) -> Option<&Option<(String, String)>> {
        self.keys.iter().find(|(f, _)| f == file).map(|(_, k)| k)
    }
}

/// Una clave posible para cruzar una planilla.
#[derive(Debug, Clone, PartialEq)]
pub struct Candidate {
    pub key: String,
    pub other_key: String,
    pub matched: f64,
    /// Si es de las que MIO usaría sola.
    pub auto: bool,
}

/// Qué pasó con cada planilla, para revisar la unión.
#[derive(Debug, Clone, PartialEq)]
pub struct FileInfo {
    pub file: String,
    pub rows: usize,
    pub columns: usize,
    /// "principal" (de la tabla principal, sola o apilada), "cruzada", "sin_cruzar" o "fuera".
    pub role: &'static str,
    /// Con cuántas planillas quedó apilada (contándose); 1 si va sola.
    pub stacked: usize,
    /// Las claves con las que se puede cruzar (las que no son principales) y la elegida.
    pub candidates: Vec<Candidate>,
    pub chosen: Option<(String, String)>,
}

impl FileInfo {
    pub fn json(&self) -> Value {
        json!({
            "archivo": self.file, "filas": self.rows, "columnas": self.columns, "papel": self.role, "apiladas": self.stacked,
            "candidatas": self.candidates.iter().map(|c| json!({ "clave": c.key, "clave_otra": c.other_key, "encontradas": c.matched, "sugerida": c.auto })).collect::<Vec<_>>(),
            "elegida": self.chosen.as_ref().map(|(m, o)| json!([m, o])),
        })
    }
}

/// Une las planillas con lo elegido por defecto (todo adentro, las claves que MIO sugiere).
pub fn combine(parts: Vec<Part>) -> Combined {
    combine_with(parts, &Choices::default())
}

/// Une las planillas: apila las que tienen las mismas columnas y cruza las demás con la principal
/// (la que más filas tiene), respetando lo que eligió la persona (`choices`). Con una sola, la
/// devuelve tal cual.
pub fn combine_with(parts: Vec<Part>, choices: &Choices) -> Combined {
    let mut steps = Vec::new();
    let mut files: Vec<FileInfo> = parts
        .iter()
        .map(|p| FileInfo { file: p.file.clone(), rows: p.table.rows(), columns: p.table.names.len(), role: "fuera", stacked: 1, candidates: Vec::new(), chosen: None })
        .collect();
    let (kept, out): (Vec<Part>, Vec<Part>) = parts.into_iter().partition(|p| !choices.out.contains(&p.file));
    let kept = if kept.is_empty() { out.into_iter().take(1).collect() } else { kept }; // nunca queda sin ninguna
    for f in &mut files {
        if choices.out.contains(&f.file) && !kept.iter().any(|p| p.file == f.file) {
            steps.push(Step::Skipped { file: f.file.clone(), reason: "La sacaste de la unión.".into() });
        }
    }
    fn info(files: &[FileInfo], file: &str) -> usize {
        files.iter().position(|f| f.file == file).expect("planilla conocida")
    }

    // Grupos de planillas con las mismas columnas (o del mismo reporte y parecidas), en el orden en que llegaron.
    let mut groups: Vec<(FxHashSet<String>, String, Vec<Part>, Vec<(String, String, String)>)> = Vec::new();
    for mut p in kept {
        let n = names(&p.table);
        let report = report_of(&p.file);
        let same = |g: &FxHashSet<String>, r: &String| shared(g, &n) >= SAME_COLUMNS || (!report.is_empty() && *r == report && shared(g, &n) >= SAME_REPORT_COLUMNS);
        match groups.iter_mut().find(|(g, r, _, _)| same(g, r)) {
            Some((g, _, members, renamed)) => {
                renamed.extend(align_names(&mut p, g).into_iter().map(|(from, to)| (p.file.clone(), from, to)));
                members.push(p);
            }
            None => groups.push((n, report, vec![p], Vec::new())),
        }
    }
    let mut tables: Vec<(String, Vec<String>, Table)> = groups
        .into_iter()
        .map(|(_, _, g, renamed)| {
            let names: Vec<String> = g.iter().map(|p| p.file.clone()).collect();
            if g.len() == 1 {
                let p = g.into_iter().next().expect("uno");
                return (p.file, names, p.table);
            }
            let t = stack(g);
            steps.push(Step::Stacked { files: names.clone(), rows: t.rows(), renamed });
            (names[0].clone(), names, t)
        })
        .collect();
    for (_, group, _) in &tables {
        for f in group {
            let k = info(&files, f);
            files[k].stacked = group.len();
        }
    }
    tables.sort_by_key(|(_, _, t)| std::cmp::Reverse(t.rows()));
    let rest = tables.split_off(1);
    let (main_file, main_group, mut main) = tables.pop().expect("al menos una planilla");
    for f in &main_group {
        let k = info(&files, f);
        files[k].role = "principal";
    }
    let origin = main.names.last().filter(|n| norm(n).starts_with("archivo")).cloned().unwrap_or_default();

    // Cruzar hasta que no se pueda más: una tabla puede necesitar columnas que trajo otra (ventas → productos → categorías).
    let mut rest: Vec<(String, Vec<String>, Table)> = rest;
    let mut reasons: FxHashMap<String, String> = FxHashMap::default();
    let mut main_keys: Vec<Option<Keys>> = main.columns.iter().map(Keys::of).collect();
    loop {
        let before = rest.len();
        let mut waiting = Vec::new();
        for (file, group, other) in rest {
            let found = candidates(&main, &main_keys, &other, &base(&file), &origin);
            let k = info(&files, &file);
            files[k].candidates = found.iter().map(|m| Candidate { key: main.names[m.main].clone(), other_key: other.names[m.other].clone(), matched: m.matched, auto: m.auto }).collect();
            let pick = match choices.key(&file) {
                Some(None) => {
                    reasons.insert(file.clone(), "Elegiste no cruzarla.".into());
                    None
                }
                Some(Some((mk, ok))) => {
                    let m = found.into_iter().find(|m| main.names[m.main] == *mk && other.names[m.other] == *ok);
                    if m.is_none() {
                        reasons.insert(file.clone(), format!("La clave elegida ({mk} = {ok}) ya no coincide."));
                    }
                    m
                }
                None => found.into_iter().find(|m| m.auto),
            };
            let Some(m) = pick else {
                waiting.push((file, group, other));
                continue;
            };
            let have: FxHashSet<String> = main.names.iter().map(|n| norm(n)).collect();
            let rows = rows_of(main_keys[m.main].as_ref().expect("una clave"), &other.columns[m.other]);
            let mut added = Vec::new();
            for (j, (name, col)) in other.names.iter().zip(&other.columns).enumerate() {
                if j == m.other {
                    continue;
                }
                let shown = if have.contains(&norm(name)) { format!("{name} ({})", base(&file)) } else { name.clone() };
                let joined = gather(col, &rows);
                main_keys.push(Keys::of(&joined));
                main.columns.push(joined);
                main.names.push(shown.clone());
                added.push(shown);
            }
            let (key, other_key) = (main.names[m.main].clone(), other.names[m.other].clone());
            for f in &group {
                let k = info(&files, f);
                files[k].role = "cruzada";
                files[k].chosen = Some((key.clone(), other_key.clone()));
            }
            reasons.remove(&file);
            steps.push(Step::Joined { file, key, other_key, matched: m.matched, added });
        }
        rest = waiting;
        if rest.is_empty() || rest.len() == before {
            break;
        }
    }
    for (file, group, _) in rest {
        for f in &group {
            let k = info(&files, f);
            files[k].role = "sin_cruzar";
        }
        let reason = reasons.remove(&file).unwrap_or_else(|| "No tiene una columna que coincida con la principal (mismos valores y, en esta, sin repetir).".into());
        steps.push(Step::Skipped { file, reason });
    }
    main.index = None;
    Combined { table: main, steps, main: main_file, files }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dict::Dict;

    fn text(v: &[&str]) -> Column {
        Column::Text(Dict::build(v.iter().map(|s| (!s.is_empty()).then(|| s.to_string())), |s| s.clone()))
    }
    fn table(names: &[&str], columns: Vec<Column>) -> Table {
        Table { names: names.iter().map(|s| s.to_string()).collect(), columns, index: None }
    }
    fn part(file: &str, t: Table) -> Part {
        Part { file: file.into(), table: t }
    }
    fn texts(c: &Column) -> Vec<Option<String>> {
        (0..c.len()).map(|i| cell_text(c, i)).collect()
    }

    /// Un mismo reporte con el formato cambiado (columnas renombradas, otra de más, otro orden) se apila;
    /// dos planillas distintas con pocas columnas en común, no.
    #[test]
    fn apila_un_reporte_aunque_cambien_las_columnas() {
        let y23 = table(&["ticket", "sku", "precio_unitario", "subtotal"], vec![text(&["a"]), text(&["x"]), Column::Float(vec![1.0]), Column::Float(vec![2.0])]);
        let y25 = table(&["subtotal", "ticket", "sku", "precio_unit", "canal"], vec![Column::Float(vec![4.0]), text(&["b"]), text(&["y"]), Column::Float(vec![3.0]), text(&["online"])]);
        let c = combine(vec![part("ventas_2023.csv", y23), part("ventas_2025.csv", y25)]);
        let Step::Stacked { rows, renamed, .. } = &c.steps[0] else { panic!("{:?}", c.steps) };
        assert_eq!(*rows, 2);
        assert_eq!(renamed, &[("ventas_2025.csv".to_string(), "precio_unit".to_string(), "precio_unitario".to_string())]);
        assert_eq!(c.table.names, ["ticket", "sku", "precio_unitario", "subtotal", "canal", "archivo"]);
        let at = |n: &str| c.table.names.iter().position(|x| x == n).unwrap();
        assert_eq!(texts(&c.table.columns[at("precio_unitario")]), [Some("1".to_string()), Some("3".to_string())]);
        assert_eq!(texts(&c.table.columns[at("subtotal")]), [Some("2".to_string()), Some("4".to_string())]);
        assert_eq!(texts(&c.table.columns[at("canal")]), [None, Some("online".to_string())]);

        // Otro reporte con las mismas pocas columnas no se apila.
        let otra = table(&["ticket", "sku", "motivo", "monto"], vec![text(&["a"]), text(&["x"]), text(&["roto"]), Column::Float(vec![9.0])]);
        let y23 = table(&["ticket", "sku", "precio_unitario", "subtotal"], vec![text(&["a"]), text(&["x"]), Column::Float(vec![1.0]), Column::Float(vec![2.0])]);
        let c = combine(vec![part("ventas_2023.csv", y23), part("devoluciones.csv", otra)]);
        assert!(!c.steps.iter().any(|s| matches!(s, Step::Stacked { .. })), "{:?}", c.steps);
    }

    /// `sku-001` y `SKU001` encuentran a `SKU-001`.
    #[test]
    fn cruza_sin_importar_como_se_escribe_el_codigo() {
        let ventas = table(&["sku", "n"], vec![text(&["SKU-001", "sku-001", "SKU001", "SKU-002", "SKU-001"]), Column::Int(vec![1, 2, 3, 4, 5])]);
        let productos = table(&["sku", "marca"], vec![text(&["SKU-001", "SKU-002"]), text(&["Acme", "Otra"])]);
        let c = combine(vec![part("ventas.csv", ventas), part("productos.csv", productos)]);
        let marca = c.table.names.iter().position(|x| x == "marca").unwrap();
        assert_eq!(texts(&c.table.columns[marca]).iter().flatten().filter(|m| *m == "Acme").count(), 4);
    }

    #[test]
    fn apila_los_meses_con_la_columna_de_origen_y_tipos_que_sirven_a_todos() {
        let enero = table(&["Fecha", "Ventas", "Sucursal"], vec![text(&["01/01/2025", "02/01/2025"]), Column::Int(vec![10, 20]), text(&["Norte", "Sur"])]);
        let febrero = table(&["fecha", "ventas", "sucursal"], vec![text(&["01/02/2025"]), Column::Float(vec![5.5]), text(&["Norte"])]);
        let c = combine(vec![part("enero.csv", enero), part("febrero.csv", febrero)]);
        assert_eq!(c.table.names, ["Fecha", "Ventas", "Sucursal", "archivo"]);
        assert_eq!(c.table.rows(), 3);
        assert_eq!(c.table.columns[1], Column::Float(vec![10.0, 20.0, 5.5]));
        assert_eq!(texts(&c.table.columns[3]), [Some("enero.csv".into()), Some("enero.csv".into()), Some("febrero.csv".into())]);
        assert_eq!(c.steps, [Step::Stacked { files: vec!["enero.csv".into(), "febrero.csv".into()], rows: 3, renamed: Vec::new() }]);
    }

    #[test]
    fn cruza_por_la_clave_aunque_se_llame_distinto_y_no_pierde_filas() {
        let ventas = table(&["cliente_id", "monto"], vec![Column::Int(vec![1, 2, 1, 9]), Column::Int(vec![100, 200, 300, 400])]);
        let clientes = table(&["id", "Nombre", "Segmento"], vec![text(&["1", "2", "3"]), text(&["Ana", "Beto", "Caro"]), text(&["A", "B", "A"])]);
        let c = combine(vec![part("clientes.csv", clientes), part("ventas.csv", ventas)]);
        assert_eq!(c.table.names, ["cliente_id", "monto", "Nombre", "Segmento"]);
        assert_eq!(c.table.rows(), 4, "la venta del cliente 9 queda, sin datos del cliente");
        assert_eq!(texts(&c.table.columns[2]), [Some("Ana".into()), Some("Beto".into()), Some("Ana".into()), None]);
        assert_eq!(c.steps, [Step::Joined { file: "clientes.csv".into(), key: "cliente_id".into(), other_key: "id".into(), matched: 0.75, added: vec!["Nombre".into(), "Segmento".into()] }]);
    }

    #[test]
    fn cruza_en_cadena_y_dice_lo_que_no_pudo_unir() {
        let ventas = table(&["sku", "unidades"], vec![text(&["a1", "b2", "a1"]), Column::Int(vec![1, 2, 3])]);
        let productos = table(&["SKU", "categoria_id"], vec![text(&["A1", "B2"]), Column::Int(vec![7, 8])]);
        let categorias = table(&["id", "categoria"], vec![Column::Int(vec![7, 8]), text(&["Bebidas", "Almacén"])]);
        let clima = table(&["dia", "lluvia"], vec![text(&["lunes"]), Column::Float(vec![1.5])]);
        let c = combine(vec![part("categorias.csv", categorias), part("ventas.csv", ventas), part("clima.csv", clima), part("productos.csv", productos)]);
        assert_eq!(c.table.names, ["sku", "unidades", "categoria_id", "categoria"]);
        assert_eq!(texts(&c.table.columns[3]), [Some("Bebidas".into()), Some("Almacén".into()), Some("Bebidas".into())]);
        assert!(matches!(&c.steps[..], [Step::Joined { file: p, .. }, Step::Joined { file: k, .. }, Step::Skipped { file: s, .. }] if p == "productos.csv" && k == "categorias.csv" && s == "clima.csv"), "{:?}", c.steps);
    }

    #[test]
    fn no_cruza_numeros_que_coinciden_por_casualidad() {
        let ventas = table(&["unidades", "monto"], vec![Column::Int(vec![1, 2, 3]), Column::Int(vec![10, 20, 30])]);
        let sucursales = table(&["numero", "nombre"], vec![Column::Int(vec![1, 2, 3]), text(&["Norte", "Sur", "Centro"])]);
        let c = combine(vec![part("ventas.csv", ventas), part("sucursales.csv", sucursales)]);
        assert!(matches!(&c.steps[..], [Step::Skipped { .. }]), "{:?}", c.steps);
    }

    #[test]
    fn no_cruza_si_en_la_otra_tabla_la_clave_se_repite() {
        let ventas = table(&["cliente", "monto"], vec![text(&["Ana", "Ana", "Beto"]), Column::Int(vec![1, 2, 3])]);
        let pagos = table(&["cliente", "pago"], vec![text(&["Ana", "Ana", "Beto", "Beto"]), Column::Int(vec![1, 1, 2, 2])]);
        let c = combine(vec![part("ventas.csv", ventas), part("pagos.csv", pagos)]);
        assert_eq!(c.table.rows(), 4, "la más grande queda como principal y no se repiten filas");
        assert!(matches!(&c.steps[..], [Step::Skipped { file, .. }] if file == "ventas.csv"), "{:?}", c.steps);
    }

    fn ventas_y_clientes() -> Vec<Part> {
        let ventas = table(&["cliente_id", "monto"], vec![Column::Int(vec![1, 2, 1, 9]), Column::Int(vec![100, 200, 300, 400])]);
        let clientes = table(&["id", "Segmento"], vec![Column::Int(vec![1, 2, 3]), text(&["A", "B", "A"])]);
        let clima = table(&["dia", "lluvia"], vec![text(&["lunes"]), Column::Float(vec![1.5])]);
        vec![part("ventas.csv", ventas), part("clientes.csv", clientes), part("clima.csv", clima)]
    }

    #[test]
    fn la_revision_dice_el_papel_de_cada_una_y_sus_claves_posibles() {
        let c = combine(ventas_y_clientes());
        let roles: Vec<(&str, &str)> = c.files.iter().map(|f| (f.file.as_str(), f.role)).collect();
        assert_eq!(roles, [("ventas.csv", "principal"), ("clientes.csv", "cruzada"), ("clima.csv", "sin_cruzar")]);
        let clientes = &c.files[1];
        assert_eq!(clientes.chosen, Some(("cliente_id".into(), "id".into())));
        assert_eq!(clientes.candidates[0], Candidate { key: "cliente_id".into(), other_key: "id".into(), matched: 0.75, auto: true });
    }

    #[test]
    fn respeta_no_cruzar_y_sacar_una_planilla() {
        let choices = Choices { out: vec!["clima.csv".into()], keys: vec![("clientes.csv".into(), None)] };
        let c = combine_with(ventas_y_clientes(), &choices);
        assert_eq!(c.table.names, ["cliente_id", "monto"]);
        assert_eq!(c.files[1].role, "sin_cruzar");
        assert_eq!(c.files[2].role, "fuera");
        assert!(c.steps.contains(&Step::Skipped { file: "clientes.csv".into(), reason: "Elegiste no cruzarla.".into() }), "{:?}", c.steps);
        assert!(c.steps.contains(&Step::Skipped { file: "clima.csv".into(), reason: "La sacaste de la unión.".into() }), "{:?}", c.steps);
        assert_eq!(Choices::from_json(&choices.json()), choices);
    }

    #[test]
    fn cruza_por_una_clave_que_mio_no_usaria_sola_si_la_persona_la_elige() {
        let ventas = table(&["unidades", "monto"], vec![Column::Int(vec![1, 2, 3]), Column::Int(vec![10, 20, 30])]);
        let sucursales = table(&["numero", "nombre"], vec![Column::Int(vec![1, 2, 3]), text(&["Norte", "Sur", "Centro"])]);
        let parts = vec![part("ventas.csv", ventas), part("sucursales.csv", sucursales)];
        let auto = combine(parts.clone());
        assert!(!auto.files[1].candidates[0].auto, "se ofrece, pero no se usa sola");
        let chosen = combine_with(parts, &Choices { out: vec![], keys: vec![("sucursales.csv".into(), Some(("unidades".into(), "numero".into())))] });
        assert_eq!(chosen.table.names, ["unidades", "monto", "nombre"]);
        assert_eq!(chosen.files[1].role, "cruzada");
    }
}
