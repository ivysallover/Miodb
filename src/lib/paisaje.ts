/**
 * paisaje — the geometry and the script of "El paisaje de 1.826 días".
 *
 * The benchmark's daily series (public/data/daily_series.json, exported by
 * scripts/export_daily_series.py) laid out as a place: one column per real day, the day of the
 * year along X and one row per year along Z, so the same season lines up across the five years and
 * the end-of-year peak becomes a ridge you can see. The scroll is the camera.
 *
 * Pure (no DOM, no three.js): unit-tested, and the canvas only reads numbers from here.
 */

export interface DailySeries {
  source: string;
  transactions: number;
  first_day: string;
  last_day: string;
  values: number[];
  median: number;
  odd_threshold: number;
  odd_days: number[];
  backtest: { from_index: number; mio: number[]; naive: number[]; mio_smape: number; naive_smape: number };
}

// ── Layout (world units) ────────────────────────────────────────────────────────────────────────
export const DAY_PITCH = 1; // X distance between two consecutive days
export const COL_W = 0.8; // column footprint along X
export const ROW_PITCH = 3.4; // Z distance between two years
export const COL_D = 2.6; // column footprint along Z
export const MAX_H = 10; // height of the tallest day

export interface Slot {
  /** 0-based year row (0 = first year, furthest from the camera). */
  row: number;
  /** 0-based day of the year. */
  doy: number;
  year: number;
  month: number;
}

const DAY_MS = 86_400_000;

/** Where day `i` of the series stands. */
export function slotOf(firstDay: string, i: number): Slot {
  const [y, m, d] = firstDay.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + i * DAY_MS;
  const date = new Date(t);
  const year = date.getUTCFullYear();
  const doy = Math.round((t - Date.UTC(year, 0, 1)) / DAY_MS);
  return { row: year - y, doy, year, month: date.getUTCMonth() };
}

export const slotX = (doy: number) => doy * DAY_PITCH;
export const slotZ = (row: number) => row * ROW_PITCH;
export const heightOf = (value: number, max: number) => (max > 0 ? Math.max(0.05, (value / max) * MAX_H) : 0.05);

/** X of the first day of each month in a non-leap year: the ruler printed on the ground. */
export const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
export const MONTH_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const monthAtX = (x: number) => {
  let m = 0;
  for (let k = 0; k < 12; k++) if (x >= MONTH_STARTS[k]) m = k;
  return m;
};

// ── Script ──────────────────────────────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/**
 * The scene opens looking straight down at the paper, which is the page's own sheet background, and
 * the first stretch of the pin tilts the camera up into the landscape: the sheet "lies down" and
 * becomes a place. TILT is the share of the pin spent on that; the story proper runs after it.
 */
export const TILT = 0.15;
/** Progress of the story once the camera is up (0..1). */
export const storyAt = (p: number) => clamp01((p - TILT) / (1 - TILT));
/** 0..1: the canvas fades in over the flat page during the very first scroll. */
export const canvasIn = (p: number) => smooth(p / 0.03);
/** 0..1: the field rises out of the paper while the camera comes up. */
export const riseAt = (p: number) => smooth((p - TILT * 0.3) / (TILT * 1.15));
/** The caption appears once there is a sky to hold it. */
export const captionOn = (p: number) => p >= TILT * 0.72;

/** The four beats of the flight, in story time. `index` is the caption on screen. */
export const BEATS = [
  { from: 0, to: 0.2 }, // 0 arrive: the whole field, MIO in front of it
  { from: 0.2, to: 0.55 }, // 1 fly along the year
  { from: 0.55, to: 0.8 }, // 2 the 108 days light up over the end-of-year ridge
  { from: 0.8, to: 1 }, // 3 the last 14 days: predicted against what happened
] as const;

export const beatAt = (p: number) => {
  const q = storyAt(p);
  for (let k = BEATS.length - 1; k >= 0; k--) if (q >= BEATS[k].from) return k;
  return 0;
};

/** 0..1: how many of the odd days are lit at progress p. */
export const oddLit = (p: number) => smooth((storyAt(p) - 0.55) / 0.2);
/** 0..1: how far the prediction rods have risen. */
export const forecastIn = (p: number) => smooth((storyAt(p) - 0.84) / 0.12);

/** Height of the opening top-down view: at this height a 2 x 10 cell of the paper is the page's 36 x 180 px cell. */
export const TOP_H = 80;

/**
 * Camera keyframes. `rows` is the number of year rows; the last one (most recent year) is the
 * nearest to the camera, so the finale lands on the real last 14 days.
 * [p, posX, posY, posZ, lookX, lookY, lookZ]
 */
export function cameraKeys(rows: number): number[][] {
  const zc = ((rows - 1) * ROW_PITCH) / 2;
  const zFront = (rows - 1) * ROW_PITCH;
  const at = (q: number) => TILT + q * (1 - TILT);
  return [
    // Straight down at empty paper, the top of the screen pointing down the year.
    [0, -104, TOP_H, zc + 31, -103.5, 0, zc + 31],
    // Then low and looking far ahead: the data fills the lower half of the frame and the sky
    // (where the caption sits) keeps the upper one.
    [at(0.0), -58, 9, zc + 31, 130, 3, zc - 4],
    [at(0.2), -14, 12, zc + 44, 110, 4, zc - 2],
    [at(0.4), 108, 12.5, zc + 46, 215, 4.5, zc - 6],
    [at(0.58), 232, 12, zc + 46, 335, 5, zc - 4],
    [at(0.8), 288, 11.5, zc + 44, 352, 5.5, zc],
    [1.0, 331, 8.2, zFront + 31, 356, 5, zFront + 1],
  ];
}

/** Writes the camera position and look-at for progress p into `out` (6 numbers, no allocation). */
export function sampleCamera(keys: number[][], p: number, out: number[]): number[] {
  const q = clamp01(p);
  let k = 0;
  while (k < keys.length - 2 && q > keys[k + 1][0]) k++;
  const a = keys[k];
  const b = keys[k + 1];
  const span = b[0] - a[0];
  // Ease inside every segment: the camera settles on each beat instead of sliding through it.
  const t = span > 0 ? smooth((q - a[0]) / span) : 0;
  for (let i = 0; i < 6; i++) out[i] = a[i + 1] + (b[i + 1] - a[i + 1]) * t;
  return out;
}

/** es-AR thousands, for the captions. */
export const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
