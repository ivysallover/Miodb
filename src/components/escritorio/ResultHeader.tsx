import React from 'react';
import { FileSpreadsheet, FileText, FolderOpen, Loader2, Sheet } from 'lucide-react';
import type { ExportFormat } from './useSaving';
import { FOCUS, field, muted, soft, surface } from './ui';
import { STAGES, num, size, type Opened, type Progress, type Result } from './desktop';

const EXPORTS: { id: ExportFormat; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'pdf', label: 'Informe PDF', icon: FileText },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', icon: Sheet },
];

/** Lo que se analizó, cómo se leyó, qué otra columna mirar, exportarlo y abrir otra planilla. */
export const ResultHeader: React.FC<{
  result: Result;
  opened: Opened;
  busy: boolean;
  /** Por dónde va el análisis de otra columna, mientras corre. */
  progress: Progress | null;
  isDark: boolean;
  onChoose: () => void;
  /** Cancelar el análisis de otra columna (queda lo de antes). */
  onCancel: () => void;
  onExport: (format: ExportFormat) => void;
  /** Lo que se está exportando, mientras tanto. */
  exporting: ExportFormat | null;
  onAnalyze: (column: string) => void;
  /** Abrir otra hoja del mismo Excel. */
  onSheet: (hoja: string) => void;
}> = ({ result, opened, busy, progress, isDark, onChoose, onCancel, onExport, exporting, onAnalyze, onSheet }) => {
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
          <p className={`mt-2 font-mono text-[12px] ${muted(isDark)}`}>{facts.join(' · ')}</p>
          {/* Llevárselo: el informe para mandar y la planilla limpia (y unida) para seguir trabajando. */}
          <div className="mt-4 flex flex-wrap items-center gap-2" data-no-print>
            <span className={`mr-1 text-sm font-bold ${muted(isDark)}`}>Exportar</span>
            {EXPORTS.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => onExport(id)} disabled={busy || exporting !== null} className={`${soft(isDark)} min-h-[36px] px-3.5`}>
                {exporting === id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />} {label}
              </button>
            ))}
          </div>
          {busy && (
            <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm font-bold text-[#7647eb]" aria-live="polite">
              Analizando otra columna: {(STAGES.find((s) => s.id === progress?.etapa)?.label || 'empezando').toLowerCase()}…
              <button type="button" onClick={onCancel} className={`rounded-full underline underline-offset-4 cursor-pointer ${FOCUS}`}>Cancelar</button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2.5" data-no-print>
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
