'use client';

import { useRef, useCallback } from 'react';

export interface ChartImage {
  chartId: string;
  title: string;
  base64: string;
}

/**
 * Hook that maintains a registry of ECharts instances for export.
 * Each DynamicChartRenderer calls registerChart(instance, chartId, title)
 * via its onChartReady callback.
 */
export function useChartExport() {
  const chartRegistry = useRef<
    Map<string, { instance: any; title: string }>
  >(new Map());

  const registerChart = useCallback(
    (instance: any, chartId: string, title: string) => {
      if (instance) {
        chartRegistry.current.set(chartId, { instance, title });
      }
    },
    []
  );

  const unregisterChart = useCallback((chartId: string) => {
    chartRegistry.current.delete(chartId);
  }, []);

  /**
   * Export all registered charts as PNG base64 strings.
   * Uses ECharts native getDataURL() — no html2canvas needed.
   */
  const exportChartsAsPNG = useCallback(
    async (maxCharts = 12): Promise<ChartImage[]> => {
      const results: ChartImage[] = [];
      let count = 0;

      const entries = Array.from(chartRegistry.current.entries());
      for (const [chartId, { instance, title }] of entries) {
        if (count >= maxCharts) break;
        try {
          const base64: string = instance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            excludeComponents: ['toolbox'],
          });
          if (base64 && base64.startsWith('data:image/png')) {
            // Strip the data URI prefix, send only base64 data
            const pureBase64 = base64.replace(/^data:image\/png;base64,/, '');
            results.push({ chartId, title, base64: pureBase64 });
            count++;
          }
        } catch (err) {
          console.warn(`Failed to export chart ${chartId}:`, err);
        }
      }

      return results;
    },
    []
  );

  return { registerChart, unregisterChart, exportChartsAsPNG };
}
