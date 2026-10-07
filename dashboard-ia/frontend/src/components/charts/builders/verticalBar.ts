import { ChartBuildContext } from '../types';
import { fmtNum, smartDecimals } from '../helpers';

export function buildVerticalBar(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette } = ctx;

  const xDim = dataset.dimensions[0];
  const yDim = dataset.dimensions[1];
  // A bar's height is its value: the axis starts at zero unless the scale is logarithmic.
  if (ctx.resolvedYAxisType !== 'log') baseOptions.yAxis = { ...baseOptions.yAxis, scale: false };
  const dec = smartDecimals(dataset.source.map((r: any) => r[yDim]));
  baseOptions.grid = { containLabel: true, left: 16, right: 28, top: 28, bottom: 28 };
  baseOptions.tooltip = {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    valueFormatter: (value: any) => (typeof value === 'number' ? fmtNum(value, 2) : String(value ?? '-')),
  };
  baseOptions.series = [{
    type: 'bar',
    barMaxWidth: 60,
    barCategoryGap: '30%',
    encode: { x: xDim, y: yDim },
    itemStyle: {
      color: palette.violet,
      borderColor: ctx.isDark ? '#000000' : palette.black,
      borderWidth: 2,
      borderRadius: [3, 3, 0, 0],
    },
    emphasis: {
      itemStyle: {
        color: '#9d7bf5',
        borderColor: ctx.isDark ? '#ffffff' : palette.black,
        borderWidth: 2.5,
        shadowBlur: 14,
        shadowColor: ctx.isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(17, 17, 17, 0.45)',
        shadowOffsetX: 4,
        shadowOffsetY: 4,
      },
    },
    label: {
      show: true,
      position: 'top',
      fontWeight: 700,
      fontSize: 11,
      color: palette.text,
      formatter: (p: any) => fmtNum(p.value?.[yDim] ?? p.value, dec),
    },
  }];
}
