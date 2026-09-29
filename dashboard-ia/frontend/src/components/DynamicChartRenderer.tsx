'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { neoBrutalistTheme } from '../lib/echartsNeoBrutalistTheme';
import { ChartSchema } from '@/types/analysis';
import { normalizeChartPayload } from './charts/normalizer';
import { prepareSafeDataset } from './charts/helpers';
import { buildChartOptions } from './charts/builders';

echarts.registerTheme('neo-brutalist', neoBrutalistTheme);

// Re-export normalizeChartPayload for backward compatibility with lib/api.ts and hooks
export { normalizeChartPayload };

interface DynamicChartRendererProps {
  payload: ChartSchema;
  height?: string | number;
  onChartReady?: (instance: any, chartId: string) => void;
}

export default function DynamicChartRenderer({
  payload: rawPayload,
  height = '100%',
  onChartReady,
}: DynamicChartRendererProps) {
  const echartsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isColorblind, setIsColorblind] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Normalize payload
  const payload = useMemo(() => normalizeChartPayload(rawPayload), [rawPayload]);

  // Sync colorblind mode state from localStorage and live custom events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsColorblind(localStorage.getItem('mio_colorblind_mode') === 'true');

      const handleToggle = (e: any) => {
        setIsColorblind(Boolean(e.detail?.enabled));
      };

      window.addEventListener('mio:colorblind-changed', handleToggle);
      return () => {
        window.removeEventListener('mio:colorblind-changed', handleToggle);
      };
    }
  }, []);

  // Detect dark mode from <html class="dark"> and watch for changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const readDark = () =>
      setIsDarkTheme(document.documentElement.classList.contains('dark'));

    readDark();

    const obs = new MutationObserver(readDark);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);

  // ResizeObserver: force echarts resize when container dimensions settle
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver(() => {
      if (echartsRef.current) {
        try {
          echartsRef.current.getEchartsInstance?.()?.resize();
        } catch {
          // safe: instance may be disposed during fast unmounts
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleChartReady = useCallback(
    (instance: any) => {
      echartsRef.current = instance;
      if (onChartReady && payload?.chartId) {
        onChartReady(instance, payload.chartId);
      }
    },
    [onChartReady, payload?.chartId]
  );

  // Safe dataset conversion
  const safeDataset = useMemo(() => prepareSafeDataset(payload), [payload]);

  // Build chart configuration options — isDarkTheme drives adaptive palette
  const options = useMemo(
    () => buildChartOptions(payload, safeDataset, isColorblind, isDarkTheme),
    [payload, safeDataset, isColorblind, isDarkTheme]
  );

  // Guard: Empty or invalid dataset
  if (
    !payload ||
    !payload.dataset ||
    !Array.isArray(payload.dataset.source) ||
    payload.dataset.source.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] bg-[#fafafc] dark:bg-[#0e0c19] border-2 border-dashed border-black/20 dark:border-white/20 p-6 text-center">
        <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-1">
          Datos no disponibles
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          No se detectaron registros suficientes para representar esta dimensión.
        </p>
      </div>
    );
  }

  // Force chart update when options, colorblind or dark mode changes
  useEffect(() => {
    if (echartsRef.current) {
      try {
        const instance = echartsRef.current.getEchartsInstance?.();
        if (instance) {
          instance.setOption(options, { notMerge: true });
        }
      } catch {
        // Safe catch for fast unmounts
      }
    }
  }, [options, isColorblind, isDarkTheme]);

  const h =
    typeof height === 'number'
      ? `${height}px`
      : height === '100%'
      ? '420px'
      : height || '420px';
  const chartTitle = payload.metadata?.title || 'Gráfico de datos';
  const chartType = payload.layoutDirectives?.chartType || 'análisis';

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`Gráfico de ${chartType}: ${chartTitle}`}
      style={{ width: '100%', height: h, minHeight: 400 }}
      className="w-full h-full flex-1 relative"
    >
      <span className="sr-only">
        Gráfico interactivo de {chartType}: {chartTitle}.{' '}
        {payload.metadata?.insightSubtitle || ''}. Compatible con lectores de
        pantalla y modo de alto contraste.
      </span>
      <ReactECharts
        ref={echartsRef}
        option={options}
        notMerge={true}
        lazyUpdate={false}
        theme="neo-brutalist"
        style={{ height: '100%', minHeight: 400, width: '100%' }}
        opts={{ renderer: 'canvas', devicePixelRatio: Math.min(window.devicePixelRatio, 1.5) }}
        onChartReady={handleChartReady}
      />
    </div>
  );
}
