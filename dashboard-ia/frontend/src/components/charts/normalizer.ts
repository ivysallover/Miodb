import { ChartSchema } from '@/types/analysis';

/**
 * Multi-format adapter for ChartSchema payloads (modern and legacy backends).
 */
export function normalizeChartPayload(raw: any): ChartSchema | null {
  if (!raw) return null;

  const actual = (raw.dataset || raw.chart_data || raw.chartData || raw.labels || raw.segments || raw.normal)
    ? raw
    : (raw.chartData || raw.chart_data || raw);
  if (!actual) return null;

  const rawDirectives = actual.layoutDirectives || actual.layout_directives;
  const rawDataset = actual.dataset;
  const rawMetadata = actual.metadata;

  // 1. Modern ChartSchema format (camelCase or snake_case)
  if (rawDataset && (rawDirectives || actual.dimensions)) {
    const chartType = rawDirectives?.chartType || rawDirectives?.chart_type || 'HorizontalBar';
    return {
      chartId: actual.chartId || actual.chart_id || `chart-${Math.random().toString(36).substring(7)}`,
      metadata: {
        title: rawMetadata?.title || actual.title || '',
        insightSubtitle: rawMetadata?.insightSubtitle || rawMetadata?.insight_subtitle || actual.description || '',
        sourceMetric: rawMetadata?.sourceMetric || rawMetadata?.source_metric || '',
      },
      layoutDirectives: {
        chartType,
        xAxisType: rawDirectives?.xAxisType || rawDirectives?.x_axis_type || (chartType === 'HorizontalBar' ? 'value' : 'category'),
        yAxisType: rawDirectives?.yAxisType || rawDirectives?.y_axis_type || (chartType === 'HorizontalBar' ? 'category' : 'value'),
        isLogScale: Boolean(rawDirectives?.isLogScale ?? rawDirectives?.is_log_scale),
        hasTimeGaps: Boolean(rawDirectives?.hasTimeGaps ?? rawDirectives?.has_time_gaps),
        highCardinality: Boolean(rawDirectives?.highCardinality ?? rawDirectives?.high_cardinality),
        showConfidenceBands: Boolean(rawDirectives?.showConfidenceBands ?? rawDirectives?.show_confidence_bands),
        ...(rawDirectives?.trendline ? { trendline: rawDirectives.trendline } : {}),
      },
      dataset: {
        dimensions: rawDataset.dimensions || [],
        source: Array.isArray(rawDataset.source) ? rawDataset.source : [],
      },
    };
  }

  // 2. Legacy Anomalies format
  const normalObj = actual.normal || actual.chart_data?.normal;
  if (normalObj) {
    const normal = actual.normal || actual.chart_data.normal;
    const anomalies = actual.anomalies || actual.chart_data?.anomalies || { x: [], y: [] };
    const xDim = actual.x_label || 'x';
    const yDim = actual.y_label || 'y';
    const source: any[] = [];
    (normal.x || []).forEach((v: any, i: number) => source.push({ [xDim]: v, [yDim]: (normal.y || [])[i], _anomaly: 1 }));
    (anomalies.x || []).forEach((v: any, i: number) => source.push({ [xDim]: v, [yDim]: (anomalies.y || [])[i], _anomaly: -1 }));
    return {
      chartId: actual.chart_id || 'anomalies_scatter',
      metadata: { title: actual.title || 'Deteccion de Anomalias', insightSubtitle: actual.description || 'Puntos atipicos detectados respecto al comportamiento historico', sourceMetric: yDim },
      layoutDirectives: { chartType: 'Scatter', xAxisType: 'value', yAxisType: 'value', isLogScale: false, hasTimeGaps: false, highCardinality: false, showConfidenceBands: false },
      dataset: { dimensions: [xDim, yDim, '_anomaly'], source },
    };
  }

  // 3. Legacy Segmentation Scatter format
  const segObj = actual.segments || actual.chart_data?.segments;
  if (segObj) {
    const segments = actual.segments || actual.chart_data.segments;
    const source: any[] = [];
    Object.entries(segments).forEach(([segName, coords]: [string, any]) => {
      (coords?.x || []).forEach((v: any, i: number) => source.push({ _pca1: v, _pca2: (coords?.y || [])[i], _segment: segName }));
    });
    return {
      chartId: actual.chart_id || 'segmentation_scatter',
      metadata: { title: actual.title || 'Segmentacion de Grupos (Clusters)', insightSubtitle: actual.description || 'Agrupacion por similitud de comportamiento multidimensional', sourceMetric: '_pca1' },
      layoutDirectives: { chartType: 'Scatter', xAxisType: 'value', yAxisType: 'value', isLogScale: false, hasTimeGaps: false, highCardinality: false, showConfidenceBands: false },
      dataset: { dimensions: ['_pca1', '_pca2', '_segment'], source },
    };
  }

  // 4. Legacy Radar format
  const radarMetrics = actual.metrics || actual.chart_data?.metrics;
  const radarDatasets = actual.datasets || actual.chart_data?.datasets;
  if (radarMetrics && radarDatasets) {
    const source: any[] = [];
    if (!Array.isArray(radarDatasets)) {
      Object.entries(radarDatasets).forEach(([segName, vals]: [string, any]) => {
        const row: any = { _segment: segName };
        radarMetrics.forEach((m: string, idx: number) => { row[m] = Array.isArray(vals) ? vals[idx] : 0; });
        source.push(row);
      });
    } else {
      radarDatasets.forEach((ds: any) => {
        const row: any = { _segment: ds.label || ds.name || 'Segmento' };
        (ds.data || []).forEach((v: any, idx: number) => { row[radarMetrics[idx]] = v ?? 0; });
        source.push(row);
      });
    }
    return {
      chartId: actual.chart_id || 'segmentation_radar',
      metadata: { title: actual.title || actual.chart_data?.title || 'Perfil Multidimensional', insightSubtitle: actual.description || actual.chart_data?.description || 'Comparativa promedio de variables clave', sourceMetric: radarMetrics[0] || 'valor' },
      layoutDirectives: { chartType: 'Radar', xAxisType: 'category', yAxisType: 'value', isLogScale: false, hasTimeGaps: false, highCardinality: false, showConfidenceBands: false },
      dataset: { dimensions: ['_segment', ...radarMetrics], source },
    };
  }

  // 5. Legacy Chart.js format
  const chartData = actual.chart_data || actual.chartData || actual;
  if (chartData && chartData.labels && Array.isArray(chartData.datasets)) {
    const labels: string[] = chartData.labels || [];
    const ds = chartData.datasets[0] || { data: [], label: 'Valor' };
    const metricName = ds.label || 'Valor';
    const chartTypeRaw = String(chartData.type || actual.type || 'bar').toLowerCase();
    let chartType: any = 'HorizontalBar';
    if (chartTypeRaw.includes('line')) chartType = 'LineChart';
    else if (chartTypeRaw.includes('doughnut') || chartTypeRaw.includes('pie') || chartTypeRaw.includes('donut')) chartType = 'Donut';
    else if (chartTypeRaw.includes('scatter')) chartType = 'Scatter';
    else if (chartTypeRaw.includes('box')) chartType = 'BoxPlot';
    const source = labels.map((lbl, idx) => ({ categoria: String(lbl), [metricName]: ds.data[idx] ?? 0 }));
    return {
      chartId: actual.chart_id || actual.chartId || `chart-${Math.random().toString(36).substring(7)}`,
      metadata: { title: actual.title || chartData.title || '', insightSubtitle: actual.description || chartData.description || '', sourceMetric: metricName },
      layoutDirectives: { chartType, xAxisType: chartType === 'HorizontalBar' ? 'value' : 'category', yAxisType: chartType === 'HorizontalBar' ? 'category' : 'value', isLogScale: false, hasTimeGaps: false, highCardinality: labels.length > 5, showConfidenceBands: false },
      dataset: { dimensions: ['categoria', metricName], source },
    };
  }

  return null;
}
