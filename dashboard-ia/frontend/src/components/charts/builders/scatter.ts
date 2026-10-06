import { ChartBuildContext } from '../types';
import { fmtNum } from '../helpers';

export function buildScatter(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, payload, palette } = ctx;
  const { layoutDirectives } = payload;

  if (dataset.dimensions.includes('_segment')) {
    const segments = Array.from(new Set(dataset.source.map((s: any) => s._segment)));
    const segColors = [palette.violet, palette.teal, palette.amber, palette.emerald, palette.red, palette.black];
    baseOptions.dataset = undefined;
    baseOptions.tooltip = {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: palette.black,
      borderWidth: 2,
      textStyle: { color: palette.black, fontWeight: 'bold', fontSize: 12 },
      formatter: (params: any) => {
        const pt = params.data || [];
        return `<div style="font-weight:900;margin-bottom:3px;">${params.seriesName}</div>
          <div>PC1: <b>${typeof pt[0] === 'number' ? pt[0].toFixed(3) : pt[0]}</b></div>
          <div>PC2: <b>${typeof pt[1] === 'number' ? pt[1].toFixed(3) : pt[1]}</b></div>`;
      },
    };
    baseOptions.series = segments.map((seg, idx) => ({
      name: String(seg),
      type: 'scatter',
      data: dataset.source.filter((s: any) => s._segment === seg).map((s: any) => [
        s._pca1 != null ? s._pca1 : s[dataset.dimensions[0]],
        s._pca2 != null ? s._pca2 : s[dataset.dimensions[1]],
      ]),
      symbolSize: 8,
      itemStyle: {
        color: segColors[idx % segColors.length],
        borderColor: palette.black,
        borderWidth: 1.5,
        opacity: 0.82,
      },
      emphasis: {
        scale: 1.6,
        itemStyle: {
          borderColor: ctx.isDark ? '#ffffff' : palette.black,
          borderWidth: 2.5,
          shadowBlur: 10,
          shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 17, 17, 0.4)',
          opacity: 1,
        },
      },
    }));
    baseOptions.legend = { show: true, bottom: 4, left: 'center', textStyle: { fontWeight: 700, fontSize: 12, color: palette.text } };

  } else if (dataset.dimensions.includes('_anomaly')) {
    const xDim = dataset.dimensions[0];
    const yDim = dataset.dimensions[1];
    const isTimeAxis = layoutDirectives.xAxisType === 'time';
    baseOptions.dataset = undefined;
    // Plain wheel scrolls the page; zooming the chart needs Ctrl/Cmd, so charts never trap the scroll.
  baseOptions.dataZoom = [{ type: 'inside', filterMode: 'none', zoomOnMouseWheel: 'ctrl', moveOnMouseWheel: false, preventDefaultMouseMove: false }];
    baseOptions.tooltip = {
      trigger: 'item',
      backgroundColor: palette.tooltipBg,
      borderColor: palette.border,
      borderWidth: 2,
      textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
      formatter: (params: any) => {
        const pt = params.data || [];
        const xVal = pt[0];
        const yVal = pt[1];
        const isAnom = params.seriesName === 'Anomalia';
        const dotColor = isAnom ? palette.red : palette.violet;
        const statusLabel = isAnom ? 'ANOMALIA DETECTADA' : 'REGISTRO NORMAL';
        let dateDisplay = String(xVal ?? '');
        if (isTimeAxis && xVal) {
          const d = new Date(xVal);
          if (!isNaN(d.getTime())) dateDisplay = d.toLocaleString('es-ES', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        return `<div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid ${palette.border};padding-bottom:3px;color:${palette.tooltipText};">${dateDisplay}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dotColor};"></span>
            <span style="font-weight:bold;color:${dotColor};font-size:11px;">${statusLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;gap:14px;color:${palette.tooltipText};"><span>${yDim}:</span><b>${typeof yVal === 'number' ? fmtNum(yVal, 2) : yVal}</b></div>`;
      },
    };
    baseOptions.legend = { show: true, bottom: 6, left: 'center', itemGap: 20, data: ['Normal', 'Anomalia'], textStyle: { fontWeight: 700, fontSize: 12, color: palette.text } };
    baseOptions.series = [
      {
        name: 'Normal', type: 'scatter',
        data: dataset.source.filter((s: any) => s._anomaly === 1).map((s: any) => [s[xDim], s[yDim]]),
        symbolSize: 6,
        itemStyle: { color: 'rgba(129,90,225,0.45)', borderColor: palette.violet, borderWidth: 1 },
        emphasis: {
          scale: 1.6,
          itemStyle: {
            color: palette.violet,
            borderColor: ctx.isDark ? '#ffffff' : palette.black,
            borderWidth: 2,
            shadowBlur: 10,
            shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 17, 17, 0.4)',
          },
        },
      },
      {
        name: 'Anomalia', type: 'scatter',
        data: dataset.source.filter((s: any) => s._anomaly === -1).map((s: any) => [s[xDim], s[yDim]]),
        symbolSize: 12,
        itemStyle: { color: palette.red, borderColor: ctx.isDark ? '#ffffff' : palette.black, borderWidth: 2 },
        emphasis: {
          scale: 1.5,
          itemStyle: {
            color: '#ff3b30',
            borderColor: ctx.isDark ? '#ffffff' : palette.black,
            borderWidth: 2.5,
            shadowBlur: 14,
            shadowColor: 'rgba(255, 59, 48, 0.6)',
          },
        },
        z: 10,
      },
    ];

  } else {
    const xDim = dataset.dimensions[0];
    const yDim = dataset.dimensions[1];
    const trend = (layoutDirectives as any)?.trendline;
    baseOptions.dataset = undefined;
    baseOptions.tooltip = {
      trigger: 'item',
      backgroundColor: palette.tooltipBg,
      borderColor: palette.border,
      borderWidth: 2,
      textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
      formatter: (params: any) => {
        if (params.seriesType === 'line') return `<b style="color:${palette.tooltipText};">Linea de tendencia</b>`;
        const pt = params.data || [];
        return `<div style="font-weight:bold;margin-bottom:3px;color:${palette.tooltipText};">${xDim}: ${typeof pt[0] === 'number' ? fmtNum(pt[0], 2) : pt[0]}</div>
          <div style="color:${palette.tooltipText};">${yDim}: <b>${typeof pt[1] === 'number' ? fmtNum(pt[1], 2) : pt[1]}</b></div>`;
      },
    };
    const seriesList: any[] = [{
      name: 'Observaciones', type: 'scatter',
      data: dataset.source.map((row: any) => [row[xDim], row[yDim]]),
      symbolSize: 7,
      itemStyle: { color: 'rgba(129,90,225,0.6)', borderColor: palette.violet, borderWidth: 1.5 },
      emphasis: {
        scale: 1.8,
        itemStyle: {
          color: palette.violet,
          borderColor: ctx.isDark ? '#ffffff' : palette.black,
          borderWidth: 2,
          shadowBlur: 12,
          shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 17, 17, 0.45)',
        },
      },
    }];
    if (trend?.min_x != null && trend?.max_x != null) {
      const y1 = trend.slope * trend.min_x + trend.intercept;
      const y2 = trend.slope * trend.max_x + trend.intercept;
      seriesList.push({
        name: 'Tendencia', type: 'line',
        data: [[trend.min_x, Number(y1.toFixed(3))], [trend.max_x, Number(y2.toFixed(3))]],
        showSymbol: false,
        lineStyle: { color: palette.text, width: 3, type: 'solid' },
        z: 20,
      });
    }
    baseOptions.series = seriesList;
  }
}
