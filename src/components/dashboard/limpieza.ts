/**
 * Lo que hizo la limpieza, en palabras de negocio. Los motores (Python y Rust) escriben cada paso en
 * términos técnicos ("nulos imputados con la mediana", "downcasting") y tienen que seguir dando el mismo
 * texto entre sí; acá se traduce para mostrarlo. Lo que no le importa a quien lee (cómo se guardan los
 * números en memoria) no se muestra; un paso que no se reconoce queda tal cual.
 */

const n = (s: string) => Number(s).toLocaleString('es-AR', { maximumFractionDigits: 2 });

const RULES: [RegExp, (...m: string[]) => string | null][] = [
  [/^Locale detectado: [^ ]+ \(decimal: '(.)', miles: '(.)', dayfirst: (\w+)\)\.$/, (dec, thousands, dayfirst) =>
    `Leí los números con ${dec === ',' ? 'coma' : 'punto'} para los decimales${thousands.trim() ? ` y ${thousands === '.' ? 'punto' : 'coma'} para los miles` : ''}${dayfirst === 'True' ? ', y las fechas como día/mes/año' : ''}.`],
  [/^Columna '(.+)': convertida de moneda\/porcentaje a float64/, (col) => `En «${col}» saqué el signo $ (o %) y los puntos de miles, para poder sumarla.`],
  [/^Columna '(.+)': convertida exitosamente a numérico \(([\d.]+)% de valores parseables\)\.$/, (col, pct) =>
    `«${col}» tenía números escritos como texto: los pasé a número${Number(pct) < 100 ? ` (se pudo con el ${n(pct)} %)` : ''}.`],
  [/^Columna '(.+)': parseada como fecha con dayfirst=(\w+)(?: \((\d+) fechas potencialmente ambiguas.*\))?\.$/, (col, dayfirst, amb) =>
    `«${col}» se leyó como fecha${dayfirst === 'True' ? ' (día/mes/año)' : ''}${amb ? `; ${n(amb)} podían leerse de dos maneras y tomé el día primero` : ''}.`],
  [/^Columna '(.+)': (\d+) nulos imputados con la mediana \((.+)\)\.$/, (col, k, med) =>
    `«${col}» tenía ${n(k)} ${k === '1' ? 'celda vacía' : 'celdas vacías'}: ${k === '1' ? 'la completé' : 'las completé'} con el valor del medio (${n(med)}).`],
  [/^Columna '(.+)': (\d+) nulos imputados con la moda \('(.*)'\)\.$/, (col, k, mode) =>
    `«${col}» tenía ${n(k)} ${k === '1' ? 'celda vacía' : 'celdas vacías'}: ${k === '1' ? 'la completé' : 'las completé'} con el valor más común («${mode}»).`],
  [/^Columna '(.+)': (\d+) fechas nulas imputadas mediante forward-fill/, (col, k) => `«${col}» tenía ${n(k)} fechas vacías: les puse la de la fila anterior.`],
  [/^Columna '(.+)': (\d+) fechas nulas preservadas/, (col, k) => `«${col}» tiene ${n(k)} fechas vacías: las dejé así, porque las filas no están en orden de fecha.`],
  [/^Se eliminaron (\d+) filas duplicadas exactas\.$/, (k) => `Saqué ${n(k)} ${k === '1' ? 'fila repetida' : 'filas repetidas'} (iguales en todo).`],
  [/^Se eliminaron (\d+) filas completamente vacías\.$/, (k) => `Saqué ${n(k)} ${k === '1' ? 'fila vacía' : 'filas vacías'}.`],
  [/^Se eliminaron (\d+) columna\(s\) completamente vacías: \[(.*)\]\.$/, (k, list) => `Saqué ${k === '1' ? 'una columna vacía' : `${n(k)} columnas vacías`}: ${list}.`],
  [/^Se convirtieron (\d+) celdas con valores/, (k) => `${n(k)} celdas decían «N/A», «-» o «s/d»: las tomé como vacías.`],
  [/^Se normalizaron encabezados/, () => 'Arreglé nombres de columnas que tenían espacios de más o saltos de línea.'],
  [/^Se optimizó memoria/, () => null],
];

/** Cada paso de la limpieza, en palabras de negocio (sin los que no le dicen nada a quien lee). */
export function plainCleaning(actions: string[]): string[] {
  return actions.flatMap((a) => {
    for (const [re, say] of RULES) {
      const m = a.match(re);
      if (m) {
        const text = say(...m.slice(1));
        return text ? [text] : [];
      }
    }
    return [a];
  });
}
