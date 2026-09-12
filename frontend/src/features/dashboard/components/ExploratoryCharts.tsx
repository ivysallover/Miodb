import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Square, Maximize2, Minimize2, BarChart3 } from 'lucide-react';
import { ChartSchema } from '@/types/analysis';
import { ChartLegendExplainer } from '@/components/ChartLegendExplainer';

const DynamicChartRenderer = dynamic(() => import('@/components/DynamicChartRenderer'), { ssr: false });

interface ExploratoryChartsProps {
  charts?: ChartSchema[];
  filename: string;
  onChartReady?: (instance: any, chartId: string, title: string) => void;
}

function getExploratoryChartGuide(c: ChartSchema) {
  const chartType = c.layoutDirectives?.chartType || (c as any).layout_directives?.chart_type || '';
  const title = (c.metadata?.title || (c as any).title || '').toLowerCase();

  if (chartType === 'CorrelationHeatmap' || title.includes('correlación') || title.includes('matriz')) {
    return {
      whatItDoes: 'Mide la intensidad y direccion de la relacion lineal entre todas las variables numericas.',
      whatItShows: 'Los tonos verdes indican correlacion positiva (crecen juntas) y los rojos negativa (cuando una sube, la otra baja). El valor oscila de -1.0 a +1.0.',
      actionHint: 'Busca pares con valores superiores a 0.5 o inferiores a -0.5 para detectar dependencias clave en tu negocio.',
    };
  }

  if (chartType === 'BoxPlot' || title.includes('dispersión') || title.includes('cuartiles') || title.includes('boxplot')) {
    return {
      whatItDoes: 'Compara la dispersión estadística, la mediana y los valores atípicos entre grupos o variables.',
      whatItShows: 'La línea central de la caja es la mediana (el 50% típico). La caja encierra la mitad central de los datos (IQR). Los bigotes marcan los límites normales y los puntos rojos señalan casos atípicos.',
      actionHint: 'Compará la altura y posición de las cajas: un grupo con la caja más arriba tiene valores superiores, y una caja más alta indica mayor variabilidad.',
    };
  }

  if (chartType === 'Scatter' || title.includes('relación') || title.includes('correlación')) {
    return {
      whatItDoes: 'Comprueba si dos variables se mueven juntas o si una influye sobre la otra.',
      whatItShows: 'La línea negra marca la dirección general. Si sube hacia la derecha, ambas variables crecen juntas. Si baja, van en sentido opuesto. Los puntos muestran cada dato real.',
      actionHint: 'Si la relación es clara, podés accionar sobre la variable horizontal para impulsar directamente la variable objetivo.',
    };
  }

  if (chartType === 'LineChart' || title.includes('evolución') || title.includes('tiempo') || title.includes('fecha')) {
    return {
      whatItDoes: 'Muestra cómo cambia esta métrica a lo largo de los días, semanas o meses.',
      whatItShows: 'La curva te indica si la tendencia general va subiendo o bajando, y si existen épocas del año con picos o caídas marcadas.',
      actionHint: 'Identificá los momentos con mayores subidas para anticipar recursos, compras o campañas con tiempo.',
    };
  }

  if (chartType === 'Donut' || chartType === 'Pie' || title.includes('composición') || title.includes('participación')) {
    return {
      whatItDoes: 'Muestra qué porcentaje aporta cada grupo sobre el total.',
      whatItShows: 'Te permite ver de un vistazo si tus resultados dependen de una sola categoría o si están bien repartidos.',
      actionHint: 'Si un solo grupo concentra más de la mitad del total, buscá diversificar para no depender de uno solo.',
    };
  }

  if (chartType === 'HorizontalBar' || title.includes('ranking') || title.includes('por ') || title.includes('top')) {
    return {
      whatItDoes: 'Compara el rendimiento de las diferentes opciones ordenadas de mayor a menor.',
      whatItShows: 'Las barras de arriba son las líderes indiscutidas y las que más volumen generan.',
      actionHint: 'Concentrate en las 3 primeras barras para conseguir la mayor parte de tus resultados.',
    };
  }

  // Distribución / Histograma general
  return {
    whatItDoes: 'Muestra en qué rango de números se agrupa la mayor parte de tus datos.',
    whatItShows: 'La barra más alta señala el valor más común y habitual; los extremos son los casos excepcionales o raros.',
    actionHint: 'Tomá decisiones y fijá metas basadas en el rango más frecuente y no en los valores aislados.',
  };
}

export const ExploratoryCharts: React.FC<ExploratoryChartsProps> = ({
  charts,
  filename,
  onChartReady,
}) => {
  const [layoutMode, setLayoutMode] = useState<'adaptive' | 'full'>('adaptive');
  const [expandedChartKeys, setExpandedChartKeys] = useState<Record<string, boolean>>({});

  if (!charts || charts.length === 0) return null;

  const toggleExpand = (key: string) => {
    setExpandedChartKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      {/* Barra de control de vista del Bento Grid */}
      <div className="md:col-span-12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border-2 border-[#111] shadow-[4px_4px_0px_#111]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-mio-lime border border-[#111]">
            <BarChart3 className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-gray-900">
              Análisis Exploratorio y Distribuciones ({charts.length} gráficos)
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Diseño amplio y legible para inspeccionar estadísticas sin compresión de etiquetas
            </p>
          </div>
        </div>

        {/* Selector de modo de cuadrícula */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLayoutMode('adaptive')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#111] flex items-center gap-1.5 transition-all ${
              layoutMode === 'adaptive'
                ? 'bg-gray-900 text-white shadow-none translate-y-[1px]'
                : 'bg-white text-gray-700 shadow-[2px_2px_0px_#111] hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cómodo (2 Columnas)</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('full')}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#111] flex items-center gap-1.5 transition-all ${
              layoutMode === 'full'
                ? 'bg-gray-900 text-white shadow-none translate-y-[1px]'
                : 'bg-white text-gray-700 shadow-[2px_2px_0px_#111] hover:bg-gray-100'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Ancho Total (1 Columna)</span>
          </button>
        </div>
      </div>

      {charts.map((c, i) => {
        const chartKey = `${filename}-chart-${i}`;
        const isManuallyExpanded = Boolean(expandedChartKeys[chartKey]);
        const chartType = c.layoutDirectives?.chartType || (c as any).layout_directives?.chart_type || '';

        // Determinación de ancho del card: NUNCA usar 3 columnas (col-span-4)
        let spanClass = 'md:col-span-12 lg:col-span-6';
        let chartHeight = 440;

        if (layoutMode === 'full' || isManuallyExpanded) {
          spanClass = 'md:col-span-12 lg:col-span-12';
          chartHeight = 480;
        } else if (
          chartType === 'BoxPlot' ||
          chartType === 'CorrelationHeatmap' ||
          chartType === 'LineChart' ||
          charts.length === 1
        ) {
          // Boxplots, Heatmaps y Series de Tiempo siempre ocupan el 100% de ancho para no recortar etiquetas
          spanClass = 'md:col-span-12 lg:col-span-12';
          chartHeight = 480;
        } else {
          // Para gráficos estándar en modo adaptativo (Histograma, Bar, Scatter):
          // Máximo 2 columnas (lg:col-span-6), dando ~650px a cada gráfico
          spanClass = 'md:col-span-12 lg:col-span-6';
          chartHeight = 440;
        }

        const guide = getExploratoryChartGuide(c);
        const chartTitle = c.metadata?.title || (c as any).title || `Grafico ${i + 1}`;
        const subtitle = c.metadata?.insightSubtitle || (c as any).metadata?.insight_subtitle || (c as any).description || '';

        return (
          <div
            key={chartKey}
            className={`bg-white p-6 md:p-8 flex flex-col rounded-none border-2 border-[#111] shadow-[5px_5px_0px_#111] transition-all hover:shadow-[7px_7px_0px_#111] ${spanClass}`}
          >
            {/* Header del Card con botón de expandir */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h4 className="text-lg md:text-xl font-black tracking-tight text-gray-900 leading-tight uppercase">
                  {chartTitle}
                </h4>
                {subtitle && (
                  <p className="text-xs md:text-sm text-gray-600 mt-1 font-medium">
                    {subtitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => toggleExpand(chartKey)}
                title={isManuallyExpanded ? 'Reducir tamaño' : 'Ver en ancho completo'}
                className="p-1.5 border-2 border-[#111] bg-white hover:bg-yellow-100 shadow-[2px_2px_0px_#111] active:translate-y-[1px] active:shadow-none transition-all flex-shrink-0"
              >
                {isManuallyExpanded ? (
                  <Minimize2 className="w-4 h-4 text-gray-800" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-800" />
                )}
              </button>
            </div>

            {/* Contenedor del gráfico amplio */}
            <div className="mt-4 relative w-full flex-1" style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}>
              <DynamicChartRenderer
                key={`${filename}-${i}-${isManuallyExpanded ? 'expanded' : layoutMode}`}
                payload={c}
                height={chartHeight}
                onChartReady={onChartReady ? (inst, cId) => onChartReady(inst, cId, chartTitle) : undefined}
              />
            </div>

            {/* Leyenda y Guía de Interpretación debajo del gráfico */}
            <div className="mt-4">
              <ChartLegendExplainer
                whatItDoes={guide.whatItDoes}
                whatItShows={guide.whatItShows}
                actionHint={guide.actionHint}
                collapsible={true}
                defaultOpen={false}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};

