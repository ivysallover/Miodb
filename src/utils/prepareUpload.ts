/**
 * Year-first dates on their way to the analysis engine.
 *
 * When the engine assumes day-first dates (its default here), it also applies that to year-first
 * text such as "2024-01-13": the 13th is dropped as invalid and "2024-01-02" becomes the 1st of
 * February. Until that is fixed on the server, a CSV that has such a column is rewritten on the
 * way out so those dates read day/month/year, which the engine gets right. The file on the user's
 * disk is never touched, and when anything about the file is unclear it is sent exactly as it is.
 */

const MAX_BYTES = 30 * 1024 * 1024;
const YEAR_FIRST = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](.*))?$/;
const DAY_OR_MONTH_FIRST = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/;
// The engine's own patterns for numbers written the local way and the US way (it picks the
// date order from them, so the same test is needed here to know what it will do).
const LATAM_NUM = /^[$€£¥]?\s*-?\d{1,3}(\.\d{3})*,\d{1,4}\s*%?$|^[$€£¥]?\s*-?\d+,\d{1,4}\s*%?$/;
const US_NUM = /^[$€£¥]?\s*-?\d{1,3}(,\d{3})*\.\d{1,4}\s*%?$|^[$€£¥]?\s*-?\d+\.\d{1,4}\s*%?$/;

const pad = (s: string) => s.padStart(2, '0');
const unquote = (s: string) => s.trim().replace(/^"(.*)"$/, '$1').trim();

/** Split one CSV line on `sep`, leaving quoted cells whole. Cells come back as written. */
export function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    if (ch === sep && !quoted) {
      cells.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

/** "2024-01-13 10:30:00" → "13/01/2024 10:30:00". Anything else comes back untouched. */
export function toDayFirst(cell: string): string {
  const raw = unquote(cell);
  const m = raw.match(YEAR_FIRST);
  if (!m) return cell;
  const time = m[4] ? ` ${m[4].replace(/Z$/, '')}` : '';
  const out = `${pad(m[3])}/${pad(m[2])}/${m[1]}${time}`;
  return cell.trim().startsWith('"') ? `"${out}"` : out;
}

/**
 * The same text with its year-first date columns written day/month/year, or null when nothing
 * should change: no such column, a file this cannot read safely, or an engine that is going to
 * read month-first (where year-first dates are already understood).
 */
export function rewriteYearFirstDates(text: string): { text: string; columns: string[] } | null {
  // A file that is not UTF-8 would be damaged by re-encoding it: leave it alone.
  if (text.includes('�')) return null;
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return null;
  // A quoted cell that spans lines cannot be handled line by line.
  if (lines.some((l) => (l.match(/"/g) || []).length % 2 === 1)) return null;

  const header = lines[0];
  const count = (re: RegExp) => (header.match(re) || []).length;
  const sep = count(/;/g) > count(/,/g) ? ';' : count(/\t/g) > count(/,/g) ? '\t' : ',';
  const names = splitCsvLine(header, sep).map(unquote);
  const sample = lines.slice(1, 201).filter((l) => l.trim() !== '').map((l) => splitCsvLine(l, sep).map(unquote));
  if (!sample.length) return null;

  const column = (i: number) => sample.map((r) => r[i] ?? '').filter((v) => v !== '');
  const dateColumns = names
    .map((_, i) => i)
    .filter((i) => {
      const values = column(i).slice(0, 50);
      return values.length >= 2 && values.filter((v) => YEAR_FIRST.test(v)).length / values.length >= 0.8;
    });
  if (!dateColumns.length) return null;

  // What the engine will decide, on the file as it would arrive after the rewrite.
  let usHits = 0, latamHits = 0, dayFirst = 0, monthFirst = 0;
  names.forEach((_, i) => {
    const all = column(i);
    // Columns of plain numbers are read as numbers by the engine and never looked at here.
    if (all.length && all.every((v) => v !== '' && Number.isFinite(Number(v)))) return;
    for (const original of all.slice(0, 30)) {
      const v = dateColumns.includes(i) ? toDayFirst(original) : original;
      if (LATAM_NUM.test(v)) latamHits++;
      else if (US_NUM.test(v)) usHits++;
      const d = v.match(DAY_OR_MONTH_FIRST);
      if (d) {
        const p1 = Number(d[1]), p2 = Number(d[2]);
        if (p1 > 12 && p2 <= 12) dayFirst++;
        else if (p2 > 12 && p1 <= 12) monthFirst++;
      }
    }
  });
  // Month-first engine: year-first dates are read correctly as they are.
  if (usHits > latamHits || monthFirst > dayFirst) return null;

  const out = lines.map((line, n) => {
    if (n === 0 || line.trim() === '') return line;
    const cells = splitCsvLine(line, sep);
    for (const i of dateColumns) if (cells[i] !== undefined) cells[i] = toDayFirst(cells[i]);
    return cells.join(sep);
  });
  return { text: out.join(newline), columns: dateColumns.map((i) => names[i]) };
}

/** The file to send for analysis, and which columns (if any) had their dates rewritten. */
export async function prepareForUpload(file: File): Promise<{ file: File; rewritten: string[] }> {
  try {
    if (!/\.csv$/i.test(file.name) || file.size > MAX_BYTES) return { file, rewritten: [] };
    const result = rewriteYearFirstDates(await file.text());
    if (!result) return { file, rewritten: [] };
    return { file: new File([result.text], file.name, { type: file.type || 'text/csv' }), rewritten: result.columns };
  } catch {
    return { file, rewritten: [] };
  }
}
