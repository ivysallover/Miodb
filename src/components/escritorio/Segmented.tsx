import React from 'react';
import { ActivePill } from './ActivePill';
import { FOCUS } from './ui';

/**
 * Elegir una opción entre pocas (tema, tamaño, movimiento…): un riel con la marca violeta que se
 * desliza hasta la elegida. `onChange` recibe también el clic (el tema se abre desde ahí).
 */
export function Segmented<T extends string | number>({ label, group, value, options, isDark, onChange }: {
  label: string;
  /** Nombre único de este control, para que la marca se deslice solo dentro de él. */
  group: string;
  value: T;
  options: { id: T; label: string; icon?: React.FC<{ className?: string }> }[];
  isDark: boolean;
  onChange: (v: T, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex flex-wrap gap-1 rounded-full p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
      {options.map(({ id, label: text, icon: Icon }) => (
        <button
          key={String(id)}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={(e) => onChange(id, e)}
          className={`relative isolate inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${value === id ? 'text-white' : isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-white'}`}
        >
          {value === id && <ActivePill group={group} />}
          {Icon && <Icon className="h-4 w-4" aria-hidden />}
          {text}
        </button>
      ))}
    </div>
  );
}
