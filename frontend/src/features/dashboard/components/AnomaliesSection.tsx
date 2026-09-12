'use client';

import React, { useState } from 'react';
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

  const count = metrics?.nAnomalias ?? metrics?.n_anomalias ?? 0;
  const pct = metrics?.pctAnomalias ?? metrics?.pct_anomalias ?? 0;
  const anomalyRecords = metrics?.anomalyRecords ?? metrics?.anomaly_records ?? [];
  const sampleRecords = metrics?.sampleRecords ?? metrics?.sample_records ?? [];
  const tableColumns = metrics?.tableColumns ?? metrics?.table_columns ?? [];
  const columnRoles = metrics?.columnRoles ?? metrics?.column_roles ?? {};

  return (
    <div className="md:col-span-12 bg-white p-6 md:p-8 rounded-none border-2 border-[#111] shadow-[4px_4px_0px_#111]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ff6b6b] rounded-none border border-[#111]">
            <TriangleAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
              Valores Atípicos (Anomalías)
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              {chartData.metadata?.insightSubtitle || 'Detección no supervisada con Isolation Forest'}
            </p>
          </div>
        </div>

        {count > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#111] bg-[#fff5f5] shadow-[2px_2px_0px_#111] text-xs font-bold text-gray-900 self-start sm:self-auto">
            <ShieldAlert className="w-4 h-4 text-[#ff6b6b]" />
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
      <div className="mt-8 pt-6 border-t-2 border-[#111]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-gray-100 border border-[#111]">
              <TableIcon className="w-4 h-4 text-gray-900" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tight text-gray-900">
                Explorador de Registros y Muestras de Anomalías
              </h4>
              <p className="text-[11px] text-gray-500 font-medium">
                Inspeccioná fila por fila los datos clasificados por el modelo Isolation Forest
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowTable(!showTable)}
            className="px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#111] bg-white hover:bg-gray-100 shadow-[2px_2px_0px_#111] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            {showTable ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Ocultar Tabla
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Ver Registros en Tabla ({anomalyRecords.length + sampleRecords.length})
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

