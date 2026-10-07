import React, { useState, useMemo, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LayoutGrid, Square, Maximize2, X, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
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
  const chartType = chart.layoutDirectives?.chartType || (chart as any).layout_directives?.chart_type || '';
  if (!Array.isArray(source) || source.length === 0) return null;

  const metricName = chart.metadata?.sourceMetric || chart.metadata?.title || 'Métrica';

  // 1. BoxPlot handling
  if (chartType === 'BoxPlot') {
    const validRows = source
      .map((r: any) => {
        const med = r.box?.[2];
        return {
          name: String(r.categoria ?? ''),
          val: typeof med === 'number' ? med : (r.box?.[0] ?? 0),
        };
      })
      .filter((r) => !isNaN(r.val));
    if (validRows.length === 0) return null;
    const sorted = [...validRows].sort((a, b) => b.val - a.val);
    const leader = sorted[0];
    const trailer = sorted[sorted.length - 1];
    const sum = validRows.reduce((acc, curr) => acc + curr.val, 0);
    return {
      metricName,
      totalCategories: validRows.length,
      leader,
      trailer,
      spread: leader.val - trailer.val,
      average: sum / validRows.length,
    };
  }

  // 2. CorrelationHeatmap handling
  if (chartType === 'CorrelationHeatmap') {
    const validRows = source
      .filter((r: any) => typeof r.value === 'number' && r.x !== r.y)
      .map((r: any) => ({
        name: `${r.x} ↔ ${r.y}`,
        val: Number(r.value),
      }));
    if (validRows.length === 0) return null;
    const sorted = [...validRows].sort((a, b) => b.val - a.val);
    const leader = sorted[0];
    const trailer = sorted[sorted.length - 1];
    const absSorted = [...validRows].sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
    const strongest = absSorted[0];
    return {
      metricName: 'Correlación',
      totalCategories: validRows.length,
      leader: strongest ? { name: strongest.name, val: strongest.val } : leader,
      trailer,
      spread: leader.val - trailer.val,
      average: validRows.reduce((acc, curr) => acc + curr.val, 0) / validRows.length,
    };
  }

  // 3. LineChart handling
  if (chartType === 'LineChart') {
    const xDim = dimensions[0];
    const yDim = dimensions[1] || dimensions[0];
    const validRows = source
      .map((r: any) => ({
        name: String(r[xDim] ?? ''),
        val: Number(r[yDim]),
      }))
      .filter((r) => !isNaN(r.val));
    if (validRows.length === 0) return null;
    const sorted = [...validRows].sort((a, b) => b.val - a.val);
    const leader = sorted[0];
    const trailer = sorted[sorted.length - 1];
    const sum = validRows.reduce((acc, curr) => acc + curr.val, 0);
    return {
      metricName: yDim,
      totalCategories: validRows.length,
      leader,
      trailer,
      spread: leader.val - trailer.val,
      average: sum / validRows.length,
    };
  }

  // 4. Standard categorical/numeric handling (HorizontalBar, Donut, Scatter, etc.)
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
    <div className="bg-white dark:bg-[#0e0d16] p-6 md:p-8 flex flex-col justify-between rounded-mio transition-all md:col-span-12 lg:col-span-6 min-h-[440px]">
      <div>
        {/* Header con Badge */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-mio-lime border border-black/15 text-[10px] font-black uppercase tracking-wider text-gray-900">
              Resumen Complementario
            </span>
            <span className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400">
              Espacio Optimizado
            </span>
          </div>
          <button
            type="button"
            onClick={onExpandChart}
            title="Expandir el gráfico continuo a ancho completo"
            className="p-1.5 border border-black/15 dark:border-white/20 bg-white dark:bg-[#141124] text-zinc-900 dark:text-white hover:bg-mio-violet hover:text-white active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 text-xs font-black uppercase cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ancho Total</span>
          </button>
        </div>

        <h4 className="text-lg md:text-xl font-black tracking-tight text-gray-900 dark:text-white leading-tight uppercase mb-2">
          Hallazgos Clave & Distribución
        </h4>
        <p className="text-xs md:text-sm text-gray-600 dark:text-zinc-400 font-medium mb-5">
          Métricas calculadas y patrones destacados para complementar la lectura de <strong className="text-gray-900 dark:text-zinc-100">{chartTitle}</strong>.
        </p>

        {/* Métricas destacadas */}
        {stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div className="p-3 bg-[#fafafc] border border-black/15">
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

            <div className="p-3 bg-[#fafafc] border border-black/15">
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

            <div className="p-3 bg-[#fafafc] border border-black/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                Promedio de Grupos
              </span>
              <p className="text-sm font-black text-gray-900">
                {stats.average != null ? formatStatNumber(stats.average) : '-'}
              </p>
              <span className="text-[10px] text-gray-500 font-medium">Entre {stats.totalCategories} categorías</span>
            </div>

            <div className="p-3 bg-[#fafafc] border border-black/15">
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
          <div className="p-4 bg-amber-50 border border-black/15 mb-5">
            <p className="text-xs font-bold text-amber-900">
              {subtitle || 'Visualización de datos exploratorios.'}
            </p>
          </div>
        )}

        {/* Bloque de Insight Narrativo */}
        <div className="p-4 bg-mio-violet/5 border border-black/15">
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
// Tabla resumen dinámica según tipo de gráfico
// ---------------------------------------------------------------------------
function buildSummaryTable(chart: ChartSchema): { headers: string[]; rows: (string | number)[][] } | null {
  const source = chart.dataset?.source;
  const dims = chart.dataset?.dimensions || [];
  const chartType = chart.layoutDirectives?.chartType || (chart as any).layout_directives?.chart_type || '';
  if (!Array.isArray(source) || source.length === 0) return null;

  const fmt = (n: number, dec = 2) => {
    if (!isFinite(n)) return '-';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(dec)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(dec)}K`;
    return n.toLocaleString('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  if (chartType === 'BoxPlot') {
    const headers = ['Categoría', 'Mín', 'Q1', 'Mediana', 'Q3', 'Máx', 'Atípicos'];
    const rows = source.map((r: any) => {
      const [lo, q1, med, q3, hi] = (r.box || []) as number[];
      return [
        String(r.categoria ?? ''),
        lo != null ? fmt(lo) : '-',
        q1 != null ? fmt(q1) : '-',
        med != null ? fmt(med) : '-',
        q3 != null ? fmt(q3) : '-',
        hi != null ? fmt(hi) : '-',
        Array.isArray(r.outliers) ? r.outliers.length : 0,
      ];
    });
    return { headers, rows };
  }

  if (chartType === 'CorrelationHeatmap') {
    const pairs = source
      .filter((r: any) => typeof r.value === 'number' && r.x !== r.y)
      .map((r: any) => {
        const v = Number(r.value);
        const abs = Math.abs(v);
        const strength = abs >= 0.7 ? 'Muy fuerte' : abs >= 0.5 ? 'Fuerte' : abs >= 0.3 ? 'Moderada' : 'Débil';
        return { x: r.x, y: r.y, v, abs, strength };
      })
      .sort((a: any, b: any) => b.abs - a.abs);
    // Remove mirror duplicates (A-B and B-A)
    const seen = new Set<string>();
    const unique = pairs.filter((p: any) => {
      const key = [p.x, p.y].sort().join('|||');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const headers = ['Variable A', 'Variable B', 'Correlación', 'Fuerza', 'Dirección'];
    const rows = unique.slice(0, 20).map((p: any) => [
      p.x, p.y, p.v.toFixed(3), p.strength, p.v >= 0 ? '↑ Positiva' : '↓ Negativa',
    ]);
    return { headers, rows };
  }

  if (chartType === 'HorizontalBar' || chartType === 'Tornado') {
    const catDim = dims.find((d: string) => typeof source[0]?.[d] === 'string') || dims[0];
    const valDim = dims.find((d: string) => typeof source[0]?.[d] === 'number') || dims[1];
    if (!catDim || !valDim) return null;
    const total = source.reduce((s: number, r: any) => s + (Number(r[valDim]) || 0), 0);
    const sorted = [...source].sort((a: any, b: any) => (Number(b[valDim]) || 0) - (Number(a[valDim]) || 0));
    const headers = ['#', 'Categoría', 'Valor', '% del Total', 'Acumulado'];
    let acc = 0;
    const rows = sorted.map((r: any, i: number) => {
      const v = Number(r[valDim]) || 0;
      const pct = total > 0 ? (v / total) * 100 : 0;
      acc += pct;
      return [i + 1, String(r[catDim] ?? ''), fmt(v), `${pct.toFixed(1)}%`, `${acc.toFixed(1)}%`];
    });
    return { headers, rows };
  }

  if (chartType === 'Donut') {
    const catDim = dims[0];
    const valDim = dims[1];
    if (!catDim || !valDim) return null;
    const total = source.reduce((s: number, r: any) => s + (Number(r[valDim]) || 0), 0);
    const sorted = [...source].sort((a: any, b: any) => (Number(b[valDim]) || 0) - (Number(a[valDim]) || 0));
    const headers = ['Categoría', 'Valor', '% del Total'];
    const rows = sorted.map((r: any) => {
      const v = Number(r[valDim]) || 0;
      return [String(r[catDim] ?? ''), fmt(v), `${total > 0 ? ((v / total) * 100).toFixed(1) : '0'}%`];
    });
    return { headers, rows };
  }

  if (chartType === 'LineChart') {
    const xDim = dims[0];
    const yDim = dims[1] || dims[0];
    const rows: (string | number)[][] = [];
    source.forEach((r: any, i: number) => {
      const curr = Number(r[yDim]);
      const prev = i > 0 ? Number(source[i - 1][yDim]) : null;
      const delta = prev != null && isFinite(prev) && isFinite(curr) ? curr - prev : null;
      const deltaPct = delta != null && prev !== 0 && prev != null ? (delta / Math.abs(prev)) * 100 : null;
      rows.push([
        String(r[xDim] ?? ''),
        fmt(curr),
        delta != null ? `${delta >= 0 ? '+' : ''}${fmt(delta)}` : '-',
        deltaPct != null ? `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%` : '-',
      ]);
    });
    return { headers: ['Período', yDim, 'Δ vs. Anterior', '% Cambio'], rows };
  }

  // Generic fallback: first string dim as category, first numeric as value
  const catDim = dims.find((d: string) => typeof source[0]?.[d] === 'string') || dims[0];
  const valDim = dims.find((d: string) => typeof source[0]?.[d] === 'number') || dims[1];
  if (!catDim || !valDim) return null;
  const total = source.reduce((s: number, r: any) => s + (Number(r[valDim]) || 0), 0);
  const sorted = [...source].sort((a: any, b: any) => (Number(b[valDim]) || 0) - (Number(a[valDim]) || 0));
  const headers = ['Categoría', 'Valor', '% del Total'];
  const rows = sorted.map((r: any) => {
    const v = Number(r[valDim]) || 0;
    return [String(r[catDim] ?? ''), fmt(v), `${total > 0 ? ((v / total) * 100).toFixed(1) : '0'}%`];
  });
  return { headers, rows };
}

/** PNG of the chart in this card, or the data behind it as CSV. */
async function downloadChart(from: HTMLElement, chart: ChartSchema, title: string, kind: 'png' | 'csv') {
  const c = await import('../../../components/charts/capture');
  if (kind === 'csv') return c.saveText(c.chartCsv(chart as any), `${c.slug(title)}.csv`);
  const url = c.chartPng(from.closest('[data-chart-card]'), document.documentElement.classList.contains('dark'));
  if (url) c.save(url, `${c.slug(title)}.png`);
}

interface ChartSummaryTableProps { chart: ChartSchema }

const ChartSummaryTable: React.FC<ChartSummaryTableProps> = ({ chart }) => {
  const table = useMemo(() => buildSummaryTable(chart), [chart]);
  if (!table) return null;
  const chartType = chart.layoutDirectives?.chartType || '';
  const isCorr = chartType === 'CorrelationHeatmap';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <span className="px-2.5 py-1 bg-mio-lime border border-black/15 text-[10px] font-black uppercase tracking-wider text-gray-900">
          Tabla Resumen
        </span>
        <span className="text-xs font-mono text-gray-400">{table.rows.length} filas</span>
      </div>
      <div className="flex-1 overflow-auto border border-black/15 dark:border-white/10">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-black uppercase tracking-wider bg-[#111] dark:bg-[#1a172a] text-white border-r border-gray-700 dark:border-white/10 whitespace-nowrap text-[10px]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-gray-100 dark:border-white/5 hover:bg-mio-lime/20 dark:hover:bg-mio-lime/10 transition-colors ${
                  ri % 2 === 0 ? 'bg-white dark:bg-[#0e0c19]' : 'bg-gray-50 dark:bg-[#141224]'
                }`}
              >
                {row.map((cell, ci) => {
                  const isNum = typeof cell === 'number' || (typeof cell === 'string' && /^[\d,.+\-KM%↑↓]+$/.test(String(cell)));
                  const isHighCorr = isCorr && ci === 2 && Math.abs(parseFloat(String(cell))) >= 0.5;
                  return (
                    <td
                      key={ci}
                      className={`px-3 py-1.5 border-r border-gray-100 dark:border-white/5 whitespace-nowrap font-mono
                        ${isNum ? 'text-right' : 'text-left font-sans'}
                        ${isHighCorr ? 'font-black text-mio-violet dark:text-violet-400' : 'font-medium text-gray-800 dark:text-zinc-300'}
                        ${ci === 0 ? 'font-semibold text-gray-900 dark:text-zinc-100 font-sans' : ''}
                      `}
                    >
                      {String(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modal fullscreen para expandir un gráfico
// ---------------------------------------------------------------------------
interface ChartModalProps {
  chart: ChartSchema;
  title: string;
  onClose: () => void;
}

const ChartModal: React.FC<ChartModalProps> = ({ chart, title, onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const stats = useMemo(() => extractChartStats(chart), [chart]);
  const subtitle = chart.metadata?.insightSubtitle || (chart as any).description || '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white dark:bg-[#0e0d16] rounded-mio w-full max-w-[98vw] flex flex-col overflow-hidden"
        style={{ height: '94vh', maxHeight: '94vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0e0c19] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#bdf559]/20 border border-[#bdf559]/30 rounded-mio-sm">
              <Maximize2 className="w-4 h-4 text-emerald-800 dark:text-[#bdf559]" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold font-sans text-zinc-950 dark:text-white tracking-tight leading-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-zinc-500 font-medium line-clamp-1">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar (ESC)"
            className="p-2 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: 2 Columns on Desktop */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-0 overflow-hidden">
          {/* Columna Izquierda: Gráfico grande y nítido */}
          <div className="flex-1 lg:flex-[6] p-6 min-h-[360px] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-white/10 flex flex-col justify-center bg-white dark:bg-[#0e0c19]">
            <DynamicChartRenderer
              payload={chart}
              height="100%"
            />
          </div>

          {/* Columna Derecha: Panel Inteligente (Tarjetas Arriba + Tabla de Valores Reales Abajo) */}
          <div className="flex-1 lg:flex-[5] flex flex-col min-h-0 overflow-y-auto bg-zinc-50/50 dark:bg-[#121024] p-6 gap-6">
            {/* 1. Header con Badge Neo-Brutalista */}
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-[#0e0c19] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 bg-mio-lime border border-black/15 text-[10px] font-black uppercase tracking-wider text-gray-900">
                  Resumen Complementario
                </span>
                <span className="text-xs font-mono font-bold text-gray-500 dark:text-zinc-400">
                  Inspección Detallada
                </span>
              </div>

              <div>
                <h4 className="text-lg font-black tracking-tight text-gray-900 dark:text-white leading-tight uppercase">
                  Hallazgos Clave & Distribución
                </h4>
                <p className="text-xs text-gray-600 dark:text-zinc-400 font-medium mt-1">
                  Métricas calculadas y patrones destacados para complementar la lectura de <strong className="text-gray-900 dark:text-zinc-100">{title}</strong>.
                </p>
              </div>

              {/* 2. Grid de 4 KPIs destacados */}
              {stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#fafafc] dark:bg-[#151224] border border-black/15 dark:border-white/10 dark:shadow-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                      Líder Destacado
                    </span>
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate" title={stats.leader?.name}>
                      {stats.leader?.name || '-'}
                    </p>
                    <p className="text-xs font-mono font-bold text-mio-violet dark:text-violet-400">
                      {stats.leader ? formatStatNumber(stats.leader.val) : '-'}
                    </p>
                  </div>

                  <div className="p-3 bg-[#fafafc] dark:bg-[#151224] border border-black/15 dark:border-white/10 dark:shadow-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                      Menor Registro
                    </span>
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate" title={stats.trailer?.name}>
                      {stats.trailer?.name || '-'}
                    </p>
                    <p className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300">
                      {stats.trailer ? formatStatNumber(stats.trailer.val) : '-'}
                    </p>
                  </div>

                  <div className="p-3 bg-[#fafafc] dark:bg-[#151224] border border-black/15 dark:border-white/10 dark:shadow-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                      Promedio de Grupos
                    </span>
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {stats.average != null ? formatStatNumber(stats.average) : '-'}
                    </p>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">Entre {stats.totalCategories} categorías</span>
                  </div>

                  <div className="p-3 bg-[#fafafc] dark:bg-[#151224] border border-black/15 dark:border-white/10 dark:shadow-none">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-zinc-400 block mb-1">
                      Brecha (Máx - Mín)
                    </span>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Δ {stats.spread != null ? formatStatNumber(stats.spread) : '-'}
                    </p>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">Amplitud de dispersión</span>
                  </div>
                </div>
              )}

              {/* 3. Bloque de Insight Narrativo / Conclusión Rápida */}
              <div className="p-3.5 bg-mio-violet/5 dark:bg-mio-violet/15 border border-black/15 dark:border-white/10 dark:shadow-none">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-mio-violet dark:text-violet-400" />
                  <span className="text-xs font-black uppercase tracking-tight text-mio-violet dark:text-violet-400">
                    Conclusión Rápida
                  </span>
                </div>
                <p className="text-xs text-gray-800 dark:text-zinc-200 font-medium leading-relaxed">
                  {subtitle || 'La distribución refleja la variabilidad y concentración relativa entre los segmentos principales del dataset.'}
                </p>
              </div>
            </div>

            {/* 4. Tabla de Datos Reales del Gráfico */}
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-[#0e0c19] p-5 flex flex-col flex-1 min-h-[300px]">
              <ChartSummaryTable chart={chart} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-2 border-t-2 border-black/15 dark:border-white/10 bg-white dark:bg-[#0e0c19] flex-shrink-0 flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400 font-bold">
          <span>Presioná <strong>ESC</strong> o hacé clic afuera para salir del visor.</span>
          <span className="font-mono text-gray-400 dark:text-zinc-500">Inspección de Gráficos MIO-DEV</span>
        </div>
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
  const [modalChart, setModalChart] = useState<{ chart: ChartSchema; title: string } | null>(null);

  const openModal = useCallback((chart: ChartSchema, title: string) => {
    setModalChart({ chart, title });
  }, []);

  const closeModal = useCallback(() => {
    setModalChart(null);
  }, []);

  const isFullWidth = useCallback((c: ChartSchema) => {
    if (layoutMode === 'full') return true;
    const chartType = c.layoutDirectives?.chartType || (c as any).layout_directives?.chart_type || '';
    if (chartType === 'BoxPlot' || chartType === 'CorrelationHeatmap' || chartType === 'LineChart') return true;
    if (!charts || charts.length === 1) return true;
    return false;
  }, [layoutMode, charts]);

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

      if (isFullWidth(c)) {
        if (pendingHalf) {
          // Buscar en el resto del array el próximo gráfico de 6 columnas para emparejar
          let foundPairIdx = -1;
          for (let j = i + 1; j < charts.length; j++) {
            if (consumedIndices.has(j)) continue;
            if (!isFullWidth(charts[j])) {
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
  }, [charts, layoutMode, filename, isFullWidth]);

  if (!charts || charts.length === 0) return null;

  const renderChartCard = (
    c: ChartSchema,
    i: number,
    chartKey: string,
    spanClass: string,
    chartHeight: number
  ) => {
    const guide = getExploratoryChartGuide(c);
    const chartTitle = c.metadata?.title || (c as any).title || `Gráfico ${i + 1}`;
    const subtitle =
      c.metadata?.insightSubtitle || (c as any).metadata?.insight_subtitle || (c as any).description || '';

    return (
      <div
        key={chartKey}
        data-chart-card
        className={`bg-white dark:bg-[#0e0d16] p-6 md:p-8 flex flex-col rounded-mio ${spanClass}`}
      >
        {/* Header del Card con botón de expandir a pantalla completa */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h4 className="text-lg md:text-xl font-bold font-sans tracking-tight text-zinc-950 dark:text-white leading-tight">
              {chartTitle}
            </h4>
            {subtitle && (
              <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => downloadChart(e.currentTarget, c, chartTitle, 'png')}
              title="Descargar el gráfico como imagen"
              className="min-h-[36px] rounded-full bg-zinc-100 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:bg-[#e4dcff] hover:text-zinc-950 cursor-pointer dark:bg-white/[0.07] dark:text-zinc-300 dark:hover:bg-white/15 dark:hover:text-white"
            >
              Imagen
            </button>
            <button
              type="button"
              onClick={(e) => downloadChart(e.currentTarget, c, chartTitle, 'csv')}
              title="Descargar los datos del gráfico para Excel"
              className="min-h-[36px] rounded-full bg-zinc-100 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-600 transition-colors hover:bg-[#e4dcff] hover:text-zinc-950 cursor-pointer dark:bg-white/[0.07] dark:text-zinc-300 dark:hover:bg-white/15 dark:hover:text-white"
            >
              Datos
            </button>
          <button
            type="button"
            onClick={() => openModal(c, chartTitle)}
            title="Ver en pantalla completa"
            className="p-2 rounded-full border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 transition-all flex-shrink-0 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          </div>
        </div>

        {/* Contenedor del gráfico */}
        <div className="mt-4 relative w-full flex-1" style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}>
          <DynamicChartRenderer
            key={`${filename}-${i}-${layoutMode}`}
            payload={c}
            height={chartHeight}
            onChartReady={onChartReady ? (inst: any, cId: any) => onChartReady(inst, cId, chartTitle) : undefined}
          />
        </div>

        {/* Guía de interpretación */}
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
    <div className="w-full flex flex-col gap-6">
      {/* Modal fullscreen */}
      {modalChart && (
        <ChartModal
          chart={modalChart.chart}
          title={modalChart.title}
          onClose={closeModal}
        />
      )}

      {/* Barra de control de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-white dark:bg-[#0e0d16] rounded-mio">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#bdf559]/20 border border-[#bdf559]/30 rounded-mio text-emerald-800 dark:text-[#bdf559]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold font-sans text-zinc-950 dark:text-white tracking-tight">
              Análisis Exploratorio y Distribuciones ({charts.length} gráficos)
            </h3>
            <p className="text-xs text-zinc-500 font-mono">
              Usá <Maximize2 className="w-3 h-3 inline-block mb-0.5" /> para inspeccionar en pantalla completa
            </p>
          </div>
        </div>

        {/* Selector de modo de cuadrícula */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLayoutMode('adaptive')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              layoutMode === 'adaptive'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white/15 shadow-sm'
                : 'bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cómodo (2 Col.)</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('full')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              layoutMode === 'full'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white/15 shadow-sm'
                : 'bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Ancho Total</span>
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
                  onExpandChart={() => openModal(item.chart, item.chart.metadata?.title || `Gráfico ${item.index + 1}`)}
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

