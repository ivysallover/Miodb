import React, { Suspense, lazy, useMemo } from 'react';
import { AnomalyTableInspector } from '../../../dashboard-ia/frontend/src/features/dashboard/components/AnomalyTableInspector';
import { ForecastMetricsBar } from '../../../dashboard-ia/frontend/src/features/dashboard/components/ForecastMetricsBar';

/**
 * "MIO mejorado": the same analysis the classic panel shows, told in the order a business owner
 * asks (what MIO found → the charts that back it → what is coming → why → what to review).
 *
 * It draws every chart with the classic renderer (same chart selection, same tooltips), so it
 * works with any sheet the classic works with: time series, categories, correlations, segments.
 * Nothing here calls the API, and no finding is stated unless the data for it is really there.
 */

const DynamicChartRenderer = lazy(() => import('@/components/DynamicChartRenderer'));

type AnyRow = Record<string, any>;
type Chart = { chartId?: string; metadata?: AnyRow; dataset?: { dimensions?: string[]; source?: AnyRow[] }; layoutDirectives?: AnyRow };

const num = (v: any): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const toTime = (v: any): number | null => {
  if (v == null) return null;
  const t = new Date(String(v).replace(' ', 'T')).getTime();
  return Number.isFinite(t) ? t : null;
};
const fmt = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e4) return Math.round(n).toLocaleString('es-AR');
  return n.toLocaleString('es-AR', { maximumFractionDigits: a < 100 ? 2 : 0 });
};
const pct = (x: number) => Math.abs(x).toLocaleString('es-AR', { maximumFractionDigits: Math.abs(x) < 10 ? 1 : 0 });
const fmtDate = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** "acidity_score" → "acidity score": column names as people read them. */
const pretty = (s: any): string => String(s ?? '').replace(/_/g, ' ').trim();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const ACCENTS: [RegExp, string][] = [
  [/\bEvolucion\b/g, 'Evolución'], [/\bDistribucion\b/g, 'Distribución'], [/\bDispersion\b/g, 'Dispersión'],
  [/\bRelacion\b/g, 'Relación'], [/\bCorrelacion\b/g, 'Correlación'], [/\bmayoria\b/g, 'mayoría'], [/\bSegmentacion\b/g, 'Segmentación'],
  [/\bmas\b/g, 'más'], [/\batipicos\b/g, 'atípicos'], [/\bcategoria\b/g, 'categoría'], [/\blidera\b/g, 'va primero'],
];
const tidy = (s: any): string => {
  let out = pretty(s);
  for (const [re, to] of ACCENTS) out = out.replace(re, to);
  return out;
};

const typeOf = (c?: Chart) => String(c?.layoutDirectives?.chartType || '');
const KIND: Record<string, { kicker: string; hint: string }> = {
  LineChart: { kicker: 'En el tiempo', hint: 'La curva muestra si viene subiendo o bajando, y en qué momentos hay picos.' },
  HorizontalBar: { kicker: 'Comparación', hint: 'Cada barra es un grupo. Cuanto más larga, mayor el valor.' },
  Bar: { kicker: 'Comparación', hint: 'Cada barra es un grupo. Cuanto más alta, mayor el valor.' },
  Donut: { kicker: 'Cómo se reparte', hint: 'Muestra qué parte del total aporta cada grupo.' },
  Pie: { kicker: 'Cómo se reparte', hint: 'Muestra qué parte del total aporta cada grupo.' },
  BoxPlot: { kicker: 'Cuánto varía', hint: 'La caja encierra la mitad central de los datos y la línea del medio es el valor típico.' },
  Scatter: { kicker: 'Relación entre dos datos', hint: 'Si los puntos suben hacia la derecha, los dos valores crecen juntos.' },
  CorrelationHeatmap: { kicker: 'Qué se mueve junto', hint: 'Los cuadros más intensos marcan pares de columnas que cambian a la par.' },
  Radar: { kicker: 'Perfil de cada grupo', hint: 'Cada eje es una característica; la forma muestra en qué se destaca cada grupo.' },
};
const kindOf = (c?: Chart) => KIND[typeOf(c)] || { kicker: 'Gráfico', hint: '' };
const isWide = (c: Chart) => ['CorrelationHeatmap', 'LineChart', 'FanChart'].includes(typeOf(c)) || (c.dataset?.source?.length ?? 0) > 14;

/** "59.2K - 67.4K" → 59200, so value ranges can be put in order. */
const rangeStart = (label: any): number => {
  const mm = String(label).match(/-?[\d.,]+\s*[KkMm]?/);
  if (!mm) return 0;
  const raw = mm[0].trim();
  const mult = /[Mm]$/.test(raw) ? 1e6 : /[Kk]$/.test(raw) ? 1e3 : 1;
  return (parseFloat(raw.replace(/[KkMm]/, '').replace(',', '.')) || 0) * mult;
};
const isHistogram = (c: Chart) => String(c.chartId || '').startsWith('dist') || /^frecuencia$/i.test(String(c.dataset?.dimensions?.[1] || ''));
/** A distribution reads in value order, not by how tall each bar is. */
const inValueOrder = (c: Chart): Chart =>
  isHistogram(c) && c.dataset?.source
    ? { ...c, dataset: { ...c.dataset, source: [...c.dataset.source].sort((a, b) => rangeStart(a[c.dataset!.dimensions![0]]) - rangeStart(b[c.dataset!.dimensions![0]])) } }
    : c;

/** The one thing to take from a chart: a sentence, plus a headline figure when the data gives one. */
const conclude = (c: Chart): { text: string; big?: string; bigLabel?: string } => {
  const t = typeOf(c);
  const d = c.dataset?.dimensions || [];
  const src = c.dataset?.source || [];
  // First sentence only, decimals the local way: the note is a headline, not a paragraph.
  const raw = tidy(c.metadata?.insightSubtitle || '');
  const firstSentence = (raw.match(/^.*?[.!?](?=\s|$)/)?.[0] || raw).replace(/(\d)\.(\d)/g, '$1,$2').replace(/['‘’]/g, '');
  const text = firstSentence || kindOf(c).hint;
  try {
    if (isHistogram(c)) {
      const rows = src.map((r) => ({ l: String(r[d[0]]), v: num(r[d[1]]) ?? 0 }));
      if (rows.length) {
        const top = [...rows].sort((a, b) => b.v - a.v)[0];
        const total = rows.reduce((a, b) => a + b.v, 0);
        return { text: `Lo más común es entre ${top.l.replace(' - ', ' y ')}.`, big: total ? `${pct((top.v / total) * 100)} %` : String(top.v), bigLabel: `${top.v.toLocaleString('es-AR')} de ${total.toLocaleString('es-AR')} registros` };
      }
    }
    if (t === 'HorizontalBar' || t === 'Bar') {
      const rows = src.map((r) => ({ l: pretty(r[d[0]]), v: num(r[d[1]]) })).filter((r) => r.l && r.v != null) as { l: string; v: number }[];
      if (rows.length) {
        const sorted = [...rows].sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
        const top = sorted[0], low = sorted[sorted.length - 1];
        const metric = pretty(d[1]);
        const flat = rows.length > 1 && low.v !== 0 && Math.abs((top.v - low.v) / low.v) < 0.05;
        // Say it ourselves: the figure is in the data, and "casi no hay diferencia" is a finding too.
        const own = flat
          ? `Casi no hay diferencia entre grupos: todos rondan ${fmt(top.v)}.`
          : `${cap(top.l)} tiene el valor más alto de ${metric}: ${fmt(top.v)}.`;
        return { text: own, big: fmt(top.v), bigLabel: top.l };
      }
    }
    if (t === 'Donut' || t === 'Pie') {
      const rows = src.map((r) => ({ l: pretty(r[d[0]]), v: num(r[d[1]]) ?? 0 })).filter((r) => r.l);
      const total = rows.reduce((a, b) => a + b.v, 0);
      if (rows.length && total > 0) {
        const top = [...rows].sort((a, b) => b.v - a.v)[0];
        const share = (top.v / total) * 100;
        return { text: `${cap(top.l)} ${share >= 50 ? 'concentra' : 'es el grupo más grande, con'} el ${pct(share)} % del total.`, big: `${pct(share)} %`, bigLabel: top.l };
      }
    }
    if (t === 'CorrelationHeatmap') {
      const pairs = src.map((r) => ({ a: pretty(r.x), b: pretty(r.y), v: num(r.value) })).filter((q) => q.v != null && q.a !== q.b) as { a: string; b: string; v: number }[];
      if (pairs.length) { const top = [...pairs].sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0]; return { text, big: top.v.toLocaleString('es-AR', { maximumFractionDigits: 2 }), bigLabel: `${top.a} y ${top.b}` }; }
    }
    if (t === 'Scatter' && d.length >= 2) {
      const xs: number[] = [], ys: number[] = [];
      for (const r of src) { const x = num(r[d[0]]), y = num(r[d[1]]); if (x != null && y != null) { xs.push(x); ys.push(y); } }
      if (xs.length > 5) {
        const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
        const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
        const word = Math.abs(r) >= 0.7 ? 'fuerte' : Math.abs(r) >= 0.4 ? 'moderada' : 'débil';
        return { text, big: cap(word), bigLabel: `relación ${r < 0 ? 'inversa' : 'directa'} entre ${pretty(d[0])} y ${pretty(d[1])}` };
      }
    }
    if (t === 'BoxPlot') {
      const rows = src
        .map((r) => ({ l: pretty(r[d[0]]), q1: Array.isArray(r.box) ? num(r.box[1]) : null, med: Array.isArray(r.box) ? num(r.box[2]) : null, q3: Array.isArray(r.box) ? num(r.box[3]) : null }))
        .filter((r) => r.med != null) as { l: string; q1: number | null; med: number; q3: number | null }[];
      if (rows.length) {
        const top = [...rows].sort((a, b) => b.med - a.med)[0];
        const range = top.q1 != null && top.q3 != null ? ` La mitad de los datos está entre ${fmt(top.q1)} y ${fmt(top.q3)}.` : '';
        const own = rows.length > 1 ? `${cap(top.l)} tiene el valor típico más alto: ${fmt(top.med)}.` : `El valor típico es ${fmt(top.med)}.${range}`;
        return { text: own, big: fmt(top.med), bigLabel: rows.length > 1 ? `valor típico de ${top.l}` : 'valor típico' };
      }
    }
    if (t === 'LineChart') {
      const pts = src.map((r) => num(r[d[1]])).filter((v): v is number => v != null);
      if (pts.length >= 2 && pts[0]) {
        const ch = ((pts[pts.length - 1] - pts[0]) / Math.abs(pts[0])) * 100;
        const name = cap(pretty(d[1]));
        const own = Math.abs(ch) < 2 ? `${name} se mantuvo casi igual de punta a punta.` : `${name} ${ch < 0 ? 'bajó' : 'subió'} ${pct(ch)} % del primer al último dato.`;
        return { text: own, big: `${ch < 0 ? '−' : '+'}${pct(ch)} %`, bigLabel: `de ${fmt(pts[0])} a ${fmt(pts[pts.length - 1])}` };
      }
    }
  } catch { /* fall through to the sentence alone */ }
  return { text };
};

interface Props { result: any; isDark: boolean }

export const ResultadoMejorado: React.FC<Props> = ({ result, isDark }) => {
  const m = useMemo(() => {
    const charts: Chart[] = Array.isArray(result?.charts) ? result.charts.filter(Boolean) : [];
    const target = pretty(result?.targetCol || result?.target_col || '');
    const p = result?.profile || {};
    const nRows = num(p.nRows ?? p.n_rows);
    const nCols = num(p.nCols ?? p.n_cols);
    const quality = num(p.qualityScore ?? p.quality_score);

    // ── Time: only when there really is a series (several distinct dates) ──────────────────────
    const line = charts.find((c) => typeOf(c) === 'LineChart');
    const ld = line?.dataset?.dimensions || [];
    const pts = (line?.dataset?.source || [])
      .map((r) => ({ t: toTime(r[ld[0]]), v: num(r[ld[1]]) }))
      .filter((q): q is { t: number; v: number } => q.t != null && q.v != null)
      .sort((a, b) => a.t - b.t);
    const distinctDates = new Set(pts.map((q) => q.t)).size;
    const hasSeries = distinctDates >= 5 && pts[pts.length - 1].t > pts[0].t;
    const trend = hasSeries && pts[0].v ? { first: pts[0], last: pts[pts.length - 1], change: ((pts[pts.length - 1].v - pts[0].v) / Math.abs(pts[0].v)) * 100, name: pretty(ld[1]) } : null;

    // ── Forecast ───────────────────────────────────────────────────────────────────────────────
    const fChart: Chart | undefined = result?.forecast?.chartData || result?.forecast?.chart_data || undefined;
    const fRows = (fChart?.dataset?.source || []).filter((r) => r.forecast != null);
    const fDate = fChart?.dataset?.dimensions?.[0];
    const fLast = fRows.length ? fRows[fRows.length - 1] : null;
    const forecast = fLast && fDate ? {
      t: toTime(fLast[fDate]), v: num(fLast.forecast), lo: num(fLast.lower),
      hi: num(fLast.upper) ?? (num(fLast.lower) != null && num(fLast.band_width) != null ? (num(fLast.lower) as number) + (num(fLast.band_width) as number) : null),
    } : null;
    const fErr = result?.forecast?.metrics?.error;

    // ── Odd records ────────────────────────────────────────────────────────────────────────────
    const aChart: Chart | undefined = result?.anomalies?.chartData || result?.anomalies?.chart_data || undefined;
    const aMetrics = result?.anomalies?.metrics || {};
    const aSrc: AnyRow[] = aChart?.dataset?.source || [];
    const plottedOdd = aSrc.filter((s) => s._anomaly === -1 || s._is_anomaly === true || s.is_anomaly === true);
    const plottedNormal = aSrc.filter((s) => s._anomaly === 1 || s._is_anomaly === false || s.is_anomaly === false);
    const rawOdd: AnyRow[] = aMetrics.anomalyRecords ?? aMetrics.anomaly_records ?? [];
    const rawSample: AnyRow[] = aMetrics.sampleRecords ?? aMetrics.sample_records ?? [];
    const anomalyRecords = rawOdd.length ? rawOdd : plottedOdd.map((s) => ({ ...s, _is_anomaly: true }));
    const sampleRecords = rawSample.length ? rawSample : plottedNormal.slice(0, 100).map((s) => ({ ...s, _is_anomaly: false }));
    const oddCount = num(aMetrics.nAnomalias ?? aMetrics.n_anomalias) ?? anomalyRecords.length;
    const rawCols: string[] = aMetrics.tableColumns ?? aMetrics.table_columns ?? [];
    const tableColumns = rawCols.length ? rawCols : anomalyRecords.length ? Object.keys(anomalyRecords[0]).filter((c) => !c.startsWith('_')) : [];
    const columnRoles = aMetrics.columnRoles ?? aMetrics.column_roles ?? {};
    const ax = aChart?.dataset?.dimensions?.[0];
    const aPlottable = !!ax && new Set(aSrc.slice(0, 400).map((r) => String(r[ax]))).size >= 3;

    // ── What weighs most ───────────────────────────────────────────────────────────────────────
    const fi = result?.featureImportance || result?.feature_importance || {};
    const fiChart: Chart | undefined = fi.chartImportance || fi.chart_importance || undefined;
    const shapChart: Chart | undefined = fi.chartShap || fi.chart_shap || undefined;
    const fiDims = fiChart?.dataset?.dimensions || [];
    const feats = (fiChart?.dataset?.source || [])
      .map((r) => ({ label: pretty(r[fiDims[0]]), value: num(r[fiDims[1]]) ?? 0 }))
      .filter((f) => f.label)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const fiErr = fi?.metrics?.error;

    // ── Groups: the first "value by category" comparison the classic panel would show ──────────
    const cmp = charts.find((c) => ['HorizontalBar', 'Bar'].includes(typeOf(c)) && (c.dataset?.source?.length ?? 0) >= 2 && c.chartId !== 'dist_hist' && !String(c.chartId || '').startsWith('dist'));
    const cd = cmp?.dataset?.dimensions || [];
    const groups = (cmp?.dataset?.source || [])
      .map((r) => ({ label: pretty(r[cd[0]]), value: num(r[cd[1]]) }))
      .filter((g): g is { label: string; value: number } => !!g.label && g.value != null)
      .sort((a, b) => b.value - a.value);
    const gap = groups.length >= 2 ? { top: groups[0], bottom: groups[groups.length - 1], metric: pretty(cd[1]), by: pretty(cd[0]) } : null;

    // ── Segments ───────────────────────────────────────────────────────────────────────────────
    const seg = result?.segmentation || {};
    const segChart: Chart | undefined = seg.scatterData || seg.scatter_data || undefined;
    const radarChart: Chart | undefined = seg.radarData || seg.radar_data || undefined;
    const sd = segChart?.dataset?.dimensions || [];
    const segs = (segChart?.dataset?.source || [])
      .map((r) => ({ label: pretty(r[sd[0]]), value: num(r[sd[1]]) ?? 0 }))
      .filter((g) => g.label)
      .sort((a, b) => b.value - a.value);
    const segTotal = segs.reduce((a, b) => a + b.value, 0);

    // ── Up to three findings, most useful first, only from data that exists ────────────────────
    const findings: { tag: string; text: string }[] = [];
    if (trend) {
      findings.push({
        tag: 'Qué pasó',
        text: Math.abs(trend.change) < 2
          ? `${cap(trend.name)} casi no cambió entre ${fmtDate(trend.first.t)} y ${fmtDate(trend.last.t)}: ronda ${fmt(trend.last.v)}.`
          : `${cap(trend.name)} ${trend.change < 0 ? 'bajó' : 'subió'} ${pct(trend.change)} % entre ${fmtDate(trend.first.t)} y ${fmtDate(trend.last.t)}: de ${fmt(trend.first.v)} a ${fmt(trend.last.v)}.`,
      });
    }
    if (forecast && forecast.t != null && forecast.v != null) {
      findings.push({ tag: 'Qué viene', text: `Para el ${fmtDate(forecast.t)} MIO estima ${fmt(forecast.v)}${forecast.lo != null && forecast.hi != null ? `, entre ${fmt(forecast.lo)} y ${fmt(forecast.hi)}` : ''}.` });
    }
    // Only worth saying when the groups really differ (5 % or more); a 7,75 vs 7,74 gap is noise.
    const gapRel = gap && gap.bottom.value !== 0 ? Math.abs((gap.top.value - gap.bottom.value) / gap.bottom.value) : 0;
    if (gap && gapRel >= 0.05) {
      findings.push({ tag: 'Dónde está la diferencia', text: `${cap(gap.top.label)} tiene el ${gap.metric} más alto (${fmt(gap.top.value)}) y ${gap.bottom.label} el más bajo (${fmt(gap.bottom.value)}).` });
    }
    if (feats.length) {
      findings.push({ tag: 'Por qué', text: `Lo que más pesa${target ? ` en ${target}` : ''} es ${feats[0].label}${feats[1] ? `, seguido de ${feats[1].label}` : ''}.` });
    }
    if (oddCount > 0) {
      const share = nRows ? (oddCount / nRows) * 100 : null;
      findings.push({ tag: 'Para revisar', text: `${oddCount.toLocaleString('es-AR')} ${oddCount === 1 ? 'registro se sale' : 'registros se salen'} de lo normal${share != null ? ` (${pct(share)} % de la planilla)` : ''}.` });
    }
    if (segs.length >= 2 && segTotal > 0) {
      findings.push({ tag: 'Grupos', text: `MIO encontró ${segs.length} grupos parecidos entre sí. El más grande, ${segs[0].label}, reúne el ${pct((segs[0].value / segTotal) * 100)} %.` });
    }

    return { charts, target, nRows, nCols, quality, trend, forecast, fChart, fErr, aChart, aPlottable, oddCount, anomalyRecords, sampleRecords, tableColumns, columnRoles, fiChart, shapChart, feats, fiErr, segChart, radarChart, segs, findings: findings.slice(0, 3), hasSeries };
  }, [result]);

  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const TONES = {
    white: isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950',
    violet: 'bg-[#7647eb] text-white',
    ink: isDark ? 'bg-black text-white' : 'bg-[#0b0914] text-white',
    lav: isDark ? 'bg-[#2a1766] text-white' : 'bg-[#e4dcff] text-zinc-950',
    mute: isDark ? 'bg-[#17142a] text-zinc-200' : 'bg-[#e9e7f1] text-zinc-800',
  } as const;
  type Tone = keyof typeof TONES;
  const SPAN: Record<number, string> = { 3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9', 12: 'lg:col-span-12' };
  const onColour = (t: Tone) => t === 'violet' || t === 'ink';
  const H2 = 'font-extrabold tracking-[-0.035em] leading-[1.05] text-2xl sm:text-4xl';
  const filename = String(result?.filename || 'dataset');

  const block = (span: number, tone: Tone, kicker: string, children: React.ReactNode, key?: string, extra = '') => (
    <section key={key} className={`relative flex min-w-0 flex-col rounded-mio p-6 sm:p-8 ${SPAN[span]} ${TONES[tone]} ${extra}`}>
      <p className={`mb-3 font-mono text-[11px] font-bold uppercase tracking-wider ${onColour(tone) ? 'text-[#bdf559]' : 'text-[#7647eb] dark:text-[#a78bfa]'}`}>{kicker}</p>
      {children}
    </section>
  );

  /** A chart (classic renderer) and, next to it, a colour block with its mini conclusion.
      Sizes and sides rotate so the grid stays lively instead of a uniform stack. */
  const PATTERNS: [number, number, boolean][] = [[8, 4, false], [7, 5, true], [7, 5, false], [8, 4, true]]; // [chart, note, noteFirst]
  const NOTE_TONES: Tone[] = ['lav', 'ink', 'violet', 'mute'];
  let turn = 0;
  const pair = (raw: Chart, key: string, kickerOverride?: string) => {
    const c = inValueOrder(raw);
    if (!kickerOverride && isHistogram(c)) kickerOverride = 'Cómo se reparte';
    const wide = isWide(c);
    const idx = turn++;
    const [cs, ns, noteFirst] = wide ? ([9, 3, idx % 2 === 1] as [number, number, boolean]) : PATTERNS[idx % PATTERNS.length];
    const tone = NOTE_TONES[idx % NOTE_TONES.length];
    const k = kindOf(c);
    const con = conclude(c);
    const height = wide ? 440 : 340;
    const chart = block(cs, 'white', kickerOverride || k.kicker, (
      <>
        <h3 className={`${H2} !text-xl sm:!text-2xl`}>{tidy(c.metadata?.title || 'Gráfico')}</h3>
        <div className="mt-4 w-full" style={{ height }}>
          <Suspense fallback={<div className={`h-full w-full animate-pulse rounded-mio-sm ${TONES.mute}`} />}>
            <DynamicChartRenderer key={`${filename}-${key}`} payload={c as any} height={height} />
          </Suspense>
        </div>
      </>
    ), `${key}-chart`);
    const note = block(ns, tone, 'En una frase', (
      <div className="flex flex-1 flex-col justify-between gap-6">
        <p className={`font-bold leading-[1.13] tracking-[-0.025em] ${ns <= 3 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-[1.9rem]'}`}>{con.text}</p>
        <div>
          {con.big && (
            <>
              <p className={`font-extrabold leading-none tracking-[-0.04em] ${ns <= 3 ? 'text-4xl' : 'text-5xl sm:text-6xl'} ${onColour(tone) ? 'text-[#bdf559]' : 'text-[#7647eb] dark:text-[#bdf559]'}`}>{con.big}</p>
              {con.bigLabel && <p className="mt-2 font-mono text-[11px] uppercase tracking-wider opacity-70">{con.bigLabel}</p>}
            </>
          )}
          {k.hint && <p className={`mt-4 text-sm ${onColour(tone) ? 'text-white/70' : muted}`}>{k.hint}</p>}
        </div>
      </div>
    ), `${key}-note`, 'transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1');
    return noteFirst ? [note, chart] : [chart, note];
  };

  const findingTones: Tone[] = ['violet', 'lav', 'ink'];
  const fSpan = m.findings.length === 1 ? 12 : m.findings.length === 2 ? 6 : 4;
  const meta = [m.nRows != null && `${m.nRows.toLocaleString('es-AR')} filas`, m.nCols != null && `${m.nCols} columnas`, m.quality != null && `calidad de datos ${m.quality}/100`].filter(Boolean).join(' · ');

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
      {meta && <p className={`lg:col-span-12 font-mono text-[11px] uppercase tracking-wider ${muted}`}>{meta}</p>}

      {/* 1. What MIO found */}
      {m.findings.length > 0
        ? m.findings.map((f, i) => block(fSpan, findingTones[i], f.tag, (
            <p className="text-2xl sm:text-[1.9rem] font-bold leading-[1.13] tracking-[-0.025em]">{f.text}</p>
          ), `finding-${i}`, 'mio-pop'))
        : block(12, 'mute', 'Resumen', <p className="text-xl font-semibold">MIO procesó la planilla, pero no encontró nada para destacar con estos datos.</p>, 'finding-empty')}

      {/* 2. What is coming: the classic forecast chart and its metrics, when there is one */}
      {m.fChart
        ? block(12, 'white', 'Qué viene', (
            <>
              <h3 className={H2}>{tidy(m.fChart.metadata?.title || 'Predicción')}</h3>
              {m.fChart.metadata?.insightSubtitle && <p className={`mt-1.5 text-base ${muted}`}>{tidy(m.fChart.metadata.insightSubtitle)}</p>}
              <div className="mt-4 w-full" style={{ height: 420 }}>
                <Suspense fallback={<div className={`h-full w-full animate-pulse rounded-mio-sm ${TONES.mute}`} />}>
                  <DynamicChartRenderer key={`${filename}-forecast`} payload={m.fChart as any} height={420} />
                </Suspense>
              </div>
              {result?.forecast?.metrics && <div className="mt-4"><ForecastMetricsBar metrics={result.forecast.metrics} /></div>}
            </>
          ), 'forecast')
        : m.hasSeries && block(12, 'ink', 'Qué viene', (
            <>
              <h3 className={H2}>Sin predicción esta vez.</h3>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75">MIO no pudo calcular una estimación confiable con estos datos, y prefiere decírtelo antes que inventar un número.</p>
              {m.fErr && (
                <details className="mt-3 text-sm text-white/60">
                  <summary className="cursor-pointer font-medium">Detalle técnico</summary>
                  <p className="mt-2 font-mono text-xs">{String(m.fErr)}</p>
                </details>
              )}
            </>
          ), 'forecast-empty')}

      {/* 3. The charts behind the findings: same selection the classic panel makes */}
      {m.charts.map((c, i) => pair(c, `chart-${c.chartId || i}`))}

      {/* 4. Why */}
      {m.fiChart && pair(m.fiChart, 'fi', 'Por qué')}
      {m.shapChart && pair(m.shapChart, 'shap', 'Por qué, registro por registro')}

      {/* 5. Groups */}
      {m.segChart && pair(m.segChart, 'seg', 'Grupos parecidos')}
      {m.radarChart && pair(m.radarChart, 'radar', 'Perfil de cada grupo')}

      {/* 6. What to review */}
      {m.aChart && block(12, 'white', 'Para revisar', (
        <>
          <h3 className={H2}>{m.oddCount.toLocaleString('es-AR')} {m.oddCount === 1 ? 'registro' : 'registros'} fuera de lo normal.</h3>
          <p className={`mt-1.5 text-base ${muted}`}>Son los que más se alejan del resto. Puede ser algo extraordinario o un error de carga.</p>
          {m.aPlottable && (
            <div className="mt-4 w-full" style={{ height: 400 }}>
              <Suspense fallback={<div className={`h-full w-full animate-pulse rounded-mio-sm ${TONES.mute}`} />}>
                <DynamicChartRenderer key={`${filename}-anom`} payload={m.aChart as any} height={400} />
              </Suspense>
            </div>
          )}
          {(m.anomalyRecords.length > 0 || m.sampleRecords.length > 0) && (
            <details className="mt-5" open={!m.aPlottable}>
              <summary className="cursor-pointer text-base font-bold">Ver los registros uno por uno</summary>
              <div className="mt-4">
                <AnomalyTableInspector anomalyRecords={m.anomalyRecords} sampleRecords={m.sampleRecords} tableColumns={m.tableColumns} columnRoles={m.columnRoles} filename={filename} />
              </div>
            </details>
          )}
        </>
      ), 'anomalies')}

      {/* 7. What MIO did to the sheet */}
      {Array.isArray(result?.cleaningReport?.actions) && result.cleaningReport.actions.length > 0 && block(12, 'mute', 'Antes de analizar', (
        <details>
          <summary className="cursor-pointer text-lg font-bold">Qué hizo MIO con tu planilla</summary>
          <ul className="mt-4 space-y-2 text-sm">
            {result.cleaningReport.actions.map((a: any, i: number) => (
              <li key={i} className="flex gap-3"><span aria-hidden className="font-mono text-[#7647eb]">✓</span>{String(a)}</li>
            ))}
          </ul>
        </details>
      ), 'cleaning')}
    </div>
  );
};

export default ResultadoMejorado;
