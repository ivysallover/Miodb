import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {} }));

import { newId, pack, prepare, unpack } from '@/lib/compartir';
import { shareIdOf, sharePath } from '@/lib/compartirRuta';

const analisis = {
  target_col: 'monto',
  kpis: { Total: 1000 },
  anomalies: { metrics: { n_anomalias: 2, anomaly_records: [{ cliente: 'Kiosco 24', monto: 900 }], sample_records: [{ cliente: 'Maxi', monto: 10 }], table_columns: ['cliente', 'monto'] }, chart_data: { chart_id: 'anom' } },
};

describe('Compartir un análisis', () => {
  it('el enlace lleva un id al azar que se reconoce en la dirección', () => {
    const id = newId();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newId()).not.toBe(id);
    expect(shareIdOf(sharePath(id))).toBe(id);
    expect(shareIdOf(`${sharePath(id)}/`)).toBe(id);
    expect(shareIdOf('/compartido/corto')).toBeNull();
    expect(shareIdOf(`/compartido/${id}/otra`)).toBeNull();
    expect(shareIdOf('/dashboard')).toBeNull();
  });

  it('sin filas no sube ningún registro de la planilla, y deja lo demás', () => {
    const out = prepare(analisis, false) as typeof analisis;
    expect(JSON.stringify(out)).not.toContain('Kiosco 24');
    expect(JSON.stringify(out)).not.toContain('Maxi');
    expect(out.anomalies.metrics.n_anomalias).toBe(2);
    expect(out.anomalies.metrics.table_columns).toEqual(['cliente', 'monto']);
    expect(out.anomalies.chart_data).toEqual({ chart_id: 'anom' });
    expect(out.kpis).toEqual({ Total: 1000 });
    expect(analisis.anomalies.metrics.anomaly_records).toHaveLength(1); // el de la pantalla no se toca
    expect(prepare(analisis, true)).toBe(analisis);
    expect(prepare({ kpis: {} }, false)).toEqual({ kpis: {} });
  });

  it('comprime y vuelve a dar lo mismo', async () => {
    const big = { ...analisis, filas: Array.from({ length: 2000 }, (_, i) => ({ cliente: `Cliente ${i % 7}`, monto: i })) };
    const gz = await pack(big);
    expect(gz.length).toBeLessThan(JSON.stringify(big).length / 4);
    expect(await unpack(gz)).toEqual(big);
  });
});
