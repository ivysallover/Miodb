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
