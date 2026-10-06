import React, { useEffect, useRef } from 'react';
import { useActiveSection } from '@/hooks/useActiveSection';
import { LANDING_SECTIONS } from '@/lib/landingSections';
import { ScrollTrigger } from '@/lib/gsap';

const ROW_H = 36;

/**
 * The page is a spreadsheet: a gutter of row numbers runs down the left edge and counts as you
 * scroll, and a "name box" names the cell you are in. It is the landing's one continuous thread
 * (and it replaces the dotted section rail). Desktop only; one transform write per frame.
 */
export const SheetFrame: React.FC = () => {
  const colRef = useRef<HTMLDivElement>(null);
  const refRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const active = useActiveSection();
  const idx = Math.max(0, LANDING_SECTIONS.findIndex((s) => s.id === active));
  const letterRef = useRef('A');
  letterRef.current = String.fromCharCode(65 + idx);

  useEffect(() => {
    const col = colRef.current;
    if (!col) return;
    const spans = Array.from(col.children) as HTMLElement[];
    let raf = 0;
    let lastBase = -1;
    const paint = () => {
      raf = 0;
      const raw = window.scrollY;
      // While a section is pinned the page does not move, so the sheet must not either:
      // subtract the distance already spent inside every pin.
      let held = 0;
      const pins = ScrollTrigger.getAll();
      for (let k = 0; k < pins.length; k++) {
        const t = pins[k];
        if (!t.pin) continue;
        held += Math.min(Math.max(raw - t.start, 0), t.end - t.start);
      }
      const y = raw - held;
      const base = Math.floor(y / ROW_H);
      col.style.transform = `translate3d(0,${-(y % ROW_H)}px,0)`;
      if (base !== lastBase) {
        lastBase = base;
        for (let i = 0; i < spans.length; i++) spans[i].textContent = String(base + i + 1);
        if (refRef.current) refRef.current.textContent = `${letterRef.current}${base + 1}`;
      }
      if (barRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, raw / max) : 0})`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    paint();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // A fixed, generous row count: the gutter never has stale cells after a resize.
  const rows = 64;
  const label = LANDING_SECTIONS[idx]?.label ?? '';

  return (
    <div aria-hidden="true" className="hidden lg:block pointer-events-none select-none">
      <div className="fixed left-0 top-0 bottom-0 z-30 w-9 overflow-hidden mix-blend-difference">
        <div ref={colRef} className="will-change-transform">
          {Array.from({ length: rows }, (_, i) => (
            <span
              key={i}
              className="block text-center font-mono text-[10px] text-zinc-400/80"
              style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Name box: the selected cell, in the corner of the sheet. Out of the way of the content. */}
      <div className="fixed left-0 bottom-0 z-40 flex h-9 items-stretch font-mono text-[10px] font-bold uppercase tracking-wider">
        <span ref={refRef} className="flex w-12 items-center justify-center bg-[#7647eb] text-white tabular-nums">A1</span>
        <span className="flex items-center gap-2 border-t border-r border-black/10 bg-white px-2.5 text-zinc-900 dark:border-white/15 dark:bg-[#0e0d16] dark:text-zinc-100">
          <span key={label} className="mio-swap">{label}</span>
          <span className="block h-[2px] w-10 bg-black/10 dark:bg-white/15">
            <span ref={barRef} className="block h-full origin-left bg-[#7647eb]" style={{ transform: 'scaleX(0)' }} />
          </span>
        </span>
      </div>
    </div>
  );
};

export default SheetFrame;
