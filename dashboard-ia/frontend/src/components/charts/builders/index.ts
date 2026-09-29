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

  if (isColorblind) {
    baseOptions.color = ['#0033bb', '#ffe500', '#d55e00', '#009e73', '#0072b2', '#cc79a7', '#111111'];
  }

  return baseOptions;
}
