import { ChartBuildContext } from '../types';
import { fmtNum } from '../helpers';

export function buildFanChart(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette } = ctx;
  const sourceRows = dataset?.source || [];
  const validValues = sourceRows.flatMap((d: any) =>
    [d.historical, d.forecast, d.lower, d.upper].filter((v: any) => typeof v === 'number' && !isNaN(v))
  );

  if (validValues.length > 0) {
    const minVal = Math.min(...validValues);
    const maxVal = Math.max(...validValues);
    const range = maxVal - minVal;
    const meanVal = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
    const isTightRange = meanVal > 0 && (range / meanVal) < 0.25;

    if (isTightRange) {
      const pad = Math.max(range * 2.5, meanVal * 0.18);
      baseOptions.yAxis = { ...baseOptions.yAxis, min: (v: any) => Math.max(0, Math.floor((v.min - pad) * 10) / 10), max: (v: any) => Math.ceil((v.max + pad) * 10) / 10, scale: true };
    } else {
      const pad = Math.max(range * 0.12, 1);
      baseOptions.yAxis = { ...baseOptions.yAxis, min: (v: any) => Math.max(minVal >= 0 ? 0 : -Infinity, Math.floor((v.min - pad) * 10) / 10), max: (v: any) => Math.ceil((v.max + pad) * 10) / 10, scale: true };
    }
  }

  const firstForecastIdx = sourceRows.findIndex((r: any) => r.forecast != null);
  const transitionDate = firstForecastIdx >= 0 ? sourceRows[firstForecastIdx]?.date : undefined;

  // Plain wheel scrolls the page; zooming the chart needs Ctrl/Cmd, so charts never trap the scroll.
  baseOptions.dataZoom = [{ type: 'inside', filterMode: 'none', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false, preventDefaultMouseMove: false }];
  baseOptions.tooltip = {
    trigger: 'axis',
    axisPointer: { type: 'line', lineStyle: { color: palette.violet, width: 1.5, type: 'dashed' } },
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (params: any[]) => {
      if (!params?.length) return '';
      const dateStr = params[0].axisValueLabel || params[0].name;
      let html = `<div style="font-weight:700;margin-bottom:5px;padding-bottom:2px;color:${palette.tooltipText};">${dateStr}</div>`;
      const row = params[0].data;
      if (row) {
        if (row.historical != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;color:${palette.tooltipText};"><span><span style="display:inline-block;width:8px;height:8px;background:${palette.text};margin-right:6px;"></span>Histórico:</span><b>${fmtNum(row.historical, 2)}</b></div>`;
        if (row.forecast != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;color:#c4b5fd;"><span><span style="display:inline-block;width:8px;height:8px;background:#c4b5fd;margin-right:6px;"></span>Proyección:</span><b>${fmtNum(row.forecast, 2)}</b></div>`;
        if (row.lower != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;font-size:11px;color:rgba(255,255,255,0.72);margin-bottom:2px;"><span>Piso del rango:</span><b>${fmtNum(row.lower, 2)}</b></div>`;
        const upVal = row.upper ?? (row.lower != null && row.band_width != null ? row.lower + row.band_width : null);
        if (upVal != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;font-size:11px;color:rgba(255,255,255,0.72);"><span>Techo del rango:</span><b>${fmtNum(upVal, 2)}</b></div>`;
      }
      return html;
    },
  };

  baseOptions.legend = {
    show: true,
    bottom: 6,
    left: 'center',
    itemGap: 20,
    data: ['Histórico', 'Proyección', 'Rango esperado'],
    textStyle: { fontWeight: 700, fontSize: 12, color: palette.text },
  };

  baseOptions.series = [
    {
      name: 'Histórico', type: 'line', encode: { x: 'date', y: 'historical' },
      itemStyle: { color: palette.text }, lineStyle: { width: 2.5, color: palette.text },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: ctx.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.09)' }, { offset: 1, color: 'rgba(24,24,27,0.00)' }] } },
      showSymbol: false, smooth: 0.28,
    },
    {
      name: 'Proyección', type: 'line', encode: { x: 'date', y: 'forecast' },
      lineStyle: { type: 'dashed', width: 2.5, color: palette.violet },
      itemStyle: { color: palette.violet }, showSymbol: false, smooth: 0.28,
      markLine: transitionDate ? {
        symbol: ['none', 'none'], silent: true,
        lineStyle: { color: palette.violet, type: 'dashed', width: 1.5 },
        label: { show: true, position: 'insideEndTop', formatter: 'Lo que sigue', color: '#ffffff', fontWeight: 600, fontSize: 10, backgroundColor: palette.violet, borderWidth: 0, borderRadius: 6, padding: [4, 7] },
        data: [{ xAxis: transitionDate }],
      } : undefined,
    },
    {
      name: 'Piso del rango', type: 'line', encode: { x: 'date', y: 'lower' },
      lineStyle: { opacity: 0 }, showSymbol: false, stack: 'confidence-band', smooth: 0.28,
    },
    {
      name: 'Rango esperado', type: 'line', encode: { x: 'date', y: 'band_width' },
      lineStyle: { opacity: 0 }, itemStyle: { color: palette.violet },
      areaStyle: { color: palette.violet, opacity: 0.15 }, showSymbol: false, stack: 'confidence-band', smooth: 0.28,
    },
  ];
}
