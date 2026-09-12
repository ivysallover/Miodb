'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { neoBrutalistTheme } from '../lib/echartsNeoBrutalistTheme';

echarts.registerTheme('neo-brutalist', neoBrutalistTheme);

import { ChartSchema } from '@/types/analysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DynamicChartRendererProps {
  payload: ChartSchema;
  height?: string | number;
  onChartReady?: (instance: any, chartId: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const PALETTE = {
  violet: '#815ae1',
  lime: '#bdf559',
  black: '#111111',
  red: '#ff6b6b',
  teal: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  bg: '#fafafc',
};

const SERIES_COLORS = [PALETTE.black, PALETTE.violet, PALETTE.teal, PALETTE.emerald, PALETTE.amber];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a number with M/K suffixes for axis/label display.
 */
function fmtNum(value: any, decimals = 1): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (isNaN(n)) return String(value);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(decimals) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(decimals) + 'K';
  return Number.isInteger(n) ? n.toString() : n.toFixed(decimals);
}

/**
 * Truncate a string for axis labels.
 */
function truncate(s: string, max: number): string {
  return s.length > max ? s.substring(0, max) + '...' : s;
}

/**
 * Safe axis type resolver — CRITICAL for log scale correctness.
 * Rule: 'log' may ONLY be applied to axes of base type 'value'.
 * Category, time, and other axes are ALWAYS returned unchanged.
 */
function resolveAxisType(
  baseType: string,
  isLog: boolean,
  allPositive: boolean
): string {
  if (baseType === 'category' || baseType === 'time') return baseType;
  if (baseType === 'value' && isLog && allPositive) return 'log';
  return baseType;
}

/**
 * Returns true if every numeric value in the dataset source for the given
 * dimension is strictly greater than zero. Used to guard log scale fallback.
 */
function allValuesPositive(source: Record<string, any>[], dim: string): boolean {
  if (!source || source.length === 0) return false;
  return source.every((row) => {
    const v = row[dim];
    return typeof v === 'number' && v > 0;
  });
}

// ---------------------------------------------------------------------------
// normalizeChartPayload — multi-format adapter
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// DynamicChartRenderer — main component
// ---------------------------------------------------------------------------
export default function DynamicChartRenderer({
  payload: rawPayload,
  height = '100%',
  onChartReady,
}: DynamicChartRendererProps) {
  const echartsRef = useRef<any>(null);
  const payload = useMemo(() => normalizeChartPayload(rawPayload), [rawPayload]);

  const handleChartReady = useCallback(
    (instance: any) => {
      echartsRef.current = instance;
      if (onChartReady && payload?.chartId) {
        onChartReady(instance, payload.chartId);
      }
    },
    [onChartReady, payload?.chartId]
  );

  const safeDataset = useMemo(() => {
    if (!payload || !payload.dataset) return null;
    const ds = JSON.parse(JSON.stringify(payload.dataset));
    if (ds.source && ds.dimensions) {
      if (payload.layoutDirectives.chartType === 'FanChart') {
        ds.source.forEach((row: any) => {
          if (row.upper != null && row.lower != null && row.band_width == null) {
            row.band_width = Math.max(0, row.upper - row.lower);
          }
        });
        if (!ds.dimensions.includes('band_width')) ds.dimensions.push('band_width');
      }
      // Coerce first dimension to string for non-scatter/heatmap charts
      if (!['Scatter', 'CorrelationHeatmap'].includes(payload.layoutDirectives.chartType)) {
        ds.source.forEach((row: any) => {
          ds.dimensions.forEach((dim: string) => {
            if (typeof row[dim] === 'number' && (dim === ds.dimensions[0] || dim === 'feature' || dim === '_segment')) {
              row[dim] = String(row[dim]);
            }
          });
        });
      }
    }
    return ds;
  }, [payload]);

  const options = useMemo(() => {
    if (!payload || !safeDataset) return {};
    const { layoutDirectives } = payload;
    const dataset = safeDataset;
    const isLogScale = layoutDirectives.isLogScale;

    // --- Axis type resolution (log scale safety guard) ---
    // For HorizontalBar: values are on X, categories on Y
    // For Scatter: always use linear scale on both X and Y.
    // For all others: values are on Y, categories on X
    const isHorizontal = layoutDirectives.chartType === 'HorizontalBar' || layoutDirectives.chartType === 'Tornado';
    const isScatter = layoutDirectives.chartType === 'Scatter';

    // Pre-compute positivity for safe log scale fallback (never on Scatter)
    const numericDimForLog = isHorizontal
      ? (dataset.dimensions.find((d: string) => typeof dataset.source[0]?.[d] === 'number') || dataset.dimensions[1])
      : (dataset.dimensions[1] || '');
    const canLog = !isScatter && isLogScale && allValuesPositive(dataset.source, numericDimForLog);

    const resolvedXAxisType = resolveAxisType(
      layoutDirectives.xAxisType,
      isHorizontal ? canLog : false,   // log on X only for horizontal charts
      true
    );
    const resolvedYAxisType = resolveAxisType(
      layoutDirectives.yAxisType,
      (isHorizontal || isScatter) ? false : canLog,   // log on Y only for non-scatter vertical charts
      true
    );

    // Axis formatters
    const valueAxisFormatter = (value: any) => fmtNum(value);
    const categoryAxisFormatter = (value: any, hc: boolean, maxLen: number) =>
      hc ? truncate(String(value), maxLen) : String(value);
    const timeAxisFormatter = (value: any) => {
      const d = new Date(value);
      return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    };

    const xFormatter = (value: any) => {
      if (resolvedXAxisType === 'value' || resolvedXAxisType === 'log') return valueAxisFormatter(value);
      if (resolvedXAxisType === 'time') return timeAxisFormatter(value);
      return categoryAxisFormatter(value, layoutDirectives.highCardinality, 10);
    };
    const yFormatter = (value: any) => {
      if (resolvedYAxisType === 'value' || resolvedYAxisType === 'log') return valueAxisFormatter(value);
      if (resolvedYAxisType === 'time') return timeAxisFormatter(value);
      return categoryAxisFormatter(value, layoutDirectives.highCardinality, 16);
    };

    const isLegendChart = ['FanChart', 'Scatter', 'BoxPlot', 'LineChart'].includes(layoutDirectives.chartType);

    const baseOptions: any = {
      dataset: dataset,
      grid: {
        containLabel: true,
        left: 16,
        right: 28,
        top: 24,
        bottom: isLegendChart ? 48 : 28,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#fff',
        borderColor: PALETTE.black,
        borderWidth: 2,
        textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
        valueFormatter: (value: any) => {
          if (value == null) return '-';
          if (typeof value === 'number') return fmtNum(value, 2);
          return String(value);
        },
      },
      xAxis: {
        type: resolvedXAxisType,
        scale: resolvedXAxisType === 'value' || resolvedXAxisType === 'log',
        axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
        axisTick: { lineStyle: { color: PALETTE.black } },
        splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
        axisLabel: {
          hideOverlap: true,
          color: '#374151',
          fontWeight: 600,
          fontSize: 11,
          formatter: xFormatter,
        },
      },
      yAxis: {
        type: resolvedYAxisType,
        scale: resolvedYAxisType === 'value' || resolvedYAxisType === 'log',
        axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
        axisTick: { lineStyle: { color: PALETTE.black } },
        splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
        axisLabel: {
          hideOverlap: true,
          color: '#374151',
          fontWeight: 600,
          fontSize: 11,
          formatter: yFormatter,
        },
      },
      series: [],
    };

    // -------------------------------------------------------------------------
    // Chart-type switch
    // -------------------------------------------------------------------------
    switch (layoutDirectives.chartType) {

      // -----------------------------------------------------------------------
      case 'HorizontalBar': {
        const d0 = dataset.dimensions[0];
        const d1 = dataset.dimensions[1];
        const v0 = dataset.source[0] ? dataset.source[0][d0] : null;
        const isD0Num = typeof v0 === 'number';
        const numD = isD0Num ? d0 : d1;
        const catD = isD0Num ? d1 : d0;

        // Apply log to X axis when applicable
        if (canLog) {
          baseOptions.xAxis = {
            ...baseOptions.xAxis,
            type: 'log',
            logBase: 10,
            scale: true,
          };
          baseOptions.yAxis = {
            ...baseOptions.yAxis,
            type: 'category',
          };
        }

        baseOptions.grid = { containLabel: true, left: 16, right: 52, top: 24, bottom: 28 };
        baseOptions.tooltip = {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          formatter: (params: any[]) => {
            if (!params?.length) return '';
            const p = params[0];
            const row = p.data;
            const catVal = row ? row[catD] : p.name;
            const numVal = row ? row[numD] : p.value;
            return `
              <div style="font-weight:900;text-transform:uppercase;margin-bottom:4px;border-bottom:2px solid #111;padding-bottom:3px;">${catVal}</div>
              <div style="display:flex;justify-content:space-between;gap:12px;">
                <span>${numD}:</span><b>${fmtNum(numVal, 2)}</b>
              </div>
            `;
          },
        };
        baseOptions.series = [{
          type: 'bar',
          barMaxWidth: 36,
          barCategoryGap: '28%',
          itemStyle: {
            color: PALETTE.violet,
            borderColor: PALETTE.black,
            borderWidth: 2,
            borderRadius: [0, 3, 3, 0],
          },
          emphasis: {
            itemStyle: {
              color: PALETTE.black,
              borderColor: PALETTE.violet,
              shadowBlur: 8,
              shadowColor: 'rgba(129,90,225,0.3)',
            },
          },
          label: {
            show: true,
            position: 'right',
            fontWeight: 'bold',
            fontSize: 11,
            color: PALETTE.black,
            formatter: (p: any) => {
              const val = p.value ? p.value[numD] : p.value;
              return fmtNum(val, 1);
            },
          },
          encode: { x: numD, y: catD },
        }];
        break;
      }

      // -----------------------------------------------------------------------
      case 'Tornado': {
        const td0 = dataset.dimensions[0];
        const td1 = dataset.dimensions[1];
        const tv0 = dataset.source[0] ? dataset.source[0][td0] : null;
        const tIsD0Num = typeof tv0 === 'number';
        const tnumD = tIsD0Num ? td0 : td1;
        const tcatD = tIsD0Num ? td1 : td0;

        baseOptions.grid = { containLabel: true, left: 16, right: 52, top: 24, bottom: 28 };
        baseOptions.tooltip = {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
        };
        baseOptions.series = [{
          type: 'bar',
          barMaxWidth: 36,
          barCategoryGap: '28%',
          encode: { x: tnumD, y: tcatD },
          itemStyle: {
            color: (params: any) => {
              const val = params.value?.[tnumD] ?? params.value?.[1] ?? 0;
              return val >= 0 ? PALETTE.lime : PALETTE.red;
            },
            borderColor: PALETTE.black,
            borderWidth: 2,
            borderRadius: [0, 3, 3, 0],
          },
          label: {
            show: true,
            position: 'right',
            fontWeight: 'bold',
            fontSize: 11,
            formatter: (p: any) => {
              const val = p.value?.[tnumD] ?? 0;
              return fmtNum(val, 1);
            },
          },
        }];
        break;
      }

      // -----------------------------------------------------------------------
      case 'LineChart': {
        // ── Data viz guard: line charts imply continuity over an ordered/time axis.
        // If x-axis is not time or the source has no valid date-like strings, fall through to default.
        const xDimCheck = dataset.dimensions[0];
        const isTimeAxis = layoutDirectives.xAxisType === 'time' ||
          (dataset.source.length > 0 && /^\d{4}-\d{2}/.test(String(dataset.source[0]?.[xDimCheck] ?? '')));
        if (!isTimeAxis) break; // falls through to default (vertical bar)

        const xDim = dataset.dimensions[0];
        const yDims = dataset.dimensions.slice(1);
        const sourceRows = dataset?.source || [];

        const validValues = sourceRows.flatMap((row: any) =>
          yDims.map((dim: string) => {
            const val = row[dim];
            return typeof val === 'number' && !isNaN(val) ? val : null;
          }).filter((v: any): v is number => v !== null)
        );

        if (validValues.length > 0) {
          const minVal = Math.min(...validValues);
          const maxVal = Math.max(...validValues);
          const range = maxVal - minVal;
          const meanVal = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
          const isTightRange = meanVal > 0 && (range / meanVal) < 0.25;

          if (isTightRange) {
            const pad = Math.max(range * 2.5, meanVal * 0.18);
            baseOptions.yAxis = {
              ...baseOptions.yAxis,
              min: (val: any) => Math.max(0, Math.floor((val.min - pad) * 10) / 10),
              max: (val: any) => Math.ceil((val.max + pad) * 10) / 10,
              scale: true,
            };
          } else {
            const pad = Math.max(range * 0.12, 1);
            baseOptions.yAxis = {
              ...baseOptions.yAxis,
              min: (val: any) => Math.max(minVal >= 0 ? 0 : -Infinity, Math.floor((val.min - pad) * 10) / 10),
              max: (val: any) => Math.ceil((val.max + pad) * 10) / 10,
              scale: true,
            };
          }
        }

        // Bigger margins — keeps axis labels from clipping and the chart more stable
        baseOptions.grid = { containLabel: true, left: 32, right: 40, top: 32, bottom: 52 };
        baseOptions.dataZoom = [{ type: 'inside', filterMode: 'none' }];
        baseOptions.tooltip = {
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: PALETTE.violet, width: 1.5, type: 'dashed' } },
          confine: true,
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          formatter: (params: any[]) => {
            if (!params?.length) return '';
            const dateStr = (params[0].data?.[xDim]) || params[0].axisValueLabel || params[0].name || '';
            const formatted = (() => {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) return d.toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: '2-digit' });
              return dateStr;
            })();
            let html = `<div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid #111;padding-bottom:3px;">${formatted}</div>`;
            params.forEach((param: any) => {
              const r = param.data;
              const yCol = param.seriesName || yDims[0];
              const val = r ? (r[yCol] ?? param.value) : param.value;
              if (val != null) {
                const color = param.color || PALETTE.black;
                html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;">
                  <span><span style="display:inline-block;width:8px;height:8px;background:${color};margin-right:6px;border-radius:1px;"></span>${yCol}:</span>
                  <b>${fmtNum(val, 2)}</b>
                </div>`;
              }
            });
            return html;
          },
        };

        baseOptions.series = (yDims.length > 0 ? yDims : [dataset.dimensions[1]]).map((yCol: string, idx: number) => ({
          name: yCol,
          type: 'line',
          encode: { x: xDim, y: yCol },
          itemStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length] },
          lineStyle: { width: 2.5, color: SERIES_COLORS[idx % SERIES_COLORS.length] },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: idx === 0 ? 'rgba(24,24,27,0.09)' : 'rgba(129,90,225,0.09)' },
                { offset: 1, color: 'rgba(24,24,27,0.00)' },
              ],
            },
          },
          // Show symbols on all points up to 150; beyond that only on hover
          showSymbol: sourceRows.length <= 150,
          symbolSize: sourceRows.length > 80 ? 4 : 6,
          smooth: sourceRows.length > 30 ? 0.1 : 0.22,
          connectNulls: !layoutDirectives.hasTimeGaps,
        }));

        if (yDims.length > 1) {
          baseOptions.legend = {
            show: true,
            bottom: 6,
            left: 'center',
            itemGap: 16,
            textStyle: { fontWeight: 700, fontSize: 12, color: PALETTE.black },
          };
        }
        break;
      }


      // -----------------------------------------------------------------------
      case 'FanChart': {
        const sourceRows = dataset?.source || [];
        const validValues = sourceRows.flatMap((d: any) =>
          [d.historical, d.forecast, d.lower, d.upper].filter((v: any) => typeof v === 'number' && !isNaN(v))
        );

        if (validValues.length > 0) {
          const minVal = Math.min(...validValues);
          const maxVal = Math.max(...validValues);
          const range = maxVal - minVal;
          const meanVal = validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length;
          const isTightRange = meanVal > 0 && (range / meanVal) < 0.25;

          if (isTightRange) {
            const pad = Math.max(range * 2.5, meanVal * 0.18);
            baseOptions.yAxis = { ...baseOptions.yAxis, min: (v: any) => Math.max(0, Math.floor((v.min - pad) * 10) / 10), max: (v: any) => Math.ceil((v.max + pad) * 10) / 10, scale: true };
          } else {
            const pad = Math.max(range * 0.12, 1);
            baseOptions.yAxis = { ...baseOptions.yAxis, min: (v: any) => Math.max(minVal >= 0 ? 0 : -Infinity, Math.floor((v.min - pad) * 10) / 10), max: (v: any) => Math.ceil((v.max + pad) * 10) / 10, scale: true };
          }
        }

        const firstForecastIdx = sourceRows.findIndex((r: any) => r.forecast != null);
        const transitionDate = firstForecastIdx >= 0 ? sourceRows[firstForecastIdx]?.date : undefined;

        baseOptions.dataZoom = [{ type: 'inside', filterMode: 'none' }];
        baseOptions.tooltip = {
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: PALETTE.violet, width: 1.5, type: 'dashed' } },
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          formatter: (params: any[]) => {
            if (!params?.length) return '';
            const dateStr = params[0].axisValueLabel || params[0].name;
            let html = `<div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid #111;padding-bottom:3px;">${dateStr}</div>`;
            const row = params[0].data;
            if (row) {
              if (row.historical != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;"><span><span style="display:inline-block;width:8px;height:8px;background:#111;margin-right:6px;"></span>Historico:</span><b>${fmtNum(row.historical, 2)}</b></div>`;
              if (row.forecast != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:3px;color:${PALETTE.violet};"><span><span style="display:inline-block;width:8px;height:8px;background:${PALETTE.violet};margin-right:6px;"></span>Proyeccion:</span><b>${fmtNum(row.forecast, 2)}</b></div>`;
              if (row.lower != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;font-size:11px;color:#666;margin-bottom:2px;"><span>Limite Inferior:</span><b>${fmtNum(row.lower, 2)}</b></div>`;
              const upVal = row.upper ?? (row.lower != null && row.band_width != null ? row.lower + row.band_width : null);
              if (upVal != null) html += `<div style="display:flex;justify-content:space-between;gap:14px;font-size:11px;color:#666;"><span>Limite Superior:</span><b>${fmtNum(upVal, 2)}</b></div>`;
            }
            return html;
          },
        };

        baseOptions.legend = {
          show: true,
          bottom: 6,
          left: 'center',
          itemGap: 20,
          data: ['Historico', 'Proyeccion', 'Banda de Confianza'],
          textStyle: { fontWeight: 700, fontSize: 12, color: PALETTE.black },
        };

        baseOptions.series = [
          {
            name: 'Historico', type: 'line', encode: { x: 'date', y: 'historical' },
            itemStyle: { color: PALETTE.black }, lineStyle: { width: 2.5, color: PALETTE.black },
            areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(24,24,27,0.09)' }, { offset: 1, color: 'rgba(24,24,27,0.00)' }] } },
            showSymbol: false, smooth: 0.28,
          },
          {
            name: 'Proyeccion', type: 'line', encode: { x: 'date', y: 'forecast' },
            lineStyle: { type: 'dashed', width: 2.5, color: PALETTE.violet },
            itemStyle: { color: PALETTE.violet }, showSymbol: false, smooth: 0.28,
            markLine: transitionDate ? {
              symbol: ['none', 'none'], silent: true,
              lineStyle: { color: PALETTE.violet, type: 'dashed', width: 1.5 },
              label: { show: true, position: 'insideEndTop', formatter: 'Proyeccion IA', color: PALETTE.violet, fontWeight: 'bold', fontSize: 10, backgroundColor: '#fff', borderColor: PALETTE.violet, borderWidth: 1.5, padding: [3, 6] },
              data: [{ xAxis: transitionDate }],
            } : undefined,
          },
          {
            name: 'Limite Inferior', type: 'line', encode: { x: 'date', y: 'lower' },
            lineStyle: { opacity: 0 }, showSymbol: false, stack: 'confidence-band', smooth: 0.28,
          },
          {
            name: 'Banda de Confianza', type: 'line', encode: { x: 'date', y: 'band_width' },
            lineStyle: { opacity: 0 }, itemStyle: { color: PALETTE.violet },
            areaStyle: { color: PALETTE.violet, opacity: 0.15 }, showSymbol: false, stack: 'confidence-band', smooth: 0.28,
          },
        ];
        break;
      }

      // -----------------------------------------------------------------------
      case 'Scatter': {
        if (dataset.dimensions.includes('_segment')) {
          const segments = Array.from(new Set(dataset.source.map((s: any) => s._segment)));
          const segColors = [PALETTE.violet, PALETTE.teal, PALETTE.amber, PALETTE.emerald, PALETTE.red, PALETTE.black];
          baseOptions.dataset = undefined;
          baseOptions.tooltip = {
            trigger: 'item',
            backgroundColor: '#fff',
            borderColor: PALETTE.black,
            borderWidth: 2,
            textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
            formatter: (params: any) => {
              const pt = params.data || [];
              return `<div style="font-weight:900;margin-bottom:3px;">${params.seriesName}</div>
                <div>PC1: <b>${typeof pt[0] === 'number' ? pt[0].toFixed(3) : pt[0]}</b></div>
                <div>PC2: <b>${typeof pt[1] === 'number' ? pt[1].toFixed(3) : pt[1]}</b></div>`;
            },
          };
          baseOptions.series = segments.map((seg, idx) => ({
            name: String(seg),
            type: 'scatter',
            data: dataset.source.filter((s: any) => s._segment === seg).map((s: any) => [
              s._pca1 != null ? s._pca1 : s[dataset.dimensions[0]],
              s._pca2 != null ? s._pca2 : s[dataset.dimensions[1]],
            ]),
            symbolSize: 8,
            itemStyle: {
              color: segColors[idx % segColors.length],
              borderColor: PALETTE.black,
              borderWidth: 1.5,
              opacity: 0.82,
            },
          }));
          baseOptions.legend = { show: true, bottom: 4, left: 'center', textStyle: { fontWeight: 700, fontSize: 12, color: PALETTE.black } };

        } else if (dataset.dimensions.includes('_anomaly')) {
          const xDim = dataset.dimensions[0];
          const yDim = dataset.dimensions[1];
          const isTimeAxis = layoutDirectives.xAxisType === 'time';
          baseOptions.dataset = undefined;
          baseOptions.dataZoom = [{ type: 'inside', filterMode: 'none' }];
          baseOptions.tooltip = {
            trigger: 'item',
            backgroundColor: '#fff',
            borderColor: PALETTE.black,
            borderWidth: 2,
            textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
            formatter: (params: any) => {
              const pt = params.data || [];
              const xVal = pt[0];
              const yVal = pt[1];
              const isAnom = params.seriesName === 'Anomalia';
              const dotColor = isAnom ? PALETTE.red : PALETTE.violet;
              const statusLabel = isAnom ? 'ANOMALIA DETECTADA' : 'REGISTRO NORMAL';
              let dateDisplay = String(xVal ?? '');
              if (isTimeAxis && xVal) {
                const d = new Date(xVal);
                if (!isNaN(d.getTime())) dateDisplay = d.toLocaleString('es-ES', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
              }
              return `<div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid #111;padding-bottom:3px;">${dateDisplay}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dotColor};"></span>
                  <span style="font-weight:bold;color:${dotColor};font-size:11px;">${statusLabel}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:14px;"><span>${yDim}:</span><b>${typeof yVal === 'number' ? fmtNum(yVal, 2) : yVal}</b></div>`;
            },
          };
          baseOptions.legend = { show: true, bottom: 6, left: 'center', itemGap: 20, data: ['Normal', 'Anomalia'], textStyle: { fontWeight: 700, fontSize: 12, color: PALETTE.black } };
          baseOptions.series = [
            {
              name: 'Normal', type: 'scatter',
              data: dataset.source.filter((s: any) => s._anomaly === 1).map((s: any) => [s[xDim], s[yDim]]),
              symbolSize: 6,
              itemStyle: { color: 'rgba(129,90,225,0.45)', borderColor: PALETTE.violet, borderWidth: 1 },
            },
            {
              name: 'Anomalia', type: 'scatter',
              data: dataset.source.filter((s: any) => s._anomaly === -1).map((s: any) => [s[xDim], s[yDim]]),
              symbolSize: 12,
              itemStyle: { color: PALETTE.red, borderColor: PALETTE.black, borderWidth: 2 },
              z: 10,
            },
          ];

        } else {
          const xDim = dataset.dimensions[0];
          const yDim = dataset.dimensions[1];
          const trend = (layoutDirectives as any)?.trendline;
          baseOptions.dataset = undefined;
          baseOptions.tooltip = {
            trigger: 'item',
            backgroundColor: '#fff',
            borderColor: PALETTE.black,
            borderWidth: 2,
            textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
            formatter: (params: any) => {
              if (params.seriesType === 'line') return `<b>Linea de tendencia</b>`;
              const pt = params.data || [];
              return `<div style="font-weight:bold;margin-bottom:3px;">${xDim}: ${typeof pt[0] === 'number' ? fmtNum(pt[0], 2) : pt[0]}</div>
                <div>${yDim}: <b>${typeof pt[1] === 'number' ? fmtNum(pt[1], 2) : pt[1]}</b></div>`;
            },
          };
          const seriesList: any[] = [{
            name: 'Observaciones', type: 'scatter',
            data: dataset.source.map((row: any) => [row[xDim], row[yDim]]),
            symbolSize: 7,
            itemStyle: { color: 'rgba(129,90,225,0.6)', borderColor: PALETTE.violet, borderWidth: 1.5 },
          }];
          if (trend?.min_x != null && trend?.max_x != null) {
            const y1 = trend.slope * trend.min_x + trend.intercept;
            const y2 = trend.slope * trend.max_x + trend.intercept;
            seriesList.push({
              name: 'Tendencia', type: 'line',
              data: [[trend.min_x, Number(y1.toFixed(3))], [trend.max_x, Number(y2.toFixed(3))]],
              showSymbol: false,
              lineStyle: { color: PALETTE.black, width: 3, type: 'solid' },
              z: 20,
            });
          }
          baseOptions.series = seriesList;
        }
        break;
      }

      // -----------------------------------------------------------------------
      case 'Radar': {
        baseOptions.xAxis = { show: false };
        baseOptions.yAxis = { show: false };
        baseOptions.grid = undefined;
        baseOptions.tooltip = {
          trigger: 'item',
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
        };
        const indicators = dataset.dimensions.slice(1).map((dim: string) => ({ name: String(dim) }));
        const radarData = dataset.source.map((row: any) => ({
          name: String(row._segment),
          value: dataset.dimensions.slice(1).map((dim: string) => row[dim]),
        }));
        baseOptions.radar = {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 5,
          axisName: { color: PALETTE.black, fontWeight: 700, fontSize: 12 },
          splitLine: { lineStyle: { color: '#e5e7eb' } },
          splitArea: { show: true, areaStyle: { color: ['rgba(250,250,252,0.6)', 'rgba(230,230,240,0.4)'] } },
        };
        baseOptions.series = [{
          type: 'radar',
          data: radarData.map((d: any, idx: number) => ({
            ...d,
            itemStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length] },
            lineStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length], width: 2 },
            areaStyle: { color: SERIES_COLORS[idx % SERIES_COLORS.length], opacity: 0.12 },
          })),
        }];
        baseOptions.legend = { show: true, bottom: 2, left: 'center', textStyle: { fontWeight: 700, fontSize: 12, color: PALETTE.black } };
        break;
      }

      // -----------------------------------------------------------------------
      case 'Donut': {
        baseOptions.xAxis = { show: false };
        baseOptions.yAxis = { show: false };
        baseOptions.grid = undefined;
        baseOptions.tooltip = {
          trigger: 'item',
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          formatter: (params: any) => {
            const val = params.value ? params.value[dataset.dimensions[1]] : params.value;
            const percent = params.percent !== undefined ? ` (${params.percent.toFixed(1)}%)` : '';
            return `<b>${params.name}</b>: ${fmtNum(val, 1)}${percent}`;
          },
        };
        const hasLegend = dataset.source.length <= 10;
        baseOptions.legend = {
          show: hasLegend,
          bottom: 4,
          left: 'center',
          itemGap: 14,
          textStyle: { fontWeight: 700, fontSize: 12, color: PALETTE.black },
        };
        baseOptions.series = [{
          type: 'pie',
          radius: ['38%', '72%'],
          center: ['50%', hasLegend ? '44%' : '50%'],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: PALETTE.black, borderWidth: 2 },
          label: {
            show: dataset.source.length <= 8,
            formatter: '{b}\n{d}%',
            fontWeight: 700,
            fontSize: 12,
            color: PALETTE.black,
          },
          labelLine: { show: dataset.source.length <= 8, length: 12, length2: 8 },
          emphasis: { label: { show: true, fontSize: 15, fontWeight: 'bold' }, scaleSize: 5 },
          encode: { itemName: dataset.dimensions[0], value: dataset.dimensions[1] },
        }];
        break;
      }

      // -----------------------------------------------------------------------
      case 'BoxPlot': {
        const sourceRows = dataset?.source || [];
        const categories = sourceRows.map((r: any) => String(r.categoria ?? ''));
        const boxData = sourceRows.map((r: any) => r.box || []);
        const outlierPoints: [number, number][] = [];
        sourceRows.forEach((r: any, catIdx: number) => {
          if (Array.isArray(r.outliers)) {
            r.outliers.forEach((val: number) => outlierPoints.push([catIdx, val]));
          }
        });

        baseOptions.dataset = undefined;
        baseOptions.grid = { containLabel: true, left: 24, right: 28, top: 30, bottom: categories.length > 5 ? 56 : 40 };
        baseOptions.xAxis = {
          type: 'category',
          data: categories,
          axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
          axisTick: { lineStyle: { color: PALETTE.black } },
          axisLabel: {
            interval: 0,
            rotate: categories.length > 5 ? 20 : 0,
            fontWeight: 700,
            fontSize: 11,
            color: '#1f2937',
            formatter: (v: any) => truncate(String(v), 16),
          },
        };
        baseOptions.yAxis = {
          type: 'value',
          scale: true,
          axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
          splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
          axisLabel: {
            fontWeight: 600,
            fontSize: 11,
            color: '#374151',
            formatter: valueAxisFormatter,
          },
        };
        baseOptions.tooltip = {
          trigger: 'item',
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          formatter: (param: any) => {
            if (param.seriesType === 'boxplot') {
              const d = param.data || [];
              const catName = param.name || categories[param.dataIndex] || '';
              const [lo, q1, med, q3, hi] = d;
              return `
                <div style="font-weight:900;text-transform:uppercase;margin-bottom:5px;border-bottom:2px solid #111;padding-bottom:3px;">${catName}</div>
                <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;"><span>Maximo Normal:</span><b>${fmtNum(hi, 2)}</b></div>
                <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;"><span>Q3 (75%):</span><b>${fmtNum(q3, 2)}</b></div>
                <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;color:${PALETTE.violet};font-weight:900;"><span>Mediana (50%):</span><b>${fmtNum(med, 2)}</b></div>
                <div style="display:flex;justify-content:space-between;gap:14px;margin-bottom:2px;"><span>Q1 (25%):</span><b>${fmtNum(q1, 2)}</b></div>
                <div style="display:flex;justify-content:space-between;gap:14px;"><span>Minimo Normal:</span><b>${fmtNum(lo, 2)}</b></div>
              `;
            }
            if (param.seriesType === 'scatter') {
              const pt = param.data || [];
              const catName = categories[pt[0]] || '';
              return `<div style="font-weight:900;text-transform:uppercase;margin-bottom:3px;">${catName}</div>
                <div style="color:${PALETTE.red};font-weight:bold;">Valor Atípico: ${typeof pt[1] === 'number' ? fmtNum(pt[1], 2) : pt[1]}</div>`;
            }
            return '';
          },
        };

        // Compute Y-axis range from box whiskers only (not outliers) so boxes are readable.
        // Outliers are rendered with clip:false and remain visible above/below the axis range.
        const allHiValues = boxData.map((b: any[]) => (Array.isArray(b) && b.length >= 5 ? b[4] : null)).filter((v: unknown): v is number => typeof v === 'number');
        const allLoValues = boxData.map((b: any[]) => (Array.isArray(b) && b.length >= 5 ? b[0] : null)).filter((v: unknown): v is number => typeof v === 'number');
        const boxYMax = allHiValues.length > 0 ? Math.max(...allHiValues) : null;
        const boxYMin = allLoValues.length > 0 ? Math.min(...allLoValues) : null;

        if (boxYMax !== null && boxYMin !== null) {
          const range = boxYMax - boxYMin || 1;
          const pad = range * 0.22;
          baseOptions.yAxis = {
            type: 'value',
            min: Math.max(0, Math.floor(boxYMin - pad)),
            max: Math.ceil(boxYMax + pad * 1.5),
            axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
            splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
            axisLabel: { fontWeight: 600, fontSize: 11, color: '#374151', formatter: valueAxisFormatter },
          };
        } else {
          baseOptions.yAxis = {
            type: 'value',
            scale: true,
            axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
            splitLine: { lineStyle: { color: '#e5e7eb', type: 'dashed' } },
            axisLabel: { fontWeight: 600, fontSize: 11, color: '#374151', formatter: valueAxisFormatter },
          };
        }

        baseOptions.series = [
          {
            name: 'Distribucion', type: 'boxplot', data: boxData,
            barMaxWidth: 50,
            itemStyle: { color: PALETTE.lime, borderColor: PALETTE.black, borderWidth: 2 },
            emphasis: { itemStyle: { color: '#a8ef6a', borderColor: PALETTE.violet, borderWidth: 2.5, shadowBlur: 10, shadowColor: 'rgba(129,90,225,0.25)' } },
          },
        ];
        if (outlierPoints.length > 0) {
          baseOptions.series.push({
            name: 'Atipicos', type: 'scatter', data: outlierPoints,
            symbolSize: 7,
            clip: false,
            itemStyle: { color: PALETTE.red, borderColor: PALETTE.black, borderWidth: 1.5, opacity: 0.85 },
            z: 15,
          });
        }
        break;
      }

      // -----------------------------------------------------------------------
      case 'CorrelationHeatmap': {
        // source format: [{x: 'Col A', y: 'Col B', value: 0.85}, ...]
        const xs = Array.from(new Set(dataset.source.map((r: any) => r.x))) as string[];
        const ys = Array.from(new Set(dataset.source.map((r: any) => r.y))) as string[];
        // Use [xIndex, yIndex, value] numeric format so ECharts never loses the value on hover
        const heatData = dataset.source.map((r: any) => [
          xs.indexOf(r.x),
          ys.indexOf(r.y),
          typeof r.value === 'number' ? r.value : null,
        ]);

        // Compute actual value range for proper color scaling
        const heatValues = dataset.source.map((r: any) => r.value).filter((v: any) => typeof v === 'number');
        const heatMin = heatValues.length > 0 ? Math.min(...heatValues) : -1;
        const heatMax = heatValues.length > 0 ? Math.max(...heatValues) : 1;
        // Symmetric around 0 for correlation matrices, but dynamic for other heatmaps
        const isCorrelation = heatMin >= -1.01 && heatMax <= 1.01;
        const vmMin = isCorrelation ? -1 : heatMin;
        const vmMax = isCorrelation ? 1 : heatMax;

        baseOptions.dataset = undefined;
        baseOptions.grid = { containLabel: true, left: 16, right: 100, top: 24, bottom: xs.length > 6 ? 56 : 40 };
        baseOptions.xAxis = {
          type: 'category',
          data: xs,
          position: 'bottom',
          axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
          axisTick: { show: false },
          splitArea: { show: true, areaStyle: { color: ['rgba(250,250,252,0.5)', 'rgba(243,244,246,0.5)'] } },
          axisLabel: {
            rotate: xs.length > 5 ? 35 : 0,
            fontWeight: 700,
            fontSize: xs.length > 10 ? 9 : 11,
            color: PALETTE.black,
            formatter: (v: any) => truncate(String(v), xs.length > 8 ? 8 : 14),
          },
        };
        baseOptions.yAxis = {
          type: 'category',
          data: ys,
          axisLine: { lineStyle: { color: PALETTE.black, width: 2 } },
          axisTick: { show: false },
          splitArea: { show: true, areaStyle: { color: ['rgba(250,250,252,0.5)', 'rgba(243,244,246,0.5)'] } },
          axisLabel: {
            fontWeight: 700,
            fontSize: ys.length > 10 ? 9 : 11,
            color: PALETTE.black,
            formatter: (v: any) => truncate(String(v), ys.length > 8 ? 9 : 16),
          },
        };
        baseOptions.visualMap = {
          min: vmMin,
          max: vmMax,
          calculable: true,
          orient: 'vertical',
          right: 8,
          top: 'center',
          itemWidth: 14,
          itemHeight: 130,
          text: [isCorrelation ? '+1.0' : fmtNum(vmMax), isCorrelation ? '-1.0' : fmtNum(vmMin)],
          textStyle: { fontWeight: 700, fontSize: 10, color: PALETTE.black },
          // Blue (negative) → White (zero) → Orange (positive) — visually distinct, accessible
          inRange: {
            color: ['#3b82f6', '#93c5fd', '#e0f2fe', '#ffffff', '#fed7aa', '#fb923c', '#ea580c'],
          },
        };
        baseOptions.tooltip = {
          trigger: 'item',
          confine: true,
          showDelay: 0,
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          formatter: (params: any) => {
            // Use params.value (robust) which is [xIdx, yIdx, val] in numeric format
            const rawVal = Array.isArray(params.value) ? params.value[2] : params.value;
            if (rawVal == null) return '';
            const xLabel = xs[Array.isArray(params.value) ? params.value[0] : params.dataIndex] ?? '';
            const yLabel = ys[Array.isArray(params.value) ? params.value[1] : 0] ?? '';
            const numVal = Number(rawVal);
            const absVal = Math.abs(numVal);
            let strength = 'Relación débil';
            if (absVal >= 0.7) strength = '⬛ Relación muy fuerte';
            else if (absVal >= 0.5) strength = '▪ Relación fuerte';
            else if (absVal >= 0.3) strength = '▫ Relación moderada';
            const direction = numVal >= 0 ? 'positiva' : 'negativa';
            const valColor = numVal > 0 ? '#ea580c' : numVal < 0 ? '#3b82f6' : '#6b7280';
            return `
              <div style="font-weight:900;margin-bottom:5px;border-bottom:2px solid #111;padding-bottom:3px;max-width:220px;">${xLabel} × ${yLabel}</div>
              <div style="margin-bottom:4px;">${strength} <b>${direction}</b></div>
              <div>Correlación: <b style="font-size:15px;color:${valColor};">${numVal.toFixed(3)}</b></div>
            `;
          },
        };
        baseOptions.series = [{
          name: 'Correlacion',
          type: 'heatmap',
          data: heatData,
          label: {
            show: xs.length <= 14,
            fontWeight: 700,
            fontSize: xs.length <= 6 ? 11 : xs.length <= 10 ? 8 : 7,
            color: (params: any) => {
              const v = Array.isArray(params.value) ? params.value[2] : (params.data?.[2] ?? 0);
              return Math.abs(Number(v)) > 0.55 ? '#ffffff' : PALETTE.black;
            },
            formatter: (params: any) => {
              const v = Array.isArray(params.value) ? params.value[2] : (params.data?.[2] ?? 0);
              return v != null ? Number(v).toFixed(3) : '';
            },
          },
          emphasis: {
            scale: true,
            itemStyle: {
              borderColor: PALETTE.black,
              borderWidth: 2,
              shadowBlur: 12,
              shadowColor: 'rgba(0,0,0,0.25)',
            },
          },
        }];
        break;
      }

      // -----------------------------------------------------------------------
      default: {
        // Vertical bar fallback — professional default
        const xDim = dataset.dimensions[0];
        const yDim = dataset.dimensions[1];
        baseOptions.grid = { containLabel: true, left: 16, right: 28, top: 24, bottom: 28 };
        baseOptions.tooltip = {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: '#fff',
          borderColor: PALETTE.black,
          borderWidth: 2,
          textStyle: { color: PALETTE.black, fontWeight: 'bold', fontSize: 12 },
          valueFormatter: (value: any) => (typeof value === 'number' ? fmtNum(value, 2) : String(value ?? '-')),
        };
        baseOptions.series = [{
          type: 'bar',
          barMaxWidth: 60,
          barCategoryGap: '30%',
          encode: { x: xDim, y: yDim },
          itemStyle: {
            color: PALETTE.violet,
            borderColor: PALETTE.black,
            borderWidth: 2,
            borderRadius: [3, 3, 0, 0],
          },
          emphasis: {
            itemStyle: { color: PALETTE.black, borderColor: PALETTE.violet, shadowBlur: 8, shadowColor: 'rgba(129,90,225,0.3)' },
          },
          label: {
            show: true,
            position: 'top',
            fontWeight: 700,
            fontSize: 11,
            color: PALETTE.black,
            formatter: (p: any) => fmtNum(p.value?.[yDim] ?? p.value, 1),
          },
        }];
        break;
      }
    }

    return baseOptions;
  }, [payload, safeDataset]);

  // Empty state
  if (
    !payload ||
    !payload.dataset ||
    !Array.isArray(payload.dataset.source) ||
    payload.dataset.source.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] bg-[#fafafc] border-2 border-dashed border-[#111] p-6 text-center">
        <p className="text-sm font-black text-gray-700 uppercase tracking-wider mb-1">Datos no disponibles</p>
        <p className="text-xs text-gray-400 font-medium">No se detectaron registros suficientes para representar esta dimension.</p>
      </div>
    );
  }

  const h = typeof height === 'number' ? `${height}px` : (height === '100%' ? '420px' : (height || '420px'));

  return (
    <div style={{ width: '100%', height: h, minHeight: 400 }} className="w-full h-full flex-1">
      <ReactECharts
        ref={echartsRef}
        option={options}
        theme="neo-brutalist"
        style={{ height: '100%', minHeight: 400, width: '100%' }}
        opts={{ renderer: 'canvas', devicePixelRatio: 2 }}
        onChartReady={handleChartReady}
      />
    </div>
  );
}
