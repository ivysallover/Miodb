import { ChartBuildContext } from '../types';
import { fmtNum, truncate } from '../helpers';

export function buildBoxPlot(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette } = ctx;
  const sourceRows = dataset?.source || [];
  const categories = sourceRows.map((r: any) => String(r.categoria ?? ''));
  const boxData = sourceRows.map((r: any) => r.box || []);
  const outlierPoints: [number, number][] = [];
  sourceRows.forEach((r: any, catIdx: number) => {
    if (Array.isArray(r.outliers)) {
      r.outliers.forEach((val: number) => outlierPoints.push([catIdx, val]));
    }
  });

  const valueAxisFormatter = (value: any) => fmtNum(value);

  baseOptions.dataset = undefined;
  baseOptions.grid = { containLabel: true, left: 24, right: 28, top: 30, bottom: categories.length > 5 ? 56 : 40 };
  baseOptions.xAxis = {
    type: 'category',
    data: categories,
    axisLine: { lineStyle: { color: palette.border, width: 2 } },
    axisTick: { lineStyle: { color: palette.border } },
    axisLabel: {
      interval: 0,
      rotate: categories.length > 5 ? 20 : 0,
      fontWeight: 700,
      fontSize: 11,
      color: palette.text,
      formatter: (v: any) => truncate(String(v), 16),
    },
  };
  baseOptions.tooltip = {
    trigger: 'item',
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (param: any) => {
      if (param.seriesType === 'boxplot') {
        const d = param.data || [];
        const catName = param.name || categories[param.dataIndex] || '';
        const [lo, q1, med, q3, hi] = d;
        return `
          <div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid ${palette.border};padding-bottom:3px;color:${palette.tooltipText};">${catName}</div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;color:${palette.tooltipText};"><span>Maximo Normal:</span><b>${fmtNum(hi, 2)}</b></div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;color:${palette.tooltipText};"><span>Q3 (75%):</span><b>${fmtNum(q3, 2)}</b></div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;color:${palette.violet};font-weight:900;"><span>Mediana (50%):</span><b>${fmtNum(med, 2)}</b></div>
          <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;color:${palette.tooltipText};"><span>Q1 (25%):</span><b>${fmtNum(q1, 2)}</b></div>
          <div style="display:flex;justify-content:space-between;gap:14px;color:${palette.tooltipText};"><span>Minimo Normal:</span><b>${fmtNum(lo, 2)}</b></div>
        `;
      }
      if (param.seriesType === 'scatter') {
        const pt = param.data || [];
        const catName = categories[pt[0]] || '';
        return `<div style="font-weight:900;text-transform:uppercase;margin-bottom:3px;color:${palette.tooltipText};">${catName}</div>
          <div style="color:${palette.red};font-weight:bold;">Valor Atípico: ${typeof pt[1] === 'number' ? fmtNum(pt[1], 2) : pt[1]}</div>`;
      }
      return '';
    },
  };

  // Compute Y-axis range from box whiskers only (not outliers) so boxes are readable.
  // Outliers are rendered with clip:false and remain visible above/below the axis range.
  const allHiValues = boxData.map((b: any[]) => (Array.isArray(b) && b.length >= 5 ? b[4] : null)).filter((v: unknown): v is number => typeof v === 'number');
  const allLoValues = boxData.map((b: any[]) => (Array.isArray(b) && b.length >= 5 ? b[0] : null)).filter((v: unknown): v is number => typeof v === 'number');
  const boxYMax = allHiValues.length > 0 ? Math.max(...allHiValues) : null;
  const boxYMin = allLoValues.length > 0 ? Math.min(...allLoValues) : null;

  if (boxYMax !== null && boxYMin !== null) {
    const range = boxYMax - boxYMin || 1;
    const pad = range * 0.22;
    baseOptions.yAxis = {
      type: 'value',
      min: Math.max(0, Math.floor(boxYMin - pad)),
      max: Math.ceil(boxYMax + pad * 1.5),
      axisLine: { lineStyle: { color: palette.border, width: 2 } },
      splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
      axisLabel: { fontWeight: 600, fontSize: 11, color: palette.text, formatter: valueAxisFormatter },
    };
  } else {
    baseOptions.yAxis = {
      type: 'value',
      scale: true,
      axisLine: { lineStyle: { color: palette.border, width: 2 } },
      splitLine: { lineStyle: { color: palette.splitLine, type: 'dashed' } },
      axisLabel: { fontWeight: 600, fontSize: 11, color: palette.text, formatter: valueAxisFormatter },
    };
  }

  baseOptions.series = [
    {
      name: 'Distribucion', type: 'boxplot', data: boxData,
      barMaxWidth: 50,
      itemStyle: { color: palette.lime, borderColor: ctx.isDark ? '#ffffff' : palette.black, borderWidth: 2 },
      emphasis: {
        itemStyle: {
          color: '#d4ff70',
          borderColor: ctx.isDark ? '#ffffff' : palette.black,
          borderWidth: 2.5,
          shadowBlur: 14,
          shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(17, 17, 17, 0.45)',
          shadowOffsetX: 4,
          shadowOffsetY: 4,
        },
      },
    },
  ];
  if (outlierPoints.length > 0) {
    baseOptions.series.push({
      name: 'Atipicos', type: 'scatter', data: outlierPoints,
      symbolSize: 7,
      clip: false,
      itemStyle: { color: palette.red, borderColor: ctx.isDark ? '#ffffff' : palette.black, borderWidth: 1.5, opacity: 0.85 },
      emphasis: {
        scale: 1.6,
        itemStyle: {
          color: '#ff4444',
          borderColor: ctx.isDark ? '#ffffff' : palette.black,
          borderWidth: 2,
          shadowBlur: 8,
          shadowColor: 'rgba(255, 68, 68, 0.5)',
        },
      },
      z: 15,
    });
  }
}
