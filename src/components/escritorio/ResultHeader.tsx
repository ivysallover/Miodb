import React from 'react';
import { ChevronsUpDown, FileSpreadsheet, FileText, FolderOpen, Loader2, Mail, ScrollText, Sheet } from 'lucide-react';
import type { ExportFormat } from './useSaving';
import { CambiarColumna } from './Columnas';
import { FOCUS, lilac, muted, soft, surface } from './ui';
import { STAGES, num, size, type Opened, type Progress, type Result } from './desktop';

const EXPORTS: { id: ExportFormat; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'pdf', label: 'Informe PDF', icon: FileText },
  { id: 'resumen', label: 'Resumen de una página', icon: ScrollText },
  { id: 'mail', label: 'Copiar para un mail', icon: Mail },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', icon: Sheet },
];

/**
 * Lo que se analizó y cómo se leyó; a la derecha, la hoja (en un Excel con varias) y lo que se
 * analiza, para cambiarlos; abajo, exportarlo y abrir otra planilla.
 */
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
  /** Abrir otra hoja del mismo Excel (o tabla de la misma base). */
  onSheet: (hoja: string) => void;
  /** "Hoja" en un Excel, "Tabla" en una base. */
  partLabel: string;
}> = ({ result, opened, busy, progress, isDark, onChoose, onCancel, onExport, exporting, onAnalyze, onSheet, partLabel }) => {
  const p = result.profile;
  const facts = [
    size(opened.bytes),
    `${num(p.nRows)} filas`,
    `${p.nCols} columnas`,
    `calidad ${p.qualityScore}/100`,
    opened.filas_titulo > 0 ? `${opened.filas_titulo} filas de título salteadas` : null,
    opened.guardado ? 'abierto de lo guardado' : `analizada en ${num(opened.segundos, 1)} s`,
  ].filter(Boolean);
  return (
    <section className={`rounded-mio p-5 sm:p-7 ${surface(isDark)}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl [overflow-wrap:anywhere]">{result.filename}</h1>
          <p className={`mt-2 font-mono text-[12px] ${muted(isDark)}`}>{facts.join(' · ')}</p>
          {busy && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm font-bold text-[#7647eb]" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Analizando otra columna: {(STAGES.find((s) => s.id === progress?.etapa)?.label || 'empezando').toLowerCase()}…
              <button type="button" onClick={onCancel} className={`rounded-full underline underline-offset-4 cursor-pointer ${FOCUS}`}>Cancelar</button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-stretch gap-2.5" data-no-print>
          {opened.hojas.length > 1 && (
            // El selector del sistema, invisible encima del bloque: se ve como el de la columna y se usa igual que siempre.
            <label className={`relative flex min-h-[68px] min-w-[11rem] items-center justify-between gap-4 rounded-mio-sm px-4 py-3 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#7647eb] ${lilac(isDark)} ${busy ? 'opacity-60' : ''}`}>
              <span className="min-w-0">
                <span className={`block text-xs font-bold ${muted(isDark)}`}>{partLabel}</span>
                <span className="block max-w-[12rem] truncate text-lg font-extrabold tracking-[-0.01em]">{opened.hoja}</span>
              </span>
              <ChevronsUpDown className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
              <select value={opened.hoja ?? ''} disabled={busy} onChange={(e) => onSheet(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0">
                {opened.hojas.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          )}
          <CambiarColumna result={result} isDark={isDark} busy={busy} onAnalyze={onAnalyze} />
        </div>
      </div>
      {/* Llevárselo: el informe para mandar y la planilla limpia (y unida) para seguir trabajando. */}
      <div className="mt-5 flex flex-wrap items-center gap-2" data-no-print>
        <span className={`mr-1 text-sm font-bold ${muted(isDark)}`}>Exportar</span>
        {EXPORTS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => onExport(id)} disabled={busy || exporting !== null} className={`${soft(isDark)} min-h-[40px] px-4`}>
            {exporting === id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />} {label}
          </button>
        ))}
        <button type="button" onClick={onChoose} disabled={busy} className={`${soft(isDark)} min-h-[40px] px-4 sm:ml-auto`}>
          <FolderOpen className="h-4 w-4" aria-hidden /> Abrir otra planilla
        </button>
      </div>
    </section>
  );
};
