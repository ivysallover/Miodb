import { ChartBuildContext } from '../types';

export function buildRadar(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette, seriesColors } = ctx;

  baseOptions.xAxis = { show: false };
  baseOptions.yAxis = { show: false };
  baseOptions.grid = undefined;
  baseOptions.tooltip = {
    trigger: 'item',
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
  };
  const indicators = dataset.dimensions.slice(1).map((dim: string) => ({ name: String(dim) }));
  const radarData = dataset.source.map((row: any) => ({
    name: String(row._segment),
    value: dataset.dimensions.slice(1).map((dim: string) => row[dim]),
  }));
  baseOptions.radar = {
    indicator: indicators,
    shape: 'polygon',
    splitNumber: 5,
    axisName: { color: palette.text, fontWeight: 700, fontSize: 12 },
    splitLine: { lineStyle: { color: palette.splitLine } },
    splitArea: {
      show: true,
      areaStyle: {
        color: ctx.isDark
          ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)']
          : ['rgba(250,250,252,0.6)', 'rgba(230,230,240,0.4)'],
      },
    },
  };
  baseOptions.series = [{
    type: 'radar',
    data: radarData.map((d: any, idx: number) => ({
      ...d,
      itemStyle: { color: seriesColors[idx % seriesColors.length] },
      lineStyle: { color: seriesColors[idx % seriesColors.length], width: 2 },
      areaStyle: { color: seriesColors[idx % seriesColors.length], opacity: 0.12 },
      emphasis: {
        lineStyle: { width: 4, shadowBlur: 10, shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 17, 17, 0.35)' },
        areaStyle: { opacity: 0.4 },
      },
    })),
  }];
  baseOptions.legend = { show: true, bottom: 2, left: 'center', textStyle: { fontWeight: 700, fontSize: 12, color: palette.text } };
}
