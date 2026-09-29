import { ChartBuildContext } from '../types';
import { fmtNum } from '../helpers';

export function buildDonut(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette } = ctx;

  baseOptions.xAxis = { show: false };
  baseOptions.yAxis = { show: false };
  baseOptions.grid = undefined;
  baseOptions.tooltip = {
    trigger: 'item',
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (params: any) => {
      const val = params.value ? params.value[dataset.dimensions[1]] : params.value;
      const percent = params.percent !== undefined ? ` (${params.percent.toFixed(1)}%)` : '';
      return `<b style="color:${palette.tooltipText};">${params.name}</b>: <span style="color:${palette.tooltipText};">${fmtNum(val, 1)}${percent}</span>`;
    },
  };
  const hasLegend = dataset.source.length <= 10;
  baseOptions.legend = {
    show: hasLegend,
    bottom: 4,
    left: 'center',
    itemGap: 14,
    textStyle: { fontWeight: 700, fontSize: 12, color: palette.text },
  };
  baseOptions.series = [{
    type: 'pie',
    radius: ['38%', '72%'],
    center: ['50%', hasLegend ? '44%' : '50%'],
    avoidLabelOverlap: true,
    itemStyle: { borderColor: ctx.isDark ? '#0e0c19' : palette.black, borderWidth: 2 },
    label: {
      show: dataset.source.length <= 8,
      formatter: '{b}\n{d}%',
      fontWeight: 700,
      fontSize: 12,
      color: palette.text,
    },
    emphasis: {
      scale: true,
      scaleSize: 8,
      label: { show: true, fontSize: 14, fontWeight: 'bold' },
      itemStyle: {
        borderColor: ctx.isDark ? '#ffffff' : palette.black,
        borderWidth: 2.5,
        shadowBlur: 14,
        shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 17, 17, 0.45)',
        shadowOffsetX: 4,
        shadowOffsetY: 4,
      },
    },
    encode: { itemName: dataset.dimensions[0], value: dataset.dimensions[1] },
  }];
}
