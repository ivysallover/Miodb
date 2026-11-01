import { describe, expect, it } from 'vitest';
import type { Overview } from '@/components/escritorio/desktop';
import { categoryColumns, day, edaFindings, firstCategories, firstNumbers, heaviestGroup, month, monthStats } from '@/components/escritorio/panorama';
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

  it('con un número principal, dice en qué valor está la mayor parte, no solo las filas', () => {
    const columnas = [{ nombre: 'zona', tipo: 'categórica', vacios: 0, distintos: 2, valores: { comunes: [['Sur', 8], ['Norte', 2]], resto: 0, lista: [['Sur', 8, 100], ['Norte', 2, 300]] } }];
    const conMonto = { ...o, relaciones: null, columnas, principal: { columna: 'monto', total: 400 } } as unknown as Overview;
    expect(edaFindings(conMonto)[0]).toMatchObject({ tag: 'Dónde está', big: '75 %', text: 'de monto está en Norte, según «zona».' });
    expect(heaviestGroup({ ...conMonto, principal: { columna: 'monto', total: 0 } })).toBeNull();
  });

  it('de entrada muestra lo que se lee de un vistazo, no todas las columnas', () => {
    const cat = (nombre: string, distintos: number, vacios = 0) => ({ nombre, tipo: 'categórica', vacios, distintos, valores: { comunes: [['a', 5]], resto: 0 } });
    const num = (nombre: string, vacios = 0) => ({ nombre, tipo: 'numérica', vacios, distintos: 9, numeros: {} });
    const big = { ...o, filas: 100, principal: { columna: 'monto', total: 1 }, columnas: [
      cat('zona', 4), cat('cliente', 5000), cat('promo', 5, 80), cat('archivo', 3), ...Array.from({ length: 10 }, (_, i) => cat(`c${i}`, 3)),
      num('unidades'), num('otro', 50), num('monto', 90),
    ] } as unknown as Overview;
    const cats = firstCategories(big).map((c) => c.nombre);
    expect(cats).toHaveLength(6);
    expect(cats).not.toContain('cliente');
    expect(cats).not.toContain('promo');
    expect(cats).not.toContain('archivo');
    expect(firstNumbers(big).map((c) => c.nombre)).toEqual(['monto', 'unidades']);
  });

  it('no destaca lo que es casi todo igual, y lo raro sale de lo que se revisó fila por fila', () => {
    const cat = (nombre: string, distintos: number, top: number) => ({ nombre, tipo: 'categórica', vacios: 0, distintos, valores: { comunes: [['a', top]], resto: 0, lista: [['a', top, top]] } });
    const big = { ...o, filas: 100, relaciones: null, principal: { columna: 'monto', total: 100 }, columnas: [cat('puesto', 2, 99), cat('zona', 4, 40), cat('marca', 8, 20)], problemas: [{ columna: 'precio', tipo: 'lejos', filas: 7, texto: 'Hay 7 raros.' }, { columna: 'cantidad', tipo: 'negativo', filas: 3, texto: 'Hay 3.' }] } as unknown as Overview;
    expect(firstCategories(big).map((c) => c.nombre)).toEqual(['marca', 'zona']);
    const f = edaFindings(big);
    expect(f[0]).toMatchObject({ tag: 'Dónde está', big: '40 %' });
    expect(f.find((x) => x.tag === 'Para revisar')).toMatchObject({ big: '10', text: 'valores fuera de lo normal en 2 columnas.', detail: 'Hay 7 raros.' });
  });

  it('del tiempo saca el mejor mes, el peor y cómo cerró', () => {
    expect(monthStats([['2025-01', 100], ['2025-02', 50], ['2025-03', 75]])).toEqual({ best: ['2025-01', 100], worst: ['2025-02', 50], last: ['2025-03', 75], change: 0.5 });
    expect(monthStats([['2025-01', 0], ['2025-02', 50]])?.change).toBeNull();
    expect(monthStats([['2025-01', 100]])).toBeNull();
  });

  it('ordena las categorías de la más concentrada a la menos, con el archivo de origen al final', () => {
    const names = categoryColumns(o).map((c) => c.nombre);
    expect(names.slice(0, 2)).toEqual(['segmento', 'ciudad']);
    expect(names[names.length - 1]).toBe('archivo');
    expect([day('2025-03-07'), month('2025-03')]).toEqual(['7/3/2025', 'mar 2025']);
  });
});
