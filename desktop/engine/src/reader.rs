//! Leer una planilla CSV como la lee el motor de Python (`detect_csv_format` + `pd.read_csv` con
//! sus opciones por defecto): misma codificación, mismo separador, mismas filas salteadas, y el tipo
//! de cada columna decidido con las reglas de pandas.

/// Una columna con el tipo que le daría pandas.
#[derive(Debug, Clone, PartialEq)]
pub enum Column {
    /// int64
    Int(Vec<i64>),
    /// float64; `NaN` = vacío
    Float(Vec<f64>),
    /// bool si no hay vacíos (`None`); con vacíos pandas la deja como object con True/False/NaN
    Bool(Vec<Option<bool>>),
    /// object (texto); `None` = vacío
    Text(Vec<Option<String>>),
}

impl Column {
    pub fn dtype(&self) -> &'static str {
        match self {
            Column::Int(_) => "int64",
            Column::Float(_) => "float64",
            Column::Bool(v) => if v.iter().all(|x| x.is_some()) { "bool" } else { "object" },
            Column::Text(_) => "object",
        }
    }
    pub fn len(&self) -> usize {
        match self {
            Column::Int(v) => v.len(),
            Column::Float(v) => v.len(),
            Column::Bool(v) => v.len(),
            Column::Text(v) => v.len(),
        }
    }
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }
}

#[derive(Debug, Clone, Default)]
pub struct Table {
    pub names: Vec<String>,
    pub columns: Vec<Column>,
    /// Rótulos de fila cuando pandas toma la primera columna como índice (filas con coma final).
    pub index: Option<Vec<String>>,
}

impl Table {
    pub fn rows(&self) -> usize {
        self.columns.first().map_or(0, |c| c.len())
    }
}

/// Lo que detecta `detect_csv_format`.
#[derive(Debug, Clone, PartialEq)]
pub struct Format {
    pub encoding: &'static str,
    pub sep: u8,
    pub skiprows: usize,
}

/// Los textos que pandas toma como vacío (por defecto).
const NA: [&str; 19] = [
    "", "#N/A", "#N/A N/A", "#NA", "-1.#IND", "-1.#QNAN", "-NaN", "-nan", "1.#IND", "1.#QNAN", "<NA>", "N/A",
    "NA", "NULL", "NaN", "None", "n/a", "nan", "null",
];

/// Codificación, como la adivina `chardet` en los casos comunes.
fn guess_encoding(raw: &[u8]) -> &'static str {
    if raw.starts_with(&[0xEF, 0xBB, 0xBF]) {
        "UTF-8-SIG"
    } else if raw.is_ascii() {
        "ascii"
    } else if valid_prefix(raw) == raw.len() || (raw.len() >= 100_000 && valid_prefix(raw) > 0) {
        // UTF-8 válido (la muestra de 100.000 bytes puede cortar un carácter al final)
        "utf-8"
    } else if raw.iter().any(|b| (0x80..=0x9F).contains(b)) {
        "Windows-1252"
    } else {
        "ISO-8859-1"
    }
}

/// Largo del prefijo que es UTF-8 válido (la muestra de 100.000 bytes puede cortar un carácter).
fn valid_prefix(raw: &[u8]) -> usize {
    match std::str::from_utf8(raw) {
        Ok(_) => raw.len(),
        Err(e) if e.error_len().is_none() => e.valid_up_to(),
        Err(_) => 0,
    }
}

fn decode(raw: &[u8], enc: &str) -> String {
    match enc {
        "UTF-8-SIG" => String::from_utf8_lossy(&raw[3..]).into_owned(),
        "ascii" | "utf-8" => String::from_utf8_lossy(raw).into_owned(),
        "Windows-1252" => encoding_rs::WINDOWS_1252.decode(raw).0.into_owned(),
        _ => raw.iter().map(|&b| b as char).collect(), // ISO-8859-1: cada byte es un carácter
    }
}

/// Como `detect_csv_format`: separador más frecuente en el encabezado y filas de título a saltear.
pub fn detect(raw: &[u8]) -> Format {
    let sample = &raw[..raw.len().min(100_000)];
    let encoding = guess_encoding(sample);
    let text = decode(sample, encoding);
    // Como Python: las primeras 15 líneas, sin las vacías.
    let lines: Vec<&str> = text.lines().take(15).filter(|l| !l.trim().is_empty()).collect();
    let mut sep = b',';
    let mut skiprows = 0;
    if !lines.is_empty() {
        // El separador se cuenta en la primera línea que tenga alguno (arriba puede haber un título).
        let seps = [b',', b';', b'\t', b'|'];
        let header = lines.iter().find(|l| l.bytes().any(|b| seps.contains(&b))).unwrap_or(&lines[0]);
        let mut best = (b',', 0usize);
        for c in seps {
            let n = header.bytes().filter(|b| *b == c).count();
            if n > best.1 {
                best = (c, n);
            }
        }
        if best.1 > 0 {
            sep = best.0;
        }
        // Títulos arriba del encabezado: líneas con menos campos que el ancho dominante, salteadas
        // hasta la primera línea con ese ancho si parece un encabezado (mayoría de texto).
        let physical: Vec<(usize, &str)> = text.lines().enumerate().filter(|(_, l)| !l.trim().is_empty()).take(15).collect();
        if physical.len() >= 4 {
            let width_of = |line: &str| -> Vec<String> {
                let mut r = csv::ReaderBuilder::new().delimiter(sep).has_headers(false).flexible(true).from_reader(line.as_bytes());
                r.records().next().and_then(|x| x.ok()).map(|x| x.iter().map(|f| f.to_string()).collect()).unwrap_or_default()
            };
            let widths: Vec<usize> = physical.iter().take(10).map(|(_, l)| width_of(l).len()).collect();
            let mut counts: Vec<(usize, usize)> = Vec::new(); // (ancho, veces) en orden de aparición
            for &n in &widths[1..] {
                match counts.iter_mut().find(|(w, _)| *w == n) {
                    Some(e) => e.1 += 1,
                    None => counts.push((n, 1)),
                }
            }
            let (dominant, times) = counts.iter().fold((0, 0), |best, &(w, c)| if c > best.1 { (w, c) } else { best });
            if widths[0] < dominant && times >= 3 {
                let first = widths.iter().position(|&n| n == dominant).unwrap();
                let fields = width_of(physical[first].1);
                let numeric = fields.iter().filter(|f| !f.trim().is_empty() && f.trim().replace(',', ".").parse::<f64>().is_ok()).count();
                if first > 0 && (numeric as f64) < fields.len() as f64 / 2.0 {
                    skiprows = physical[first].0;
                }
            }
        }
    }
    Format { encoding, sep, skiprows }
}

fn parse_int(s: &str) -> Option<i64> {
    let t = s.trim();
    let digits = t.strip_prefix(['+', '-']).unwrap_or(t);
    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    t.parse::<i64>().ok()
}

fn looks_int(s: &str) -> bool {
    let t = s.trim();
    let digits = t.strip_prefix(['+', '-']).unwrap_or(t);
    !digits.is_empty() && digits.bytes().all(|b| b.is_ascii_digit())
}

fn parse_float(s: &str) -> Option<f64> {
    let t = s.trim();
    if t.is_empty() {
        return None;
    }
    let lower = t.to_ascii_lowercase();
    let body = lower.strip_prefix(['+', '-']).unwrap_or(&lower);
    if body == "inf" || body == "infinity" {
        return Some(if lower.starts_with('-') { f64::NEG_INFINITY } else { f64::INFINITY });
    }
    // Solo dígitos, un punto y un exponente (Rust aceptaría también "nan", que pandas ya tomó como vacío).
    if !body.bytes().all(|b| b.is_ascii_digit() || b == b'.' || b == b'e' || b == b'+' || b == b'-') {
        return None;
    }
    t.parse::<f64>().ok()
}

fn parse_bool(s: &str) -> Option<bool> {
    match s {
        "True" | "TRUE" | "true" => Some(true),
        "False" | "FALSE" | "false" => Some(false),
        _ => None,
    }
}

/// Decide el tipo de una columna como pandas (`None` = vacío).
fn infer(values: Vec<Option<String>>) -> Column {
    let present: Vec<&str> = values.iter().flatten().map(|s| s.as_str()).collect();
    let has_na = present.len() < values.len();
    if present.is_empty() {
        return Column::Float(vec![f64::NAN; values.len()]);
    }
    if present.iter().all(|s| looks_int(s)) {
        let ints: Option<Vec<i64>> = present.iter().map(|s| parse_int(s)).collect();
        match ints {
            Some(_) if !has_na => return Column::Int(values.iter().map(|v| parse_int(v.as_deref().unwrap()).unwrap()).collect()),
            Some(_) => return Column::Float(values.iter().map(|v| v.as_deref().map_or(f64::NAN, |s| parse_int(s).unwrap() as f64)).collect()),
            None => return Column::Text(values), // no entra en int64: pandas lo deja como texto
        }
    }
    if present.iter().all(|s| parse_float(s).is_some()) {
        return Column::Float(values.iter().map(|v| v.as_deref().map_or(f64::NAN, |s| parse_float(s).unwrap())).collect());
    }
    if present.iter().all(|s| parse_bool(s).is_some()) {
        return Column::Bool(values.iter().map(|v| v.as_deref().and_then(parse_bool)).collect());
    }
    Column::Text(values)
}

/// Lee un CSV completo.
pub fn read_csv(raw: &[u8]) -> Result<(Format, Table), String> {
    let fmt = detect(raw);
    let mut text = decode(raw, fmt.encoding);
    if fmt.skiprows > 0 {
        let mut cut = 0;
        for _ in 0..fmt.skiprows {
            match text[cut..].find('\n') {
                Some(i) => cut += i + 1,
                None => {
                    cut = text.len();
                    break;
                }
            }
        }
        text = text[cut..].to_string();
    }
    let mut rdr = csv::ReaderBuilder::new()
        .delimiter(fmt.sep)
        .has_headers(false)
        .flexible(true)
        .double_quote(true)
        .from_reader(text.as_bytes());
    let mut records = rdr.records().filter_map(|r| r.ok()).filter(|r| !(r.len() == 1 && r.get(0) == Some("")));
    let header = match records.next() {
        Some(h) => h,
        None => return Err("El archivo está vacío: no tiene filas ni columnas para analizar.".into()),
    };
    let width = header.len();
    // Nombres como pandas: vacíos -> "Unnamed: i"; repetidos -> "x.1", "x.2".
    let mut names: Vec<String> = Vec::with_capacity(width);
    for (i, h) in header.iter().enumerate() {
        let base = if h.is_empty() { format!("Unnamed: {i}") } else { h.to_string() };
        let mut name = base.clone();
        let mut k = 1;
        while names.contains(&name) {
            name = format!("{base}.{k}");
            k += 1;
        }
        names.push(name);
    }
    let mut cols: Vec<Vec<Option<String>>> = vec![Vec::new(); width];
    let mut labels: Vec<String> = Vec::new();
    // Si la primera fila de datos tiene un campo más que el encabezado, pandas toma la primera
    // columna como índice (no es un dato) y corre el resto: pasa con filas que terminan en coma.
    let mut records = records.peekable();
    let offset = match records.peek() {
        Some(first) if first.len() == width + 1 => 1,
        _ => 0,
    };
    for rec in records {
        if rec.len() > width + offset {
            continue; // fila con campos de más: pandas la saltea (on_bad_lines="skip")
        }
        if offset == 1 {
            labels.push(rec.get(0).unwrap_or("").to_string());
        }
        for (j, col) in cols.iter_mut().enumerate() {
            let v = rec.get(j + offset);
            col.push(match v {
                Some(s) if !NA.contains(&s) => Some(s.to_string()),
                _ => None,
            });
        }
    }
    let rows = cols.first().map_or(0, |c| c.len());
    let columns = cols
        .into_iter()
        .map(|c| if rows == 0 { Column::Text(Vec::new()) } else { infer(c) })
        .collect();
    let index = if offset == 1 { Some(labels) } else { None };
    Ok((fmt, Table { names, columns, index }))
}
