'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, ShieldCheck } from 'lucide-react';
import { ChartSchema, ForecastMetricsSchema } from '@/types/analysis';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
import { ForecastTimeRangeFilter, ForecastTimeRange } from './ForecastTimeRangeFilter';
import { ForecastMetricsBar } from './ForecastMetricsBar';
import { ChartLegendExplainer } from '@/components/ChartLegendExplainer';

const DynamicChartRenderer = dynamic(() => import('@/components/DynamicChartRenderer'), { ssr: false });

interface ForecastSectionProps {
  chartData?: ChartSchema;
  metrics?: ForecastMetricsSchema;
  filename: string;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({
  chartData,
  metrics,
  filename,
}) => {
  const [timeRange, setTimeRange] = useState<ForecastTimeRange>('ALL');

  const sourceRows = chartData?.dataset?.source || [];
  const hasMultipleRanges = sourceRows.length > 25;

  const precision = metrics?.precisionPct ?? (metrics?.mape != null ? Math.max(0, 100 - metrics.mape) : 95.0);
  const confidence = metrics?.confianza ?? (precision >= 85 ? 'Alta' : precision >= 70 ? 'Media' : 'Precaución');

  const filteredPayload = useMemo(() => {
    if (!chartData || timeRange === 'ALL' || !hasMultipleRanges) return chartData;
    const source = chartData.dataset?.source || [];

    const firstForecastIdx = source.findIndex((r: any) => r.forecast != null);
    const splitIdx = firstForecastIdx >= 0 ? firstForecastIdx : source.length;
    const splitDateStr = source[Math.max(0, splitIdx - 1)]?.date;
    if (!splitDateStr) return chartData;

    const endDate = new Date(splitDateStr).getTime();
    const daysMap: Record<string, number> = { '3M': 92, '6M': 183, '1Y': 365 };
    const cutoffMs = endDate - (daysMap[timeRange] || 365) * 24 * 60 * 60 * 1000;

    const filtered = source.filter((r: any, idx: number) => {
      if (idx >= splitIdx) return true;
      const t = new Date(r.date).getTime();
      return t >= cutoffMs;
    });

    return {
      ...chartData,
      dataset: {
        ...chartData.dataset,
        source: filtered,
      },
    };
  }, [chartData, timeRange, hasMultipleRanges]);

  if (!chartData) return null;

  return (
    <div className="w-full bg-white dark:bg-[#0e0c19] backdrop-blur-xl p-6 md:p-8 rounded-lg border border-zinc-200 dark:border-white/10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7647eb]/10 dark:bg-[#7647eb]/20 border border-[#7647eb]/20 rounded-2xl text-[#7647eb] dark:text-[#a78bfa]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold font-sans text-zinc-950 dark:text-white">
                Proyecciones Inteligentes
              </h3>
              {metrics?.frecuencia && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#7647eb]/10 dark:bg-[#7647eb]/20 border border-[#7647eb]/20 text-[10px] font-mono font-bold uppercase text-[#7647eb] dark:text-[#a78bfa]">
                  {metrics.frecuencia}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
              {chartData.metadata?.insightSubtitle || 'Modelo predictivo regularizado con bandas de confianza'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {hasMultipleRanges && (
            <ForecastTimeRangeFilter value={timeRange} onChange={setTimeRange} />
          )}

          {metrics?.confianza && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-white/[0.04] text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa]" />
              <span>Confianza: <strong className="uppercase">{confidence}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-[450px]">
        <ChartErrorBoundary>
          <DynamicChartRenderer
            key={`forecast-${filename}-${timeRange}`}
            payload={filteredPayload!}
            height={450}
          />
        </ChartErrorBoundary>
      </div>

      {/* Modular Prediction Metrics Bar */}
      {metrics && <ForecastMetricsBar metrics={metrics} />}

      <ChartLegendExplainer
        whatItDoes="Proyecta hacia adelante cómo evolucionará tu métrica en los próximos meses basándose en lo ocurrido en el pasado."
        whatItShows="La línea continua muestra los datos reales que ya ocurrieron. La curva violeta es la proyección más probable, y la franja sombreada indica el rango esperado (escenarios optimista y pesimista)."
        actionHint="Usá esta proyección para planificar tus presupuestos, compras o metas comerciales con anticipación y sin sorpresas."
        collapsible={true}
        defaultOpen={true}
      />
    </div>
  );
};
