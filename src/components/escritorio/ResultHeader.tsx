import React from 'react';
import { FolderOpen } from 'lucide-react';
import { field, muted, soft, surface } from './ui';
import { STAGES, num, size, type Opened, type Progress, type Result } from './desktop';

/** Lo que se analizó, cómo se leyó, qué otra columna mirar y abrir otra planilla. */
export const ResultHeader: React.FC<{
  result: Result;
  opened: Opened;
  busy: boolean;
  /** Por dónde va el análisis de otra columna, mientras corre. */
  progress: Progress | null;
  isDark: boolean;
  onChoose: () => void;
  onAnalyze: (column: string) => void;
  /** Abrir otra hoja del mismo Excel. */
  onSheet: (hoja: string) => void;
}> = ({ result, opened, busy, progress, isDark, onChoose, onAnalyze, onSheet }) => {
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
  const pick = `${field(isDark)} cursor-pointer`;
  return (
    <section className={`rounded-mio p-5 sm:p-7 ${surface(isDark)}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl [overflow-wrap:anywhere]">{result.filename}</h1>
          <p className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${muted(isDark)}`}>{facts.join(' · ')}</p>
          {busy && (
            <p className="mt-2 text-sm font-bold text-[#7647eb]" aria-live="polite">
              Analizando otra columna: {(STAGES.find((s) => s.id === progress?.etapa)?.label || 'empezando').toLowerCase()}…
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          {opened.hojas.length > 1 && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Hoja</span>
              <select value={opened.hoja ?? ''} disabled={busy} onChange={(e) => onSheet(e.target.value)} className={pick}>
                {opened.hojas.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Lo que se analiza</span>
            <select
              value={result.targetCol}
              disabled={busy}
              onChange={(e) => onAnalyze(e.target.value)}
              className={`${pick} min-w-[14rem]`}
            >
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button type="button" onClick={onChoose} disabled={busy} className={soft(isDark)}>
            <FolderOpen className="h-4 w-4" aria-hidden /> Abrir otra
          </button>
        </div>
      </div>
    </section>
  );
};
