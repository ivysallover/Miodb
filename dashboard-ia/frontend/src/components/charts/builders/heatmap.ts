import { ChartBuildContext } from '../types';
import { fmtNum, truncate } from '../helpers';

export function buildCorrelationHeatmap(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette } = ctx;

  // source format: [{x: 'Col A', y: 'Col B', value: 0.85}, ...]
  const xs = Array.from(new Set(dataset.source.map((r: any) => r.x))) as string[];
  const ys = Array.from(new Set(dataset.source.map((r: any) => r.y))) as string[];
  // Use [xIndex, yIndex, value] numeric format so ECharts never loses the value on hover
  const heatData = dataset.source.map((r: any) => [
    xs.indexOf(r.x),
    ys.indexOf(r.y),
    typeof r.value === 'number' ? r.value : null,
  ]);

  // Compute actual value range for proper color scaling
  const heatValues = dataset.source.map((r: any) => r.value).filter((v: any) => typeof v === 'number');
  const heatMin = heatValues.length > 0 ? Math.min(...heatValues) : -1;
  const heatMax = heatValues.length > 0 ? Math.max(...heatValues) : 1;
  // Symmetric around 0 for correlation matrices, but dynamic for other heatmaps
  const isCorrelation = heatMin >= -1.01 && heatMax <= 1.01;
  const vmMin = isCorrelation ? -1 : heatMin;
  const vmMax = isCorrelation ? 1 : heatMax;

  baseOptions.dataset = undefined;
  baseOptions.grid = { containLabel: true, left: 16, right: 100, top: 24, bottom: xs.length > 6 ? 56 : 40 };
  baseOptions.xAxis = {
    type: 'category',
    data: xs,
    position: 'bottom',
    axisLine: { lineStyle: { color: palette.border, width: 2 } },
    axisTick: { show: false },
    splitArea: {
      show: true,
      areaStyle: {
        color: ctx.isDark
          ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
          : ['rgba(250,250,252,0.5)', 'rgba(243,244,246,0.5)'],
      },
    },
    axisLabel: {
      rotate: xs.length > 5 ? 35 : 0,
      fontWeight: 700,
      fontSize: xs.length > 10 ? 9 : 11,
      color: palette.text,
      formatter: (v: any) => truncate(String(v), xs.length > 8 ? 8 : 14),
    },
  };
  baseOptions.yAxis = {
    type: 'category',
    data: ys,
    axisLine: { lineStyle: { color: palette.border, width: 2 } },
    axisTick: { show: false },
    splitArea: {
      show: true,
      areaStyle: {
        color: ctx.isDark
          ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
          : ['rgba(250,250,252,0.5)', 'rgba(243,244,246,0.5)'],
      },
    },
    axisLabel: {
      fontWeight: 700,
      fontSize: ys.length > 10 ? 9 : 11,
      color: palette.text,
      formatter: (v: any) => truncate(String(v), ys.length > 8 ? 9 : 16),
    },
  };
  baseOptions.visualMap = {
    min: vmMin,
    max: vmMax,
    calculable: true,
    orient: 'vertical',
    right: 8,
    top: 'center',
    itemWidth: 14,
    itemHeight: 130,
    text: [isCorrelation ? '+1.0' : fmtNum(vmMax), isCorrelation ? '-1.0' : fmtNum(vmMin)],
    textStyle: { fontWeight: 700, fontSize: 10, color: palette.text },
    // Blue (negative) → White (zero) → Orange (positive) — visually distinct, accessible
    inRange: {
      color: ['#3b82f6', '#93c5fd', '#e0f2fe', '#ffffff', '#fed7aa', '#fb923c', '#ea580c'],
    },
  };
  baseOptions.tooltip = {
    trigger: 'item',
    confine: true,
    showDelay: 0,
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (params: any) => {
      const rawVal = Array.isArray(params.value) ? params.value[2] : params.value;
      if (rawVal == null) return '';
      const xLabel = xs[Array.isArray(params.value) ? params.value[0] : params.dataIndex] ?? '';
      const yLabel = ys[Array.isArray(params.value) ? params.value[1] : 0] ?? '';
      const numVal = Number(rawVal);
      const absVal = Math.abs(numVal);
      let strength = 'Relación débil';
      if (absVal >= 0.7) strength = '⬛ Relación muy fuerte';
      else if (absVal >= 0.5) strength = '▪ Relación fuerte';
      else if (absVal >= 0.3) strength = '▫ Relación moderada';
      const direction = numVal >= 0 ? 'positiva' : 'negativa';
      const valColor = numVal > 0 ? '#ea580c' : numVal < 0 ? '#3b82f6' : '#6b7280';
      return `
        <div style="font-weight:900;margin-bottom:5px;border-bottom:2px solid ${palette.border};padding-bottom:3px;max-width:220px;color:${palette.tooltipText};">${xLabel} × ${yLabel}</div>
        <div style="margin-bottom:4px;color:${palette.tooltipText};">${strength} <b>${direction}</b></div>
        <div style="color:${palette.tooltipText};">Correlación: <b style="font-size:15px;color:${valColor};">${numVal.toFixed(3)}</b></div>
      `;
    },
  };
  baseOptions.series = [{
    name: 'Correlacion',
    type: 'heatmap',
    data: heatData,
    label: {
      show: xs.length <= 14,
      fontWeight: 700,
      fontSize: xs.length <= 6 ? 11 : xs.length <= 10 ? 8 : 7,
      color: (params: any) => {
        const v = Array.isArray(params.value) ? params.value[2] : (params.data?.[2] ?? 0);
        return Math.abs(Number(v)) > 0.55 ? '#ffffff' : palette.text;
      },
      formatter: (params: any) => {
        const v = Array.isArray(params.value) ? params.value[2] : (params.data?.[2] ?? 0);
        return v != null ? Number(v).toFixed(3) : '';
      },
    },
    emphasis: {
      scale: true,
      itemStyle: {
        borderColor: ctx.isDark ? '#ffffff' : palette.black,
        borderWidth: 2,
        shadowBlur: 12,
        shadowColor: ctx.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)',
      },
    },
  }];
}
