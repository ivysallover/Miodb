import React from 'react';

/**
 * SectionPlate — instrument-panel section label (BRANDING.md §2: Neo-Brutalismo + Metrología Suiza).
 *
 * Replaces the rounded "pill + dot" eyebrow that every section used to repeat.
 * Two square cells with a 1px hard border and no radius: [ 02/06 ][ ■ LABEL ].
 * The index cell echoes the navbar logo (black square, lime glyph) and gives the page a
 * numbered structure that reads like a spec sheet instead of a template.
 */
interface SectionPlateProps {
  index: string;
  total?: string;
  label: string;
  /** Color of the square status LED. */
  tone?: 'violet' | 'lime';
  /** Pulse the LED (use for "live" labels such as the hero). */
  live?: boolean;
  /** Force the dark-surface look for sections that are always dark (case study, CTA). */
  onDark?: boolean;
  /** Optional extra cell on the right, rendered in brand violet (e.g. "EDICIÓN 2026"). */
  aside?: string;
  className?: string;
}

export const SectionPlate: React.FC<SectionPlateProps> = ({
  index,
  total = '07',
  label,
  tone = 'violet',
  live = false,
  onDark = false,
  aside,
  className = '',
}) => {
  const surface = onDark
    ? 'border-white/15 bg-[#0e0c19] text-zinc-300'
    : 'border-black bg-white text-zinc-900 dark:border-white/15 dark:bg-[#0e0c19] dark:text-zinc-300';

  const indexCell = onDark
    ? 'border-white/15 bg-white/[0.06] text-[#bdf559]'
    : 'border-black bg-black text-[#bdf559] dark:border-white/15 dark:bg-white/[0.06]';

  const asideCell = onDark
    ? 'border-white/15 text-[#a78bfa]'
    : 'border-black text-[#602cd1] dark:border-white/15 dark:text-[#a78bfa]';

  const led = tone === 'lime' ? '#bdf559' : '#7647eb';

  return (
    <div
      className={`inline-flex max-w-full items-stretch border rounded-none font-mono text-[10px] sm:text-[11px] leading-tight uppercase tracking-[0.14em] select-none ${surface} ${className}`}
    >
      <span className={`shrink-0 px-2 sm:px-2.5 py-1.5 border-r font-bold tabular-nums ${indexCell}`}>
        {index}/{total}
      </span>
      <span className="flex min-w-0 items-center gap-2 px-2.5 py-1.5">
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 ${live ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: led }}
          aria-hidden="true"
        />
        <span>{label}</span>
      </span>
      {aside && (
        <span className={`hidden sm:flex shrink-0 items-center border-l px-2.5 py-1.5 font-semibold ${asideCell}`}>
          {aside}
        </span>
      )}
    </div>
  );
};

export default SectionPlate;
