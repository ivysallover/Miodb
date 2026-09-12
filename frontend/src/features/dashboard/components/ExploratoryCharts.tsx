import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Square, Maximize2, Minimize2, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Extracción de estadísticas para tarjeta de insights complementarios
// ---------------------------------------------------------------------------
interface MetricSummary {
  metricName: string;
  totalCategories: number;
  leader?: { name: string; val: number };
  trailer?: { name: string; val: number };
  spread?: number;
  average?: number;
}

function extractChartStats(chart: ChartSchema): MetricSummary | null {
  const source = chart.dataset?.source;
  const dimensions = chart.dataset?.dimensions || [];
  if (!Array.isArray(source) || source.length === 0) return null;

  const metricName = chart.metadata?.sourceMetric || chart.metadata?.title || 'Métrica';

  let catDim: string | undefined = dimensions.find((d) => typeof source[0]?.[d] === 'string') || dimensions[0];
  let valDim: string | undefined = dimensions.find((d) => typeof source[0]?.[d] === 'number') || dimensions[1];

  if (!valDim) {
    const keys = Object.keys(source[0] || {});
    valDim = keys.find((k) => typeof source[0]?.[k] === 'number');
    catDim = keys.find((k) => typeof source[0]?.[k] === 'string') || keys[0];
  }

  if (!valDim || !catDim) return null;

  const validCatDim = catDim;
  const validValDim = valDim;

  const validRows = source
    .map((r) => ({
      name: String(r[validCatDim] ?? ''),
      val: Number(r[validValDim]),
    }))
    .filter((r) => !isNaN(r.val));

  if (validRows.length === 0) return null;

  const sorted = [...validRows].sort((a, b) => b.val - a.val);
  const leader = sorted[0];
  const trailer = sorted[sorted.length - 1];
  const sum = validRows.reduce((acc, curr) => acc + curr.val, 0);
  const avg = sum / validRows.length;
  const spread = leader.val - trailer.val;

  return {
    metricName,
    totalCategories: validRows.length,
    leader,
    trailer,
    spread,
    average: avg,
  };
}

function formatStatNumber(val: number): string {
  if (isNaN(val)) return '-';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------------
// Tarjeta complementaria para ocupar espacios vacíos con valor real
// ---------------------------------------------------------------------------
interface CompanionCardProps {
  chart: ChartSchema;
  onExpandChart: () => void;
}

const ExploratoryCompanionCard: React.FC<CompanionCardProps> = ({ chart, onExpandChart }) => {
  const stats = extractChartStats(chart);
  const chartTitle = chart.metadata?.title || 'Gráfico';
  const subtitle = chart.metadata?.insightSubtitle || (chart as any).description || '';

  return (
    <div className="bg-white p-6 md:p-8 flex flex-col justify-between rounded-none border-2 border-[#111] shadow-[5px_5px_0px_#111] transition-all hover:shadow-[7px_7px_0px_#111] md:col-span-12 lg:col-span-6 min-h-[440px]">
      <div>
        {/* Header con Badge */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-mio-lime border-2 border-[#111] text-[10px] font-black uppercase tracking-wider text-gray-900 shadow-[2px_2px_0px_#111]">
              Resumen Complementario
            </span>
            <span className="text-xs font-mono font-bold text-gray-500">
              Espacio Optimizado
            </span>
          </div>
          <button
            type="button"
            onClick={onExpandChart}
            title="Expandir el gráfico continuo a ancho completo"
            className="p-1.5 border-2 border-[#111] bg-white hover:bg-mio-violet hover:text-white shadow-[2px_2px_0px_#111] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 text-xs font-black uppercase"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ancho Total</span>
          </button>
        </div>

        <h4 className="text-lg md:text-xl font-black tracking-tight text-gray-900 leading-tight uppercase mb-2">
          Hallazgos Clave & Distribución
        </h4>
        <p className="text-xs md:text-sm text-gray-600 font-medium mb-5">
          Métricas calculadas y patrones destacados para complementar la lectura de <strong className="text-gray-900">{chartTitle}</strong>.
        </p>

        {/* Métricas destacadas */}
        {stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="p-3 bg-[#fafafc] border-2 border-[#111] shadow-[2px_2px_0px_#111]">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                Líder Destacado
              </span>
              <p className="text-sm font-black text-gray-900 truncate" title={stats.leader?.name}>
                {stats.leader?.name || '-'}
              </p>
              <p className="text-xs font-mono font-bold text-mio-violet">
                {stats.leader ? formatStatNumber(stats.leader.val) : '-'}
              </p>
            </div>

            <div className="p-3 bg-[#fafafc] border-2 border-[#111] shadow-[2px_2px_0px_#111]">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                Menor Registro
              </span>
              <p className="text-sm font-black text-gray-900 truncate" title={stats.trailer?.name}>
                {stats.trailer?.name || '-'}
              </p>
              <p className="text-xs font-mono font-bold text-gray-700">
                {stats.trailer ? formatStatNumber(stats.trailer.val) : '-'}
              </p>
            </div>

            <div className="p-3 bg-[#fafafc] border-2 border-[#111] shadow-[2px_2px_0px_#111]">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                Promedio de Grupos
              </span>
              <p className="text-sm font-black text-gray-900">
                {stats.average != null ? formatStatNumber(stats.average) : '-'}
              </p>
              <span className="text-[10px] text-gray-500 font-medium">Entre {stats.totalCategories} categorías</span>
            </div>

            <div className="p-3 bg-[#fafafc] border-2 border-[#111] shadow-[2px_2px_0px_#111]">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                Brecha (Máx - Mín)
              </span>
              <p className="text-sm font-black text-emerald-600">
                Δ {stats.spread != null ? formatStatNumber(stats.spread) : '-'}
              </p>
              <span className="text-[10px] text-gray-500 font-medium">Amplitud de dispersión</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border-2 border-[#111] mb-5">
            <p className="text-xs font-bold text-amber-900">
              {subtitle || 'Visualización de datos exploratorios.'}
            </p>
          </div>
        )}

        {/* Bloque de Insight Narrativo */}
        <div className="p-4 bg-mio-violet/5 border-2 border-[#111] shadow-[2px_2px_0px_#111]">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-mio-violet" />
            <span className="text-xs font-black uppercase tracking-tight text-mio-violet">
              Conclusión Rápida
            </span>
          </div>
          <p className="text-xs text-gray-800 font-medium leading-relaxed">
            {subtitle || 'La distribución refleja la variabilidad y concentración relativa entre los segmentos principales del dataset.'}
          </p>
        </div>
      </div>

      {/* Footer interactivo */}
      <div className="mt-6 pt-4 border-t-2 border-gray-100 flex items-center justify-between gap-3 text-xs text-gray-500 font-medium">
        <span>¿Preferís ver el gráfico en toda la pantalla?</span>
        <button
          type="button"
          onClick={onExpandChart}
          className="font-black text-mio-violet hover:underline flex items-center gap-1"
        >
          <span>Expandir gráfico</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Componente Principal
// ---------------------------------------------------------------------------
export const ExploratoryCharts: React.FC<ExploratoryChartsProps> = ({
  charts,
  filename,
  onChartReady,
}) => {
  const [layoutMode, setLayoutMode] = useState<'adaptive' | 'full'>('adaptive');
  const [expandedChartKeys, setExpandedChartKeys] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpandedChartKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isFullWidth = (c: ChartSchema, chartKey: string) => {
    if (layoutMode === 'full' || expandedChartKeys[chartKey]) return true;
    const chartType = c.layoutDirectives?.chartType || (c as any).layout_directives?.chart_type || '';
    if (chartType === 'BoxPlot' || chartType === 'CorrelationHeatmap' || chartType === 'LineChart') {
      return true;
    }
    if (!charts || charts.length === 1) return true;
    return false;
  };

  // Emparejamiento inteligente de gráficos para evitar huecos en modo adaptativo
  const layoutItems = useMemo(() => {
    if (!charts || charts.length === 0) return [];

    const items: Array<
      | { type: 'full'; chart: ChartSchema; index: number; key: string }
      | {
          type: 'pair';
          left: { chart: ChartSchema; index: number; key: string };
          right: { chart: ChartSchema; index: number; key: string };
        }
      | { type: 'orphan'; chart: ChartSchema; index: number; key: string }
    > = [];

    if (layoutMode === 'full') {
      charts.forEach((c, i) => {
        items.push({ type: 'full', chart: c, index: i, key: `${filename}-chart-${i}` });
      });
      return items;
    }

    const consumedIndices = new Set<number>();
    let pendingHalf: { chart: ChartSchema; index: number; key: string } | null = null;

    for (let i = 0; i < charts.length; i++) {
      if (consumedIndices.has(i)) continue;

      const c = charts[i];
      const key = `${filename}-chart-${i}`;

      if (isFullWidth(c, key)) {
        if (pendingHalf) {
          // Buscar en el resto del array el próximo gráfico de 6 columnas para emparejar
          let foundPairIdx = -1;
          for (let j = i + 1; j < charts.length; j++) {
            if (consumedIndices.has(j)) continue;
            const nextKey = `${filename}-chart-${j}`;
            if (!isFullWidth(charts[j], nextKey)) {
              foundPairIdx = j;
              break;
            }
          }

          if (foundPairIdx !== -1) {
            consumedIndices.add(foundPairIdx);
            items.push({
              type: 'pair',
              left: pendingHalf,
              right: {
                chart: charts[foundPairIdx],
                index: foundPairIdx,
                key: `${filename}-chart-${foundPairIdx}`,
              },
            });
            pendingHalf = null;
          } else {
            // Es un gráfico huérfano (no hay otro gráfico de 6 columnas disponible)
            items.push({
              type: 'orphan',
              chart: pendingHalf.chart,
              index: pendingHalf.index,
              key: pendingHalf.key,
            });
            pendingHalf = null;
          }
        }

        consumedIndices.add(i);
        items.push({ type: 'full', chart: c, index: i, key });
      } else {
        // Gráfico de 6 columnas
        consumedIndices.add(i);
        if (!pendingHalf) {
          pendingHalf = { chart: c, index: i, key };
        } else {
          items.push({
            type: 'pair',
            left: pendingHalf,
            right: { chart: c, index: i, key },
          });
          pendingHalf = null;
        }
      }
    }

    if (pendingHalf) {
      items.push({
        type: 'orphan',
        chart: pendingHalf.chart,
        index: pendingHalf.index,
        key: pendingHalf.key,
      });
    }

    return items;
  }, [charts, layoutMode, expandedChartKeys, filename]);

  if (!charts || charts.length === 0) return null;

  const renderChartCard = (
    c: ChartSchema,
    i: number,
    chartKey: string,
    spanClass: string,
    chartHeight: number
  ) => {
    const isManuallyExpanded = Boolean(expandedChartKeys[chartKey]);
    const guide = getExploratoryChartGuide(c);
    const chartTitle = c.metadata?.title || (c as any).title || `Gráfico ${i + 1}`;
    const subtitle =
      c.metadata?.insightSubtitle || (c as any).metadata?.insight_subtitle || (c as any).description || '';

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
  };

  return (
    <div className="md:col-span-12 flex flex-col gap-6">
      {/* Barra de control de vista del Bento Grid */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border-2 border-[#111] shadow-[4px_4px_0px_#111]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-mio-lime border border-[#111]">
            <BarChart3 className="w-5 h-5 text-gray-900" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-black uppercase tracking-tight text-gray-900">
              Análisis Exploratorio y Distribuciones ({charts.length} gráficos)
            </h3>
            <p className="text-xs text-gray-500 font-medium">
              Diseño amplio y legible sin huecos vacíos ni compresión de etiquetas
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

      {/* Grilla ordenada sin espacios vacíos */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {layoutItems.map((item) => {
          if (item.type === 'full') {
            return renderChartCard(item.chart, item.index, item.key, 'md:col-span-12 lg:col-span-12', 480);
          }

          if (item.type === 'pair') {
            return (
              <React.Fragment key={`pair-${item.left.key}-${item.right.key}`}>
                {renderChartCard(
                  item.left.chart,
                  item.left.index,
                  item.left.key,
                  'md:col-span-12 lg:col-span-6',
                  440
                )}
                {renderChartCard(
                  item.right.chart,
                  item.right.index,
                  item.right.key,
                  'md:col-span-12 lg:col-span-6',
                  440
                )}
              </React.Fragment>
            );
          }

          if (item.type === 'orphan') {
            return (
              <React.Fragment key={`orphan-${item.key}`}>
                {renderChartCard(
                  item.chart,
                  item.index,
                  item.key,
                  'md:col-span-12 lg:col-span-6',
                  440
                )}
                <ExploratoryCompanionCard
                  chart={item.chart}
                  onExpandChart={() => toggleExpand(item.key)}
                />
              </React.Fragment>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};

