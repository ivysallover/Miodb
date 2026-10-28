import { describe, expect, it } from 'vitest';
import { plainCleaning } from '@/components/dashboard/limpieza';

describe('la limpieza en palabras de negocio', () => {
  it('traduce lo que escriben los motores y saca lo que no le importa a quien lee', () => {
    // Lo que devolvió el motor con el ejemplo de la app.
    const actions = [
      "Locale detectado: es-AR (decimal: ',', miles: '.', dayfirst: True).",
      "Columna 'monto': convertida de moneda/porcentaje a float64 usando separador decimal ','.",
      "Columna 'fecha': parseada como fecha con dayfirst=True (30 fechas potencialmente ambiguas tratadas con dayfirst=True).",
      "Columna 'unidades': 8 nulos imputados con la mediana (9.0).",
      "Columna 'segmento': 1 nulos imputados con la moda ('Mayorista').",
      'Se eliminaron 12 filas duplicadas exactas.',
      'Se optimizó memoria mediante downcasting selectivo en 2 columnas continuas no-sensibles (columnas monetarias e IDs blindadas en float64).',
      'Un paso nuevo que todavía no tiene traducción.',
    ];
    expect(plainCleaning(actions)).toEqual([
      'Leí los números con coma para los decimales y punto para los miles, y las fechas como día/mes/año.',
      'En «monto» saqué el signo $ (o %) y los puntos de miles, para poder sumarla.',
      '«fecha» se leyó como fecha (día/mes/año); 30 podían leerse de dos maneras y tomé el día primero.',
      '«unidades» tenía 8 celdas vacías: las completé con el valor del medio (9).',
      '«segmento» tenía 1 celda vacía: la completé con el valor más común («Mayorista»).',
      'Saqué 12 filas repetidas (iguales en todo).',
      'Un paso nuevo que todavía no tiene traducción.',
    ]);
  });
});
