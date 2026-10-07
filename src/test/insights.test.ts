import { describe as suite, expect, it } from 'vitest';
import { buildModel, chartEntries, describe, fmtApart, fmtDate, noForecastReason, pickFeatured, richness, summaryText, tidy, toTime, type Chart, type ChartEntry } from '@/components/dashboard/insights';

const bar = (rows: [string, number][], metric = 'ventas'): Chart => ({
  chartId: 'cmp',
  metadata: { title: 'Ventas por sucursal' },
  layoutDirectives: { chartType: 'HorizontalBar' },
  dataset: { dimensions: ['sucursal', metric], source: rows.map(([sucursal, v]) => ({ sucursal, [metric]: v })) },
});

suite('describe', () => {
  it('names the top group and the gap when groups really differ', () => {
    const i = describe(bar([['Centro', 200], ['Norte', 100], ['Sur', 150]]));
    expect(i.text).toContain('Centro');
    expect(i.big).toBe('200');
    expect(i.look).toContain('100 %');
    expect(i.rank.map((r) => r.label)).toEqual(['Centro', 'Sur', 'Norte']);
  });

  it('says there is no difference instead of crowning a winner by a hair', () => {
    const i = describe(bar([['A', 7.742], ['B', 7.751], ['C', 7.755]]));
    expect(i.text).toMatch(/Casi no hay diferencia/);
    // close values keep enough decimals to be told apart
    expect(new Set(i.rank.map((r) => r.value)).size).toBe(3);
  });

  it('reads a histogram in value order and reports the most common range', () => {
    const hist: Chart = {
      chartId: 'dist_precio',
      layoutDirectives: { chartType: 'Bar' },
      dataset: { dimensions: ['rango', 'Frecuencia'], source: [{ rango: '20 - 30', Frecuencia: 10 }, { rango: '0 - 10', Frecuencia: 30 }, { rango: '10 - 20', Frecuencia: 60 }] },
    };
    const i = describe(hist);
    expect(i.text).toBe('Lo más común es entre 10 y 20.');
    expect(i.big).toBe('60 %');
    expect(i.facts[0]).toEqual({ label: 'Va de', value: '0 a 30' });
  });

  it('reads feature importance as shares of the total weight', () => {
    const fi: Chart = { layoutDirectives: { chartType: 'HorizontalBar' }, dataset: { dimensions: ['feature', 'importance'], source: [{ feature: 'precio', importance: 3 }, { feature: 'dia', importance: 1 }] } };
    const i = describe(fi, 'importance', 'ventas');
    expect(i.text).toBe('Precio es lo que más pesa en ventas.');
    expect(i.big).toBe('75 %');
  });

  it('falls back to the plain hint when the data gives nothing to say', () => {
    const i = describe({ layoutDirectives: { chartType: 'Scatter' }, dataset: { dimensions: ['x', 'y'], source: [] } });
    expect(i.text.length).toBeGreaterThan(0);
    expect(richness(i)).toBe(0);
  });
});

suite('fmtApart', () => {
  it('adds decimals only when the values are close', () => {
    expect(fmtApart([7.742, 7.751])(7.742)).toBe('7,742');
    expect(fmtApart([10, 250])(10)).toBe('10');
  });
});

suite('buildModel', () => {
  it('states nothing that the result does not carry', () => {
    const m = buildModel({ filename: 'vacio.csv', profile: { n_rows: 10, n_cols: 2 } });
    expect(m.findings).toEqual([]);
    expect(m.steps).toEqual([]);
    expect(m.forecast).toBeNull();
    expect(chartEntries(m)).toEqual([]);
  });

  it('skips the group finding when the groups are practically equal', () => {
    const m = buildModel({ charts: [bar([['A', 7.742], ['B', 7.755]])] });
    expect(m.findings.find((f) => f.tag === 'Dónde está la diferencia')).toBeUndefined();
  });

  it('builds findings and next steps from anomalies and importance', () => {
    const m = buildModel({
      target_col: 'ventas',
      profile: { n_rows: 1000, n_cols: 5 },
      anomalies: { chart_data: { dataset: { dimensions: ['x', 'y'], source: [] } }, metrics: { n_anomalias: 20 } },
      feature_importance: { chart_importance: { layoutDirectives: { chartType: 'HorizontalBar' }, dataset: { dimensions: ['feature', 'importance'], source: [{ feature: 'precio', importance: 3 }, { feature: 'dia', importance: 1 }] } } },
    });
    expect(m.findings.map((f) => f.tag)).toEqual(['Por qué', 'Para revisar']);
    expect(m.findings[1].big).toBe('20');
    expect(m.steps.map((s) => s.title)).toEqual(['Revisá los valores raros', 'Empezá por precio']);
  });
});

suite('tidy', () => {
  it('turns engine text into readable Spanish', () => {
    expect(tidy('Relacion muy fuerte negativa de -0.94 entre altitude_mean_meters y avg_temp_c.'))
      .toBe('Relación muy fuerte negativa de -0,94 entre altitude mean meters y avg temp c.');
    expect(tidy("'Exact Duplicate' presenta la mediana mas alta")).toBe('Exact Duplicate presenta la mediana más alta');
  });
});

suite('pickFeatured', () => {
  const entry = (key: string, weight: number): ChartEntry => ({ key, chart: {}, kicker: '', title: key, insight: { text: '', facts: [], rank: [], weight } });

  it('keeps everything when there is little to cut', () => {
    const all = ['a', 'b', 'c'].map((k) => entry(k, 0.5));
    expect(pickFeatured(all)).toEqual({ featured: all, rest: [] });
  });

  it('keeps the charts with the most to tell, in their original order', () => {
    const all = [entry('flat1', 0.15), entry('trend', 0.9), entry('flat2', 0.15), entry('corr', 0.8), entry('hist', 0.5), entry('flat3', 0.15), entry('why', 0.95), entry('box', 0.4), entry('seg', 0.8)];
    const { featured, rest } = pickFeatured(all, 6);
    expect(featured.map((e) => e.key)).toEqual(['trend', 'corr', 'hist', 'why', 'box', 'seg']);
    expect(rest.map((e) => e.key)).toEqual(['flat1', 'flat2', 'flat3']);
  });
});

suite('summaryText', () => {
  it('writes the findings and the next steps as plain text', () => {
    const m = buildModel({
      target_col: 'ventas',
      profile: { n_rows: 1000, n_cols: 5 },
      anomalies: { chart_data: { dataset: { dimensions: ['x', 'y'], source: [] } }, metrics: { n_anomalias: 20 } },
    });
    const text = summaryText(m, 'ventas.csv');
    expect(text).toContain('Análisis de ventas.csv (1.000 filas, 5 columnas)');
    expect(text).toContain('• Para revisar: 20 registros se salen de lo normal: el 2 % de la planilla.');
    expect(text).toContain('1. Revisá los valores raros.');
  });

  it('says so when there is nothing to highlight', () => {
    expect(summaryText(buildModel({}), 'vacio.csv')).toContain('no encontró nada para destacar');
  });
});

suite('toTime', () => {
  it('reads a date without time as that calendar day, whatever the time zone', () => {
    expect(fmtDate(toTime('2024-12-01') as number)).toBe('01/12/2024');
    expect(fmtDate(toTime('2024-12-01T00:00:00Z') as number)).toBe('01/12/2024');
    expect(toTime('no es una fecha')).toBeNull();
  });
});

suite('noForecastReason', () => {
  it('turns the engine error into a plain reason', () => {
    expect(noForecastReason('Error matemático al calcular la proyección. Revise si hay valores atípicos extremos.')).toMatch(/saltos demasiado bruscos/);
    expect(noForecastReason(undefined)).toMatch(/prefiere decírtelo/);
  });
});
