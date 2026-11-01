import { describe, expect, it } from 'vitest';
import { hasOwnOrder } from '../../dashboard-ia/frontend/src/components/charts/helpers';

describe('qué grupos tienen un orden propio', () => {
  it('respeta los meses, los días, los trimestres, los años, las fechas y los rangos', () => {
    for (const labels of [
      ['Enero', 'Febrero', 'Marzo'], ['ene 2025', 'feb 2025'], ['Lunes', 'Martes', 'Miércoles'], ['T1 2025', 'T2 2025'], ['Q3', 'Q4'],
      ['2023', '2024'], ['01/02/2025', '02/02/2025'], ['0 - 10', '10 - 20'], ['100 a 200', '200 a 300'],
    ]) expect(hasOwnOrder(labels), labels.join()).toBe(true);
  });

  it('ordena por valor lo que solo es un nombre o un código', () => {
    for (const labels of [
      ['Norte', 'Sur'], ['1', '2', '3', '10'], ['CAF-5', 'ALF-1'], ['Marta', 'Domingo Pérez'], ['Enero', 'Sucursal Norte'], ['Mayorista', 'Minorista'], [],
    ]) expect(hasOwnOrder(labels), labels.join()).toBe(false);
  });
});
