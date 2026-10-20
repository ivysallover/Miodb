/**
 * Text as people read it. The analysis engine writes titles and subtitles without accents and
 * with raw column names ("Relacion ... entre altitude_mean_meters y avg_temp_c"); this is the
 * one place that turns them into readable Spanish for both dashboard views.
 */

/** "acidity_score" → "acidity score": column names as people read them. */
export const pretty = (s: any): string => String(s ?? '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

// Unaccented word → the way it is written. Matched as whole words, case kept.
const WORDS: Record<string, string> = {
  relacion: 'relación', correlacion: 'correlación', correlaciones: 'correlaciones', distribucion: 'distribución',
  dispersion: 'dispersión', segmentacion: 'segmentación', evolucion: 'evolución', prediccion: 'predicción',
  proyeccion: 'proyección', deteccion: 'detección', atribucion: 'atribución', variacion: 'variación',
  concentracion: 'concentración', participacion: 'participación', informacion: 'información',
  anomalia: 'anomalía', anomalias: 'anomalías', atipico: 'atípico', atipicos: 'atípicos', atipica: 'atípica', atipicas: 'atípicas',
  categoria: 'categoría', categorias: 'categorías', mayoria: 'mayoría', mas: 'más', tambien: 'también', segun: 'según',
  maximo: 'máximo', minimo: 'mínimo', periodo: 'período', ultimo: 'último', ultimos: 'últimos', numero: 'número',
  analisis: 'análisis', grafico: 'gráfico', graficos: 'gráficos', metrica: 'métrica', metricas: 'métricas',
  estadistica: 'estadística', linea: 'línea', debil: 'débil', tipico: 'típico', tipica: 'típica',
  lidera: 'va primero',
};
const WORD_RE = new RegExp(`\\b(${Object.keys(WORDS).join('|')})\\b`, 'gi');

/** Readable title or sentence: no underscores, accents back, decimal comma, no stray quotes. */
export const tidy = (s: any): string =>
  pretty(s)
    .replace(WORD_RE, (m) => {
      const to = WORDS[m.toLowerCase()];
      return m[0] === m[0].toUpperCase() ? to.charAt(0).toUpperCase() + to.slice(1) : to;
    })
    .replace(/(\d)\.(\d)/g, '$1,$2')
    .replace(/['‘’]/g, '');

/**
 * Un porcentaje para leer: entero desde 10, con un decimal debajo. Un valor que no es 100 nunca se
 * escribe "100" ni uno que no es 0 se escribe "0" (99,7 % y 0,3 % suman 100; "100 %" y "0,3 %" no):
 * en esos bordes se suman decimales, hasta tres.
 */
export const pct = (x: number) => {
  const a = Math.abs(x);
  const shown = (d: number) => Math.round(a * 10 ** d) / 10 ** d;
  let d = a < 10 ? 1 : 0;
  while (d < 3 && a !== 0 && ((shown(d) === 100 && a !== 100) || shown(d) === 0)) d++;
  return a.toLocaleString('es-AR', { maximumFractionDigits: d });
};
