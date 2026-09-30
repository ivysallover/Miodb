import React from 'react';
import DataQualityBadge from '@/components/DataQualityBadge';
import { AnalysisResponseSchema } from '@/types/analysis';
import { Download, Presentation, RotateCcw, RefreshCw, FileSpreadsheet } from 'lucide-react';

interface DashboardHeaderProps {
  result: AnalysisResponseSchema;
  downloadingPdf: boolean;
  downloadingPptx: boolean;
  downloadingCleanData?: boolean;
  onDownloadPdf: () => void;
  onDownloadPptx: () => void;
  onDownloadCleanData?: (format: 'csv' | 'xlsx') => void;
  onReset: () => void;
  onRefresh?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  result,
  downloadingPdf,
  downloadingPptx,
  downloadingCleanData = false,
  onDownloadPdf,
  onDownloadPptx,
  onDownloadCleanData,
  onReset,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl p-6 rounded-none border border-zinc-200 dark:border-white/10 select-none">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold font-sans text-gray-900 dark:text-white tracking-tight">{result.filename}</h2>
          {result.profile && (
            <DataQualityBadge
              score={result.profile.qualityScore}
              label={result.profile.qualityLabel}
            />
          )}
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 font-mono">
          Analizando foco en: <span className="font-semibold text-[#7647eb] dark:text-[#a78bfa]">"{result.targetCol || 'Automático'}"</span> • {result.profile?.nRows ?? 0} filas • {result.profile?.nCols ?? 0} columnas
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Recalcular análisis con el backend sin volver a subir el archivo"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-[#7647eb]/10 hover:bg-[#7647eb]/20 text-[#7647eb] dark:text-[#a78bfa] text-xs font-mono font-bold border border-[#7647eb]/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalcular</span>
          </button>
        )}

        {onDownloadCleanData && (
          <div className="relative group">
            <button
              onClick={() => onDownloadCleanData('csv')}
              disabled={downloadingCleanData}
              title="Descargar dataset limpio con imputación de nulos y columnas enriquecidas"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{downloadingCleanData ? 'Exportando...' : 'Datos Limpios'}</span>
            </button>
            <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 hidden group-hover:flex flex-col bg-white dark:bg-[#121024] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xl z-50 min-w-[170px] overflow-hidden">
              <button
                type="button"
                onClick={() => onDownloadCleanData('csv')}
                className="px-3.5 py-2 text-left text-xs font-medium hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between"
              >
                <span>Descargar CSV</span>
                <span className="text-[10px] text-zinc-400 font-mono">.csv</span>
              </button>
              <button
                type="button"
                onClick={() => onDownloadCleanData('xlsx')}
                className="px-3.5 py-2 text-left text-xs font-medium hover:bg-zinc-50 dark:hover:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 flex items-center justify-between"
              >
                <span>Excel + Auditoría</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">.xlsx</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onDownloadPptx}
          disabled={downloadingPptx}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#bdf559] hover:bg-[#a8e63a] text-zinc-950 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span>{downloadingPptx ? 'Generando...' : 'Exportar PPTX'}</span>
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={downloadingPdf}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{downloadingPdf ? 'Generando...' : 'Exportar PDF'}</span>
        </button>

        <button
          onClick={onReset}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-zinc-100 dark:bg-white/[0.04] hover:bg-zinc-200 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 text-xs font-mono font-semibold transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Cargar otro archivo</span>
        </button>
      </div>
    </div>
  );
};
