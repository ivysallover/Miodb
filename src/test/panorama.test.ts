import { describe, expect, it } from 'vitest';
import type { Overview } from '@/components/escritorio/desktop';
import { categoryColumns, day, edaFindings, month } from '@/components/escritorio/panorama';
import ejemplo from './fixtures/vista_general_ejemplo.json';

/** La vista general del ejemplo que trae la app, como la devuelve el motor (`overview.rs`). */
const o = ejemplo as unknown as Overview;

describe('la vista general de toda la planilla', () => {
  it('saca de entrada dónde se concentran las filas, qué se mueve junto y qué revisar', () => {
    const f = edaFindings(o);
    expect(f.map((x) => x.tag)).toEqual(['Dónde se concentra', 'Qué se mueve junto', 'Para revisar']);
    // Minorista: 1.711 de 3.534 filas.
    expect(f[0].text).toBe('de las filas tienen Minorista en «segmento».');
    expect(f[0].big).toBe('48 %');
    expect(f[1].text).toBe('unidades y monto suben y bajan juntas.');
    expect(f[2].text).toMatch(/^filas tienen «(monto|unidades)» muy lejos del resto\.$/);
  });

  it('sin categorías concentradas ni relaciones, dice qué período cubre', () => {
    const plano: Overview = { ...o, relaciones: null, columnas: o.columnas.filter((c) => !c.valores && c.nombre !== 'monto' && c.nombre !== 'unidades') };
    expect(edaFindings(plano)).toEqual([{ tag: 'Cuándo', big: '12 meses', text: 'de datos, del 1/1/2025 al 31/12/2025.', detail: 'Sin meses vacíos en el medio' }]);
  });

  it('ordena las categorías de la más concentrada a la menos, con el archivo de origen al final', () => {
    const names = categoryColumns(o).map((c) => c.nombre);
    expect(names.slice(0, 2)).toEqual(['segmento', 'ciudad']);
    expect(names[names.length - 1]).toBe('archivo');
    expect([day('2025-03-07'), month('2025-03')]).toEqual(['7/3/2025', 'mar 2025']);
  });
});
