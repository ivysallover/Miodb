import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { markBootDone } from '@/lib/boot';
import { loadPetScene } from '@/components/pet/petKit';

const CELLS = 24;
const MIN_MS = 600; // long enough to read, short enough not to be a wall
const MAX_MS = 2200; // hard cap: the boot can never trap the visitor
const SEEN_KEY = 'mio-boot-seen';

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "MIO OS" boot screen. Covers real loading work (fonts + the pet model), shows
 * once per browser session, is skipped for prefers-reduced-motion, can be
 * skipped by any key or click, and always dismisses itself after MAX_MS.
 */
export const BootSequence: React.FC = () => {
  const [active] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !alreadySeen();
  });
  const [mounted, setMounted] = useState(active);
  const [filled, setFilled] = useState(0);
  const [okFonts, setOkFonts] = useState(false);
  const [okPet, setOkPet] = useState(false);
  const [okConsole, setOkConsole] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const exitingRef = useRef(false);

  // Not booting: release anything waiting on us right away.
  useEffect(() => {
    if (!active) markBootDone();
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';

    const start = performance.now();
    let fontsReady = false;
    let petReady = false;
    let raf = 0;
    let dead = false;

    const finish = () => {
      if (exitingRef.current || dead) return;
      exitingRef.current = true;
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        /* storage may be blocked; the boot just replays next visit */
      }
      root.style.overflow = prevOverflow;
      const el = rootRef.current;
      // Release the hero entrance slightly before the wipe ends so they overlap.
      gsap.delayedCall(0.25, markBootDone);
      if (!el) {
        setMounted(false);
        return;
      }
      gsap.to(el, {
        clipPath: 'inset(0% 0% 100% 0%)',
        duration: 0.8,
        ease: 'expo.inOut',
        onComplete: () => setMounted(false),
      });
    };

    Promise.all([
      document.fonts?.load("1em 'Climate Crisis'"),
      document.fonts?.ready,
    ])
      .catch(() => undefined)
      .then(() => {
        fontsReady = true;
        setOkFonts(true);
      });

    loadPetScene('reposo', 'violeta')
      .catch(() => undefined)
      .then(() => {
        petReady = true;
        setOkPet(true);
      });

    const tick = () => {
      const t = performance.now() - start;
      // Real progress: 2 tasks + the minimum time. Time keeps the bar moving while assets load.
      const real = (fontsReady ? 0.4 : 0) + (petReady ? 0.4 : 0) + Math.min(t / MIN_MS, 1) * 0.2;
      const timeFloor = Math.min(t / MAX_MS, 1) * 0.75;
      const p = Math.min(Math.max(real, timeFloor), 1);
      setFilled(Math.floor(p * CELLS));
      if (t > MIN_MS * 0.6) setOkConsole(true);
      if ((fontsReady && petReady && t >= MIN_MS) || t >= MAX_MS) {
        setFilled(CELLS);
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const skip = () => {
      setFilled(CELLS);
      finish();
    };
    window.addEventListener('keydown', skip, { once: true });
    window.addEventListener('pointerdown', skip, { once: true });

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
      root.style.overflow = prevOverflow;
      // No markBootDone() here: React StrictMode runs this cleanup once in dev before the real
      // run, and releasing the hero early would play its entrance behind the overlay.
    };
  }, [active]);

  if (!mounted) return null;

  const line = (label: string, ok: boolean) => (
    <div className="flex items-center gap-3">
      <span className="text-[#bdf559]">&gt;</span>
      <span className="text-white/80">{label}</span>
      <span className="flex-1 border-b border-dashed border-white/20 translate-y-[-3px]" />
      <span className={ok ? 'text-[#bdf559] font-bold' : 'text-white/30'}>{ok ? 'OK' : '..'}</span>
    </div>
  );

  return (
    <div
      ref={rootRef}
      role="status"
      aria-live="polite"
      aria-label="Cargando MIO"
      className="fixed inset-0 z-[200] bg-[#0b0914] text-white flex items-center justify-center px-6 select-none"
      style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
    >
      {/* square grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-md rounded-mio overflow-hidden border border-white/15 bg-[#0b0914]">
        <div className="flex items-center justify-between bg-[#bdf559] text-black border-b border-black/20 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider">
          <span>MIO OS v2.6</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-black animate-pulse" />
            Arranque
          </span>
        </div>

        <div className="p-5 space-y-3 font-mono text-xs">
          {line('TIPOGRAFÍAS', okFonts)}
          {line('ESPÉCIMEN 01', okPet)}
          {line('CONSOLA MIO-DEV', okConsole)}

          <div className="pt-3">
            <div className="flex gap-[3px]" aria-hidden>
              {Array.from({ length: CELLS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-3 flex-1 border ${
                    i < filled ? 'bg-[#bdf559] border-[#bdf559]' : 'bg-transparent border-white/25'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/45">
              <span>{Math.round((filled / CELLS) * 100)}%</span>
              <span>Cualquier tecla para saltar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BootSequence;
