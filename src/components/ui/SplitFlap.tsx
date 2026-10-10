import React, { useEffect, useRef, useState } from 'react';

const GLYPHS = '0123456789';
const FLIP_MS = 58; // how often a flap shows a new glyph while it is still turning
const STAGGER_MS = 85; // each flap settles a little after the one on its left
const BASE_MS = 420;

const isFlappable = (ch: string) => /[0-9]/.test(ch);

interface SplitFlapProps {
  /** The final text, e.g. "138.116" or "13,5 %". Digits flip; everything else is a fixed mark. */
  value: string;
  className?: string;
  /** Tile colours. Defaults suit a light card; pass dark for the obsidian blocks. */
  tone?: 'ink' | 'paper';
}

/**
 * SplitFlap — a departures-board number.
 *
 * Each digit sits on its own tile with a seam across the middle and turns through random digits
 * before it lands, left to right, like a station board catching up. It plays once when it enters
 * the viewport. The tiles are decoration: the real text is exposed once through aria-label, and
 * with reduced motion the final value is simply there.
 */
export const SplitFlap: React.FC<SplitFlapProps> = ({ value, className = '', tone = 'ink' }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<string[]>(() => value.split(''));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finalChars = value.split('');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(finalChars);
      setSettled(true);
      return;
    }
    setShown(finalChars.map((c) => (isFlappable(c) ? GLYPHS[Math.floor(Math.random() * 10)] : c)));
    setSettled(false);

    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started) return;
        started = true;
        io.disconnect();
        const t0 = performance.now();
        let lastFlip = 0;
        const tick = (now: number) => {
          const el = now - t0;
          const next = finalChars.map((c, i) => {
            if (!isFlappable(c)) return c;
            const settleAt = BASE_MS + i * STAGGER_MS;
            return el >= settleAt ? c : GLYPHS[Math.floor(Math.random() * 10)];
          });
          if (now - lastFlip >= FLIP_MS || el > BASE_MS + finalChars.length * STAGGER_MS) {
            lastFlip = now;
            setShown(next);
          }
          if (el < BASE_MS + finalChars.length * STAGGER_MS + FLIP_MS) raf = requestAnimationFrame(tick);
          else {
            setShown(finalChars);
            setSettled(true);
          }
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const tile =
    tone === 'paper'
      ? 'bg-white text-zinc-950 border-zinc-300'
      : 'bg-[#0b0914] text-white border-white/10';
  const seam = tone === 'paper' ? 'bg-zinc-300' : 'bg-white/15';

  return (
    <span ref={ref} role="img" aria-label={value} className={`inline-flex items-center font-mono font-bold ${className}`}>
      {shown.map((ch, i) =>
        isFlappable(value[i]) ? (
          <span
            key={i}
            aria-hidden="true"
            className={`relative mx-[0.04em] inline-flex h-[1.3em] w-[0.78em] items-center justify-center overflow-hidden rounded-[0.12em] border tabular-nums leading-none ${tile} ${
              settled ? '' : 'text-[#bdf559]'
            } transition-colors duration-200`}
          >
            {ch}
            <span className={`pointer-events-none absolute inset-x-0 top-1/2 h-px ${seam}`} />
          </span>
        ) : (
          <span key={i} aria-hidden="true" className="whitespace-pre px-[0.06em]">
            {ch}
          </span>
        )
      )}
    </span>
  );
};

export default SplitFlap;
