/**
 * quickScan — a first look at a CSV, entirely in the browser.
 *
 * Powers the hero's "drop a sheet on MIO" moment. It is deliberately modest: row and column
 * counts, how much is missing, and the values that sit far from the rest of their column
 * (z-score >= 3 on numeric columns). It never predicts anything and nothing leaves the page.
 */

export interface OddValue {
  column: string;
  /** 1-based, counting the header as row 0 (the number you would see in Excel is row + 1). */
  row: number;
  value: number;
  /** How many times the column's typical value (mean). */
  times: number;
}

export interface QuickScan {
  rows: number;
  cols: number;
  /** Fraction (0..1) of cells that are empty. */
  missing: number;
  numericCols: string[];
  oddCount: number;
  odd: OddValue[];
  /** The sheet was longer than what was read. */
  truncated: boolean;
}

/** Splits one CSV line honouring quotes. */
export function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** "$1.234,50", "1,234.50", "12 %", "-3" → number, or null when it is not a number. */
export function toNumber(raw: string): number | null {
  let s = raw.replace(/[\s$€£%]|ARS|USD/gi, '');
  if (!s || !/[0-9]/.test(s) || /[^0-9.,\-+]/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // The later separator is the decimal one.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lastComma >= 0) {
    // "12,5" is a decimal, "1,234" or "1,234,567" are thousands.
    s = /,\d{1,2}$/.test(s) && (s.match(/,/g) || []).length === 1 ? s.replace(',', '.') : s.replace(/,/g, '');
  } else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function quickScan(text: string, opts: { maxRows?: number } = {}): QuickScan | null {
  const maxRows = opts.maxRows ?? 20000;
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const head = lines[0];
  const commas = (head.match(/,/g) || []).length;
  const semis = (head.match(/;/g) || []).length;
  const tabs = (head.match(/\t/g) || []).length;
  const sep = semis > commas && semis >= tabs ? ';' : tabs > commas ? '\t' : ',';

  const names = splitLine(head, sep);
  const cols = names.length;
  if (cols < 2) return null;

  const body = lines.slice(1, maxRows + 1);
  const truncated = lines.length - 1 > maxRows;
  const values: (number | null)[][] = names.map(() => []);
  let empty = 0;
  let cells = 0;

  for (const line of body) {
    const cs = splitLine(line, sep);
    for (let c = 0; c < cols; c++) {
      const cell = cs[c] ?? '';
      cells++;
      if (cell === '' || /^(na|n\/a|null|nan|-|—)$/i.test(cell)) {
        empty++;
        values[c].push(null);
      } else values[c].push(toNumber(cell));
    }
  }

  const numericCols: string[] = [];
  const odd: OddValue[] = [];
  for (let c = 0; c < cols; c++) {
    const col = values[c];
    const nums = col.filter((v): v is number => v !== null);
    const filled = col.filter((v) => v !== null).length;
    // A numeric column: at least 8 values and nine in ten of the filled cells are numbers.
    if (nums.length < 8 || nums.length < filled * 0.9) continue;
    // Skip running ids: strictly increasing integers.
    let strictlyUp = true;
    for (let i = 1; i < nums.length && strictlyUp; i++) if (!(nums[i] > nums[i - 1]) || !Number.isInteger(nums[i])) strictlyUp = false;
    if (strictlyUp) continue;
    numericCols.push(names[c]);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const sd = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
    if (sd === 0) continue;
    col.forEach((v, r) => {
      if (v === null) return;
      if (Math.abs((v - mean) / sd) >= 3) odd.push({ column: names[c], row: r + 1, value: v, times: mean !== 0 ? v / mean : 0 });
    });
  }
  odd.sort((a, b) => Math.abs(b.times - 1) - Math.abs(a.times - 1));

  return {
    rows: body.length,
    cols,
    missing: cells ? empty / cells : 0,
    numericCols,
    oddCount: odd.length,
    odd: odd.slice(0, 3),
    truncated,
  };
}
