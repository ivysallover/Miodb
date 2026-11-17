import { ChartSchema } from '@/types/analysis';
import { ChartBuildContext } from '../types';
import { getPalette, getSeriesColors, isSober } from '../palettes';
import { resolveAxisType, allValuesPositive } from '../helpers';
import { createBaseOptions } from '../baseOptions';

import { buildHorizontalBar } from './horizontalBar';
import { buildTornado } from './tornado';
import { buildLineChart } from './lineChart';
import { buildFanChart } from './fanChart';
import { buildScatter } from './scatter';
import { buildRadar } from './radar';
import { buildDonut } from './donut';
import { buildBoxPlot } from './boxPlot';
import { buildCorrelationHeatmap } from './heatmap';
import { buildVerticalBar } from './verticalBar';

/** `a` mezclado con `b` (`t` = cuánto de `b`), en hex. */
const mix = (a: string, b: string, t: number) => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
};

/** Un nombre de columna para leer: sin guiones bajos y en castellano si es una de las que pone el motor. */
const NAMES: Record<string, string> = { date: 'Fecha', fecha: 'Fecha', frecuencia: 'Cantidad de filas', cantidad_filas: 'Cantidad de filas' };
const readable = (name: string) => {
  const n = String(name || '').trim();
  const clean = NAMES[n.toLowerCase()] ?? n.replace(/_/g, ' ');
  return clean.length > 36 ? `${clean.slice(0, 35)}…` : clean;
};

/**
 * Qué mide cada eje, escrito en el eje: la categoría (o la fecha) y el número (con "Promedio de" si es un
 * promedio). Sin esto el gráfico muestra valores sin decir de qué. Los que no tienen ejes (torta, radar) y el
 * mapa de correlaciones (sus dos ejes son las mismas columnas) quedan como están.
 */
function titleAxes(o: any, ctx: ChartBuildContext) {
  const type = ctx.payload.layoutDirectives.chartType;
  if (['Donut', 'Radar', 'CorrelationHeatmap'].includes(type)) return;
  const dims = ctx.dataset.dimensions || [];
  const title = String(ctx.payload.metadata?.title || '');
  const metric = ctx.payload.metadata?.sourceMetric || dims[1] || '';
  let category = dims[0] || '';
  let value = metric;
  const spread = /^distribuci[oó]n de (.+)$/i.exec(title);
  if (spread) {
    category = `${readable(spread[1])} (rangos)`;
    value = 'Cantidad de filas';
  } else if (/^promedio de /i.test(title)) {
    value = `Promedio de ${readable(metric)}`;
  }
  if (type === 'BoxPlot') category = / por (.+)$/i.exec(title)?.[1] || '';
  if (type === 'FanChart') category = 'Fecha';
  const scatter = type === 'Scatter' ? { x: dims[0] || '', y: dims[1] || '' } : null;
  const color = ctx.isDark ? 'rgba(244,244,245,0.72)' : 'rgba(39,39,42,0.74)';
  const name = (axis: any, which: 'x' | 'y') => {
    const ax = Array.isArray(axis) ? axis[0] : axis;
    if (!ax || typeof ax !== 'object' || ax.show === false || ax.name) return;
    const isCategory = ax.type === 'category' || ax.type === 'time';
    const text = scatter ? scatter[which] : isCategory ? category : value;
    if (!text) return;
    Object.assign(ax, {
      name: readable(text),
      nameLocation: 'middle',
      nameGap: 12,
      nameMoveOverlap: true,
      nameTextStyle: { color, fontSize: 11, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" },
    });
  };
  name(o.xAxis, 'x');
  name(o.yAxis, 'y');
  if (o.grid && typeof o.grid === 'object' && !Array.isArray(o.grid)) o.grid.outerBoundsContain = 'all';
}

/**
 * One finish for every chart, whatever its builder: no black outlines, hairline axes, and a
 * soft lift on hover (the hovered mark rises and shows its exact value).
 */
function soften(o: any, ctx: ChartBuildContext) {
  const sep = ctx.isDark ? '#0e0d16' : '#ffffff';
  const lift = { shadowBlur: 16, shadowColor: ctx.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(11,9,20,0.24)', shadowOffsetX: 0, shadowOffsetY: 6 };
  const hard = (c: any) => typeof c === 'string' && /^#(000|000000|111|111111|fff|ffffff)$/i.test(c);

  const style = (st: any, type: string, hover: boolean) => {
    if (!st || typeof st !== 'object') return;
    if (type === 'bar') {
      st.borderWidth = 0;
      delete st.borderColor;
    } else if (type === 'pie') {
      st.borderColor = sep;
      st.borderWidth = 3;
      st.borderRadius = 6;
    } else if (type === 'heatmap') {
      if (hover) { st.borderColor = sep; st.borderWidth = 2; }
    } else if (type === 'boxplot') {
      // Las cajas, del acento de la paleta: tenue de relleno y el borde entero (más claro sobre oscuro).
      st.color = isSober() ? mix(ctx.palette.violet, ctx.isDark ? '#0e0d16' : '#ffffff', hover ? 0.72 : 0.8) : hover ? (ctx.isDark ? '#4b36a8' : '#d3c6ff') : ctx.isDark ? '#35257a' : '#e4dcff';
      st.borderColor = ctx.isDark ? (isSober() ? mix(ctx.palette.violet, '#ffffff', 0.45) : '#a78bfa') : ctx.palette.violet;
      st.borderWidth = 1.5;
    } else if (hard(st.borderColor)) {
      st.borderColor = sep;
      st.borderWidth = Math.min(Number(st.borderWidth) || 1, 1.5);
    }
    if (hover && type !== 'line') Object.assign(st, lift);
  };
  const visit = (node: any, type: string) => {
    if (!node || typeof node !== 'object') return;
    style(node.itemStyle, type, false);
    style(node.emphasis?.itemStyle, type, true);
    if (Array.isArray(node.data)) node.data.forEach((d: any) => { if (d && typeof d === 'object' && !Array.isArray(d)) visit(d, type); });
  };
  (Array.isArray(o.series) ? o.series : []).forEach((s: any) => visit(s, String(s?.type || '')));

  for (const ax of [o.xAxis, o.yAxis].flat()) {
    if (!ax || typeof ax !== 'object') continue;
    if (ax.axisLine?.lineStyle) ax.axisLine.lineStyle.width = 1;
    if (ax.splitLine?.lineStyle) delete ax.splitLine.lineStyle.type;
  }
  if (o.tooltip && typeof o.tooltip === 'object') {
    Object.assign(o.tooltip, {
      borderWidth: 0,
      borderRadius: 12,
      padding: [10, 14],
      extraCssText: 'box-shadow:0 10px 30px rgba(11,9,20,0.22);',
    });
  }
}

export function buildChartOptions(
  payload: ChartSchema | null,
  dataset: { dimensions: string[]; source: Record<string, any>[] } | null,
  isColorblind: boolean,
  isDark = false
): any {
  if (!payload || !dataset) return {};

  const { layoutDirectives } = payload;
  const isLogScale = layoutDirectives.isLogScale;
  const palette = getPalette(isColorblind, isDark);
  const seriesColors = getSeriesColors(isColorblind);

  // --- Axis type resolution (log scale safety guard) ---
  const isHorizontal = layoutDirectives.chartType === 'HorizontalBar' || layoutDirectives.chartType === 'Tornado';
  const isScatter = layoutDirectives.chartType === 'Scatter';

  const numericDimForLog = isHorizontal
    ? (dataset.dimensions.find((d: string) => typeof dataset.source[0]?.[d] === 'number') || dataset.dimensions[1])
    : (dataset.dimensions[1] || '');
  const canLog = !isScatter && isLogScale && allValuesPositive(dataset.source, numericDimForLog);

  const resolvedXAxisType = resolveAxisType(
    layoutDirectives.xAxisType,
    isHorizontal ? canLog : false,
    true
  );
  const resolvedYAxisType = resolveAxisType(
    layoutDirectives.yAxisType,
    (isHorizontal || isScatter) ? false : canLog,
    true
  );

  const ctx: ChartBuildContext = {
    payload,
    dataset,
    palette,
    seriesColors,
    isColorblind,
    isDark,
    canLog,
    resolvedXAxisType,
    resolvedYAxisType,
  };

  const baseOptions = createBaseOptions(ctx);

  switch (layoutDirectives.chartType) {
    case 'HorizontalBar':
      buildHorizontalBar(baseOptions, ctx);
      break;

    case 'Tornado':
      buildTornado(baseOptions, ctx);
      break;

    case 'LineChart': {
      const ok = buildLineChart(baseOptions, ctx);
      if (!ok) {
        buildVerticalBar(baseOptions, ctx);
      }
      break;
    }

    case 'FanChart':
      buildFanChart(baseOptions, ctx);
      break;

    case 'Scatter':
      buildScatter(baseOptions, ctx);
      break;

    case 'Radar':
      buildRadar(baseOptions, ctx);
      break;

    case 'Donut':
      buildDonut(baseOptions, ctx);
      break;

    case 'BoxPlot':
      buildBoxPlot(baseOptions, ctx);
      break;

    case 'CorrelationHeatmap':
      buildCorrelationHeatmap(baseOptions, ctx);
      break;

    default:
      buildVerticalBar(baseOptions, ctx);
      break;
  }

  titleAxes(baseOptions, ctx);
  soften(baseOptions, ctx);

  if (isColorblind) {
    baseOptions.color = ['#0033bb', '#ffe500', '#d55e00', '#009e73', '#0072b2', '#cc79a7', '#111111'];
  }

  return baseOptions;
}
