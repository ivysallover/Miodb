import React from 'react';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { FOCUS } from './Inicio';
import { num, size, type Opened, type Result } from './desktop';

/** Lo que se analizó, cómo se leyó, qué otra columna mirar y cómo volver a los proyectos. */
export const ResultHeader: React.FC<{
  result: Result;
  opened: Opened;
  busy: boolean;
  isDark: boolean;
  onHome: () => void;
  onChoose: () => void;
  onAnalyze: (column: string) => void;
}> = ({ result, opened, busy, isDark, onHome, onChoose, onAnalyze }) => {
  const p = result.profile;
  const columns = [...new Set([result.targetCol, ...p.numericColumns, ...p.categoricalColumns])];
  const facts = [
    size(opened.bytes),
    `${num(p.nRows)} filas`,
    `${p.nCols} columnas`,
    `calidad ${p.qualityScore}/100`,
    opened.filas_titulo > 0 ? `${opened.filas_titulo} filas de título salteadas` : null,
    opened.guardado ? 'abierto de lo guardado' : `analizada en ${num(opened.segundos, 1)} s`,
  ].filter(Boolean);
  const soft = `inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 ${FOCUS} ${isDark ? 'bg-white/[0.08] hover:bg-white/[0.16]' : 'bg-[#f3f3f5] hover:bg-[#e4dcff]'}`;
  return (
    <section className={`rounded-mio p-5 sm:p-7 ${isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950'}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <button type="button" onClick={onHome} disabled={busy} className={`-ml-1 mb-3 inline-flex items-center gap-1.5 rounded-full px-1 text-sm font-bold cursor-pointer disabled:opacity-50 ${FOCUS} ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-950'}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Proyectos
          </button>
          <h1 className="text-2xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl [overflow-wrap:anywhere]">{result.filename}</h1>
          <p className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{facts.join(' · ')}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Lo que se analiza</span>
            <select
              value={result.targetCol}
              disabled={busy}
              onChange={(e) => onAnalyze(e.target.value)}
              className={`min-h-[44px] min-w-[14rem] rounded-mio-sm px-3 text-base font-medium cursor-pointer disabled:opacity-60 ${FOCUS} ${isDark ? 'bg-white/[0.08] text-white' : 'bg-[#f3f3f5] text-zinc-950'}`}
            >
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="button" onClick={onChoose} disabled={busy} className={soft}>
            <FolderOpen className="h-4 w-4" aria-hidden /> {busy ? 'Analizando…' : 'Abrir otra'}
          </button>
        </div>
      </div>
    </section>
  );
};
