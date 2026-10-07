'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ForecastMetricsSchema } from '@/types/analysis';

interface ForecastMetricsBarProps {
  metrics: ForecastMetricsSchema;
}

const num = (v: any): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const loc = (v: number, d = 2) => v.toLocaleString('es-AR', { maximumFractionDigits: d });

/**
 * How far to trust the forecast, in the engine's own measures. Each cell appears only when the
 * engine reported that figure: nothing here is a default.
 */
export const ForecastMetricsBar: React.FC<ForecastMetricsBarProps> = ({ metrics }) => {
  if (!metrics || metrics.error) return null;
  const m: any = metrics;

  const mape = num(m.mape);
  const precision = num(m.precisionPct) ?? (mape != null ? Math.max(0, 100 - mape) : null);
  const mae = num(m.mae), rmse = num(m.rmse), r2 = num(m.r2);
  const trend = num(m.tendenciaPct);
  const last = num(m.ultimoValorReal), end = num(m.valorFinalForecast);
  const periods = num(m.periodos);

  const cells: { label: string; value: string; sub?: string; title: string; tag?: string; icon?: React.ReactNode }[] = [];
  if (precision != null) {
    cells.push({
      label: 'Precisión',
      value: `${loc(precision, 1)} %`,
      sub: mape != null ? `MAPE ${loc(mape)} %` : undefined,
      title: 'Qué tan cerca estuvo la estimación del valor real cuando se la probó con tus propios datos',
      tag: precision >= 85 ? 'Alta' : precision >= 70 ? 'Aceptable' : 'Baja',
    });
  }
  if (mae != null) {
    cells.push({
      label: 'Error medio',
      value: `± ${loc(mae)}`,
      sub: [rmse != null && `RMSE ± ${loc(rmse)}`, r2 != null && `R² ${loc(r2, 3)}`].filter(Boolean).join(' · ') || undefined,
      title: 'En promedio, cuánto se aleja la estimación del valor real (MAE)',
    });
  }
  if (trend != null) {
    cells.push({
      label: 'Tendencia estimada',
      value: `${trend > 0 ? '+' : ''}${loc(trend, 1)} %`,
      sub: last != null && end != null ? `de ${loc(last)} a ${loc(end)}` : undefined,
      title: 'Cuánto cambia la estimación entre el último dato real y el final del período proyectado',
      icon: trend > 0.5 ? <TrendingUp className="w-4 h-4" /> : trend < -0.5 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />,
    });
  }
  if (periods != null) {
    cells.push({
      label: 'Horizonte',
      value: `${periods} ${m.frecuencia === 'Semanal' ? 'semanas' : 'días'}`,
      sub: [m.motor, m.validacion].filter(Boolean).join(' · ') || undefined,
      title: 'Hasta dónde llega la estimación y con qué método se calculó',
    });
  }
  if (!cells.length) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-bold text-zinc-950 dark:text-white">Qué tan confiable es la estimación</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {cells.map((c) => (
          <div key={c.label} title={c.title} className="rounded-mio-sm bg-[#f3f3f5] dark:bg-white/[0.05] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{c.label}</span>
              {c.tag && <span className="rounded-full bg-[#e4dcff] px-2 py-0.5 text-[10px] font-bold text-zinc-900 dark:bg-[#2a1766] dark:text-white">{c.tag}</span>}
              {c.icon && <span className="text-zinc-500 dark:text-zinc-400">{c.icon}</span>}
            </div>
            <div className="mt-2 text-2xl font-extrabold tracking-[-0.03em] tabular-nums text-zinc-950 dark:text-white">{c.value}</div>
            {c.sub && <p className="mt-1 truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400" title={c.sub}>{c.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
