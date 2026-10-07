import React from 'react';
import { FileText } from 'lucide-react';
import { NarrativeSchema } from '@/types/analysis';

interface ExecutiveSummaryProps {
  narrative: NarrativeSchema | null | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  narrative,
  isExpanded,
  onToggleExpand,
}) => {
  if (!narrative) return null;

  return (
    <div className="md:col-span-12 bg-white dark:bg-[#0e0d16] p-6 md:p-8 rounded-mio select-none transition-all">
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7647eb]/15 text-[#7647eb] dark:text-[#a78bfa] rounded-mio">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-bold font-sans tracking-tight text-gray-900 dark:text-white">
            Resumen Ejecutivo{' '}
            {narrative.source === 'pending' && (
              <span className="text-xs font-mono normal-case text-gray-400 ml-2 animate-pulse">
                (Generando...)
              </span>
            )}
          </h3>
        </div>
        <button
          type="button"
          className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] hover:opacity-80 transition-opacity uppercase tracking-wider"
        >
          {isExpanded ? 'Minimizar' : 'Expandir'}
        </button>
      </div>

      {isExpanded && (
        <div className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-zinc-300 mt-4 border-t border-zinc-100 dark:border-white/10 pt-4 font-normal">
          <p className="whitespace-pre-line leading-relaxed">
            {narrative.text || 'Sin contenido disponible.'}
          </p>
        </div>
      )}
    </div>
  );
};
