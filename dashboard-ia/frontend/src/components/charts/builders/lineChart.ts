import { ChartBuildContext } from '../types';
import { fmtNum } from '../helpers';

export function buildLineChart(baseOptions: any, ctx: ChartBuildContext): boolean {
  const { dataset, payload, palette, seriesColors } = ctx;
  const { layoutDirectives } = payload;

  // ── Data viz guard: line charts imply continuity over an ordered/time axis.
  // If x-axis is not time or the source has no valid date-like strings, fall through to default.
  const xDimCheck = dataset.dimensions[0];
  const isTimeAxis = layoutDirectives.xAxisType === 'time' ||
    (dataset.source.length > 0 && /^\d{4}-\d{2}/.test(String(dataset.source[0]?.[xDimCheck] ?? '')));
  if (!isTimeAxis) return false; // fallback to vertical bar

  const xDim = dataset.dimensions[0];
  const yDims = dataset.dimensions.slice(1);
  const sourceRows = dataset?.source || [];

  const validValues = sourceRows.flatMap((row: any) =>
    yDims.map((dim: string) => {
      const val = row[dim];
      return typeof val === 'number' && !isNaN(val) ? val : null;
    }).filter((v: any): v is number => v !== null)
  );

  if (validValues.length > 0) {
    const minVal = Math.min(...validValues);
    const maxVal = Math.max(...validValues);
    const range = maxVal - minVal;
    const meanVal = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
    const isTightRange = meanVal > 0 && (range / meanVal) < 0.25;

    if (isTightRange) {
      const pad = Math.max(range * 2.5, meanVal * 0.18);
      baseOptions.yAxis = {
        ...baseOptions.yAxis,
        min: (val: any) => Math.max(0, Math.floor((val.min - pad) * 10) / 10),
        max: (val: any) => Math.ceil((val.max + pad) * 10) / 10,
        scale: true,
      };
    } else {
      const pad = Math.max(range * 0.12, 1);
      baseOptions.yAxis = {
        ...baseOptions.yAxis,
        min: (val: any) => Math.max(minVal >= 0 ? 0 : -Infinity, Math.floor((val.min - pad) * 10) / 10),
        max: (val: any) => Math.ceil((val.max + pad) * 10) / 10,
        scale: true,
      };
    }
  }

  // Bigger margins — keeps axis labels from clipping and the chart more stable
  baseOptions.grid = { containLabel: true, left: 32, right: 40, top: 32, bottom: 52 };
  baseOptions.dataZoom = [{ type: 'inside', filterMode: 'none' }];
  baseOptions.tooltip = {
    trigger: 'axis',
    axisPointer: { type: 'line', lineStyle: { color: palette.violet, width: 1.5, type: 'dashed' } },
    confine: true,
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (params: any[]) => {
      if (!params?.length) return '';
      const dateStr = (params[0].data?.[xDim]) || params[0].axisValueLabel || params[0].name || '';
      const formatted = (() => {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: '2-digit' });
        return dateStr;
      })();
      let html = `<div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid ${palette.border};padding-bottom:3px;color:${palette.tooltipText};">${formatted}</div>`;
      params.forEach((param: any) => {
        const r = param.data;
        const yCol = param.seriesName || yDims[0];
        const val = r ? (r[yCol] ?? param.value) : param.value;
        if (val != null) {
          const color = param.color || palette.violet;
          html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;color:${palette.tooltipText};">
            <span><span style="display:inline-block;width:8px;height:8px;background:${color};margin-right:6px;border-radius:1px;"></span>${yCol}:</span>
            <b>${fmtNum(val, 2)}</b>
          </div>`;
        }
      });
      return html;
    },
  };

  baseOptions.series = (yDims.length > 0 ? yDims : [dataset.dimensions[1]]).map((yCol: string, idx: number) => ({
    name: yCol,
    type: 'line',
    encode: { x: xDim, y: yCol },
    itemStyle: { color: seriesColors[idx % seriesColors.length] },
    lineStyle: { width: 2.5, color: seriesColors[idx % seriesColors.length] },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: idx === 0 ? (ctx.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.09)') : 'rgba(129,90,225,0.09)' },
          { offset: 1, color: 'rgba(24,24,27,0.00)' },
        ],
      },
    },
    // Show symbols on all points up to 150; beyond that only on hover
    showSymbol: sourceRows.length <= 150,
    symbolSize: sourceRows.length > 80 ? 4 : 6,
    smooth: sourceRows.length > 30 ? 0.1 : 0.22,
    connectNulls: !layoutDirectives.hasTimeGaps,
  }));

  if (yDims.length > 1) {
    baseOptions.legend = {
      show: true,
      bottom: 6,
      left: 'center',
      itemGap: 16,
      textStyle: { fontWeight: 700, fontSize: 12, color: palette.text },
    };
  }

  return true;
}
