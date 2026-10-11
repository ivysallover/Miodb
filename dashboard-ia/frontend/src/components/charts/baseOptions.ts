import { ChartBuildContext } from './types';
import { fmtNum, fmtAxis, truncate } from './helpers';

export function createBaseOptions(ctx: ChartBuildContext) {
  const {
    payload,
    dataset,
    palette,
    resolvedXAxisType,
    resolvedYAxisType,
  } = ctx;

  const { layoutDirectives } = payload;

  const valueAxisFormatter = (value: any) => fmtAxis(value);
  const categoryAxisFormatter = (value: any, hc: boolean, maxLen: number) =>
    hc ? truncate(String(value), maxLen) : String(value);
  // A series of a few months reads by day ("5 ene"); a longer one by month ("ene 25"). Labelling a
  // short series by month only repeats the same label tick after tick.
  const times = (dataset.source || []).map((r: any) => new Date(r?.[dataset.dimensions?.[0]]).getTime()).filter((t: number) => Number.isFinite(t));
  const spanDays = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 86_400_000 : Infinity;
  const timeAxisFormatter = (value: any) => {
    const d = new Date(value);
    return spanDays <= 150
      ? d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      : d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
  };

  const xFormatter = (value: any) => {
    if (resolvedXAxisType === 'value' || resolvedXAxisType === 'log') return valueAxisFormatter(value);
    if (resolvedXAxisType === 'time') return timeAxisFormatter(value);
    return categoryAxisFormatter(value, layoutDirectives.highCardinality, 10);
  };
  const yFormatter = (value: any) => {
    if (resolvedYAxisType === 'value' || resolvedYAxisType === 'log') return valueAxisFormatter(value);
    if (resolvedYAxisType === 'time') return timeAxisFormatter(value);
    return categoryAxisFormatter(value, layoutDirectives.highCardinality, 16);
  };

  const isLegendChart = ['FanChart', 'Scatter', 'BoxPlot', 'LineChart'].includes(layoutDirectives.chartType);

  const baseOptions: any = {
    dataset: dataset,
    textStyle: {
      color: palette.text,
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    },
    grid: {
      containLabel: true,
      left: 16,
      right: 28,
      top: 24,
      bottom: isLegendChart ? 48 : 28,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: palette.tooltipBg,
      borderColor: palette.border,
      borderWidth: 1,
      textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
      valueFormatter: (value: any) => {
        if (value == null) return '-';
        if (typeof value === 'number') return fmtNum(value, 2);
        return String(value);
      },
    },
    xAxis: {
      type: resolvedXAxisType,
      scale: resolvedXAxisType === 'value' || resolvedXAxisType === 'log',
      axisLine: { lineStyle: { color: palette.border, width: 1 } },
      axisTick: { lineStyle: { color: palette.border } },
      splitLine: { lineStyle: { color: palette.splitLine } },
      axisLabel: {
        hideOverlap: true,
        color: palette.text,
        fontWeight: 600,
        fontSize: 11,
        formatter: xFormatter,
      },
    },
    yAxis: {
      type: resolvedYAxisType,
      scale: resolvedYAxisType === 'value' || resolvedYAxisType === 'log',
      axisLine: { lineStyle: { color: palette.border, width: 1 } },
      axisTick: { lineStyle: { color: palette.border } },
      splitLine: { lineStyle: { color: palette.splitLine } },
      axisLabel: {
        hideOverlap: true,
        color: palette.text,
        fontWeight: 600,
        fontSize: 11,
        formatter: yFormatter,
      },
    },
    series: [],
  };

  return baseOptions;
}
