import { describe, it, expect } from 'vitest';
import { hydrateProjectAnalysis } from '@/utils/projectAnalysisHydrator';

const real = { upload_id: 'u1', filename: 'ventas.csv', profile: { n_rows: 182 }, kpis: {}, charts: [] };

describe('hydrateProjectAnalysis', () => {
  it('returns the real analysis of a project, wherever it is held', () => {
    expect(hydrateProjectAnalysis({ id: 'u1', data: real })).toBe(real);
    expect(hydrateProjectAnalysis(real)).toBe(real);
  });

  it('returns null, and invents nothing, when the project has no saved result', () => {
    expect(hydrateProjectAnalysis(null)).toBeNull();
    expect(hydrateProjectAnalysis({ id: 'x', title: 'Ventas Trimestrales Retail 2026' })).toBeNull();
    expect(hydrateProjectAnalysis({ id: 'proj-1', title: 'ventas.csv', records: '14,200 filas' })).toBeNull();
  });

  it('drops the analysis older versions made up, even when a browser kept it', () => {
    const invented = { ...real, forecast: { metrics: { motor: 'LightGBM + Prophet AutoML', precisionPct: 97.2 } } };
    expect(hydrateProjectAnalysis({ id: 'proj-demo-1', data: invented })).toBeNull();
    expect(hydrateProjectAnalysis({ id: 'abc', data: invented })).toBeNull();
    expect(hydrateProjectAnalysis(invented)).toBeNull();
  });
});
