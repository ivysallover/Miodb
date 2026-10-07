'use client';

import React, { useState } from 'react';
import { tidy } from '../../../components/charts/plainText';
import dynamic from 'next/dynamic';
import { TriangleAlert, ShieldAlert, Table as TableIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { ChartSchema, AnomalyMetricsSchema } from '@/types/analysis';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
import { ChartLegendExplainer } from '@/components/ChartLegendExplainer';
import { AnomalyTableInspector } from './AnomalyTableInspector';

const DynamicChartRenderer = dynamic(() => import('@/components/DynamicChartRenderer'), { ssr: false });

interface AnomaliesSectionProps {
  chartData?: ChartSchema;
  metrics?: AnomalyMetricsSchema;
  filename: string;
}

export const AnomaliesSection: React.FC<AnomaliesSectionProps> = ({
  chartData,
  metrics,
  filename,
}) => {
  const [showTable, setShowTable] = useState<boolean>(true);

  if (!chartData) return null;

  const sourceItems: any[] = chartData?.dataset?.source ?? [];
  const plottedAnomalies = sourceItems.filter((s: any) => s._anomaly === -1 || s._is_anomaly === true || s.is_anomaly === true);
  const plottedNormals = sourceItems.filter((s: any) => s._anomaly === 1 || s._is_anomaly === false || s.is_anomaly === false);

  const rawAnomalyRecords = metrics?.anomalyRecords ?? metrics?.anomaly_records ?? [];
  const rawSampleRecords = metrics?.sampleRecords ?? metrics?.sample_records ?? [];

  // Guarantee table sync: derive records directly from chart dataset if backend metrics records are empty
  const anomalyRecords = rawAnomalyRecords.length > 0
    ? rawAnomalyRecords
    : plottedAnomalies.map((s: any) => ({ ...s, _is_anomaly: true }));

  const sampleRecords = rawSampleRecords.length > 0
    ? rawSampleRecords
    : (plottedNormals.length > 0 ? plottedNormals.slice(0, 100).map((s: any) => ({ ...s, _is_anomaly: false })) : []);

  const count = anomalyRecords.length > 0 ? anomalyRecords.length : (metrics?.nAnomalias ?? metrics?.n_anomalias ?? plottedAnomalies.length);
  const totalRows = sourceItems.length > 0 ? sourceItems.length : (anomalyRecords.length + sampleRecords.length) || 1;
  const pct = metrics?.pctAnomalias ?? metrics?.pct_anomalias ?? (totalRows > 0 ? Math.round((count / totalRows) * 1000) / 10 : 0);

  const rawColumns = metrics?.tableColumns ?? metrics?.table_columns ?? [];
  const tableColumns = rawColumns.length > 0
    ? rawColumns
    : (anomalyRecords.length > 0 ? Object.keys(anomalyRecords[0]).filter((c) => !c.startsWith('_')) : []);
  const columnRoles = metrics?.columnRoles ?? metrics?.column_roles ?? {};

  return (
    <div className="w-full bg-white dark:bg-[#0e0d16] p-6 md:p-8 rounded-mio">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-mio text-red-600 dark:text-red-400">
            <TriangleAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-sans text-zinc-950 dark:text-white">
              Valores fuera de lo normal
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              {tidy(chartData.metadata?.insightSubtitle || 'Los registros que más se alejan del resto')}
            </p>
          </div>
        </div>

        {count > 0 && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-xs font-mono font-bold text-red-600 dark:text-red-400 self-start sm:self-auto shadow-sm">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>
              <strong>{count}</strong> casos atípicos ({pct}%)
            </span>
          </div>
        )}
      </div>

      <div className="relative w-full h-[420px]">
        <ChartErrorBoundary>
          <DynamicChartRenderer
            key={`anom-${filename}`}
            payload={chartData}
            height={420}
          />
        </ChartErrorBoundary>
      </div>

      <ChartLegendExplainer
        whatItDoes="Detecta de forma automática registros raros o sospechosos que se salen de lo normal."
        whatItShows="Los puntos violetas representan las operaciones habituales del día a día. Los puntos rojos son valores atípicos (picos récord, caídas abruptas o posibles errores de carga)."
        actionHint="Revisá las fechas de los puntos rojos para entender qué ocurrió: replicar una gran oportunidad o corregir una falla."
        collapsible={true}
        defaultOpen={true}
      />

      {/* Explorador de Tabla de Datos y Anomalías */}
      <div className="mt-8 pt-6 border-t border-zinc-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-mio-sm bg-zinc-100 text-gray-700">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold font-sans text-gray-950">
                Explorador de Registros y Muestras de Anomalías
              </h4>
              <p className="text-xs text-gray-500 font-medium">
                Inspeccioná fila por fila los datos clasificados por el modelo Isolation Forest
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className="px-4 py-2 text-xs font-mono font-bold rounded-full border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-white/[0.08] shadow-sm active:scale-95 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            {showTable ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Ocultar Tabla</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Ver Registros en Tabla ({anomalyRecords.length + sampleRecords.length})</span>
              </>
            )}
          </button>
        </div>

        {showTable && (
          <AnomalyTableInspector
            anomalyRecords={anomalyRecords}
            sampleRecords={sampleRecords}
            tableColumns={tableColumns}
            columnRoles={columnRoles}
            filename={filename}
          />
        )}
      </div>
    </div>
  );
};
