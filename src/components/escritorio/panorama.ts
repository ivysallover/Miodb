import type { Finding } from '@/components/dashboard/insights';
import { num, type Overview, type OverviewColumn } from './desktop';

/** La columna que agrega la unión de varias planillas (de qué archivo salió cada fila): no es un hallazgo. */
export const FROM_FILE = 'archivo';
/** Desde qué parte de las filas un valor "concentra" una categoría. */
const CONCENTRATED = 0.25;
/** Desde qué parte de las filas los valores lejanos merecen decirse. */
const NOTABLE_FAR = 0.01;

/** "1/1/2025" de "2025-01-01". */
export const day = (ymd: string) => ymd.split('-').reverse().map(Number).join('/');
/** "ene 2025" de "2025-01". */
export const month = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '');
};
const pct = (x: number) => num(x * 100, x < 0.1 ? 1 : 0);

export const dateColumn = (o: Overview) => o.columnas.find((c) => c.fechas);
export const numberColumns = (o: Overview) => o.columnas.filter((c) => c.numeros);
/** Las categorías, de la que más se concentra a la que menos (la del archivo de origen, al final). */
export const categoryColumns = (o: Overview) =>
  o.columnas
    .filter((c) => c.valores && c.tipo === 'categórica')
    .sort((a, b) => Number(a.nombre === FROM_FILE) - Number(b.nombre === FROM_FILE) || topShare(b, o.filas) - topShare(a, o.filas));
const topShare = (c: OverviewColumn, rows: number) => (c.valores?.comunes[0]?.[1] ?? 0) / Math.max(1, rows);

/** El valor que más pesa en el número principal, de todas las categorías (si alguno pesa de verdad). */
export function heaviestGroup(o: Overview) {
  const total = o.principal?.total ?? 0;
  if (!o.principal || total <= 0) return null;
  const options = categoryColumns(o)
    .filter((c) => c.nombre !== FROM_FILE && c.distintos >= 2 && c.valores?.lista?.length)
    .map((c) => {
      const [value, , sum] = c.valores!.lista!.reduce((a, b) => ((b[2] ?? 0) > (a[2] ?? 0) ? b : a));
      return { column: c.nombre, value, share: (sum ?? 0) / total, groups: c.distintos };
    })
    .filter((g) => g.share >= CONCENTRATED && g.share < 1);
  if (!options.length) return null;
  // Entre las que dicen algo, la que menos valores tiene se lee mejor; a igual cantidad, la que más concentra.
  const best = options.sort((a, b) => b.share - a.share)[0];
  return { ...best, target: o.principal.columna };
}

/** El mes más alto, el más bajo y cuánto cambió el último contra el anterior. */
export function monthStats(months: [string, number][]) {
  if (months.length < 2) return null;
  const best = months.reduce((a, b) => (b[1] > a[1] ? b : a));
  const worst = months.reduce((a, b) => (b[1] < a[1] ? b : a));
  const [prev, last] = months.slice(-2);
  return { best, worst, last, change: prev[1] > 0 ? last[1] / prev[1] - 1 : null };
}

/**
 * Lo que se ve de entrada en toda la planilla, en el mismo formato que los hallazgos de un análisis
 * (número grande, frase y detalle): dónde está el número principal o dónde se concentran las filas, qué números se mueven juntos, qué
 * queda lejos del resto y qué período cubre. Hasta tres, en ese orden; solo lo que los datos muestran.
 */
export function edaFindings(o: Overview): Finding[] {
  const out: Finding[] = [];

  const heavy = heaviestGroup(o);
  if (heavy) out.push({ tag: 'Dónde está', big: `${pct(heavy.share)} %`, text: `de ${heavy.target} está en ${heavy.value}, según «${heavy.column}».`, detail: `${num(heavy.groups)} valores distintos en esa columna` });

  const cat = heavy ? null : categoryColumns(o).find((c) => c.nombre !== FROM_FILE && c.distintos >= 2 && topShare(c, o.filas) >= CONCENTRATED);
  if (cat?.valores) {
    const [value] = cat.valores.comunes[0];
    out.push({ tag: 'Dónde se concentra', big: `${pct(topShare(cat, o.filas))} %`, text: `de las filas tienen ${value} en «${cat.nombre}».`, detail: `${num(cat.distintos)} valores distintos en esa columna` });
  }

  const pair = o.relaciones?.fuertes[0];
  if (pair) {
    out.push({
      tag: 'Qué se mueve junto',
      big: num(pair.r, 2),
      text: `${pair.a} y ${pair.b} ${pair.r >= 0 ? 'suben y bajan juntas' : 'van al revés: cuando una sube, la otra baja'}.`,
      detail: 'Acompañar no es causar: es una pista para mirar',
    });
  }

  const far = numberColumns(o)
    .map((c) => ({ c, n: c.numeros?.alejados ?? 0 }))
    .sort((a, b) => b.n - a.n)[0];
  if (far && far.n / Math.max(1, o.filas) >= NOTABLE_FAR) {
    out.push({
      tag: 'Para revisar',
      big: num(far.n),
      text: `${far.n === 1 ? 'fila tiene' : 'filas tienen'} «${far.c.nombre}» muy lejos del resto.`,
      detail: `El ${pct(far.n / o.filas)} % de la planilla: puede ser un error de carga o algo extraordinario`,
    });
  }

  const dates = dateColumn(o)?.fechas;
  if (dates && out.length < 3) {
    const gaps = dates.meses_vacios.length;
    out.push({
      tag: 'Cuándo',
      big: `${num(dates.meses.length)} ${dates.meses.length === 1 ? 'mes' : 'meses'}`,
      text: `de datos, del ${day(dates.desde)} al ${day(dates.hasta)}.`,
      detail: gaps ? `Faltan ${gaps === 1 ? 'un mes' : `${gaps} meses`} en el medio` : 'Sin meses vacíos en el medio',
    });
  }
  return out.slice(0, 3);
}
