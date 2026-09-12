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
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-none border border-[#111] border-2 shadow-[4px_4px_0px_#111]">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">{result.filename}</h2>
          {result.profile && (
            <DataQualityBadge
              score={result.profile.qualityScore}
              label={result.profile.qualityLabel}
            />
          )}
        </div>
        <p className="text-sm text-gray-500">
          Analizando foco en: <span className="font-semibold text-mio-violet">"{result.targetCol || 'Automático'}"</span> • {result.profile?.nRows ?? 0} filas • {result.profile?.nCols ?? 0} columnas
        </p>
      </div>

      <div className="flex items-center gap-2.5 w-full md:w-auto">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Recalcular análisis con el backend sin volver a subir el archivo"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-none bg-mio-violet/10 hover:bg-mio-violet/20 text-mio-violet text-xs font-bold border border-[#111] transition-colors"
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
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-none bg-emerald-400 hover:bg-emerald-300 text-gray-950 text-xs font-bold border-2 border-[#111] shadow-[3px_3px_0px_#111] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{downloadingCleanData ? 'Exportando...' : 'Datos Limpios'}</span>
            </button>
            <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 hidden group-hover:flex flex-col bg-white border-2 border-[#111] shadow-[4px_4px_0px_#111] z-50 min-w-[170px]">
              <button
                type="button"
                onClick={() => onDownloadCleanData('csv')}
                className="px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-gray-800 border-b border-gray-200 flex items-center justify-between"
              >
                <span>Descargar CSV</span>
                <span className="text-[10px] text-gray-400">.csv</span>
              </button>
              <button
                type="button"
                onClick={() => onDownloadCleanData('xlsx')}
                className="px-3 py-2 text-left text-xs font-bold hover:bg-emerald-50 text-gray-800 flex items-center justify-between"
              >
                <span>Excel + Auditoría</span>
                <span className="text-[10px] text-emerald-600 font-semibold">.xlsx</span>
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onDownloadPptx}
          disabled={downloadingPptx}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-mio-lime hover:bg-mio-lime/90 text-gray-900 text-xs font-semibold shadow-[4px_4px_0px_#111] transition-all disabled:opacity-50"
        >
          <Presentation className="w-4 h-4" />
          <span>{downloadingPptx ? 'Generando PPTX...' : 'Exportar PPTX'}</span>
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={downloadingPdf}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-none bg-mio-violet hover:bg-mio-violet/90 text-white text-xs font-semibold shadow-[4px_4px_0px_#111] transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloadingPdf ? 'Generando PDF...' : 'Exportar PDF'}</span>
        </button>

        <button
          onClick={onReset}
          className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-none bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Cargar otro archivo</span>
        </button>
      </div>
    </div>
  );
};
