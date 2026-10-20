//! Leer una planilla como la lee el motor de Python: un CSV como `detect_csv_format` + `pd.read_csv`
//! (misma codificación, separador y filas salteadas) y un Excel como `read_excel_table`; el tipo de
//! cada columna se decide con las reglas de pandas. Los textos se guardan como diccionario (`dict.rs`).

use crate::dict::{Dict, TextBuilder};
use crate::progress::{Progress, Stage};
use encoding_rs_io::DecodeReaderBytesBuilder;
use rayon::prelude::*;
use std::borrow::Cow;
use std::fs::File;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

/// Una columna con el tipo que le daría pandas.
#[derive(Debug, Clone, PartialEq)]
pub enum Column {
    /// int64
    Int(Vec<i64>),
    /// float64; `NaN` = vacío
    Float(Vec<f64>),
    /// bool si no hay vacíos (`None`); con vacíos pandas la deja como object con True/False/NaN
    Bool(Vec<Option<bool>>),
    /// object (texto), como diccionario; `None` = vacío
    Text(Dict<Option<String>>),
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
        let seps = *b",;\t|";
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
    let body = t.strip_prefix(['+', '-']).unwrap_or(t);
    if body.eq_ignore_ascii_case("inf") || body.eq_ignore_ascii_case("infinity") {
        return Some(if t.starts_with('-') { f64::NEG_INFINITY } else { f64::INFINITY });
    }
    // Solo dígitos, un punto y un exponente (Rust aceptaría también "nan", que pandas ya tomó como vacío).
    if !body.bytes().all(|b| b.is_ascii_digit() || matches!(b, b'.' | b'e' | b'E' | b'+' | b'-')) {
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

/// Lo que hace falta saber de una columna para darle el tipo que le da pandas; se mira valor por
/// valor (`None` = vacío), sin guardarlos.
struct Scan {
    present: bool,
    has_na: bool,
    looks_int: bool,
    ints: bool,
    floats: bool,
    bools: bool,
}

impl Default for Scan {
    fn default() -> Self {
        Scan { present: false, has_na: false, looks_int: true, ints: true, floats: true, bools: true }
    }
}

impl Scan {
    fn see(&mut self, v: Option<&str>) {
        let Some(s) = v else {
            self.has_na = true;
            return;
        };
        self.present = true;
        self.looks_int &= looks_int(s);
        self.ints = self.ints && self.looks_int && parse_int(s).is_some();
        self.floats = self.floats && parse_float(s).is_some();
        self.bools = self.bools && parse_bool(s).is_some();
    }

    /// La columna vacía, lista para llenarse con su tipo: enteros (si no hay vacíos), decimales,
    /// sí/no o texto. Sin filas queda texto; sin ningún valor, decimales vacíos.
    fn fill(&self) -> Fill {
        match self {
            Scan { present: false, has_na: false, .. } => Fill::Text(TextBuilder::default()),
            Scan { present: false, .. } => Fill::Float(Vec::new()),
            // enteros que no entran en int64: pandas los deja como texto
            Scan { looks_int: true, ints: false, .. } => Fill::Text(TextBuilder::default()),
            Scan { looks_int: true, has_na: false, .. } => Fill::Int(Vec::new()),
            Scan { looks_int: true, .. } | Scan { floats: true, .. } => Fill::Float(Vec::new()),
            Scan { bools: true, .. } => Fill::Bool(Vec::new()),
            _ => Fill::Text(TextBuilder::default()),
        }
    }
}

/// Una columna que se llena ya con su tipo (los números no pasan por texto guardado).
enum Fill {
    Int(Vec<i64>),
    Float(Vec<f64>),
    Bool(Vec<Option<bool>>),
    Text(TextBuilder),
}

impl Fill {
    fn push(&mut self, v: Option<&str>) {
        match self {
            Fill::Int(c) => c.push(v.and_then(parse_int).expect("columna de enteros sin vacíos")),
            Fill::Float(c) => c.push(v.and_then(parse_float).unwrap_or(f64::NAN)),
            Fill::Bool(c) => c.push(v.and_then(parse_bool)),
            Fill::Text(c) => c.push(v),
        }
    }

    fn finish(self) -> Column {
        match self {
            Fill::Int(c) => Column::Int(c),
            Fill::Float(c) => Column::Float(c),
            Fill::Bool(c) => Column::Bool(c),
            Fill::Text(c) => Column::Text(c.finish()),
        }
    }
}

const EMPTY: &str = "El archivo está vacío: no tiene filas ni columnas para analizar.";

fn unreadable(e: impl std::fmt::Display) -> String {
    format!("No pude leer el archivo ({e}).")
}

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

/// Bytes que mira `detect` (los mismos que lee `detect_csv_format`).
const SAMPLE: u64 = 100_000;

type CsvReader = csv::Reader<BufReader<Box<dyn Read>>>;

/// El CSV ya en UTF-8, desde la primera fila después de los títulos (el encabezado). Se lee de a
/// partes: el archivo nunca está entero en memoria.
fn csv_reader(path: &Path, fmt: &Format) -> Result<CsvReader, String> {
    let mut file = BufReader::new(File::open(path).map_err(unreadable)?);
    if fmt.encoding == "UTF-8-SIG" {
        file.read_exact(&mut [0; 3]).map_err(unreadable)?; // el BOM no es parte del encabezado
    }
    // Windows-1252 se pasa a UTF-8 (ISO-8859-1 sin bytes 0x80-0x9F es igual); UTF-8 y ASCII pasan tal cual.
    let text: Box<dyn Read> = match fmt.encoding {
        "Windows-1252" | "ISO-8859-1" => {
            Box::new(DecodeReaderBytesBuilder::new().encoding(Some(encoding_rs::WINDOWS_1252)).bom_sniffing(false).build(file))
        }
        _ => Box::new(file),
    };
    let mut text = BufReader::new(text);
    let mut line = Vec::new();
    for _ in 0..fmt.skiprows {
        line.clear();
        if text.read_until(b'\n', &mut line).map_err(unreadable)? == 0 {
            break;
        }
    }
    Ok(csv::ReaderBuilder::new().delimiter(fmt.sep).has_headers(false).flexible(true).double_quote(true).from_reader(text))
}

/// La próxima fila con datos (las líneas en blanco no cuentan); `false` al terminar el archivo.
fn next_record(rdr: &mut CsvReader, rec: &mut csv::ByteRecord) -> Result<bool, String> {
    while rdr.read_byte_record(rec).map_err(unreadable)? {
        if !(rec.len() == 1 && rec[0].is_empty()) {
            return Ok(true);
        }
    }
    Ok(false)
}

/// Filas que se procesan juntas: cada tanda se reparte entre los núcleos, una columna por tarea.
const BATCH: usize = 50_000;

/// Recorre el resto de las filas de a tandas; después de cada una avisa por qué byte va.
fn each_batch(rdr: &mut CsvReader, mut f: impl FnMut(&[csv::ByteRecord]), mut at: impl FnMut(u64)) -> Result<(), String> {
    let mut batch = vec![csv::ByteRecord::new(); BATCH];
    loop {
        let mut n = 0;
        while n < BATCH && next_record(rdr, &mut batch[n])? {
            n += 1;
        }
        if n > 0 {
            f(&batch[..n]);
            at(rdr.position().byte());
        }
        if n < BATCH {
            return Ok(());
        }
    }
}

/// Un campo como texto (los bytes que no son UTF-8 válido se reemplazan).
fn field(r: &csv::ByteRecord, j: usize) -> Option<Cow<'_, str>> {
    r.get(j).map(String::from_utf8_lossy)
}

/// El valor de una celda como lo ve pandas (`None` = vacío).
fn cell<'a>(r: &'a csv::ByteRecord, j: usize) -> Option<Cow<'a, str>> {
    field(r, j).filter(|s| !NA.contains(&s.as_ref()))
}

/// Lee un CSV en dos pasadas: la primera decide el tipo de cada columna sin guardar nada y la
/// segunda llena cada columna con su tipo. Así la memoria es la de la tabla, no la del texto.
pub fn read_csv(path: &Path, progress: &Progress) -> Result<(Format, Table), String> {
    // El avance: la mitad de la lectura es cada pasada.
    let total = std::fs::metadata(path).map_or(1, |m| m.len().max(1)) as f64;
    let read = |pass: f64| move |byte: u64| progress.report(Stage::Reading, Some((pass + byte as f64 / total) / 2.0));
    let mut sample = Vec::new();
    File::open(path).map_err(unreadable)?.take(SAMPLE).read_to_end(&mut sample).map_err(unreadable)?;
    let fmt = detect(&sample);
    let mut header = csv::ByteRecord::new();
    let mut rdr = csv_reader(path, &fmt)?;
    if !next_record(&mut rdr, &mut header)? {
        return Err(EMPTY.into());
    }
    let width = header.len();
    let names = pandas_names((0..width).map(|j| field(&header, j).unwrap_or_default()).collect::<Vec<_>>().iter().map(|s| s.as_ref()));
    // Si la primera fila de datos tiene un campo más que el encabezado, pandas toma la primera
    // columna como índice (no es un dato) y corre el resto: pasa con filas que terminan en coma.
    let mut offset = None;
    let mut scans: Vec<Scan> = (0..width).map(|_| Scan::default()).collect();
    each_batch(&mut rdr, |batch| {
        let off = *offset.get_or_insert(usize::from(batch[0].len() == width + 1));
        // pandas saltea las filas con campos de más (on_bad_lines="skip").
        scans.par_iter_mut().enumerate().for_each(|(j, s)| {
            batch.iter().filter(|r| r.len() <= width + off).for_each(|r| s.see(cell(r, j + off).as_deref()));
        });
    }, read(0.0))?;
    let offset = offset.unwrap_or(0);
    let mut cols: Vec<Fill> = scans.iter().map(Scan::fill).collect();
    let mut labels: Vec<String> = Vec::new();
    let mut rdr = csv_reader(path, &fmt)?;
    next_record(&mut rdr, &mut header)?;
    each_batch(&mut rdr, |batch| {
        let rows = || batch.iter().filter(|r| r.len() <= width + offset);
        if offset == 1 {
            labels.extend(rows().map(|r| field(r, 0).unwrap_or_default().into_owned()));
        }
        cols.par_iter_mut().enumerate().for_each(|(j, c)| rows().for_each(|r| c.push(cell(r, j + offset).as_deref())));
    }, read(1.0))?;
    let index = (offset == 1).then_some(labels);
    Ok((fmt, Table { names, columns: cols.into_iter().map(Fill::finish).collect(), index }))
}

/// Una celda de Excel con datos (lo que pandas no toma como vacío).
fn excel_filled(cell: &calamine::Data) -> bool {
    use calamine::Data as D;
    match cell {
        D::Empty | D::Error(_) => false,
        D::String(s) => !NA.contains(&s.as_str()),
        _ => true,
    }
}

/// Una celda de Excel como texto, como la entrega `pd.read_excel` antes de decidir el tipo de la
/// columna (que sigue las mismas reglas que el CSV). Una fecha suelta entre textos queda como texto ISO.
fn excel_cell(cell: &calamine::Data) -> Option<Cow<'_, str>> {
    use calamine::Data as D;
    if !excel_filled(cell) {
        return None;
    }
    Some(match cell {
        D::String(s) | D::DateTimeIso(s) | D::DurationIso(s) => Cow::Borrowed(s.as_str()),
        D::Int(i) => i.to_string().into(),
        // Excel guarda todo número como decimal: los enteros se leen como enteros (como openpyxl).
        D::Float(f) if f.fract() == 0.0 && f.abs() < 9e15 => (*f as i64).to_string().into(),
        D::Float(f) => f.to_string().into(),
        D::Bool(b) => Cow::Borrowed(if *b { "True" } else { "False" }),
        D::DateTime(d) => d.as_datetime()?.to_string().into(),
        D::Empty | D::Error(_) => return None,
    })
}

/// Una columna de Excel: fecha si todas sus celdas con datos son fechas; si no, el tipo con las
/// reglas del CSV.
fn excel_column<'a>(cells: impl Iterator<Item = &'a calamine::Data> + Clone) -> Column {
    use calamine::Data as D;
    let dates: Option<Vec<Option<i64>>> = cells
        .clone()
        .map(|c| match c {
            D::DateTime(d) => d.as_datetime().and_then(|t| t.and_utc().timestamp_nanos_opt()).map(Some),
            _ if !excel_filled(c) => Some(None),
            _ => None,
        })
        .collect();
    if let Some(v) = dates.filter(|v| v.iter().any(Option::is_some)) {
        return Column::Time(v);
    }
    let mut scan = Scan::default();
    cells.clone().for_each(|c| scan.see(excel_cell(c).as_deref()));
    let mut fill = scan.fill();
    cells.for_each(|c| fill.push(excel_cell(c).as_deref()));
    fill.finish()
}

/// Lee la primera hoja de un Excel (.xlsx, .xlsm, .xls, .ods) como `read_excel_table` del motor de
/// Python: el encabezado es la primera fila con datos (se saltean filas vacías y títulos de arriba),
/// las columnas vacías de la izquierda no cuentan, y cada columna toma el tipo con las reglas del CSV.
pub fn read_excel(path: &Path) -> Result<Table, String> {
    use calamine::Reader;
    let excel = |e: &dyn std::fmt::Display| format!("No pude abrirlo como Excel ({e}). Probá guardarlo de nuevo como .xlsx o .csv.");
    let mut book = calamine::open_workbook_auto(path).map_err(|e| excel(&e))?;
    let range = book.worksheet_range_at(0).ok_or(EMPTY)?.map_err(|e| excel(&e))?;
    // Desde la columna A, como pandas (calamine empieza en la primera columna usada).
    let pad = range.start().map_or(0, |(_, c)| c as usize);
    let blank = calamine::Data::Empty;
    let rows: Vec<&[calamine::Data]> = range.rows().collect();
    let cell = |i: usize, j: usize| if j < pad { &blank } else { rows[i].get(j - pad).unwrap_or(&blank) };
    let width = pad + range.width();
    let filled: Vec<usize> = (0..rows.len()).filter(|&i| rows[i].iter().any(excel_filled)).collect();
    // Los campos de las primeras filas con datos, hasta la última celda llena (regla de títulos).
    let fields: Vec<Vec<String>> = filled.iter().take(15).map(|&i| {
        let end = (0..width).rposition(|j| excel_filled(cell(i, j))).map_or(0, |e| e + 1);
        (0..end).map(|j| excel_cell(cell(i, j)).unwrap_or_default().into_owned()).collect()
    }).collect();
    let head = *filled.get(title_rows(&fields)).ok_or(EMPTY)?;
    let header: Vec<String> = (0..width).map(|j| excel_cell(cell(head, j)).unwrap_or_default().into_owned()).collect();
    let names = pandas_names(header.iter().map(String::as_str));
    // pandas no cuenta las filas vacías del final de la hoja.
    let end = filled.last().map_or(head, |&i| i).max(head) + 1;
    let mut table = Table { columns: (0..width).map(|j| excel_column((head + 1..end).map(|i| cell(i, j)))).collect(), names, index: None };
    // Columnas vacías a la izquierda (sin encabezado ni datos debajo): no son parte de la tabla.
    while table.names.first().is_some_and(|n| n.starts_with("Unnamed: ")) && all_empty(&table.columns[0]) {
        table.names.remove(0);
        table.columns.remove(0);
    }
    Ok(table)
}

fn all_empty(c: &Column) -> bool {
    match c {
        Column::Time(v) => v.iter().all(Option::is_none),
        Column::Float(v) => v.iter().all(|x| x.is_nan()),
        Column::Text(d) => d.values().iter().all(Option::is_none),
        Column::Bool(v) => v.iter().all(Option::is_none),
        Column::Int(_) => false,
    }
}
