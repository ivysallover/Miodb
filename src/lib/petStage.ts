/**
 * petStage — choreography of the travelling MIO specimen.
 *
 * One live 3D specimen lives on the whole landing. Every section has a "pose" (where MIO stands in
 * the viewport, how big it is, which way it faces, whether the halftone podium is under it). While
 * you scroll, the pose is resolved from where the middle of the viewport sits inside the page:
 * inside a section MIO holds that section's pose and turns slowly with your reading; near a
 * boundary it glides toward the next pose. No timers, no tweens: the page scroll is the playhead.
 *
 * This file is pure (no DOM, no three.js) so the maths can be unit-tested.
 */

export type StageMood = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo';

export interface PetPose {
  /** Centre of the specimen as a fraction of the viewport width / height. */
  x: number;
  y: number;
  /** Displayed height as a fraction of the viewport height. */
  size: number;
  /** Extra yaw in degrees (the specimen already faces slightly to the viewer). */
  yaw: number;
  /** 0..1: the dithered podium under MIO. */
  pad: number;
  /** 1 when MIO is parked in the corner next to the guide bubble, 0 when it is on stage. */
  dock: number;
  /** 1 when MIO must be drawn above the page content (solid sections), 0 when it stands behind it. */
  above: number;
  /** 1 over a dark surface: the dither uses the light-on-dark ramp so MIO never sinks into it. */
  dark: number;
  /** Mood MIO falls back to in this section when no guide cue says otherwise. */
  mood?: StageMood;
}

/** What MioHeroStage reads every frame. One object, mutated in place, never reallocated. */
export interface PetDrive {
  /** The travelling layer is running: the stage reads the fields below. */
  active: boolean;
  /** Extra yaw in radians, scroll driven. */
  yaw: number;
  /** Roll in radians: leans into the direction of the flight. */
  roll: number;
  /** Vertical hop in model units while it is gliding between poses. */
  hop: number;
  /** 0..1 podium strength. */
  pad: number;
  /** MIO is over a dark surface. */
  dark: boolean;
  /** 0..1: how close the camera dollies in (the story pulls in while MIO reads, relaxes after). */
  zoom: number;
  /** Where MIO looks (-1 left .. 1 right) and how much that overrides the cursor (0..1). */
  gazeX: number;
  gazeOn: number;
  /** The diagnosis story is playing: rows of the sheet fly into MIO as data cubes. */
  story: boolean;
  /** 0..1 progress of the reading, 0..1 of the finding that stays hovering, and the sheet's shape. */
  storyT: number;
  storyFound: number;
  storyRows: number;
  storyFlag: number;
  /** Mood to rest in when nothing else (click, console, shaking) is overriding. */
  baseMood: StageMood | null;
}

export const petDrive: PetDrive = {
  active: false,
  yaw: 0,
  roll: 0,
  hop: 0,
  pad: 1,
  dark: false,
  zoom: 0,
  gazeX: 0,
  gazeOn: 0,
  story: false,
  storyT: 0,
  storyFound: 0,
  storyRows: 6,
  storyFlag: 4,
  baseMood: null,
};

/**
 * Written by the sections that own a pinned story (raw ScrollTrigger progress, 0..1), read by the
 * travelling layer. A plain object on purpose: no events, no React state, nothing to re-render.
 */
export const petStory = {
  /** Pin progress of the "Ejemplo" diagnosis. */
  ejemplo: 0,
  /** Shape of the sheet being read, for the cubes. */
  rows: 6,
  flag: 4,
};

const DOCK: PetPose = { x: 0.958, y: 0.875, size: 0.18, yaw: -16, pad: 0, dock: 1, above: 0, dark: 0 };

/** Order of the stops, top to bottom of the page. The hero pose is measured from the DOM. */
export const STAGE_ORDER = [
  'hero',
  'manifiesto',
  'problema',
  'ejemplo',
  'como-funciona',
  'casos-estudio',
  'tus-datos',
  'para-quien',
  'dudas',
  'quienes-somos',
  'cta',
  '__footer',
] as const;

export type StageStop = (typeof STAGE_ORDER)[number];

export const STAGE_POSES: Record<StageStop, PetPose> = {
  // Measured from the hero anchor at runtime; this is only the fallback.
  hero: { x: 0.87, y: 0.46, size: 0.86, yaw: 0, pad: 1, dock: 0, above: 0, dark: 0, mood: 'reposo' },
  manifiesto: { ...DOCK, yaw: -26, above: 1, dark: 1, mood: 'reposo' },
  problema: { ...DOCK, yaw: 20, above: 0, mood: 'anomalia' },
  ejemplo: { x: 0.8, y: 0.58, size: 0.7, yaw: -28, pad: 1, dock: 0, above: 1, dark: 0, mood: 'trabajando' },
  'como-funciona': { ...DOCK, size: 0.22, yaw: 0, above: 1 },
  'casos-estudio': { ...DOCK, above: 1, dark: 1, size: 0.24, mood: 'celebrando' },
  'tus-datos': { ...DOCK, yaw: -8, above: 0 },
  'para-quien': { ...DOCK, yaw: 22, above: 0 },
  dudas: { ...DOCK, yaw: -12, above: 0 },
  'quienes-somos': { ...DOCK, yaw: 12, above: 0, mood: 'reposo' },
  cta: { x: 0.76, y: 0.55, size: 0.78, yaw: -10, pad: 1, dock: 0, above: 1, dark: 1, mood: 'celebrando' },
  __footer: { x: 0.88, y: 0.5, size: 0.4, yaw: 0, pad: 0, dock: 0, above: 1, dark: 1, mood: 'durmiendo' },
};

export interface SectionBox {
  top: number;
  bottom: number;
}

export interface StageResult {
  /** Index in STAGE_ORDER of the stop the viewport centre is inside. */
  index: number;
  /** 0..1 position of the viewport centre inside that stop. */
  progress: number;
  /** 0..0.5 how far the pose has already slid toward `neighbour`. */
  blend: number;
  /** Index of the stop it is gliding toward, or -1 when it rests. */
  neighbour: number;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const smootherstep = (t: number) => {
  const x = clamp(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Where is the playhead? `boxes` are the stops' viewport rects (null when a stop is not on the page).
 * The gaps between stops are shared out evenly so the partition of the page is continuous.
 */
export function resolveStage(boxes: ReadonlyArray<SectionBox | null>, viewH: number, line = 0.5): StageResult {
  const cy = viewH * line;
  const idx: number[] = [];
  for (let i = 0; i < boxes.length; i++) if (boxes[i]) idx.push(i);
  if (idx.length === 0) return { index: 0, progress: 0, blend: 0, neighbour: -1 };

  // Extended edges: each stop owns half of the gap on either side.
  const ext = (k: number) => {
    const b = boxes[idx[k]]!;
    const prev = k > 0 ? boxes[idx[k - 1]]! : null;
    const next = k < idx.length - 1 ? boxes[idx[k + 1]]! : null;
    return {
      top: prev ? (prev.bottom + b.top) / 2 : -Infinity,
      bottom: next ? (b.bottom + next.top) / 2 : Infinity,
      rawTop: b.top,
      rawBottom: b.bottom,
    };
  };

  let k = 0;
  for (let j = 0; j < idx.length; j++) {
    const e = ext(j);
    if (cy >= e.top && cy < e.bottom) {
      k = j;
      break;
    }
    if (cy >= e.bottom) k = Math.min(idx.length - 1, j + 1);
  }

  const e = ext(k);
  const top = Number.isFinite(e.top) ? e.top : e.rawTop;
  const bottom = Number.isFinite(e.bottom) ? e.bottom : e.rawBottom;
  const height = Math.max(1, bottom - top);
  const progress = clamp((cy - top) / height, 0, 1);

  // Glide zone: a third of the stop, never less than 140 px nor more than 45 % of the screen.
  const zone = clamp(height * 0.33, 140, viewH * 0.45);
  const dBottom = bottom - cy;
  const dTop = cy - top;
  let blend = 0;
  let neighbour = -1;
  if (k < idx.length - 1 && dBottom < zone) {
    blend = 0.5 * (1 - clamp(dBottom / zone, 0, 1));
    neighbour = idx[k + 1];
  }
  if (k > 0 && dTop < zone) {
    const b = 0.5 * (1 - clamp(dTop / zone, 0, 1));
    if (b > blend) {
      blend = b;
      neighbour = idx[k - 1];
    }
  }
  return { index: idx[k], progress, blend: smootherstep(blend * 2) * 0.5, neighbour };
}

/** Writes lerp(a, b, t) into `out` (no allocation). */
export function mixPose(a: PetPose, b: PetPose, t: number, out: PetPose): PetPose {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.size = lerp(a.size, b.size, t);
  out.yaw = lerp(a.yaw, b.yaw, t);
  out.pad = lerp(a.pad, b.pad, t);
  out.dock = lerp(a.dock, b.dock, t);
  out.above = lerp(a.above, b.above, t);
  out.dark = lerp(a.dark, b.dark, t);
  out.mood = t < 0.5 ? a.mood : b.mood;
  return out;
}

// ── The diagnosis story ("Ejemplo") ─────────────────────────────────────────────────────────────
//   0.00 – 0.35  MIO reads the sheet: each row leaves the table as a cube and flies into its screen,
//                the camera slowly pulls in and MIO looks toward the table.
//   0.35 – 0.50  the odd row comes back out as a hovering finding, MIO flinches (anomalía).
//   0.50 – 1.00  MIO steps aside to the corner and faces the findings as they appear.

export interface EjemploBeats {
  scanT: number;
  found: number;
  zoom: number;
  gazeX: number;
  mood: StageMood;
  /** 0 = on stage at the right (reading), 1 = parked in the corner next to the findings. */
  aside: number;
}

export function ejemploBeats(p: number): EjemploBeats {
  const q = clamp(p, 0, 1);
  const scanT = clamp(q / 0.35, 0, 1);
  const found = smootherstep((q - 0.35) / 0.12);
  const aside = smootherstep((q - 0.4) / 0.14);
  const zoom = smootherstep(q / 0.35) * (1 - smootherstep((q - 0.4) / 0.15));
  const gazeX = lerp(-0.85, -0.45, smootherstep((q - 0.36) / 0.2));
  const mood: StageMood = q < 0.35 ? 'trabajando' : q < 0.5 ? 'anomalia' : q < 0.93 ? 'reposo' : 'celebrando';
  return { scanT, found, zoom, gazeX, mood, aside };
}

const EJEMPLO_READING = { x: 0.79, y: 0.56, size: 0.7, yaw: -30 };
const EJEMPLO_ASIDE = { x: 0.955, y: 0.86, size: 0.24, yaw: -22 };

/** Writes the pose "Ejemplo" has at pin progress `p` into `out`. */
export function ejemploPose(p: number, out: PetPose): PetPose {
  const { aside } = ejemploBeats(p);
  out.x = lerp(EJEMPLO_READING.x, EJEMPLO_ASIDE.x, aside);
  out.y = lerp(EJEMPLO_READING.y, EJEMPLO_ASIDE.y, aside);
  out.size = lerp(EJEMPLO_READING.size, EJEMPLO_ASIDE.size, aside);
  out.yaw = lerp(EJEMPLO_READING.yaw, EJEMPLO_ASIDE.yaw, aside);
  return out;
}
