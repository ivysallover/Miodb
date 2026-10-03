import React, { useEffect, useRef, useCallback } from 'react';
import { playMioDevSound } from '@/lib/sound';
import { useMioStore } from '@/utils/useMioStore';

// 4x4 Bayer Dither Matrix
const BAYER = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

/**
 * Global helper to navigate with signature MIO Dither Dissolve curtain
 */
export function navigateWithDither(targetPath: string) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === targetPath) return;

  const event = new CustomEvent('mio:dither-navigate', {
    detail: { path: targetPath },
  });
  window.dispatchEvent(event);
}

/**
 * DitherRouteCurtain:
 * High-performance hardware-accelerated full-screen dither transition curtain.
 * Always mounted in DOM with zero-overhead when idle to avoid React ref desyncs.
 */
export const DitherRouteCurtain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const isTransitioning = useRef(false);
  const rafId = useRef<number | null>(null);

  const renderDither = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (progress <= 0.01) return;

    const blockSize = Math.max(16, Math.floor(w / 48));
    const cols = Math.ceil(w / blockSize);
    const rows = Math.ceil(h / blockSize);

    ctx.fillStyle = isDark ? '#07070a' : '#0e0c19';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bayerVal = (BAYER[(r % 4) * 4 + (c % 4)] + 0.5) / 16;
        const centerDist = Math.hypot((c - cols / 2) / cols, (r - rows / 2) / rows);
        const threshold = progress * 1.3 - centerDist * 0.3;

        if (threshold >= bayerVal) {
          ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize);
        }
      }
    }
  }, [isDark]);

  useEffect(() => {
    const handleStartNavigation = (e: Event) => {
      if (isTransitioning.current) return;
      const customEvent = e as CustomEvent<{ path: string }>;
      const targetPath = customEvent.detail?.path;
      if (!targetPath) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const badge = badgeRef.current;
      if (!container || !canvas) return;

      isTransitioning.current = true;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      container.style.pointerEvents = 'auto';
      container.style.opacity = '1';
      if (badge) badge.style.opacity = '1';

      playMioDevSound('whoosh');

      const startTime = performance.now();
      const inDuration = 180; // 180ms in

      const stepIn = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / inDuration);
        renderDither(p);

        if (p < 1) {
          rafId.current = requestAnimationFrame(stepIn);
        } else {
          // Curtains are 100% closed: execute route change
          window.history.pushState({}, '', targetPath);
          window.dispatchEvent(new PopStateEvent('popstate'));
          window.scrollTo(0, 0);

          // Begin dissolve out
          const outStartTime = performance.now();
          const outDuration = 200; // 200ms out

          const stepOut = (outNow: number) => {
            const outElapsed = outNow - outStartTime;
            const outP = Math.max(0, 1 - outElapsed / outDuration);
            renderDither(outP);

            if (outP > 0) {
              rafId.current = requestAnimationFrame(stepOut);
            } else {
              container.style.pointerEvents = 'none';
              container.style.opacity = '0';
              if (badge) badge.style.opacity = '0';
              isTransitioning.current = false;
            }
          };

          rafId.current = requestAnimationFrame(stepOut);
        }
      };

      rafId.current = requestAnimationFrame(stepIn);
    };

    window.addEventListener('mio:dither-navigate', handleStartNavigation);
    return () => {
      window.removeEventListener('mio:dither-navigate', handleStartNavigation);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [renderDither]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="fixed inset-0 z-[999990] pointer-events-none overflow-hidden select-none transition-opacity duration-150"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Central telemetry logo during transition */}
      <div
        ref={badgeRef}
        style={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-150"
      >
        <div className="flex items-center gap-2.5 px-4 py-2 border border-[#bdf559]/40 bg-black/90 text-white font-mono text-xs tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse shadow-[0_0_8px_#bdf559]" />
          <span>MIO OS // INICIANDO MÓDULO</span>
        </div>
      </div>
    </div>
  );
};

export default DitherRouteCurtain;
