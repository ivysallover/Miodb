import React, { useEffect, useRef, useState, useCallback } from 'react';
import { playMioDevSound } from '@/lib/sound';
import { useMioStore } from '@/utils/useMioStore';

interface DitherCurtainProps {
  onTransitionComplete?: () => void;
}

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
 * Triggers a 420ms pixelation dissolve with Web Audio whoosh feedback between routes.
 */
export const DitherRouteCurtain: React.FC<DitherCurtainProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const animState = useRef<{
    progress: number; // 0 to 1 (in), 1 to 0 (out)
    direction: 'in' | 'out';
    targetPath: string | null;
    rafId: number | null;
  }>({
    progress: 0,
    direction: 'in',
    targetPath: null,
    rafId: null,
  });

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

    // Primary fill color: obsidian black in dark mode or deep graphite
    ctx.fillStyle = isDark ? '#07070a' : '#0e0c19';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bayerVal = (BAYER[(r % 4) * 4 + (c % 4)] + 0.5) / 16;
        // Radial and vertical dispersion weighting
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
      const customEvent = e as CustomEvent<{ path: string }>;
      const targetPath = customEvent.detail?.path;
      if (!targetPath) return;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      setIsActive(true);
      playMioDevSound('whoosh');

      animState.current.targetPath = targetPath;
      animState.current.direction = 'in';
      animState.current.progress = 0;

      const startTime = performance.now();
      const inDuration = 180; // 180ms in

      const stepIn = (now: number) => {
        const elapsed = now - startTime;
        const p = Math.min(1, elapsed / inDuration);
        animState.current.progress = p;
        renderDither(p);

        if (p < 1) {
          animState.current.rafId = requestAnimationFrame(stepIn);
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
            animState.current.progress = outP;
            renderDither(outP);

            if (outP > 0) {
              animState.current.rafId = requestAnimationFrame(stepOut);
            } else {
              setIsActive(false);
              animState.current.targetPath = null;
            }
          };

          animState.current.rafId = requestAnimationFrame(stepOut);
        }
      };

      animState.current.rafId = requestAnimationFrame(stepIn);
    };

    window.addEventListener('mio:dither-navigate', handleStartNavigation);
    return () => {
      window.removeEventListener('mio:dither-navigate', handleStartNavigation);
      if (animState.current.rafId) cancelAnimationFrame(animState.current.rafId);
    };
  }, [renderDither]);

  if (!isActive) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[999990] pointer-events-auto overflow-hidden select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Central telemetry logo during transition */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2.5 px-4 py-2 border border-[#bdf559]/40 bg-black/80 text-white font-mono text-xs tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse shadow-[0_0_8px_#bdf559]" />
          <span>MIO OS // INICIANDO MÓDULO</span>
        </div>
      </div>
    </div>
  );
};

export default DitherRouteCurtain;
