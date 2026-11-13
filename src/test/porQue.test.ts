import { describe, expect, it } from 'vitest';
import { comings, explanation, headline, periodNames, priceText } from '@/components/dashboard/PorQue';
import type { VariationSchema } from '../../dashboard-ia/frontend/src/types/analysis';

const base: VariationSchema = {
  columna: 'monto',
  periodo: 'mes',
  parcial: false,
  antes: { desde: '2025-11-01', hasta: '2025-11-30', total: 1000 },
  despues: { desde: '2025-12-01', hasta: '2025-12-31', total: 880 },
  diferencia: -120,
  variacion: -0.12,
  categorias: [
    {
      nombre: 'cliente',
      distintos: 4,
      valores: [
        { valor: 'Kiosco 24', antes: 100, despues: 0, diferencia: -100, filas: [5, 0], estado: 'perdido' },
        { valor: 'Maxi Ahorro', antes: 300, despues: 250, diferencia: -50, filas: [9, 8], estado: 'sigue' },
        { valor: 'Tienda Online', antes: 0, despues: 30, diferencia: 30, filas: [0, 2], estado: 'nuevo' },
        { valor: 'Otros', antes: 600, despues: 600, diferencia: 0, filas: [20, 20], estado: null },
      ],
      nuevos: { cantidad: 1, suma: 30 },
      perdidos: { cantidad: 1, suma: -100 },
      explica: 1,
    },
  ],
  precio_cantidad: { cantidad_columna: 'unidades', producto_columna: 'producto', cantidad: -200, precio: 110, nuevos: 30, perdidos: -60, resto: 0, unidades: [100, 80], precios: 0.15 },
  anio_anterior: null,
};

describe('Por qué cambió', () => {
  it('nombra los períodos', () => {
    expect(periodNames(base)).toEqual({ after: 'diciembre', before: 'noviembre' });
    const year = { ...base, antes: { ...base.antes, desde: '2025-12-01' }, despues: { ...base.despues, desde: '2026-01-01', hasta: '2026-01-31' } };
    expect(periodNames(year)).toEqual({ after: 'enero de 2026', before: 'diciembre de 2025' });
    const partial = { ...base, parcial: true, despues: { ...base.despues, hasta: '2025-12-15' } };
    expect(headline(partial)).toBe('Del 1 al 15 de diciembre, «monto» bajó 12 % frente a los mismos días de noviembre.');
    expect(headline({ ...base, periodo: 'semana', despues: { desde: '2025-02-24', hasta: '2025-03-02', total: 1 } })).toBe('En la semana del 24/2 al 2/3, «monto» bajó 12 % frente a la semana anterior.');
  });

  it('dice cuánto cambió y de dónde sale', () => {
    expect(headline(base)).toBe('En diciembre, «monto» bajó 12 % frente a noviembre.');
    expect(headline({ ...base, variacion: 0.004, diferencia: 4 })).toBe('En diciembre, «monto» quedó casi igual que en noviembre.');
    expect(explanation(base, base.categorias[0])).toBe('Lo que más pesó, por «cliente»: Kiosco 24 (−100, ya no está) y Maxi Ahorro (−50). Entre los dos explican el 100 % de la diferencia.');
    expect(explanation({ ...base, variacion: 0, diferencia: 0 }, base.categorias[0])).toBe('Se compensó: en «cliente», Tienda Online (+30, nuevo) subió y Kiosco 24 (−100, ya no está) bajó.');
    expect(comings(base.categorias[0])).toBe('En «cliente», 1 nuevo sumó +30 y 1 que estaba ya no aparece (−100).');
  });

  it('separa precio de cantidad', () => {
    expect(priceText(base)).toEqual({ title: 'Pesó más la cantidad que el precio.', text: 'Se vendieron 20 % menos unidades y los precios subieron 15 % (en lo que se vendió en los dos períodos).', byPrice: false });
    expect(priceText({ ...base, precio_cantidad: null })).toBeNull();
  });
});
