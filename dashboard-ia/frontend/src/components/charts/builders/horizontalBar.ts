import { ChartBuildContext } from '../types';
import { fmtNum, hasOwnOrder, smartDecimals } from '../helpers';

export function buildHorizontalBar(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, canLog, palette } = ctx;
  const d0 = dataset.dimensions[0];
  const d1 = dataset.dimensions[1];
  const v0 = dataset.source[0] ? dataset.source[0][d0] : null;
  const isD0Num = typeof v0 === 'number';
  const numD = isD0Num ? d0 : d1;
  const catD = isD0Num ? d1 : d0;

  // Apply log to X axis when applicable
  if (canLog) {
    baseOptions.xAxis = {
      ...baseOptions.xAxis,
      type: 'log',
      logBase: 10,
      scale: true,
    };
    baseOptions.yAxis = {
      ...baseOptions.yAxis,
      type: 'category',
    };
  }

  // A bar's length is its value: the axis starts at zero unless the scale is logarithmic.
  if (!canLog) baseOptions.xAxis = { ...baseOptions.xAxis, scale: false };
  const dec = smartDecimals(dataset.source.map((r: any) => r[numD]));
  const top = Math.max(...dataset.source.map((r: any) => Number(r[numD])));

  // Groups read from largest to smallest, top to bottom (the axis draws its first row at the bottom);
  // months and the like keep their own order.
  if (!hasOwnOrder(dataset.source.map((r: any) => r[catD]))) {
    baseOptions.dataset = { ...baseOptions.dataset, source: [...dataset.source].sort((a: any, b: any) => Number(a[numD]) - Number(b[numD])) };
  }

  baseOptions.grid = { containLabel: true, left: 16, right: 56, top: 24, bottom: 28 };
  baseOptions.tooltip = {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (params: any[]) => {
      if (!params?.length) return '';
      const p = params[0];
      const row = p.data;
      const catVal = row ? row[catD] : p.name;
      const numVal = row ? row[numD] : p.value;
      return `
        <div style="font-weight:700;margin-bottom:4px;padding-bottom:2px;color:${palette.tooltipText};">${catVal}</div>
        <div style="display:flex;justify-content:space-between;gap:12px;color:${palette.tooltipText};">
          <span>${numD}:</span><b>${fmtNum(numVal, Math.max(2, dec))}</b>
        </div>
      `;
    },
  };
  baseOptions.series = [{
    type: 'bar',
    barMaxWidth: 36,
    barCategoryGap: '28%',
    itemStyle: {
      // The largest one in colour, the rest quieter: the comparison reads at a glance.
      color: (p: any) => (Number(p.value?.[numD] ?? p.value) === top ? palette.violet : `${palette.violet}66`),
      borderRadius: [0, 6, 6, 0],
    },
    emphasis: { itemStyle: { opacity: 0.85 } },
    label: {
      show: true,
      position: 'right',
      fontWeight: 'bold',
      fontSize: 11,
      color: palette.text,
      formatter: (p: any) => {
        const val = p.value ? p.value[numD] : p.value;
        return fmtNum(val, dec);
      },
    },
    encode: { x: numD, y: catD },
  }];
}
