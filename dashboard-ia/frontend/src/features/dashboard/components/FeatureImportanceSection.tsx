import React from 'react';
import dynamic from 'next/dynamic';
import { ChartSchema } from '@/types/analysis';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
import { ChartLegendExplainer } from '@/components/ChartLegendExplainer';

const DynamicChartRenderer = dynamic(() => import('@/components/DynamicChartRenderer'), { ssr: false });

interface FeatureImportanceSectionProps {
  chartImportance?: ChartSchema;
  chartShap?: ChartSchema;
  filename: string;
}

export const FeatureImportanceSection: React.FC<FeatureImportanceSectionProps> = ({
  chartImportance,
  chartShap,
  filename,
}) => {
  if (!chartImportance) return null;

  const hasBoth = Boolean(chartImportance && chartShap);

  return (
    <div className={`w-full ${hasBoth ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
      <div className="bg-white dark:bg-[#0e0c19] backdrop-blur-xl p-6 sm:p-8 rounded-none border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
        <div>
          <div className="mb-6">
            <h3 className="text-xl font-bold font-sans tracking-tight text-zinc-950 dark:text-white">
              Impacto Base (Gini)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Jerarquía de variables que determinan el resultado</p>
          </div>
          <div className="relative w-full h-[420px]">
            <ChartErrorBoundary>
              <DynamicChartRenderer
                key={`feat-imp-${filename}`}
                payload={chartImportance}
                height={420}
              />
            </ChartErrorBoundary>
          </div>
        </div>

        <ChartLegendExplainer
          whatItDoes="Descubre cuáles son los factores que más mueven la aguja en tu resultado final."
          whatItShows="Las barras más largas son las variables principales (lo que más influye en el resultado). Las barras cortas casi no tienen peso."
          actionHint="Enfocá tu tiempo y presupuesto en las 3 variables líderes en lugar de dispersar esfuerzos."
          collapsible={true}
          defaultOpen={false}
        />
      </div>

      {chartShap && (
        <div className="bg-white dark:bg-[#0e0c19] backdrop-blur-xl p-6 sm:p-8 rounded-none border border-zinc-200 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-bold font-sans tracking-tight text-zinc-950 dark:text-white">
                Atribución (SHAP)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Dirección y magnitud de impacto por variable</p>
            </div>
            <div className="relative w-full h-[420px]">
              <ChartErrorBoundary>
                <DynamicChartRenderer
                  key={`feat-shap-${filename}`}
                  payload={chartShap}
                  height={420}
                />
              </ChartErrorBoundary>
            </div>
          </div>

          <ChartLegendExplainer
            whatItDoes="Mide cómo empuja cada factor: si ayuda a subir o a bajar el resultado final."
            whatItShows="Te indica en qué dirección empuja cada variable y cuánto suma o resta a tu métrica principal."
            actionHint="Usá esta información para saber exactamente qué palanca mover cuando quieras mejorar tus números."
            collapsible={true}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  );
};
