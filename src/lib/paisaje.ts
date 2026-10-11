/**
 * paisaje — the geometry and the script of "El paisaje de 1.826 días".
 *
 * The benchmark's daily series (public/data/daily_series.json, exported by
 * scripts/export_daily_series.py) laid out as a place: a dial. One column per real day, the days of
 * a year around a circle and one ring per year, so the same season lines up across the five years
 * and the end-of-year peak becomes a mountain range on one arc of the dial. MIO stands at the
 * centre; the scroll is the camera, and it orbits. The flight is also the method, shown on real
 * data (tidy up, mark the odd days, predict 14 hidden days), and it ends as the proof: the camera
 * climbs, the dial flattens into a printed chart and the four tests are laid out in its middle.
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
  /** The four tests of the benchmark, oldest first. */
  folds: Fold[];
  /** The last of them: the 14 days the finale stands on. */
  backtest: Fold;
  mean_mio_smape: number;
  mean_naive_smape: number;
}

/** One test: 14 days the engine never saw, what it predicted and what "repeat last week" predicted. */
export interface Fold {
  from_index: number;
  mio: number[];
  naive: number[];
  mio_smape: number;
  naive_smape: number;
}

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;

// ── Layout (world units) ────────────────────────────────────────────────────────────────────────
/** Radius of the innermost ring: the most recent year, the one nearest to MIO. */
export const R0 = 58;
export const RING_PITCH = 3.6;
/** Radial depth of a column. */
export const COL_D = 2.7;
/** Share of its arc that a column fills. */
export const COL_FILL = 0.8;
export const MAX_H = 16;
/** The dial is open: a few degrees between 31 December and 1 January, where the years are named. */
export const GAP = 6;
/** Degrees the dial is turned so that 1 December points north (the far side of the opening shot). */
export const TURN = 360 - (GAP / 2 + ((360 - GAP) * 334) / 365);

export interface Slot {
  /** 0-based year (0 = first year of the series). */
  row: number;
  /** 0-based day of the year. */
  doy: number;
  year: number;
  month: number;
  daysInYear: number;
}

/** Where day `i` of the series falls in the calendar. */
export function slotOf(firstDay: string, i: number): Slot {
  const [y, m, d] = firstDay.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + i * DAY_MS;
  const date = new Date(t);
  const year = date.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  return {
    row: year - y,
    doy: Math.round((t - jan1) / DAY_MS),
    year,
    month: date.getUTCMonth(),
    daysInYear: Math.round((Date.UTC(year + 1, 0, 1) - jan1) / DAY_MS),
  };
}

/** Angle of a day on the dial, in degrees clockwise from north (seen from above). */
export const angleOf = (doy: number, daysInYear = 365) => TURN + GAP / 2 + ((360 - GAP) * (doy + 0.5)) / daysInYear;
/** Ring of a year: 0 is the most recent one (innermost). */
export const ringOf = (row: number, rows: number) => rows - 1 - row;
export const ringRadius = (ring: number) => R0 + ring * RING_PITCH;
/** Width of a column on a ring: its share of the arc. */
export const colWidth = (ring: number) => ((2 * Math.PI * ringRadius(ring) * (360 - GAP)) / 360 / 365) * COL_FILL;

/** Polar (degrees clockwise from north, radius) to world X/Z. North is -Z, east is +X. */
export function polar(deg: number, r: number, out: { x: number; z: number }) {
  const a = deg * DEG;
  out.x = Math.sin(a) * r;
  out.z = -Math.cos(a) * r;
  return out;
}

export const heightOf = (value: number, max: number) => (max > 0 ? Math.max(0.05, (value / max) * MAX_H) : 0.05);

/** First day of each month in a non-leap year: the bezel printed on the paper. */
export const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export const MONTH_NAMES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
export const MONTH_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ── Script ──────────────────────────────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * The scene opens looking straight down at the paper, which is the page's own sheet background, and
 * the first stretch of the pin lifts and tilts the camera: the sheet "lies down" and the dial rises
 * out of it. TILT is the share of the pin spent on that; the story proper runs after it.
 */
export const TILT = 0.1;
/** Progress of the story once the camera is up (0..1). */
export const storyAt = (p: number) => clamp01((p - TILT) / (1 - TILT));
/** 0..1: the canvas fades in over the flat page during the very first scroll. */
export const canvasIn = (p: number) => smooth(p / 0.03);
/** 0..1: the dial rises out of the paper while the camera comes up. */
export const riseAt = (p: number) => smooth((p - TILT * 0.3) / (TILT * 1.15));
/** The caption appears once the scene has taken over. */
export const captionOn = (p: number) => p >= TILT * 0.72;

/** The seven beats, in story time. The index is the caption on screen. */
export const BEATS = [
  { from: 0, to: 0.13 }, // 0 the whole dial from above, MIO in the middle
  { from: 0.13, to: 0.28 }, // 1 down inside it: the first half of the year goes by behind MIO
  { from: 0.28, to: 0.42 }, // 2 the camera lifts over the rings: the week, which has no shape here
  { from: 0.42, to: 0.54 }, // 3 down again toward October: the five years side by side
  { from: 0.54, to: 0.69 }, // 4 under the end-of-year range: the 108 days light up
  { from: 0.69, to: 0.83 }, // 5 the last 14 days: predicted against what happened
  { from: 0.83, to: 1 }, // 6 the proof: the dial from straight above, the four tests in its middle
] as const;
/** Pin progress at which the proof takes over (the page's "La prueba" starts here). */
export const PROOF_AT = TILT + BEATS[6].from * (1 - TILT);

export const beatAt = (p: number) => {
  const q = storyAt(p);
  for (let k = BEATS.length - 1; k >= 0; k--) if (q >= BEATS[k].from) return k;
  return 0;
};

/** 0..1: how many of the odd days are lit at progress p. */
export const oddLit = (p: number) => smooth((storyAt(p) - 0.56) / 0.12);
/** 0..1: how far the prediction rods have risen. */
export const forecastIn = (p: number) => smooth((storyAt(p) - 0.74) / 0.07);
/** 0..1: MIO turns from the visitor to the mountain range (and back, when it walks off). */
export const turnToRange = (p: number) => 0.74 * smooth((storyAt(p) - 0.52) / 0.05) * (1 - smooth((storyAt(p) - 0.69) / 0.04));
/** 0..1: MIO walks from the centre of the dial to the last 14 days. */
export const walkToEnd = (p: number) => smooth((storyAt(p) - 0.69) / 0.07);
/** 0..1: the columns lie down into a flat print while the camera climbs. */
export const flatAt = (p: number) => smooth((storyAt(p) - 0.83) / 0.08);
/** 0..1: how much of the four tests has been laid out (linear: the days tick in at a steady pace). */
export const proofIn = (p: number) => clamp01((storyAt(p) - 0.89) / 0.09);
/** How much of its height a column keeps once it is flat: enough relief to read as print, not as a field. */
export const FLAT_KEEP = 0.05;

// ── The proof, laid out in the middle of the dial ───────────────────────────────────────────────
/** Left edge, full length (the largest error of the eight), row pitch and thickness of the bars. */
export const PROOF_X0 = -34;
export const PROOF_LEN = 68;
export const PROOF_PITCH = 11;
export const PROOF_BAR = 3.4;
/** Where the camera ends: high over the dial, north up, the dial a little right of centre so the text has room. */
export const PROOF_CAM = { x: -34, y: 262, z: 104 };
export const PROOF_LOOK = { x: -34, z: -4 };

/** sMAPE of every day of a test, in percent. Their mean is the test's sMAPE, as in the benchmark. */
export function smapeTerms(actual: ArrayLike<number>, pred: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let j = 0; j < pred.length; j++) {
    const d = (Math.abs(actual[j]) + Math.abs(pred[j])) / 2;
    out.push(d > 1e-6 ? (Math.abs(actual[j] - pred[j]) / d) * 100 : 0);
  }
  return out;
}

/** Height of the opening top-down view: at this height a 2 x 10 cell of the paper is the page's 36 x 180 px cell. */
export const TOP_H = 80;
/** Distance from the centre of the opening view: beyond the outer ring and its shadows, nothing but paper. */
export const START_R = 116;
/** Where MIO ends up: next to the last fortnight, inside the dial. */
export const END_SPOT = { deg: angleOf(364) + 7.5, r: R0 - 10 };

/**
 * Camera keyframes in dial coordinates, so that moving between two of them is an orbit and never a
 * straight line through the middle (where MIO stands). A negative radius is the far side of the
 * centre. [p, camDeg, camR, camY, lookDeg, lookR, lookY, straight?]
 * A key marked `straight` is reached in a straight line instead (the crane shot up to the proof).
 */
export function cameraKeys(): number[][] {
  const at = (q: number) => TILT + q * (1 - TILT);
  const feb = angleOf(45);
  const jun = angleOf(165);
  const aug = angleOf(215);
  const sep = angleOf(258);
  const oct = angleOf(290);
  const range = angleOf(334) + 360; // 1 December, a full turn later than the opening
  const end = angleOf(357) + 360;
  // Inside the dial the camera stands a little to one side of MIO, opposite what it looks at.
  const behind = (look: number) => look + 180 - 24;
  const top = toPolar(PROOF_CAM.x, PROOF_CAM.z);
  const topLook = toPolar(PROOF_LOOK.x, PROOF_LOOK.z);
  return [
    // Straight down at empty paper south of the dial, north at the top of the screen.
    [0, 180, START_R, TOP_H, 180, START_R - 0.5, 0],
    // The whole dial, low enough to keep a band of sky.
    [at(0.0), 180, 186, 40, 180, -14, 6],
    [at(0.08), 188, 178, 37, 180, -14, 6],
    // Down inside: the year passes behind MIO, February to June.
    [at(0.15), behind(feb), 25, 8.5, feb, R0, 2],
    [at(0.27), behind(jun), 25, 8.5, jun, R0, 2],
    // Up and back, still turning: the five rings open out one behind the other.
    [at(0.35), behind(aug) + 10, 44, 18, aug, R0 + 4, 1],
    [at(0.41), behind(sep) + 10, 44, 18, sep, R0 + 4, 1],
    // Down again, on to October.
    [at(0.5), behind(oct), 25, 8.5, oct, R0, 2],
    // Low, under the range, looking up at it.
    [at(0.57), range + 180, 25, 3.4, range, R0, 8],
    [at(0.67), range + 180, 21, 3.0, range, R0, 8.5],
    // The last fortnight, from a little above so the roofs behind the rods stay in sight.
    [at(0.76), end + 12, 12, 11, end + 1, R0 - 4, 4.2],
    [at(0.83), end + 8, 15, 9.6, end + 1, R0 - 4, 4.2],
    // The proof: a crane shot straight up to a view of the whole dial from above, north up again.
    [at(0.92), top.deg, top.r, PROOF_CAM.y, topLook.deg, topLook.r, 0, 1],
    [1.0, top.deg, top.r, PROOF_CAM.y, topLook.deg, topLook.r, 0, 1],
  ];
}

const toPolar = (x: number, z: number) => ({ deg: (Math.atan2(x, -z) / DEG + 360) % 360, r: Math.hypot(x, z) });

const _a = { x: 0, z: 0 };
const _b = { x: 0, z: 0 };
/** Writes the camera position and look-at for progress p into `out` (6 world numbers, no allocation). */
export function sampleCamera(keys: number[][], p: number, out: number[]): number[] {
  const q = clamp01(p);
  let k = 0;
  while (k < keys.length - 2 && q > keys[k + 1][0]) k++;
  const a = keys[k];
  const b = keys[k + 1];
  const span = b[0] - a[0];
  // Ease inside every segment: the camera settles on each beat instead of sliding through it.
  const t = span > 0 ? smooth((q - a[0]) / span) : 0;
  out[1] = lerp(a[3], b[3], t);
  out[4] = lerp(a[6], b[6], t);
  if (b[7]) {
    polar(a[1], a[2], _a);
    polar(b[1], b[2], _b);
    out[0] = lerp(_a.x, _b.x, t);
    out[2] = lerp(_a.z, _b.z, t);
    polar(a[4], a[5], _a);
    polar(b[4], b[5], _b);
    out[3] = lerp(_a.x, _b.x, t);
    out[5] = lerp(_a.z, _b.z, t);
    return out;
  }
  polar(lerp(a[1], b[1], t), lerp(a[2], b[2], t), _a);
  out[0] = _a.x;
  out[2] = _a.z;
  polar(lerp(a[4], b[4], t), lerp(a[5], b[5], t), _a);
  out[3] = _a.x;
  out[5] = _a.z;
  return out;
}

/** es-AR thousands, for the captions. */
export const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
