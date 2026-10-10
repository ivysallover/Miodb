/**
 * routeTransition — the page change as a scene.
 *
 * Square cells of the brand violet fill the screen (a dissolve with the same grammar as the
 * PixelDivider between acts), the route is swapped while it is fully covered, and the cells clear
 * again. ~0.6 s in total. One canvas, created and removed on demand, outside React so it survives
 * the tree being replaced underneath it. Skipped for reduced motion.
 */

const COVER_MS = 260;
const HOLD_MS = 40;
const CLEAR_MS = 320;
const CELL = 28;
const FILL = '#3d1f8a';
const SPARK = '#bdf559';

let running = false;

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
};

export function playRouteTransition(commit: () => void): void {
  if (
    typeof window === 'undefined' ||
    running ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    commit();
    return;
  }
  const ctx2d = (() => {
    const c = document.createElement('canvas');
    return c.getContext('2d') ? c : null;
  })();
  if (!ctx2d) {
    commit();
    return;
  }

  running = true;
  const canvas = ctx2d;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;z-index:400;pointer-events:auto;cursor:progress;`;
  document.body.appendChild(canvas);
  const g = canvas.getContext('2d')!;
  g.scale(dpr, dpr);

  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  // Each cell turns on at a threshold: a left-to-right front with noise, so it reads as a wave.
  const thr = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) thr[r * cols + c] = (c / cols) * 0.62 + hash(c, r) * 0.38;

  const draw = (p: number, covering: boolean) => {
    g.clearRect(0, 0, w, h);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = thr[r * cols + c];
        // Covering: cells appear as p passes their threshold. Clearing: they vanish in the same order.
        const on = covering ? p > t : p < t;
        if (!on) continue;
        const edge = covering ? p - t < 0.09 : t - p < 0.09;
        g.fillStyle = edge && hash(c, r + 99) < 0.14 ? SPARK : FILL;
        g.fillRect(c * CELL, r * CELL, CELL + 1, CELL + 1);
      }
    }
  };

  let committed = false;
  const t0 = performance.now();
  const frame = (now: number) => {
    const el = now - t0;
    if (el < COVER_MS) {
      draw(el / COVER_MS, true);
      requestAnimationFrame(frame);
    } else if (el < COVER_MS + HOLD_MS) {
      {
        draw(1.01, true);
        if (!committed) {
          committed = true;
          try {
            commit();
          } catch (e) {
            console.error('[MIO] route commit failed', e);
          }
        }
      }
      requestAnimationFrame(frame);
    } else if (el < COVER_MS + HOLD_MS + CLEAR_MS) {
      draw((el - COVER_MS - HOLD_MS) / CLEAR_MS, false);
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
      running = false;
    }
  };
  requestAnimationFrame(frame);
}
