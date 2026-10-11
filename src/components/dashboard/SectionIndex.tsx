import React, { useEffect, useState } from 'react';

/**
 * The sticky index of the "Trabajo" view: one chip per section that exists, the current one
 * highlighted. It only lists ids that are actually on the page.
 */

export type IndexItem = { id: string; label: string };

export const SectionIndex: React.FC<{ items: IndexItem[]; isDark: boolean }> = ({ items, isDark }) => {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map((i) => i.id).join('|');

  useEffect(() => {
    const list = ids.split('|');
    let frame = 0;
    // The section being read is the last one whose top has passed under the sticky bars.
    const pick = () => {
      frame = 0;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 170) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(pick); };
    pick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [ids]);

  if (items.length < 2) return null;
  return (
    <nav aria-label="Secciones del panel" className={`sticky top-16 z-30 -mx-4 overflow-x-auto px-4 py-2 print:hidden ${isDark ? 'bg-[#07070a]' : 'bg-[#f3f3f5]'}`}>
      <ul className={`inline-flex min-w-max gap-1 rounded-full p-1 ${isDark ? 'bg-[#17142a]' : 'bg-white'}`}>
        {items.map((it) => (
          <li key={it.id}>
            <button
              type="button"
              aria-current={active === it.id ? 'true' : undefined}
              onClick={() => {
                setActive(it.id);
                document.getElementById(it.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className={`min-h-[36px] whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-colors duration-200 cursor-pointer ${
                active === it.id
                  ? isDark ? 'bg-white text-zinc-950' : 'bg-[#0b0914] text-white'
                  : isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SectionIndex;
