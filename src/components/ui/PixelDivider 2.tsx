import React, { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useMioStore } from '@/utils/useMioStore';

interface PixelDividerProps {
  /** Color of the section above. 'page' resolves to the theme background. */
  from: string | 'page';
  /** Color of the section below. 'page' resolves to the theme background. */
  to: string | 'page';
  /** Sparkle color that rides the dissolve front. */
  accent?: string;
  /** Height in CSS px */
  height?: number;
  /** Cell size in CSS px */
  cell?: number;
}

// Deterministic per-cell noise so the pattern never changes between redraws.
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Signature transition between acts: square pixels of the next section's color
 * dissolve in over the previous one as you scroll through the band. Canvas 2D,
 * redrawn only while the band is on screen. Static (fully resolved) for
 * prefers-reduced-motion.
 */
export const PixelDivider: React.FC<PixelDividerProps> = ({
  from,
  to,
  accent = '#bdf559',
  height = 112,
  cell = 16,
}) => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const page = isDark ? '#07070a' : '#f3f3f5';
  const fromColor = from === 'page' ? page : from;
  const toColor = to === 'page' ? page : to;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let progress = reduced ? 1 : 0;
    let cols = 0;
    let rows = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const px = canvas.width / (cols || 1);
      const py = canvas.height / (rows || 1);
      for (let r = 0; r < rows; r++) {
        // rows nearest the next section fill first, so the wave "flows" downward
        const rowBias = r / Math.max(rows - 1, 1);
        for (let c = 0; c < cols; c++) {
          const thr = hash(c, r, 7) * 0.6 + (1 - rowBias) * 0.4;
          if (progress <= thr) continue;
          const sparkle = hash(c, r, 19) < 0.1 && progress < thr + 0.16;
          ctx.fillStyle = sparkle ? accent : toColor;
          // +1 px overlap avoids hairline seams between cells at fractional DPR
          ctx.fillRect(Math.floor(c * px), Math.floor(r * py), Math.ceil(px) + 1, Math.ceil(py) + 1);
        }
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      cols = Math.max(1, Math.ceil(w / cell));
      rows = Math.max(1, Math.round(height / cell));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let st: ScrollTrigger | undefined;
    if (!reduced) {
      st = ScrollTrigger.create({
        trigger: wrap,
        start: 'top 92%',
        end: 'bottom 35%',
        onUpdate: (self) => {
          progress = self.progress;
          draw();
        },
        onRefresh: (self) => {
          progress = self.progress;
          draw();
        },
      });
    }

    return () => {
      ro.disconnect();
      st?.kill();
    };
  }, [toColor, accent, height, cell]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="relative w-full overflow-hidden select-none pointer-events-none"
      style={{ height, backgroundColor: fromColor }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
};

export default PixelDivider;
