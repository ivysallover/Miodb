import { ChartSchema } from '@/types/analysis';

const loc = (n: number, max: number) => n.toLocaleString('es-AR', { maximumFractionDigits: max });

/**
 * Format a number with M/K suffixes for labels and tooltips, the way it is written here
 * (decimal comma).
 */
export function fmtNum(value: any, decimals = 1): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (isNaN(n)) return String(value);
  if (Math.abs(n) >= 1_000_000) return loc(n / 1_000_000, decimals) + 'M';
  if (Math.abs(n) >= 10_000) return loc(n / 1_000, decimals) + 'K';
  if (Math.abs(n) >= 1_000) return loc(n, 0);
  return loc(n, decimals);
}

/**
 * Axis ticks: as many decimals as the tick needs and no more, so a narrow axis reads
 * "7,7 · 7,72 · 7,74" instead of repeating "7.7".
 */
export function fmtAxis(value: any): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (isNaN(n)) return String(value);
  if (Math.abs(n) >= 1_000_000) return loc(n / 1_000_000, 2) + 'M';
  if (Math.abs(n) >= 10_000) return loc(n / 1_000, 2) + 'K';
  return loc(n, 3);
}

/**
 * How many decimals a set of values needs for its labels to differ: 7,74 and 7,75 must not
 * both print as "7,7".
 */
export function smartDecimals(values: any[]): number {
  const v = values.map(Number).filter((x) => Number.isFinite(x));
  if (v.length < 2) return 1;
  const maxAbs = Math.max(...v.map(Math.abs));
  const scale = maxAbs >= 1_000_000 ? 1_000_000 : maxAbs >= 10_000 ? 1_000 : 1;
  const span = (Math.max(...v) - Math.min(...v)) / scale;
  if (span === 0) return 1;
  if (span < 0.1) return 3;
  if (span < 2) return 2;
  if (span < 50 || scale > 1) return 1;
  return 0;
}

/**
 * Truncate a string for axis labels.
 */
export function truncate(s: string, max: number): string {
  return s.length > max ? s.substring(0, max) + '...' : s;
}

/**
 * Safe axis type resolver — CRITICAL for log scale correctness.
 * Rule: 'log' may ONLY be applied to axes of base type 'value'.
 * Category, time, and other axes are ALWAYS returned unchanged.
 */
export function resolveAxisType(
  baseType: string,
  isLog: boolean,
  allPositive: boolean
): string {
  if (baseType === 'category' || baseType === 'time') return baseType;
  if (baseType === 'value' && isLog && allPositive) return 'log';
  return baseType;
}

/**
 * Returns true if every numeric value in the dataset source for the given
 * dimension is strictly greater than zero. Used to guard log scale fallback.
 */
export function allValuesPositive(source: Record<string, any>[], dim: string): boolean {
  if (!source || source.length === 0) return false;
  return source.every((row) => {
    const v = row[dim];
    return typeof v === 'number' && v > 0;
  });
}

/**
 * Normalizes and prepares a clean, safe dataset copy for charting.
 * Coerces dimensions and sets up FanChart band_width if needed.
 */
export function prepareSafeDataset(payload: ChartSchema | null): { dimensions: string[]; source: Record<string, any>[] } | null {
  if (!payload || !payload.dataset) return null;
  const ds = JSON.parse(JSON.stringify(payload.dataset));
  if (ds.source && ds.dimensions) {
    if (payload.layoutDirectives.chartType === 'FanChart') {
      ds.source.forEach((row: any) => {
        if (row.upper != null && row.lower != null && row.band_width == null) {
          row.band_width = Math.max(0, row.upper - row.lower);
        }
      });
      if (!ds.dimensions.includes('band_width')) ds.dimensions.push('band_width');
    }
    // Coerce first dimension to string for non-scatter/heatmap charts
    if (!['Scatter', 'CorrelationHeatmap'].includes(payload.layoutDirectives.chartType)) {
      ds.source.forEach((row: any) => {
        ds.dimensions.forEach((dim: string) => {
          if (typeof row[dim] === 'number' && (dim === ds.dimensions[0] || dim === 'feature' || dim === '_segment')) {
            row[dim] = String(row[dim]);
          }
        });
      });
    }
  }
  return ds;
}
