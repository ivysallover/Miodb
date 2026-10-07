import { ChartSchema } from '@/types/analysis';
import { ChartBuildContext } from '../types';
import { getPalette, getSeriesColors } from '../palettes';
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
      st.color = hover ? (ctx.isDark ? '#4b36a8' : '#d3c6ff') : ctx.isDark ? '#35257a' : '#e4dcff';
      st.borderColor = ctx.isDark ? '#a78bfa' : ctx.palette.violet;
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

  soften(baseOptions, ctx);

  if (isColorblind) {
    baseOptions.color = ['#0033bb', '#ffe500', '#d55e00', '#009e73', '#0072b2', '#cc79a7', '#111111'];
  }

  return baseOptions;
}
