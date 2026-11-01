import { describe, expect, it } from 'vitest';
import { firstCompare, headline } from '@/components/escritorio/Comparar';
import { firstPivot } from '@/components/escritorio/TablaDinamica';
import type { CompareSide, Comparison, Fields } from '@/components/escritorio/desktop';

const side = (valor: string, suma: number | null, filas = 10): CompareSide => ({ valor, filas, parte: 0.5, suma, promedio: null, mediana: null, minimo: null, maximo: null });
const of = (a: CompareSide, b: CompareSide, objetivo: string | null = 'ventas'): Comparison => ({ columna: 'zona', objetivo, a, b, tiempo: null, numeros: [], diferencias: [] });

describe('la frase de una comparación', () => {
  it('dice quién tiene más y cuánto, sea cual sea el orden', () => {
    expect(headline(of(side('Norte', 120), side('Sur', 100)))).toBe('Norte tiene 20 % más de ventas que Sur.');
    expect(headline(of(side('Sur', 100), side('Norte', 120)))).toBe('Norte tiene 20 % más de ventas que Sur.');
    expect(headline(of(side('Norte', 500), side('Sur', 100)))).toBe('Norte tiene 5,0 veces más ventas que Sur.');
  });
  it('no inventa un porcentaje sobre cero ni corona a nadie por un pelo', () => {
    expect(headline(of(side('Norte', 100), side('Sur', 100.5)))).toBe('Norte y Sur tienen casi lo mismo de ventas.');
    expect(headline(of(side('Norte', 100), side('Sur', 0)))).toBe('Norte tiene 100 de ventas y Sur, 0.');
    expect(headline(of(side('Norte', 100), side('Sur', -20)))).toBe('Norte tiene 100 de ventas y Sur, -20.');
  });
  it('sin un número para mirar, compara filas', () => {
    expect(headline(of(side('Norte', null, 30), side('Sur', null, 20), null))).toBe('Norte tiene 50 % más de filas que Sur.');
  });
});

const fields: Fields = {
  filas: 30,
  columnas: [
    { nombre: 'fecha', tipo: 'fecha', desde: '2025-01-01', hasta: '2025-12-31' },
    { nombre: 'zona', tipo: 'categórica', valores: [['Norte', 20], ['Sur', 10]] },
    { nombre: 'unidades', tipo: 'numérica' },
    { nombre: 'ventas', tipo: 'numérica' },
  ],
};

describe('lo que se ve al entrar', () => {
  it('la tabla va por mes, sobre lo que se analiza', () => {
    expect(firstPivot(fields, 'ventas')).toEqual({ filas: 'fecha', columnas: '', valor: 'ventas', calculo: 'suma', periodo: 'mes' });
    expect(firstPivot(fields)?.valor).toBe('unidades');
  });
  it('la comparación toma los dos grupos con más filas', () => {
    expect(firstCompare(fields, 'ventas')).toEqual({ columna: 'zona', a: 'Norte', b: 'Sur', objetivo: 'ventas' });
    expect(firstCompare({ filas: 1, columnas: [fields.columnas[3]] })).toBeNull();
    const codes: Fields = { filas: 9, columnas: [{ nombre: 'cliente_id', tipo: 'categórica', valores: [['1', 5], ['2', 4]] }, { nombre: 'archivo', tipo: 'categórica', valores: [['a.csv', 5], ['b.csv', 4]] }, { nombre: 'zona', tipo: 'categórica', valores: [['Norte', 5], ['Sur', 4]] }] };
    expect(firstCompare(codes)?.columna).toBe('zona');
  });
  it('sin grupos, no hay tabla', () => {
    expect(firstPivot({ filas: 1, columnas: [{ nombre: 'ventas', tipo: 'numérica' }] })).toBeNull();
  });
});
