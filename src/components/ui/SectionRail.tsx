import React from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useActiveSection } from '@/hooks/useActiveSection';
import { LANDING_SECTIONS } from '@/lib/landingSections';
import { playMioDevSound } from '@/lib/sound';

/**
 * Fixed progress rail on the right edge: one square per section, the active one filled.
 * It tells the visitor where they are in the story and lets them jump, without
 * hijacking the scroll. Hidden below xl so it never competes with content on small screens.
 */
export const SectionRail: React.FC = () => {
  const active = useActiveSection();
  const { scrollTo } = useSmoothScroll();

  return (
    <nav
      aria-label="Secciones de la página"
      className="hidden xl:flex fixed right-3 top-1/2 -translate-y-1/2 z-40 flex-col items-end gap-3 select-none"
    >
      {/* spine */}
      <span
        aria-hidden
        className="absolute right-[5px] top-1 bottom-1 w-px bg-black/25 dark:bg-white/20"
      />
      {LANDING_SECTIONS.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              playMioDevSound('select');
              scrollTo(`#${s.id}`);
            }}
            aria-label={`Ir a ${s.label}`}
            aria-current={isActive ? 'true' : undefined}
            className="group relative flex items-center gap-2 cursor-pointer"
          >
            <span
              className={`font-mono text-[10px] font-bold uppercase tracking-wider border-2 px-1.5 py-0.5 transition-[opacity,transform] duration-150 ${
                isActive
                  ? 'opacity-100 translate-x-0 bg-[#bdf559] text-black border-black'
                  : 'opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 bg-white dark:bg-[#0b0914] text-black dark:text-white border-black dark:border-white/40'
              }`}
            >
              {s.index} {s.label}
            </span>
            <span
              className={`relative block w-[11px] h-[11px] border-2 transition-colors duration-150 ${
                isActive
                  ? 'bg-[#bdf559] border-black'
                  : 'bg-white dark:bg-[#0b0914] border-black/60 dark:border-white/50 group-hover:bg-[#bdf559]'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
};

export default SectionRail;
