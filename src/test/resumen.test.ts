import { describe, expect, it } from 'vitest';
import { changesSaid, forecastSaid, summaryText, totalChange, type Summary } from '@/components/escritorio/resumen';
import type { Changes } from '@/components/escritorio/desktop';

const changes: Changes = {
  desde: 1_793_000_000,
  filas: [2490, 3534],
  total: [103_364_365.66, 141_644_867.24],
  raros: [12, 17],
  raros_nuevos: 6,
  prediccion: { frecuencia: 'Semanal', motor: 'Theta', dentro: 11, error_pct: 15.2, periodos: Array(12).fill({ fecha: '2025-07-06', real: 1, predicho: 1, abajo: 0, arriba: 2 }) },
};

describe('el resumen para la oficina', () => {
  it('cuenta lo que cambió en una frase', () => {
    expect(totalChange(changes)).toBe(37);
    expect(changesSaid(changes, 'monto')).toBe('entraron 1.044 filas nuevas y monto subió 37,0 %');
    expect(forecastSaid(changes)).toBe('acertó 11 de 12 semanas');
    // Mismo total (un cambio menor a 0,05 %): no se dice.
    expect(changesSaid({ ...changes, filas: [10, 10], total: [1000, 1000.2] }, 'monto')).toBe('las filas son las mismas');
    expect(forecastSaid({ ...changes, prediccion: null })).toBeNull();
  });

  it('arma el texto para pegar en un mail, con la empresa', () => {
    const s: Summary = {
      target: 'monto',
      filename: 'ventas.csv',
      facts: '3.534 filas · 6 columnas · calidad 100/100',
      findings: [{ tag: 'Para revisar', big: '17', text: 'registros se salen de lo normal.' }],
      changes: 'Desde el análisis anterior, entraron 1.044 filas nuevas.',
      steps: [{ title: 'Revisá los valores raros', text: 'Abrí los 17 registros marcados.' }],
    };
    const text = summaryText(s, 'Distribuidora Sur');
    expect(text.split('\n')[0]).toBe('Distribuidora Sur · monto en ventas.csv');
    expect(text).toContain('• 17 registros se salen de lo normal.');
    expect(text).toContain('1. Revisá los valores raros: Abrí los 17 registros marcados.');
    expect(text).toContain('Desde el análisis anterior');
    expect(summaryText({ ...s, changes: null, steps: [] }, '')).not.toContain('Qué hacer ahora');
  });
});
