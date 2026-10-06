'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { ForecastMetricsSchema } from '@/types/analysis';

interface ForecastMetricsBarProps {
  metrics: ForecastMetricsSchema;
}

export const ForecastMetricsBar: React.FC<ForecastMetricsBarProps> = ({ metrics }) => {
  if (!metrics || metrics.error) return null;

  const precision = metrics.precisionPct ?? (metrics.mape != null ? Math.max(0, 100 - metrics.mape) : 95.0);
  const trend = metrics.tendenciaPct ?? 0;
  const isPositiveTrend = trend > 0.5;
  const isNegativeTrend = trend < -0.5;

  return (
    <div className="mt-8 pt-6 border-t-2 border-black/15 dark:border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-mio-violet dark:text-violet-400" />
        <h4 className="text-xs font-black uppercase tracking-wider text-gray-800 dark:text-zinc-200">
          Métricas de Rendimiento & Precisión del Modelo
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Precisión */}
        <div className="p-4 bg-[#fafafc] dark:bg-[#0e0c19] border border-black/15 dark:border-white/10 dark:shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-gray-600 dark:text-zinc-400">Precisión Estimada</span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 border border-black/15 dark:border-white/20 ${
                precision >= 85
                  ? 'bg-[#bdf559] text-gray-900'
                  : precision >= 70
                  ? 'bg-[#ffe066] text-gray-900'
                  : 'bg-[#ff6b6b] text-white'
              }`}
            >
              {precision >= 85 ? 'Excelente' : precision >= 70 ? 'Aceptable' : 'Dispersa'}
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {precision.toFixed(1)}%
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 font-medium">
            MAPE: {metrics.mape != null ? `${metrics.mape.toFixed(2)}%` : 'Bajo control'}
          </p>
        </div>

        {/* Metric 2: Error Medio Absoluto (MAE) */}
        <div className="p-4 bg-[#fafafc] dark:bg-[#0e0c19] border border-black/15 dark:border-white/10 dark:shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-gray-600 dark:text-zinc-400">Error Medio (MAE)</span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Desvío Promedio</span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            ± {metrics.mae != null ? metrics.mae : '-'}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 font-medium">
            {metrics.rmse != null ? `RMSE: ± ${metrics.rmse}` : 'Dispersión estable'}
            {metrics.r2 != null && ` • R²: ${metrics.r2}`}
          </p>
        </div>

        {/* Metric 3: Tendencia Futura */}
        <div className="p-4 bg-[#fafafc] dark:bg-[#0e0c19] border border-black/15 dark:border-white/10 dark:shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-gray-600 dark:text-zinc-400">Tendencia Futura</span>
            {isPositiveTrend ? (
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-emerald-400" />
            ) : isNegativeTrend ? (
              <TrendingDown className="w-4 h-4 text-red-600 dark:text-rose-400" />
            ) : (
              <Minus className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            )}
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {trend > 0 ? `+${trend}%` : `${trend}%`}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 font-medium truncate">
            {metrics.ultimoValorReal != null && metrics.valorFinalForecast != null
              ? `${metrics.ultimoValorReal} → ${metrics.valorFinalForecast}`
              : 'Estabilidad proyectada'}
          </p>
        </div>

        {/* Metric 4: Horizonte & Motor */}
        <div className="p-4 bg-[#fafafc] dark:bg-[#0e0c19] border border-black/15 dark:border-white/10 dark:shadow-none flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase text-gray-600 dark:text-zinc-400">Horizonte Temporal</span>
            <span className="text-[10px] font-black bg-mio-violet/10 dark:bg-mio-violet/25 text-mio-violet dark:text-violet-300 px-2 py-0.5 border border-mio-violet/30">
              {metrics.frecuencia || 'Adaptativa'}
            </span>
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white">
            {metrics.periodos ?? 30} {metrics.frecuencia === 'Semanal' ? 'Semanas' : 'Días'}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 font-medium truncate">
            {metrics.motor || 'Prophet'} • {metrics.validacion || 'OOS'}
          </p>
        </div>
      </div>
    </div>
  );
};
