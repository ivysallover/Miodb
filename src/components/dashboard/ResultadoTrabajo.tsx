import React, { useMemo } from 'react';
import {
  ExploratoryCharts,
  ForecastSection,
  SegmentationSection,
  AnomaliesSection,
  FeatureImportanceSection,
} from '@/features/dashboard/components';
import DatasetJoinPanel from '@/components/DatasetJoinPanel';
import { CompetitionBlock } from './Competition';
import { SectionIndex, type IndexItem } from './SectionIndex';
import { NO_DATES_REASON, buildModel, inValueOrder, pct as fmtPct } from './insights';

/**
 * "Trabajo": the same analysis as "Presentación", with every chart and metric in sight: the framing
 * numbers, the written summary, then each section (charts, forecast, groups, odd values, what weighs
 * most). The web dashboard and the desktop app show it; `extraIndex` adds the host's own sections to
 * the index (the web's chat).
 */
export const ResultadoTrabajo: React.FC<{ result: any; isDark: boolean; filename: string; extraIndex?: IndexItem[] }> = ({ result, isDark, filename, extraIndex = [] }) => {
  const model = useMemo(() => buildModel(result), [result]);
  const nRows = result?.profile?.n_rows ?? result?.profile?.nRows ?? 0;
  const nCols = result?.profile?.n_cols ?? result?.profile?.nCols ?? 0;
  const quality: number | null = result?.profile?.quality_score ?? result?.profile?.qualityScore ?? null;
  // A saved analysis can carry the "still writing" placeholder instead of a summary: that is not a summary.
  const rawNarrative = String(result?.narrative?.text || '').trim();
  const narrativeText = rawNarrative.length > 40 && !/^generando/i.test(rawNarrative) ? rawNarrative : '';

  // The framing numbers and the sections that exist for this result.
  const r: any = result;
  const oddCount = model?.oddCount ?? 0;
  const workKpis: { label: string; value: string; sub?: string; title?: string; tone: string; accent?: string }[] = [
    { label: 'Filas', value: nRows.toLocaleString('es-AR'), sub: 'registros analizados', tone: 'bg-white text-zinc-950 dark:bg-[#0e0d16] dark:text-white' },
    { label: 'Columnas', value: String(nCols), sub: model?.target ? `objetivo: ${model.target}` : undefined, tone: 'bg-white text-zinc-950 dark:bg-[#0e0d16] dark:text-white' },
    ...(quality != null ? [{ label: 'Calidad de datos', value: `${quality}`, sub: 'sobre 100', title: 'Qué tan completa y consistente llegó la planilla', tone: 'bg-[#e4dcff] text-zinc-950 dark:bg-[#2a1766] dark:text-white' }] : []),
    { label: 'Valores raros', value: oddCount.toLocaleString('es-AR'), sub: model?.oddShare != null ? `${fmtPct(model.oddShare)} % de la planilla` : 'registros para revisar', tone: 'bg-[#0b0914] text-white dark:bg-black', accent: oddCount > 0 ? 'text-[#bdf559]' : '' },
    ...(model?.mape != null
      ? [{ label: 'Error de predicción', value: `${fmtPct(model.mape)} %`, sub: model.hitRate != null ? `MAPE · acierta cerca de ${model.hitRate} de cada 10` : 'MAPE', title: 'En promedio, cuánto se desvía la estimación del valor real', tone: 'bg-[#7647eb] text-white' }]
      : []),
  ];
  const workCharts = useMemo(() => (Array.isArray(r?.charts) ? r.charts.filter(Boolean).map(inValueOrder) : []), [r]);
  const workIndex: IndexItem[] = !r ? [] : [
    { id: 't-resumen', label: 'Resumen' },
    ...((r.charts?.length ?? 0) > 0 ? [{ id: 't-graficos', label: 'Gráficos' }] : []),
    ...(model?.fChart ? [{ id: 't-prediccion', label: 'Predicción' }] : []),
    ...(r.segmentation?.scatterData || r.segmentation?.scatter_data || r.segmentation?.radarData || r.segmentation?.radar_data ? [{ id: 't-grupos', label: 'Grupos' }] : []),
    ...(r.anomalies?.chartData || r.anomalies?.chart_data ? [{ id: 't-raros', label: 'Valores raros' }] : []),
    ...(r.featureImportance?.chartImportance || r.feature_importance?.chart_importance || r.featureImportance?.chartShap || r.feature_importance?.chart_shap ? [{ id: 't-peso', label: 'Qué pesa más' }] : []),
    ...extraIndex,
  ];

  return (
    <>
      <SectionIndex isDark={isDark} items={workIndex} />

      {/* The numbers that frame everything else */}
      <div id="t-resumen" className={`scroll-mt-36 grid grid-cols-2 gap-2.5 sm:gap-3 ${workKpis.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
        {workKpis.map((k, i) => (
          <div key={k.label} title={k.title} className={`rounded-mio p-5 ${k.tone} ${workKpis.length % 2 === 1 && i === workKpis.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-90">{k.label}</p>
            <p className={`mt-2 text-3xl sm:text-4xl font-extrabold leading-none tracking-[-0.04em] tabular-nums [overflow-wrap:anywhere] ${k.accent || ''}`}>{k.value}</p>
            {k.sub && <p className="mt-2 text-xs opacity-90">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Written summary: the AI's when there is one, otherwise what the data itself shows */}
      <div className="rounded-mio bg-white p-6 sm:p-8 dark:bg-[#0e0d16] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white">Resumen de MIO</h3>
          {narrativeText && (
            <span className="rounded-full bg-[#e4dcff] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:bg-[#2a1766] dark:text-white">Redactado con IA</span>
          )}
        </div>
        {narrativeText ? (
          <>
            <p className="max-w-4xl text-sm sm:text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{narrativeText}</p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Es orientativo: lo redacta una IA a partir de tus métricas. No es asesoramiento financiero ni legal.
            </p>
          </>
        ) : model && model.findings.length > 0 ? (
          <ul className="max-w-4xl space-y-1.5 text-sm sm:text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            {model.findings.map((f) => (
              <li key={f.tag}><strong className="font-bold">{f.tag}:</strong> {f.big ? `${f.big} ` : ''}{f.text}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            MIO procesó la planilla{nRows ? ` (${nRows.toLocaleString('es-AR')} filas, ${nCols} columnas)` : ''}. Los gráficos de abajo muestran lo que hay en los datos.
          </p>
        )}
      </div>

      {/* Panel de unión relacional si proviene de auto-join */}
      {Boolean((result as any).joinSummary || (result as any).join_summary) && (
        <DatasetJoinPanel joinSummary={(result as any).joinSummary || (result as any).join_summary} />
      )}

      {/* Grid Integral de Gráficas y Modelos AutoML */}
      <div className="w-full flex flex-col gap-5">
        {/* Gráficas Exploratorias (Distribuciones, Histogramas, Matrices de Correlación, Boxplots) */}
        {((result as any).charts?.length ?? 0) > 0 && (
          <div id="t-graficos" className="w-full scroll-mt-36">
            <ExploratoryCharts
              charts={workCharts}
              filename={filename}
            />
          </div>
        )}

        {/* Sección de Proyecciones Temporales AutoML (Fan Charts, Conos de Confianza, RMSE, MAE, R²) */}
        {model?.fChart && (
          <div id="t-prediccion" className="w-full scroll-mt-36">
            <ForecastSection
              chartData={model.fChart as any}
              metrics={model.fLocal ? undefined : (result as any).forecast?.metrics}
              filename={filename}
            />
          </div>
        )}
        {model?.competition && <CompetitionBlock c={model.competition} isDark={isDark} className="w-full" />}
        {model && !model.fChart && !model.hasSeries && (
          <div className="w-full rounded-mio bg-white p-6 sm:p-8 dark:bg-[#0e0d16]">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white">Sin predicción en el tiempo</h3>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">{NO_DATES_REASON}</p>
          </div>
        )}

        {/* Segmentación K-Means de Clientes / Operaciones (Distribución Donut y Radar de Perfil) */}
        {((result as any).segmentation?.scatterData || (result as any).segmentation?.scatter_data || (result as any).segmentation?.radarData || (result as any).segmentation?.radar_data) && (
          <div id="t-grupos" className="w-full scroll-mt-36">
            <SegmentationSection
              scatterData={(result as any).segmentation?.scatterData || (result as any).segmentation?.scatter_data}
              radarData={(result as any).segmentation?.radarData || (result as any).segmentation?.radar_data}
              filename={filename}
            />
          </div>
        )}

        {/* Detección de Anomalías (Isolation Forest) con Gráfico de Dispersión y Tabla Interactiva */}
        {((result as any).anomalies?.chartData || (result as any).anomalies?.chart_data) && (
          <div id="t-raros" className="w-full scroll-mt-36">
            <AnomaliesSection
              chartData={(result as any).anomalies?.chartData || (result as any).anomalies?.chart_data}
              metrics={(result as any).anomalies?.metrics}
              filename={filename}
            />
          </div>
        )}

        {/* Importancia y Atribución de Variables (Valores SHAP y Gini) */}
        {((result as any).featureImportance?.chartImportance || (result as any).feature_importance?.chart_importance || (result as any).featureImportance?.chartShap || (result as any).feature_importance?.chart_shap) && (
          <div id="t-peso" className="w-full scroll-mt-36">
            <FeatureImportanceSection
              chartImportance={(result as any).featureImportance?.chartImportance || (result as any).feature_importance?.chart_importance}
              chartShap={(result as any).featureImportance?.chartShap || (result as any).feature_importance?.chart_shap}
              filename={filename}
            />
          </div>
        )}
      </div>
    </>
  );
};
