import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

export interface ChartLegendExplainerProps {
  whatItDoes: string;
  whatItShows: string;
  actionHint?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const ChartLegendExplainer: React.FC<ChartLegendExplainerProps> = ({
  whatItDoes,
  whatItShows,
  actionHint,
  collapsible = false,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mt-4 rounded-mio-sm bg-[#f3f3f5] dark:bg-white/[0.05] p-3 sm:p-4 text-xs">
      <div
        className={`flex items-center justify-between gap-2 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => collapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa]" />
          <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100">Cómo leer este gráfico</span>
        </div>
        {collapsible && (
          <button
            type="button"
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            aria-label={isOpen ? 'Ocultar la explicación' : 'Mostrar la explicación'}
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-mio-sm bg-white dark:bg-[#0e0d16] p-3.5">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Para qué sirve</span>
            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{whatItDoes}</p>
          </div>

          <div className="rounded-mio-sm bg-white dark:bg-[#0e0d16] p-3.5">
            <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Cómo se lee</span>
            <p className="text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed">{whatItShows}</p>
          </div>

          {actionHint && (
            <div className="md:col-span-2 rounded-mio-sm bg-[#e4dcff] dark:bg-[#2a1766] p-3.5">
              <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#bdf559] mb-1">Qué mirar</span>
              <p className="text-[13px] font-medium text-zinc-900 dark:text-white leading-relaxed">{actionHint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
