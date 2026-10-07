import { ChartBuildContext } from '../types';
import { fmtNum, smartDecimals } from '../helpers';

export function buildTornado(baseOptions: any, ctx: ChartBuildContext) {
  const { dataset, palette, isColorblind } = ctx;
  const td0 = dataset.dimensions[0];
  const td1 = dataset.dimensions[1];
  const tv0 = dataset.source[0] ? dataset.source[0][td0] : null;
  const tIsD0Num = typeof tv0 === 'number';
  const tnumD = tIsD0Num ? td0 : td1;
  const tcatD = tIsD0Num ? td1 : td0;

  const dec = smartDecimals(dataset.source.map((r: any) => r[tnumD]));
  baseOptions.grid = { containLabel: true, left: 16, right: 52, top: 24, bottom: 28 };
  baseOptions.tooltip = {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: palette.tooltipBg,
    borderColor: palette.border,
    borderWidth: 2,
    textStyle: { color: palette.tooltipText, fontWeight: 'bold', fontSize: 12 },
    formatter: (params: any[]) => {
      if (!params || !params.length) return '';
      const p = params[0];
      const cat = p.name || (Array.isArray(p.value) ? p.value[1] : '');
      const rawVal = Array.isArray(p.value) ? p.value[0] : (p.value?.[tnumD] ?? p.value ?? 0);
      return `<div style="font-weight:bold;margin-bottom:2px;color:${palette.tooltipText};">${cat}</div><div style="color:${palette.tooltipText};">Atribución (SHAP): <b>${fmtNum(rawVal, 2)}</b></div>`;
    },
  };

  const tornadoData = (dataset?.source || []).map((row: any) => {
    const rawVal = row[tnumD];
    const val = typeof rawVal === 'number' ? rawVal : Number(rawVal) || 0;
    const isPos = val >= 0;
    const barColor = isColorblind
      ? (isPos ? '#ffe500' : '#0033bb')
      : (isPos ? (ctx.isDark ? '#bdf559' : palette.violet) : '#ff6b6b');

    return {
      value: [val, row[tcatD]],
      itemStyle: {
        color: barColor,
        borderColor: ctx.isDark ? '#000000' : palette.black,
        borderWidth: 2,
        borderRadius: isPos ? [0, 4, 4, 0] : [4, 0, 0, 4],
      },
      label: {
        show: true,
        position: isPos ? 'right' : 'left',
        fontWeight: 'bold',
        fontSize: 11,
        color: palette.text,
        formatter: () => fmtNum(val, dec),
      },
    };
  });

  baseOptions.series = [{
    type: 'bar',
    barMaxWidth: 36,
    barCategoryGap: '28%',
    data: tornadoData,
    emphasis: {
      itemStyle: {
        borderColor: palette.black,
        borderWidth: 2.5,
        shadowBlur: 14,
        shadowColor: 'rgba(17, 17, 17, 0.45)',
        shadowOffsetX: 4,
        shadowOffsetY: 4,
      },
    },
  }];
}
