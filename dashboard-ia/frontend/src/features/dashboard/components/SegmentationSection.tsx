import React from 'react';
import dynamic from 'next/dynamic';
import { PieChart, BarChart3 } from 'lucide-react';
import { ChartSchema } from '@/types/analysis';
import ChartErrorBoundary from '@/components/ChartErrorBoundary';
import { ChartLegendExplainer } from '@/components/ChartLegendExplainer';

const DynamicChartRenderer = dynamic(() => import('@/components/DynamicChartRenderer'), { ssr: false });

interface SegmentationSectionProps {
  scatterData?: ChartSchema;
  radarData?: ChartSchema;
  filename: string;
}

export const SegmentationSection: React.FC<SegmentationSectionProps> = ({
  scatterData,
  radarData,
  filename,
}) => {
  if (!scatterData && !radarData) return null;

  const hasBoth = Boolean(scatterData && radarData);

  return (
    <div className={`w-full ${hasBoth ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : ''}`}>
      {scatterData && (
        <div className="bg-white dark:bg-[#0e0d16] p-6 sm:p-8 rounded-mio flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-mio bg-[#7647eb]/15 text-[#7647eb]">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold font-sans tracking-tight text-zinc-950 dark:text-white">
                {scatterData.metadata?.title || 'Distribución de Segmentos'}
              </h3>
            </div>
            <div className="relative w-full h-[460px]">
              <ChartErrorBoundary>
                <DynamicChartRenderer
                  key={`seg-dist-${filename}`}
                  payload={scatterData}
                  height={460}
                />
              </ChartErrorBoundary>
            </div>
          </div>

          <ChartLegendExplainer
            whatItDoes="Agrupa tus datos en perfiles similares de forma automática."
            whatItShows="Muestra el tamaño relativo de cada grupo (por ejemplo, qué porcentaje representa el grupo masivo frente a los grupos exclusivos)."
            actionHint="Priorizá recursos en el grupo mayoritario y diseñá propuestas diferenciadas para los grupos de mayor valor."
            collapsible={true}
            defaultOpen={false}
          />
        </div>
      )}

      {radarData && (
        <div className="bg-white dark:bg-[#0e0d16] p-6 sm:p-8 rounded-mio flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-mio bg-[#7647eb]/15 text-[#7647eb]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold font-sans tracking-tight text-zinc-950 dark:text-white">
                {radarData.metadata?.title || 'Perfil de Segmentos'}
              </h3>
            </div>
            <div className="relative w-full h-[460px]">
              <ChartErrorBoundary>
                <DynamicChartRenderer
                  key={`seg-prof-${filename}`}
                  payload={radarData}
                  height={460}
                />
              </ChartErrorBoundary>
            </div>
          </div>

          <ChartLegendExplainer
            whatItDoes="Compara cómo se comporta cada grupo en base a sus características principales."
            whatItShows="Destaca en qué se diferencia cada grupo del resto (por ejemplo, quién gasta más, quién compra más seguido o quién busca precios bajos)."
            actionHint="Personalizá tus ofertas y mensajes según lo que busca cada grupo en lugar de tratar a todos por igual."
            collapsible={true}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  );
};
