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
    /// datetime64[ns] (nanosegundos desde 1970); solo lo da Excel, que guarda fechas de verdad
    Time(Vec<Option<i64>>),
}

impl Column {
    pub fn dtype(&self) -> &'static str {
        match self {
            Column::Int(_) => "int64",
            Column::Float(_) => "float64",
            Column::Bool(v) => if v.iter().all(|x| x.is_some()) { "bool" } else { "object" },
            Column::Text(_) => "object",
            Column::Time(_) => "datetime64[ns]",
        }
    }
    pub fn len(&self) -> usize {
        match self {
            Column::Int(v) => v.len(),
            Column::Float(v) => v.len(),
            Column::Bool(v) => v.len(),
            Column::Text(v) => v.len(),
            Column::Time(v) => v.len(),
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
        // `skiprows` cuenta líneas del archivo, incluidas las vacías.
        let physical: Vec<(usize, &str)> = text.lines().enumerate().filter(|(_, l)| !l.trim().is_empty()).take(15).collect();
        let fields: Vec<Vec<String>> = physical
            .iter()
            .map(|(_, line)| {
                let mut r = csv::ReaderBuilder::new().delimiter(sep).has_headers(false).flexible(true).from_reader(line.as_bytes());
                r.records().next().and_then(|x| x.ok()).map(|x| x.iter().map(str::to_string).collect()).unwrap_or_default()
            })
            .collect();
        skiprows = match title_rows(&fields) {
            0 => 0,
            first => physical[first].0,
        };
    }
    Format { encoding, sep, skiprows }
}

/// Títulos arriba del encabezado (común en exportaciones): con los campos de las primeras filas no
/// vacías, devuelve cuántas son títulos. Las primeras filas tienen menos campos que el ancho
/// dominante; se saltean hasta la primera con ese ancho, siempre que parezca un encabezado
/// (mayoría de texto). Es `_title_rows` del motor de Python.
fn title_rows(rows: &[Vec<String>]) -> usize {
    if rows.len() < 4 {
        return 0;
    }
    let widths: Vec<usize> = rows.iter().take(10).map(Vec::len).collect();
    let mut counts: Vec<(usize, usize)> = Vec::new(); // (ancho, veces) en orden de aparición
    for &n in &widths[1..] {
        match counts.iter_mut().find(|(w, _)| *w == n) {
            Some(e) => e.1 += 1,
            None => counts.push((n, 1)),
        }
    }
    let (dominant, times) = counts.iter().fold((0, 0), |best, &(w, c)| if c > best.1 { (w, c) } else { best });
    if widths[0] >= dominant || times < 3 {
        return 0;
    }
    let first = widths.iter().position(|&n| n == dominant).unwrap();
    let header = &rows[first];
    let numeric = header.iter().filter(|f| !f.trim().is_empty() && f.trim().replace(',', ".").parse::<f64>().is_ok()).count();
    if (numeric as f64) < header.len() as f64 / 2.0 { first } else { 0 }
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

const EMPTY: &str = "El archivo está vacío: no tiene filas ni columnas para analizar.";

/// Nombres de columna como pandas: vacíos -> "Unnamed: i"; repetidos -> "x.1", "x.2".
fn pandas_names<'a>(header: impl Iterator<Item = &'a str>) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    for (i, h) in header.enumerate() {
        let base = if h.is_empty() { format!("Unnamed: {i}") } else { h.to_string() };
        let mut name = base.clone();
        let mut k = 1;
        while names.contains(&name) {
            name = format!("{base}.{k}");
            k += 1;
        }
        names.push(name);
    }
    names
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
        None => return Err(EMPTY.into()),
    };
    let width = header.len();
    let names = pandas_names(header.iter());
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

/// Una celda de Excel como texto, como la entrega `pd.read_excel` antes de decidir el tipo de la
/// columna (que sigue las mismas reglas que el CSV): el texto que pandas toma como vacío queda vacío.
/// Una fecha suelta entre textos queda como texto ISO.
fn excel_cell(cell: &calamine::Data) -> Option<String> {
    use calamine::Data as D;
    match cell {
        D::Empty | D::Error(_) => None,
        D::String(s) => (!NA.contains(&s.as_str())).then(|| s.clone()),
        D::Int(i) => Some(i.to_string()),
        // Excel guarda todo número como decimal: los enteros se leen como enteros (como openpyxl).
        D::Float(f) if f.fract() == 0.0 && f.abs() < 9e15 => Some((*f as i64).to_string()),
        D::Float(f) => Some(f.to_string()),
        D::Bool(b) => Some(if *b { "True" } else { "False" }.into()),
        D::DateTime(d) => d.as_datetime().map(|t| t.to_string()),
        D::DateTimeIso(s) | D::DurationIso(s) => Some(s.clone()),
    }
}

/// Lee la primera hoja de un Excel (.xlsx, .xlsm, .xls, .ods) como `read_excel_table` del motor de
/// Python: el encabezado es la primera fila con datos (se saltean filas vacías y títulos de arriba),
/// las columnas vacías de la izquierda no cuentan, y cada columna toma el tipo con las reglas del CSV.
pub fn read_excel(raw: &[u8]) -> Result<Table, String> {
    use calamine::Reader;
    let unreadable = |e: &dyn std::fmt::Display| format!("No pude abrirlo como Excel ({e}). Probá guardarlo de nuevo como .xlsx o .csv.");
    let mut book = calamine::open_workbook_auto_from_rs(std::io::Cursor::new(raw)).map_err(|e| unreadable(&e))?;
    let range = book.worksheet_range_at(0).ok_or(EMPTY)?.map_err(|e| unreadable(&e))?;
    // Desde la columna A, como pandas (calamine empieza en la primera columna usada).
    let pad = range.start().map_or(0, |(_, c)| c as usize);
    let blank = calamine::Data::Empty;
    let grid: Vec<Vec<&calamine::Data>> = range.rows().map(|r| std::iter::repeat(&blank).take(pad).chain(r).collect()).collect();
    let text: Vec<Vec<Option<String>>> = grid.iter().map(|r| r.iter().map(|c| excel_cell(c)).collect()).collect();
    // Las filas con datos y sus campos hasta la última celda llena (para la regla de títulos).
    let filled: Vec<usize> = (0..text.len()).filter(|&i| text[i].iter().any(Option::is_some)).collect();
    let fields: Vec<Vec<String>> = filled.iter().take(15).map(|&i| {
        let row = &text[i];
        let end = row.iter().rposition(Option::is_some).map_or(0, |e| e + 1);
        row[..end].iter().map(|c| c.clone().unwrap_or_default()).collect()
    }).collect();
    let head = *filled.get(title_rows(&fields)).ok_or(EMPTY)?;
    let names = pandas_names(text[head].iter().map(|c| c.as_deref().unwrap_or("")));
    // pandas no cuenta las filas vacías del final de la hoja.
    let end = text.iter().rposition(|r| r.iter().any(Option::is_some)).map_or(head + 1, |i| i + 1).max(head + 1);
    let mut table = Table { names, columns: Vec::new(), index: None };
    for j in 0..table.names.len() {
        let cells: Vec<&calamine::Data> = grid[head + 1..end].iter().map(|r| r.get(j).copied().unwrap_or(&blank)).collect();
        table.columns.push(excel_column(&cells));
    }
    // Columnas vacías a la izquierda (sin encabezado ni datos debajo): no son parte de la tabla.
    while table.names.first().map_or(false, |n| n.starts_with("Unnamed: ")) && all_empty(&table.columns[0]) {
        table.names.remove(0);
        table.columns.remove(0);
    }
    Ok(table)
}

/// Una columna de Excel: fecha si todas sus celdas con datos son fechas; si no, el tipo con las
/// reglas del CSV.
fn excel_column(cells: &[&calamine::Data]) -> Column {
    use calamine::Data as D;
    let dates: Option<Vec<Option<i64>>> = cells
        .iter()
        .map(|c| match c {
            D::Empty | D::Error(_) => Some(None),
            D::DateTime(d) => d.as_datetime().and_then(|t| t.and_utc().timestamp_nanos_opt()).map(Some),
            _ => None,
        })
        .collect();
    match dates {
        Some(v) if v.iter().any(Option::is_some) => Column::Time(v),
        _ if cells.is_empty() => Column::Text(Vec::new()),
        _ => infer(cells.iter().map(|c| excel_cell(c)).collect()),
    }
}

fn all_empty(c: &Column) -> bool {
    match c {
        Column::Time(v) => v.iter().all(Option::is_none),
        Column::Float(v) => v.iter().all(|x| x.is_nan()),
        Column::Text(v) => v.iter().all(Option::is_none),
        Column::Bool(v) => v.iter().all(Option::is_none),
        Column::Int(_) => false,
    }
}
