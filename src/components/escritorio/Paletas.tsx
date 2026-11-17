import React from 'react';
import { Check } from 'lucide-react';
import { SOBRIAS, type Sobria } from '@/lib/sobrias';
import { FOCUS } from './ui';

/** Las alturas de las barras de muestra: una por color de la paleta, como en un gráfico. */
const BARS = [0.92, 0.7, 0.82, 0.48, 0.62, 0.34];

/**
 * Elegir la paleta sobria: cada una con una muestra de cómo se verían sus gráficos (seis barras, una por
 * color, en orden) y su nombre. Elegir una la deja prendida para ver cómo queda.
 */
export const Paletas: React.FC<{ value: Sobria; active: boolean; isDark: boolean; onChange: (s: Sobria) => void }> = ({ value, active, isDark, onChange }) => (
  <div role="radiogroup" aria-label="Paleta sobria" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
    {(Object.keys(SOBRIAS) as Sobria[]).map((id) => {
      const p = SOBRIAS[id];
      const on = value === id;
      return (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(id)}
          className={`group flex flex-col gap-2.5 rounded-mio-sm p-2.5 text-left transition-colors duration-150 cursor-pointer ${FOCUS} ${
            on ? (isDark ? 'bg-white/[0.12]' : 'bg-zinc-950/[0.07]') : isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-950/[0.04]'
          }`}
        >
          <span aria-hidden className={`flex h-16 items-end gap-1 rounded-[10px] px-2.5 pb-2 pt-3 ${isDark ? 'bg-[#141218]' : 'bg-[#fafafb]'}`}>
            {p.series.map((c, i) => (
              <span key={c} className="flex-1 rounded-t-[3px] transition-[height] duration-200" style={{ background: c, height: `${BARS[i] * 100}%` }} />
            ))}
          </span>
          <span className="flex items-center justify-between gap-1 px-0.5 text-sm font-bold">
            {p.label}
            {on && <Check className={`h-4 w-4 ${active ? '' : 'opacity-45'}`} style={{ color: active ? undefined : p.acento }} aria-hidden />}
          </span>
        </button>
      );
    })}
  </div>
);
