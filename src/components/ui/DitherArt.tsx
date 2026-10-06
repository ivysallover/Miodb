import React, { useEffect, useRef } from 'react';

export type DitherVariant = 'sheet' | 'anomalies' | 'models' | 'shap' | 'chat' | 'texture';
export type DitherBleed = 'none' | 'left' | 'right' | 'top' | 'bottom';

interface DitherArtProps {
  variant: DitherVariant;
  seed?: number;
  /** CSS size of the art. Omit to fill the parent. */
  width?: number;
  height?: number;
  /** CSS pixels per dither cell. */
  pixelSize?: number;
  /** Edge the drawing runs off (content is scaled up and anchored to the opposite side). */
  bleed?: DitherBleed;
  /** `light` = ink on a light page, `dark` = lavender on obsidian. */
  tone?: 'light' | 'dark';
  className?: string;
}

// Ink ramps, faintest → strongest. Same violet gamma as the hero specimen.
const RAMPS = {
  light: ['#e9e3ff', '#b6a1ff', '#7647eb', '#3d1f8a', '#150b33'],
  dark: ['#1a0f3d', '#4a25b0', '#7647eb', '#b6a1ff', '#f1ecff'],
};
const SPARK = '#bdf559';

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Bayer 8x8, normalised to (0,1).
const BAYER8: number[] = (() => {
  const m2 = [[0, 2], [3, 1]];
  const build = (n: number): number[][] => {
    if (n === 2) return m2;
    const p = build(n / 2);
    const out: number[][] = [];
    for (let y = 0; y < n; y++) {
      out.push([]);
      for (let x = 0; x < n; x++) {
        const q = p[y % (n / 2)][x % (n / 2)] * 4;
        out[y].push(q + m2[Math.floor(y / (n / 2))][Math.floor(x / (n / 2))]);
      }
    }
    return out;
  };
  return build(8).flat().map((v) => (v + 0.5) / 64);
})();

const hash = (x: number, y: number, s: number) => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t: number) => t * t * (3 - 2 * t);
const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};

/** Distance to a rounded rect centred at (cx,cy) with half-sizes (hx,hy). */
const rrect = (px: number, py: number, cx: number, cy: number, hx: number, hy: number, r: number) => {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

// Each field writes [ink 0..1, spark 0|1] into `o` for logical pixel (px,py) of a w×h grid.
type Field = (px: number, py: number, w: number, h: number, seed: number, o: number[]) => void;

const sheet: Field = (px, py, w, h, seed, o) => {
  const cols = 8, rows = 11;
  const cw = w / cols, ch = h / rows;
  const cx = Math.floor(px / cw), cy = Math.floor(py / ch);
  const fx = px - cx * cw, fy = py - cy * ch;
  o[0] = 0; o[1] = 0;
  if (fx < 1 || fy < 1) { o[0] = 0.5; return; }
  if (cy === 0) { o[0] = 0.9; return; }
  const r = hash(cx, cy, seed);
  if (r < 0.1) { // broken cell: diagonal hatch
    o[0] = (Math.floor(fx + fy) % 5) < 2 ? 0.75 : 0;
    o[1] = cx === 3 && cy === 5 ? 1 : 0;
    if (o[1]) o[0] = 1;
    return;
  }
  if (r < 0.3) return;
  if (r < 0.7) { // text stub
    const bw = (0.3 + 0.6 * hash(cx, cy, seed + 7)) * (cw - 4);
    if (fx > 2 && fx < 2 + bw && Math.abs(fy - ch / 2) < 1.4) o[0] = 0.7;
    return;
  }
  o[0] = 0.26; // numeric block
};

const SPIKES = [0.2, 0.57, 0.82];
const anomalies: Field = (px, py, w, h, seed, o) => {
  const series = (x: number) => {
    let y = 0.56 + 0.1 * Math.sin(x * 9 + seed) + 0.05 * Math.sin(x * 23 + seed * 2);
    for (const s of SPIKES) y -= 0.3 * Math.exp(-Math.pow((x - s) / 0.012, 2));
    return y;
  };
  const x = px / w, y = py / h, yl = series(x);
  o[0] = 0; o[1] = 0;
  if (y > yl) o[0] = Math.max(0, 0.34 - (y - yl) * 0.5);
  if (Math.abs(py - yl * h) < 1.5) o[0] = 1;
  if (Math.abs(((y * 5) % 1) * h / 5) < 0.6 && Math.floor(px / 3) % 2 === 0) o[0] = Math.max(o[0], 0.22);
  for (const s of SPIKES) {
    const sx = s * w, sy = series(s) * h;
    if (Math.abs(Math.hypot(px - sx, py - sy) - 8) < 1.2) { o[0] = 1; o[1] = 1; }
    if (Math.abs(px - sx) < 0.6 && py > sy + 9 && Math.floor(py / 3) % 2 === 0) o[0] = Math.max(o[0], 0.5);
  }
};

const models: Field = (px, py, w, h, seed, o) => {
  const x = px / w, y = py / h;
  const cut = 0.6;
  const truth = (t: number) => 0.62 - 0.28 * t + 0.07 * Math.sin(t * 14 + seed);
  const curves = [
    (t: number) => truth(t) + (t > cut ? 0.05 * (t - cut) * 4 : 0.01 * Math.sin(t * 30)),
    (t: number) => truth(t) - (t > cut ? 0.1 * (t - cut) * 2.5 : 0.015 * Math.sin(t * 25 + 1)),
    (t: number) => truth(t) + 0.02 * Math.sin(t * 40) + (t > cut ? 0.02 : 0),
  ];
  o[0] = 0; o[1] = 0;
  const win = curves[2](x);
  const band = x > cut ? 0.015 + (x - cut) * 0.22 : 0.012;
  if (Math.abs(y - win) < band) o[0] = 0.24 + (x > cut ? 0.1 : 0);
  if (Math.abs(px - cut * w) < 0.6 && Math.floor(py / 3) % 2 === 0) o[0] = 0.55;
  if (x <= cut && Math.abs(py - truth(x) * h) < 1 && Math.floor(px / 3) % 2 === 0) o[0] = 0.85;
  for (let i = 0; i < 2; i++) if (Math.abs(py - curves[i](x) * h) < 0.9) o[0] = Math.max(o[0], 0.5);
  if (Math.abs(py - win * h) < 1.8) { o[0] = 1; o[1] = x > cut ? 1 : 0; }
};

const SHAP = [1, 0.82, 0.64, 0.5, 0.38, 0.25, 0.15];
const shap: Field = (px, py, w, h, seed, o) => {
  const n = SHAP.length, rh = h / n;
  const i = Math.min(n - 1, Math.floor(py / rh));
  const fy = py - i * rh;
  o[0] = 0; o[1] = 0;
  const x0 = w * 0.2;
  if (Math.abs(px - x0) < 0.6) { o[0] = 0.6; return; }
  if (fy < rh * 0.2 || fy > rh * 0.8) return;
  const len = SHAP[i] * w * 0.76;
  if (px > w * 0.03 && px < w * 0.03 + w * 0.12 * (0.6 + 0.4 * hash(i, 1, seed)) && Math.abs(fy - rh / 2) < 1.4) { o[0] = 0.6; return; }
  if (px > x0 && px < x0 + len) {
    o[0] = 0.4 + 0.6 * ((px - x0) / len);
    if (i === 0 && px > x0 + len - 4) { o[0] = 1; o[1] = 1; }
  }
};

const BUBBLES = [
  { r: false, y: 0.15, w: 0.64, h: 0.2, lines: 3 },
  { r: true, y: 0.37, w: 0.5, h: 0.12, lines: 2 },
  { r: false, y: 0.62, w: 0.74, h: 0.28, lines: 4 },
  { r: true, y: 0.87, w: 0.36, h: 0.1, lines: 1 },
];
const chat: Field = (px, py, w, h, seed, o) => {
  o[0] = 0; o[1] = 0;
  for (const b of BUBBLES) {
    const bw = b.w * w, bh = b.h * h;
    const cx = b.r ? w - bw / 2 - w * 0.03 : bw / 2 + w * 0.03, cy = b.y * h;
    const d = rrect(px, py, cx, cy, bw / 2, bh / 2, 8);
    if (d > 0) continue;
    if (d > -1.4) { o[0] = 0.9; return; }
    o[0] = b.r ? 0.62 : 0.2;
    const lx = px - (cx - bw / 2) - 10, ly = py - (cy - bh / 2) - 9;
    if (lx > 0 && lx < bw - 20 && ly > 0) {
      const line = Math.floor(ly / 7);
      if (line < b.lines && ly % 7 < 2.2) {
        const last = line === b.lines - 1;
        if (lx < (bw - 20) * (last ? 0.55 : 1 - 0.1 * hash(line, 3, seed))) o[0] = b.r ? 0.18 : 0.9;
      }
    }
  }
  const dots = [0.08, 0.14, 0.2];
  for (let k = 0; k < 3; k++) {
    if (Math.hypot(px - w * dots[k], py - h * 0.985 + 3) < 2.3) { o[0] = 1; o[1] = k === 2 ? 1 : 0; }
  }
};

// "Curvas de nivel": a domain-warped noise terrain read as a contour map. Two warp passes bend the
// field into slow, river-like folds; iso-lines every 1/BANDS of height become the ink, and the
// faint fill under them follows the same height, so the dither reads as relief, not static.
const BANDS = 9;
const fbm = (x: number, y: number, s: number) =>
  vnoise(x, y, s) * 0.55 + vnoise(x * 2.03, y * 2.03, s + 1) * 0.3 + vnoise(x * 4.1, y * 4.1, s + 2) * 0.15;
const texture: Field = (px, py, w, h, seed, o) => {
  const k = 3.2 / Math.max(w, h);
  const x = px * k, y = py * k;
  const qx = fbm(x + 3.1, y + 1.7, seed), qy = fbm(x - 2.4, y + 5.2, seed + 7);
  const hgt = fbm(x + 2.2 * qx, y + 2.2 * qy, seed + 13);
  const f = hgt * BANDS;
  const d = Math.abs(f - Math.round(f)); // distance to the nearest iso-line, in band units
  const vignette = Math.max(0.2, 1 - Math.hypot(px / w - 0.5, py / h - 0.5) * 1.1);
  o[0] = (d < 0.06 ? 0.85 : hgt * 0.22) * vignette;
  o[1] = 0;
};

const FIELDS: Record<DitherVariant, Field> = { sheet, anomalies, models, shap, chat, texture };

export const DitherArt: React.FC<DitherArtProps> = ({
  variant,
  seed = 1,
  width,
  height,
  pixelSize = 3,
  bleed = 'none',
  tone = 'light',
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ramp = RAMPS[tone].map(hexToRgb);
    const spark = hexToRgb(SPARK);
    const field = FIELDS[variant];
    const o = [0, 0];
    const zoom = bleed === 'none' ? 1 : 1.18;

    const draw = () => {
      const cssW = width ?? host.clientWidth;
      const cssH = height ?? host.clientHeight;
      if (!cssW || !cssH) return;
      const w = Math.max(8, Math.ceil(cssW / pixelSize));
      const h = Math.max(8, Math.ceil(cssH / pixelSize));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const img = ctx.createImageData(w, h);
      const d = img.data;
      // Content is scaled up and pinned to the edge opposite the bleed, so it runs off that side.
      const ox = bleed === 'left' ? w - w * zoom : 0;
      const oy = bleed === 'top' ? h - h * zoom : 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const fx = (x - ox) / zoom, fy = (y - oy) / zoom;
          o[0] = 0; o[1] = 0;
          field(fx, fy, w, h, seed, o);
          const ink = o[0];
          const t = BAYER8[(y & 7) * 8 + (x & 7)];
          if (ink <= 0.02 + t * 0.06) continue;
          const i = (y * w + x) * 4;
          let c: [number, number, number];
          if (o[1]) c = spark;
          else {
            const s = Math.min(1, ink) * 4;
            const base = Math.floor(s);
            c = ramp[Math.min(4, base + (s - base > t ? 1 : 0))];
          }
          d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    draw();
    if (width && height) return;
    const ro = new ResizeObserver(draw);
    ro.observe(host);
    return () => ro.disconnect();
  }, [variant, seed, width, height, pixelSize, bleed, tone]);

  return (
    <div
      ref={hostRef}
      className={`relative ${width ? '' : 'w-full h-full'} ${className}`}
      style={width && height ? { width, height } : undefined}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default DitherArt;
