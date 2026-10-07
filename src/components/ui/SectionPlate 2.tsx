import React from 'react';

/**
 * SectionPlate — section label for the editorial layout.
 *
 * A small solid index chip ("02") followed by a mono, uppercase label. No box, no shadow:
 * the structure comes from the numbering, in the spirit of a spec sheet.
 * (Name and props are unchanged so every section keeps working.)
 */
interface SectionPlateProps {
  index: string;
  /** Kept for API compatibility; the total is no longer printed (the progress rail shows it). */
  total?: string;
  label: string;
  /** Color of the status LED. */
  tone?: 'violet' | 'lime';
  /** Pulse the LED (use for "live" labels such as the hero). */
  live?: boolean;
  /** Force the dark-surface look for sections that are always dark (case study, CTA). */
  onDark?: boolean;
  /** Optional extra text on the right, in brand violet (e.g. "EDICIÓN 2026"). */
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
  const chip = onDark
    ? 'bg-[#bdf559] text-black'
    : 'bg-[#602cd1] text-white dark:bg-[#bdf559] dark:text-black';
  const text = onDark ? 'text-zinc-300' : 'text-zinc-800 dark:text-zinc-300';
  const asideText = onDark ? 'text-[#a78bfa]' : 'text-[#602cd1] dark:text-[#a78bfa]';
  const led = tone === 'lime' ? '#bdf559' : '#7647eb';

  return (
    <div
      className={`inline-flex max-w-full items-center gap-3 font-mono text-[11px] leading-tight uppercase tracking-[0.14em] select-none ${text} ${className}`}
    >
      <span className={`shrink-0 rounded-md px-2 py-1 font-bold tabular-nums ${chip}`}>{index}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${live ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: led }}
          aria-hidden="true"
        />
        <span>{label}</span>
      </span>
      {aside && <span className={`hidden sm:inline shrink-0 font-semibold ${asideText}`}>· {aside}</span>}
    </div>
  );
};

export default SectionPlate;
