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
pub struct Part {
    pub file: String,
    pub table: Table,
}

/// Lo que se hizo con cada planilla.
#[derive(Debug, Clone, PartialEq)]
pub enum Step {
    /// Estas planillas tenían las mismas columnas y se apilaron.
    Stacked { files: Vec<String>, rows: usize },
    /// Esta planilla se cruzó con la principal por `key` (en la principal) = `other_key` (en esta).
    Joined { file: String, key: String, other_key: String, matched: f64, added: Vec<String> },
    /// Esta planilla no se pudo unir.
    Skipped { file: String, reason: String },
}

impl Step {
    pub fn json(&self) -> Value {
        match self {
            Step::Stacked { files, rows } => json!({ "tipo": "apilado", "archivos": files, "filas": rows }),
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
}

/// Coinciden las columnas de dos planillas si comparten al menos esta parte de los nombres.
const SAME_COLUMNS: f64 = 0.8;
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

fn same_columns(a: &FxHashSet<String>, b: &FxHashSet<String>) -> bool {
    let both = a.intersection(b).count() as f64;
    both / (a.len().max(b.len()).max(1) as f64) >= SAME_COLUMNS
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

/// La clave de cada fila para cruzar (texto recortado y en minúscula; los enteros como enteros, también
/// si vienen como decimales sin parte decimal). Columnas que no sirven de clave (fechas, sí/no,
/// decimales de verdad) dan `None`.
fn keys(c: &Column) -> Option<Vec<Option<String>>> {
    match c {
        Column::Int(v) => Some(v.iter().map(|x| Some(x.to_string())).collect()),
        Column::Float(v) => v.iter().all(|x| x.is_nan() || x.fract() == 0.0).then(|| v.iter().map(|x| (!x.is_nan()).then(|| (*x as i64).to_string())).collect()),
        Column::Text(d) => Some(d.iter().map(|s| s.as_ref().map(|s| s.trim().to_lowercase()).filter(|s| !s.is_empty())).collect()),
        Column::Bool(_) | Column::Time(_) => None,
    }
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
    /// Fila de la otra tabla para cada fila de la principal.
    rows: Vec<Option<usize>>,
}

/// La mejor clave para cruzar `main` con `other`, si la hay.
fn best_key(main: &Table, other: &Table, other_table: &str, skip: &str) -> Option<Match> {
    let main_keys: Vec<Option<Vec<Option<String>>>> = main.columns.iter().zip(&main.names).map(|(c, n)| if n == skip { None } else { keys(c) }).collect();
    let mut best: Option<Match> = None;
    for (j, oc) in other.columns.iter().enumerate() {
        let Some(ok) = keys(oc) else { continue };
        let filled: Vec<&String> = ok.iter().flatten().collect();
        let mut at: FxHashMap<&str, usize> = FxHashMap::default();
        for (r, k) in ok.iter().enumerate() {
            if let Some(k) = k {
                at.entry(k.as_str()).or_insert(r);
            }
        }
        if filled.is_empty() || (at.len() as f64) < UNIQUE_KEY * filled.len() as f64 {
            continue; // en la otra tabla no es una clave: cruzar repetiría filas
        }
        for (i, mk) in main_keys.iter().enumerate() {
            let Some(mk) = mk else { continue };
            let present = mk.iter().flatten().count();
            if present == 0 {
                continue;
            }
            let rows: Vec<Option<usize>> = mk.iter().map(|k| k.as_deref().and_then(|k| at.get(k).copied())).collect();
            let matched = rows.iter().flatten().count() as f64 / present as f64;
            let named = name_score(&main.names[i], &other.names[j], other_table);
            // Sin nombres parecidos, solo códigos de texto: dos columnas de números chicos coinciden por casualidad.
            let unnamed_ok = matched >= MIN_MATCH_UNNAMED && matches!(main.columns[i], Column::Text(_));
            if matched < MIN_MATCH || (named == 0.0 && !unnamed_ok) {
                continue;
            }
            let score = named + 3.0 * matched;
            if best.as_ref().is_none_or(|b| score > b.score) {
                best = Some(Match { main: i, other: j, matched, score, rows });
            }
        }
    }
    best
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

/// Une las planillas: apila las que tienen las mismas columnas y cruza las demás con la principal
/// (la que más filas tiene). Con una sola, la devuelve tal cual.
pub fn combine(parts: Vec<Part>) -> Combined {
    let mut steps = Vec::new();
    // Grupos de planillas con las mismas columnas, en el orden en que llegaron.
    let mut groups: Vec<(FxHashSet<String>, Vec<Part>)> = Vec::new();
    for p in parts {
        let n = names(&p.table);
        match groups.iter_mut().find(|(g, _)| same_columns(g, &n)) {
            Some((_, g)) => g.push(p),
            None => groups.push((n, vec![p])),
        }
    }
    let mut tables: Vec<(String, Table)> = groups
        .into_iter()
        .map(|(_, g)| {
            if g.len() == 1 {
                let p = g.into_iter().next().expect("uno");
                return (p.file, p.table);
            }
            let files: Vec<String> = g.iter().map(|p| p.file.clone()).collect();
            let label = files[0].clone();
            let t = stack(g);
            steps.push(Step::Stacked { files, rows: t.rows() });
            (label, t)
        })
        .collect();
    tables.sort_by_key(|(_, t)| std::cmp::Reverse(t.rows()));
    let mut rest = tables.split_off(1);
    let (main_file, mut main) = tables.pop().expect("al menos una planilla");
    let origin = main.names.last().filter(|n| norm(n).starts_with("archivo")).cloned().unwrap_or_default();

    // Cruzar hasta que no se pueda más: una tabla puede necesitar columnas que trajo otra (ventas → productos → categorías).
    loop {
        let before = rest.len();
        let mut waiting = Vec::new();
        for (file, other) in rest {
            let Some(m) = best_key(&main, &other, &base(&file), &origin) else {
                waiting.push((file, other));
                continue;
            };
            let have: FxHashSet<String> = main.names.iter().map(|n| norm(n)).collect();
            let mut added = Vec::new();
            for (j, (name, col)) in other.names.iter().zip(&other.columns).enumerate() {
                if j == m.other {
                    continue;
                }
                let shown = if have.contains(&norm(name)) { format!("{name} ({})", base(&file)) } else { name.clone() };
                main.columns.push(gather(col, &m.rows));
                main.names.push(shown.clone());
                added.push(shown);
            }
            steps.push(Step::Joined { file, key: main.names[m.main].clone(), other_key: other.names[m.other].clone(), matched: m.matched, added });
        }
        rest = waiting;
        if rest.is_empty() || rest.len() == before {
            break;
        }
    }
    for (file, _) in rest {
        steps.push(Step::Skipped { file, reason: "No tiene una columna que coincida con la principal (mismos valores y, en esta, sin repetir).".into() });
    }
    main.index = None;
    Combined { table: main, steps, main: main_file }
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

    #[test]
    fn apila_los_meses_con_la_columna_de_origen_y_tipos_que_sirven_a_todos() {
        let enero = table(&["Fecha", "Ventas", "Sucursal"], vec![text(&["01/01/2025", "02/01/2025"]), Column::Int(vec![10, 20]), text(&["Norte", "Sur"])]);
        let febrero = table(&["fecha", "ventas", "sucursal"], vec![text(&["01/02/2025"]), Column::Float(vec![5.5]), text(&["Norte"])]);
        let c = combine(vec![part("enero.csv", enero), part("febrero.csv", febrero)]);
        assert_eq!(c.table.names, ["Fecha", "Ventas", "Sucursal", "archivo"]);
        assert_eq!(c.table.rows(), 3);
        assert_eq!(c.table.columns[1], Column::Float(vec![10.0, 20.0, 5.5]));
        assert_eq!(texts(&c.table.columns[3]), [Some("enero.csv".into()), Some("enero.csv".into()), Some("febrero.csv".into())]);
        assert_eq!(c.steps, [Step::Stacked { files: vec!["enero.csv".into(), "febrero.csv".into()], rows: 3 }]);
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
}
