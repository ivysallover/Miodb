import React from 'react';
import { ChevronsUpDown, FileSpreadsheet, FileText, Link2, Loader2, Mail, Presentation, Sheet } from 'lucide-react';
import type { ExportFormat } from './useSaving';
import { CambiarColumna } from './Columnas';
import { FOCUS, lilac, muted, surface, tool } from './ui';
import { STAGES, num, size, type Opened, type Progress, type Result } from './desktop';

const EXPORTS: { id: ExportFormat; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'mail', label: 'Mail', icon: Mail },
  { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', icon: Sheet },
];

/**
 * Lo que se analizó y cómo se leyó; a la derecha, la hoja (en un Excel con varias) y lo que se
 * analiza, para cambiarlos. Abajo, en una sola fila y a la misma altura: presentarlo, compartirlo,
 * y exportarlo (un riel con los cuatro formatos). Abrir otra planilla está en el menú.
 */
export const ResultHeader: React.FC<{
  result: Result;
  opened: Opened;
  busy: boolean;
  /** Por dónde va el nuevo análisis, mientras corre. */
  progress: Progress | null;
  isDark: boolean;
  /** Cancelar lo que se está volviendo a analizar (queda lo de antes). */
  onCancel: () => void;
  onExport: (format: ExportFormat) => void;
  /** Abrir el paso previo al PDF. */
  onPdf: () => void;
  /** Abrir "Compartir": un enlace para mirar el análisis en la web. */
  onShare: () => void;
  /** Una idea por pantalla, para una reunión. */
  onPresent: () => void;
  /** Lo que se está exportando, mientras tanto. */
  exporting: ExportFormat | null;
  onAnalyze: (column: string) => void;
  /** Abrir otra hoja del mismo Excel (o tabla de la misma base). */
  onSheet: (hoja: string) => void;
  /** "Hoja" en un Excel, "Tabla" en una base. */
  partLabel: string;
}> = ({ result, opened, busy, progress, isDark, onCancel, onExport, onPdf, onShare, onPresent, exporting, onAnalyze, onSheet, partLabel }) => {
  const p = result.profile;
  const base = opened.base;
  const facts = [
    base ? 'consultada a la base recién' : size(opened.bytes),
    `${num(p.nRows)} filas`,
    `${p.nCols} columnas`,
    `calidad ${p.qualityScore}/100`,
    opened.filas_titulo > 0 ? `${opened.filas_titulo} filas de título salteadas` : null,
    opened.guardado ? 'abierto de lo guardado' : `analizada en ${num(opened.segundos, 1)} s`,
  ].filter(Boolean);
  // Los botones de la fila de abajo van sobre un tono apenas distinto del bloque; dentro del riel de exportar, sobre él.
  const rail = isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]';
  const railButton = `${rail} ${isDark ? 'hover:!bg-white/[0.12]' : 'hover:!bg-pal-soft'}`;
  const inRail = isDark ? 'hover:!bg-white/[0.1]' : 'hover:!bg-white';
  return (
    <section className={`rounded-mio p-5 sm:p-7 ${surface(isDark)}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl [overflow-wrap:anywhere]">{result.filename}</h1>
          <p className={`mt-2 font-mono text-[12px] ${muted(isDark)}`}>{facts.join(' · ')}</p>
          {/* De una base: si se trajo solo una parte, decirlo antes que cualquier número. */}
          {base?.cortada && (
            <p className="mt-3 max-w-3xl text-sm font-bold text-pal-violet">
              Son las primeras {num(base.tope)} filas: la base tiene más. Para mirar todo, filtrá o agrupá en una consulta, o subí el tope en la conexión.
            </p>
          )}
          {base?.avisos.map((a) => <p key={a} className={`mt-2 max-w-3xl text-sm ${muted(isDark)}`}>{a}</p>)}
          {busy && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm font-bold text-pal-violet" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Volviendo a analizar: {(STAGES.find((s) => s.id === progress?.etapa)?.label || 'empezando').toLowerCase()}…
              <button type="button" onClick={onCancel} className={`rounded-full underline underline-offset-4 cursor-pointer ${FOCUS}`}>Cancelar</button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-stretch gap-2.5" data-no-print>
          {opened.hojas.length > 1 && (
            // El selector del sistema, invisible encima del bloque: se ve como el de la columna y se usa igual que siempre.
            <label className={`relative flex min-h-[68px] min-w-[11rem] items-center justify-between gap-4 rounded-mio-sm px-4 py-3 cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-pal-violet ${lilac(isDark)} ${busy ? 'opacity-60' : ''}`}>
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
      {/* Llevárselo: presentarlo, compartirlo, el informe y la planilla limpia (y unida) para seguir trabajando. */}
      <div className="mt-6 flex flex-wrap items-center gap-2" data-no-print>
        <button type="button" onClick={onPresent} disabled={busy} className={tool(isDark, true)} title="Una idea por pantalla, para una reunión (flechas para moverse, Esc para salir)">
          <Presentation className="h-4 w-4" aria-hidden /> Presentar
        </button>
        <button type="button" onClick={onShare} disabled={busy} className={`${tool(isDark)} ${railButton}`}>
          <Link2 className="h-4 w-4" aria-hidden /> Compartir
        </button>
        {/* Con la ventana angosta, los formatos quedan solo con su ícono (el nombre, al pasar el mouse). */}
        <div role="group" aria-label="Exportar" className={`flex items-center gap-0.5 rounded-full p-0.5 pl-4 ${rail}`}>
          <span className={`mr-1.5 text-sm font-bold ${muted(isDark)}`}>Exportar</span>
          <button type="button" onClick={onPdf} disabled={busy} aria-label="PDF" title="Informe en PDF" className={`${tool(isDark)} !min-h-[36px] !px-3 lg:!px-3.5 ${inRail}`}>
            <FileText className="h-4 w-4" aria-hidden /> <span className="hidden lg:inline">PDF</span>
          </button>
          {EXPORTS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => onExport(id)} disabled={busy || exporting !== null} aria-label={label} title={id === 'mail' ? 'Copiar un resumen para pegar en un mail' : label} className={`${tool(isDark)} !min-h-[36px] !px-3 lg:!px-3.5 ${inRail}`}>
              {exporting === id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />} <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
