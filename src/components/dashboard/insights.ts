/**
 * What MIO says about a result, in plain language. Pure functions: no React, no API.
 *
 * Both dashboard views read from here, so "Trabajo" and "Presentación" never disagree, and
 * every sentence is derived from the data in the chart payload. When the data does not back
 * a statement, the field is simply left out.
 */

import { pretty, tidy } from '../../../dashboard-ia/frontend/src/components/charts/plainText';

export type AnyRow = Record<string, any>;
export type Chart = {
  chartId?: string;
  metadata?: AnyRow;
  dataset?: { dimensions?: string[]; source?: AnyRow[] };
  layoutDirectives?: AnyRow;
};
export type Fact = { label: string; value: string };
/** `share` is 0..1 and only sizes the mini bar. */
export type Rank = { label: string; value: string; share: number };
export type Insight = {
  text: string;
  big?: string;
  bigLabel?: string;
  /** One sentence on what to do with the chart. */
  look?: string;
  facts: Fact[];
  rank: Rank[];
  rankTitle?: string;
  /** 0..1: how much this chart has to tell. Decides what makes the short version. */
  weight?: number;
};
export type Role = 'importance' | 'shap' | 'segments' | 'radar';
export type Finding = { tag: string; text: string; big?: string; detail?: string };
export type Step = { title: string; text: string };

// ── Formatting ───────────────────────────────────────────────────────────────────────────────
export const num = (v: any): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
export const toTime = (v: any): number | null => {
  if (v == null) return null;
  const t = new Date(String(v).replace(' ', 'T')).getTime();
  return Number.isFinite(t) ? t : null;
};
export const fmt = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e4) return Math.round(n).toLocaleString('es-AR');
  return n.toLocaleString('es-AR', { maximumFractionDigits: a < 100 ? 2 : 0 });
};
export const pct = (x: number) => Math.abs(x).toLocaleString('es-AR', { maximumFractionDigits: Math.abs(x) < 10 ? 1 : 0 });
export const fmtDate = (t: number) => new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export { pretty, tidy };
export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// ── Chart kinds ──────────────────────────────────────────────────────────────────────────────
export const typeOf = (c?: Chart) => String(c?.layoutDirectives?.chartType || '');
const KIND: Record<string, { kicker: string; hint: string }> = {
  LineChart: { kicker: 'En el tiempo', hint: 'La curva muestra si viene subiendo o bajando, y en qué momentos hay picos.' },
  FanChart: { kicker: 'Qué viene', hint: 'La línea es la estimación y la franja, el rango donde es razonable que caiga.' },
  HorizontalBar: { kicker: 'Comparación', hint: 'Cada barra es un grupo. Cuanto más larga, mayor el valor.' },
  Bar: { kicker: 'Comparación', hint: 'Cada barra es un grupo. Cuanto más alta, mayor el valor.' },
  Tornado: { kicker: 'Qué empuja el resultado', hint: 'Las barras hacia la derecha suben el resultado; hacia la izquierda, lo bajan.' },
  Donut: { kicker: 'Cómo se reparte', hint: 'Muestra qué parte del total aporta cada grupo.' },
  Pie: { kicker: 'Cómo se reparte', hint: 'Muestra qué parte del total aporta cada grupo.' },
  BoxPlot: { kicker: 'Cuánto varía', hint: 'La caja encierra la mitad central de los datos y la línea del medio es el valor típico.' },
  Scatter: { kicker: 'Relación entre dos datos', hint: 'Si los puntos suben hacia la derecha, los dos valores crecen juntos.' },
  CorrelationHeatmap: { kicker: 'Qué se mueve junto', hint: 'Los cuadros más intensos marcan pares de columnas que cambian a la par.' },
  Radar: { kicker: 'Perfil de cada grupo', hint: 'Cada eje es una característica; la forma muestra en qué se destaca cada grupo.' },
};
export const kindOf = (c?: Chart) => KIND[typeOf(c)] || { kicker: 'Gráfico', hint: '' };
export const isWide = (c: Chart) => ['CorrelationHeatmap', 'LineChart', 'FanChart'].includes(typeOf(c)) || (c.dataset?.source?.length ?? 0) > 14;

/** "59.2K - 67.4K" → 59200, so value ranges can be put in order. */
export const rangeStart = (label: any): number => {
  const mm = String(label).match(/-?[\d.,]+\s*[KkMm]?/);
  if (!mm) return 0;
  const raw = mm[0].trim();
  const mult = /[Mm]$/.test(raw) ? 1e6 : /[Kk]$/.test(raw) ? 1e3 : 1;
  return (parseFloat(raw.replace(/[KkMm]/, '').replace(',', '.')) || 0) * mult;
};
export const isHistogram = (c: Chart) => String(c.chartId || '').startsWith('dist') || /^frecuencia$/i.test(String(c.dataset?.dimensions?.[1] || ''));
const localDecimals = (s: string) => s.replace(/(\d)\.(\d)/g, '$1,$2');
const binLabel = (l: string) => localDecimals(l).replace(/\s+-\s+/, ' a ');
const BIN_SPLIT = /\s+(?:-|a)\s+/;
/**
 * A distribution reads in value order, not by how tall each bar is: low to high, left to right
 * for upright bars and top to bottom for lying ones. Ranges are written "59,2K a 67,4K".
 */
export const inValueOrder = (c: Chart): Chart => {
  if (!isHistogram(c) || !c.dataset?.source || !c.dataset.dimensions?.length) return c;
  const d0 = c.dataset.dimensions[0];
  // ECharts stacks categories bottom-up on a lying bar chart, so the lowest range goes last.
  const lying = typeOf(c) === 'HorizontalBar';
  const source = [...c.dataset.source]
    .sort((a, b) => (rangeStart(a[d0]) - rangeStart(b[d0])) * (lying ? -1 : 1))
    .map((r) => ({ ...r, [d0]: binLabel(String(r[d0])) }));
  return { ...c, dataset: { ...c.dataset, source } };
};

/** Format a set of values with enough decimals to tell them apart (7,742 vs 7,751, not 7,75 twice). */
export const fmtApart = (values: number[]): ((n: number) => string) => {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return fmt;
  const span = Math.max(...v) - Math.min(...v);
  const maxAbs = Math.max(...v.map(Math.abs));
  if (maxAbs >= 1e4 || span === 0 || span >= 2) return fmt;
  const digits = span < 0.1 ? 3 : 2;
  return (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** The reading of one chart: the sentence, the headline figure, what to look at, and the supporting data. */
export const describe = (c: Chart, role?: Role, target = ''): Insight => {
  const t = typeOf(c);
  const d = c.dataset?.dimensions || [];
  const src = c.dataset?.source || [];
  // First sentence only, decimals the local way: the note is a headline, not a paragraph.
  const raw = tidy(c.metadata?.insightSubtitle || '');
  const firstSentence = localDecimals(raw.match(/^.*?[.!?](?=\s|$)/)?.[0] || raw).replace(/['‘’]/g, '');
  const base: Insight = { text: firstSentence || kindOf(c).hint, facts: [], rank: [], weight: 0.1 };
  try {
    // ── What weighs most ───────────────────────────────────────────────────────────────────
    if (role === 'importance') {
      const rows = src.map((r) => ({ l: pretty(r[d[0]]), v: Math.abs(num(r[d[1]]) ?? 0) })).filter((r) => r.l).sort((a, b) => b.v - a.v);
      const total = rows.reduce((a, b) => a + b.v, 0);
      if (rows.length && total > 0) {
        const top3 = rows.slice(0, 3);
        const share = (r: { v: number }) => (r.v / total) * 100;
        const facts: Fact[] = [{ label: 'Columnas evaluadas', value: String(rows.length) }];
        if (rows.length > 3) facts.push({ label: 'Las tres primeras suman', value: `${pct(top3.reduce((a, b) => a + share(b), 0))} %` });
        return {
          text: `${cap(rows[0].l)} es lo que más pesa${target ? ` en ${target}` : ''}.`,
          big: `${pct(share(rows[0]))} %`,
          bigLabel: 'del peso total',
          look: `Si querés mover ${target || 'el resultado'}, empezá por ${rows[0].l}. Lo que está al fondo de la lista casi no influye.`,
          facts,
          rank: top3.map((r) => ({ label: r.l, value: `${pct(share(r))} %`, share: r.v / rows[0].v })),
          rankTitle: 'Lo que más pesa',
          weight: 0.95,
        };
      }
    }
    if (t === 'Radar') {
      const axes = d.slice(1).map(pretty);
      const groups = src.map((r) => pretty(r._segment ?? r[d[0]])).filter(Boolean);
      return {
        ...base,
        text: groups.length > 1 ? `Cada uno de los ${groups.length} grupos tiene un perfil distinto.` : base.text,
        look: 'Buscá en qué eje se separan más las formas: ahí está lo que distingue a cada grupo.',
        weight: 0.5,
        facts: [
          ...(groups.length ? [{ label: 'Grupos', value: String(groups.length) }] : []),
          ...(axes.length ? [{ label: 'Características', value: axes.slice(0, 4).join(', ') + (axes.length > 4 ? '…' : '') }] : []),
        ],
      };
    }
    // ── Distribution ───────────────────────────────────────────────────────────────────────
    if (isHistogram(c)) {
      const rows = src.map((r) => ({ l: String(r[d[0]]), v: num(r[d[1]]) ?? 0 })).sort((a, b) => rangeStart(a.l) - rangeStart(b.l));
      const total = rows.reduce((a, b) => a + b.v, 0);
      if (rows.length && total > 0) {
        const byCount = [...rows].sort((a, b) => b.v - a.v);
        const top = byCount[0];
        const top3 = byCount.slice(0, 3);
        const top3Share = (top3.reduce((a, b) => a + b.v, 0) / total) * 100;
        const lo = rows[0].l.split(BIN_SPLIT)[0];
        const hi = rows[rows.length - 1].l.split(BIN_SPLIT).pop() || '';
        return {
          text: `Lo más común es entre ${binLabel(top.l).replace(' a ', ' y ')}.`,
          big: `${pct((top.v / total) * 100)} %`,
          bigLabel: `${top.v.toLocaleString('es-AR')} de ${total.toLocaleString('es-AR')} registros`,
          look: rows.length > 3
            ? `Los tres tramos más frecuentes juntan el ${pct(top3Share)} % de los registros. Lo que cae lejos de ahí es poco habitual.`
            : undefined,
          facts: [
            ...(lo && hi ? [{ label: 'Va de', value: `${localDecimals(lo)} a ${localDecimals(hi)}` }] : []),
            { label: 'Registros', value: total.toLocaleString('es-AR') },
          ],
          rank: top3.map((r) => ({ label: binLabel(r.l), value: `${pct((r.v / total) * 100)} %`, share: r.v / top.v })),
          rankTitle: 'Los tramos más frecuentes',
          weight: 0.5,
        };
      }
    }
    // ── Share of a total ───────────────────────────────────────────────────────────────────
    if (t === 'Donut' || t === 'Pie' || role === 'segments') {
      const rows = src.map((r) => ({ l: pretty(r[d[0]]), v: num(r[d[1]]) ?? 0 })).filter((r) => r.l).sort((a, b) => b.v - a.v);
      const total = rows.reduce((a, b) => a + b.v, 0);
      if (rows.length && total > 0) {
        const top = rows[0];
        const share = (top.v / total) * 100;
        const facts: Fact[] = [{ label: 'Grupos', value: String(rows.length) }];
        if (rows.length > 2) facts.push({ label: 'Los dos más grandes suman', value: `${pct(((rows[0].v + rows[1].v) / total) * 100)} %` });
        return {
          text: role === 'segments'
            ? `MIO armó ${rows.length} grupos de registros parecidos. El más grande reúne el ${pct(share)} %.`
            : `${cap(top.l)} ${share >= 50 ? 'concentra' : 'es el grupo más grande, con'} el ${pct(share)} % del total.`,
          big: `${pct(share)} %`,
          bigLabel: top.l,
          look: role === 'segments'
            ? 'Cada grupo se comporta distinto: conviene mirarlos por separado en vez de promediar todo.'
            : share >= 50
              ? 'Más de la mitad depende de un solo grupo: si ese grupo cambia, cambia todo el total.'
              : 'Ningún grupo pasa la mitad: el total está repartido.',
          facts,
          rank: rows.slice(0, 3).map((r) => ({ label: r.l, value: `${pct((r.v / total) * 100)} %`, share: r.v / top.v })),
          rankTitle: 'Los más grandes',
          weight: role === 'segments' ? 0.8 : share >= 50 ? 0.6 : 0.55,
        };
      }
    }
    // ── Comparison between groups ──────────────────────────────────────────────────────────
    if (t === 'HorizontalBar' || t === 'Bar' || t === 'Tornado') {
      const firstIsNum = typeof src[0]?.[d[0]] === 'number';
      const [catD, numD] = firstIsNum ? [d[1], d[0]] : [d[0], d[1]];
      const rows = src.map((r) => ({ l: pretty(r[catD]), v: num(r[numD]) })).filter((r) => r.l && r.v != null) as { l: string; v: number }[];
      if (rows.length) {
        const signed = t === 'Tornado' || role === 'shap';
        const sorted = [...rows].sort((a, b) => (signed ? Math.abs(b.v) - Math.abs(a.v) : b.v - a.v));
        const top = sorted[0], low = sorted[sorted.length - 1];
        const metric = pretty(numD);
        const scale = Math.max(...sorted.map((r) => Math.abs(r.v))) || 1;
        const f = fmtApart(rows.map((r) => r.v));
        const rank = sorted.slice(0, 3).map((r) => ({ label: r.l, value: f(r.v), share: Math.abs(r.v) / scale }));
        if (signed) {
          return {
            text: `${cap(top.l)} es lo que más ${top.v < 0 ? 'baja' : 'sube'} el resultado.`,
            big: fmt(top.v),
            bigLabel: top.l,
            look: 'Las barras hacia un lado suben el resultado y hacia el otro lo bajan. Las más largas son las que conviene atender.',
            facts: [
              { label: 'Suben', value: String(rows.filter((r) => r.v > 0).length) },
              { label: 'Bajan', value: String(rows.filter((r) => r.v < 0).length) },
            ],
            rank,
            rankTitle: 'Lo que más influye',
            weight: 0.75,
          };
        }
        const gap = rows.length > 1 && low.v !== 0 ? Math.abs((top.v - low.v) / low.v) * 100 : null;
        const flat = gap != null && gap < 5;
        const facts: Fact[] = [];
        if (rows.length > 1) {
          facts.push({ label: 'Promedio', value: fmt(mean(rows.map((r) => r.v))) });
          facts.push({ label: 'El más bajo', value: `${low.l} · ${f(low.v)}` });
        }
        return {
          // Say it ourselves: the figure is in the data, and "casi no hay diferencia" is a finding too.
          text: flat ? `Casi no hay diferencia entre grupos: todos rondan ${fmt(top.v)}.` : `${cap(top.l)} tiene el valor más alto de ${metric}: ${fmt(top.v)}.`,
          big: fmt(top.v),
          bigLabel: top.l,
          look: gap == null
            ? undefined
            : flat
              ? `Entre el primero y el último hay apenas ${pct(gap)} % de diferencia. Lo que cambia el resultado está en otra columna.`
              : `Entre el primero y el último hay ${pct(gap)} % de diferencia. Vale la pena ver qué hace distinto ${top.l}.`,
          facts,
          rank: rows.length > 1 ? rank : [],
          rankTitle: 'Los primeros',
          // A comparison where every group is the same is the first thing to leave out.
          weight: gap == null ? 0.3 : flat ? 0.15 : Math.min(0.9, 0.5 + gap / 100),
        };
      }
    }
    if (t === 'CorrelationHeatmap') {
      const seen = new Set<string>();
      const pairs: { a: string; b: string; v: number }[] = [];
      for (const r of src) {
        const a = pretty(r.x), b = pretty(r.y), v = num(r.value);
        if (v == null || a === b) continue;
        const k = [a, b].sort().join('|');
        if (seen.has(k)) continue;
        seen.add(k);
        pairs.push({ a, b, v });
      }
      if (pairs.length) {
        const sorted = [...pairs].sort((x, y) => Math.abs(y.v) - Math.abs(x.v));
        const top = sorted[0];
        const s = Math.abs(top.v);
        const coef = (v: number) => v.toLocaleString('es-AR', { maximumFractionDigits: 2 });
        const cols = new Set(pairs.flatMap((q) => [q.a, q.b])).size;
        return {
          text: s < 0.3
            ? 'Ningún par de columnas se mueve claramente junto.'
            : `${cap(top.a)} y ${top.b} son los datos que más se mueven ${top.v < 0 ? 'en sentido contrario' : 'juntos'}.`,
          big: s >= 0.7 ? 'Muy ligados' : s >= 0.4 ? 'Algo ligados' : 'Poco ligados',
          bigLabel: `${top.a} y ${top.b} · correlación ${coef(top.v)}`,
          look: 'Que dos datos se muevan juntos no prueba que uno cause al otro, pero marca dónde mirar primero.',
          facts: [
            { label: 'Columnas comparadas', value: String(cols) },
            { label: 'Pares muy ligados', value: String(pairs.filter((q) => Math.abs(q.v) >= 0.7).length) },
          ],
          rank: sorted.slice(0, 3).map((q) => ({ label: `${q.a} + ${q.b}`, value: coef(q.v), share: Math.abs(q.v) })),
          rankTitle: 'Los pares más ligados',
          weight: 0.45 + 0.45 * Math.min(1, s),
        };
      }
    }
    if (t === 'Scatter' && d.length >= 2) {
      const xs: number[] = [], ys: number[] = [];
      for (const r of src) { const x = num(r[d[0]]), y = num(r[d[1]]); if (x != null && y != null) { xs.push(x); ys.push(y); } }
      if (xs.length > 5) {
        const mx = mean(xs), my = mean(ys);
        let sxy = 0, sxx = 0, syy = 0;
        for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
        const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
        const s = Math.abs(r);
        const word = s >= 0.7 ? 'fuerte' : s >= 0.4 ? 'moderada' : 'débil';
        const X = pretty(d[0]), Y = pretty(d[1]);
        return {
          text: s < 0.2 ? `${cap(X)} y ${Y} casi no tienen relación.` : `Cuando sube ${X}, ${Y} tiende a ${r > 0 ? 'subir' : 'bajar'}.`,
          big: cap(word),
          bigLabel: `relación ${r < 0 ? 'inversa' : 'directa'} entre ${X} y ${Y}`,
          look: s >= 0.4 ? 'Sirve como pista, no como regla: fijate en los puntos que se alejan del resto.' : 'No alcanza para estimar un dato a partir del otro.',
          facts: [
            { label: 'Puntos', value: xs.length.toLocaleString('es-AR') },
            { label: cap(X), value: `de ${fmt(Math.min(...xs))} a ${fmt(Math.max(...xs))}` },
            { label: cap(Y), value: `de ${fmt(Math.min(...ys))} a ${fmt(Math.max(...ys))}` },
          ],
          rank: [],
          weight: 0.3 + 0.6 * Math.min(1, s),
        };
      }
    }
    if (t === 'BoxPlot') {
      const b = (r: AnyRow, i: number) => (Array.isArray(r.box) ? num(r.box[i]) : null);
      const rows = src
        .map((r) => ({ l: pretty(r[d[0]]), min: b(r, 0), q1: b(r, 1), med: b(r, 2), q3: b(r, 3), max: b(r, 4) }))
        .filter((r) => r.med != null) as { l: string; min: number | null; q1: number | null; med: number; q3: number | null; max: number | null }[];
      if (rows.length) {
        const sorted = [...rows].sort((a, c2) => c2.med - a.med);
        const top = sorted[0];
        const many = rows.length > 1;
        const facts: Fact[] = [];
        if (top.q1 != null && top.q3 != null) facts.push({ label: 'La mitad central', value: `de ${fmt(top.q1)} a ${fmt(top.q3)}` });
        if (top.min != null && top.max != null) facts.push({ label: 'Mínimo y máximo', value: `${fmt(top.min)} y ${fmt(top.max)}` });
        return {
          text: many ? `${cap(top.l)} tiene el valor típico más alto: ${fmt(top.med)}.` : `El valor típico es ${fmt(top.med)}.`,
          big: fmt(top.med),
          bigLabel: many ? `valor típico de ${top.l}` : 'valor típico',
          look: 'Cuanto más larga la caja, más disparejo es ese grupo. Los puntos sueltos son casos fuera de lo común.',
          facts,
          rank: many ? sorted.slice(0, 3).map((r) => ({ label: r.l, value: fmtApart(rows.map((q) => q.med))(r.med), share: top.med ? Math.abs(r.med / top.med) : 0 })) : [],
          rankTitle: 'Valor típico más alto',
          weight: 0.4,
        };
      }
    }
    if (t === 'LineChart') {
      const pts = src.map((r) => ({ x: r[d[0]], v: num(r[d[1]]) })).filter((q): q is { x: any; v: number } => q.v != null);
      if (pts.length >= 2 && pts[0].v) {
        const first = pts[0].v, last = pts[pts.length - 1].v;
        const ch = ((last - first) / Math.abs(first)) * 100;
        const name = cap(pretty(d[1]));
        const hi = pts.reduce((a, q) => (q.v > a.v ? q : a)), lo = pts.reduce((a, q) => (q.v < a.v ? q : a));
        const avg = mean(pts.map((q) => q.v));
        const when = (x: any) => { const tt = toTime(x); return tt != null ? ` · ${fmtDate(tt)}` : ''; };
        const vsAvg = avg ? ((last - avg) / Math.abs(avg)) * 100 : 0;
        return {
          text: Math.abs(ch) < 2 ? `${name} se mantuvo casi igual de punta a punta.` : `${name} ${ch < 0 ? 'bajó' : 'subió'} ${pct(ch)} % del primer al último dato.`,
          big: `${ch < 0 ? '−' : '+'}${pct(ch)} %`,
          bigLabel: `de ${fmt(first)} a ${fmt(last)}`,
          look: Math.abs(vsAvg) < 2
            ? 'El último dato está en línea con el promedio del período.'
            : `El último dato está ${pct(vsAvg)} % ${vsAvg > 0 ? 'por encima' : 'por debajo'} del promedio del período.`,
          facts: [
            { label: 'Máximo', value: `${fmt(hi.v)}${when(hi.x)}` },
            { label: 'Mínimo', value: `${fmt(lo.v)}${when(lo.x)}` },
            { label: 'Promedio', value: fmt(avg) },
          ],
          rank: [],
          weight: Math.abs(ch) < 2 ? 0.6 : 0.9,
        };
      }
    }
  } catch { /* fall through to the sentence alone */ }
  return base;
};

/** How much a note has to say: it decides whether its block gets a wide or a narrow slot. */
export const richness = (i: Insight) => (i.big ? 1 : 0) + (i.look ? 1 : 0) + i.facts.length + (i.rank.length ? 2 : 0);

// ── The whole result ─────────────────────────────────────────────────────────────────────────
export const buildModel = (result: any) => {
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
  const trend = hasSeries && pts[0].v
    ? {
        first: pts[0], last: pts[pts.length - 1], change: ((pts[pts.length - 1].v - pts[0].v) / Math.abs(pts[0].v)) * 100, name: pretty(ld[1]),
        hi: pts.reduce((a, q) => (q.v > a.v ? q : a)), lo: pts.reduce((a, q) => (q.v < a.v ? q : a)),
      }
    : null;

  // ── Forecast ───────────────────────────────────────────────────────────────────────────────
  const fChart: Chart | undefined = result?.forecast?.chartData || result?.forecast?.chart_data || undefined;
  const fRows = (fChart?.dataset?.source || []).filter((r) => r.forecast != null);
  const fDate = fChart?.dataset?.dimensions?.[0];
  const fLast = fRows.length ? fRows[fRows.length - 1] : null;
  const forecast = fLast && fDate ? {
    t: toTime(fLast[fDate]), v: num(fLast.forecast), lo: num(fLast.lower),
    hi: num(fLast.upper) ?? (num(fLast.lower) != null && num(fLast.band_width) != null ? (num(fLast.lower) as number) + (num(fLast.band_width) as number) : null),
  } : null;
  const fMetrics: AnyRow | null = result?.forecast?.metrics && !result.forecast.metrics.error ? result.forecast.metrics : null;
  const fErr = result?.forecast?.metrics?.error;
  const mape = num(fMetrics?.mape);
  /** "Acierta 9 de cada 10": only when the backend measured the error. */
  const hitRate = mape != null ? Math.max(0, Math.min(10, Math.round((100 - mape) / 10))) : null;

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
  const oddShare = nRows && oddCount ? (oddCount / nRows) * 100 : null;
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

  // ── Groups: the first "value by category" comparison the classic panel would show ──────────
  const cmp = charts.find((c) => ['HorizontalBar', 'Bar'].includes(typeOf(c)) && (c.dataset?.source?.length ?? 0) >= 2 && !isHistogram(c));
  const cd = cmp?.dataset?.dimensions || [];
  const groups = (cmp?.dataset?.source || [])
    .map((r) => ({ label: pretty(r[cd[0]]), value: num(r[cd[1]]) }))
    .filter((g): g is { label: string; value: number } => !!g.label && g.value != null)
    .sort((a, b) => b.value - a.value);
  const gap = groups.length >= 2 ? { top: groups[0], bottom: groups[groups.length - 1], metric: pretty(cd[1]), by: pretty(cd[0]) } : null;
  // Only worth saying when the groups really differ (5 % or more); a 7,75 vs 7,74 gap is noise.
  const gapRel = gap && gap.bottom.value !== 0 ? Math.abs((gap.top.value - gap.bottom.value) / gap.bottom.value) : 0;
  const realGap = gap && gapRel >= 0.05 ? gap : null;

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
  const findings: Finding[] = [];
  if (trend) {
    const steady = Math.abs(trend.change) < 2;
    findings.push({
      tag: 'Qué pasó',
      big: steady ? fmt(trend.last.v) : `${trend.change < 0 ? '−' : '+'}${pct(trend.change)} %`,
      text: steady
        ? `${cap(trend.name)} casi no cambió entre ${fmtDate(trend.first.t)} y ${fmtDate(trend.last.t)}.`
        : `${cap(trend.name)} ${trend.change < 0 ? 'bajó' : 'subió'} entre ${fmtDate(trend.first.t)} y ${fmtDate(trend.last.t)}: de ${fmt(trend.first.v)} a ${fmt(trend.last.v)}.`,
      detail: `Máximo ${fmt(trend.hi.v)} el ${fmtDate(trend.hi.t)} · mínimo ${fmt(trend.lo.v)} el ${fmtDate(trend.lo.t)}`,
    });
  }
  if (forecast && forecast.t != null && forecast.v != null) {
    findings.push({
      tag: 'Qué viene',
      big: fmt(forecast.v),
      text: `Es lo que MIO estima para el ${fmtDate(forecast.t)}${forecast.lo != null && forecast.hi != null ? `, con un rango razonable entre ${fmt(forecast.lo)} y ${fmt(forecast.hi)}` : ''}.`,
      detail: hitRate != null ? `En las pruebas con tus datos acertó cerca de ${hitRate} de cada 10 veces` : undefined,
    });
  }
  if (realGap) {
    findings.push({
      tag: 'Dónde está la diferencia',
      big: `${pct(gapRel * 100)} %`,
      text: `Es lo que separa a ${realGap.top.label} (${fmt(realGap.top.value)}) de ${realGap.bottom.label} (${fmt(realGap.bottom.value)}) en ${realGap.metric}.`,
      detail: `${groups.length} grupos comparados por ${realGap.by}`,
    });
  }
  if (feats.length) {
    const weight = feats.reduce((a, f) => a + Math.abs(f.value), 0);
    findings.push({
      tag: 'Por qué',
      big: weight > 0 ? `${pct((Math.abs(feats[0].value) / weight) * 100)} %` : undefined,
      text: weight > 0
        ? `del peso${target ? ` en ${target}` : ''} lo tiene ${feats[0].label}${feats[1] ? `, seguido de ${feats[1].label}` : ''}.`
        : `Lo que más pesa${target ? ` en ${target}` : ''} es ${feats[0].label}${feats[1] ? `, seguido de ${feats[1].label}` : ''}.`,
      detail: `${feats.length} columnas evaluadas`,
    });
  }
  if (oddCount > 0) {
    findings.push({
      tag: 'Para revisar',
      big: oddCount.toLocaleString('es-AR'),
      text: `${oddCount === 1 ? 'registro se sale' : 'registros se salen'} de lo normal${oddShare != null ? `: el ${pct(oddShare)} % de la planilla` : ''}.`,
      detail: 'Puede ser algo extraordinario o un error de carga',
    });
  }
  if (segs.length >= 2 && segTotal > 0) {
    findings.push({
      tag: 'Grupos',
      big: String(segs.length),
      text: `grupos de registros parecidos entre sí. El más grande, ${segs[0].label}, reúne el ${pct((segs[0].value / segTotal) * 100)} %.`,
    });
  }

  // ── What to do next: each step exists only if the data behind it does ──────────────────────
  const steps: Step[] = [];
  if (oddCount > 0) steps.push({ title: 'Revisá los valores raros', text: `Abrí los ${oddCount.toLocaleString('es-AR')} registros marcados y separá los errores de carga de los casos reales.` });
  if (feats.length) steps.push({ title: `Empezá por ${feats[0].label}`, text: `Es lo que más mueve ${target || 'el resultado'}. Cualquier cambio ahí se nota antes que en el resto.` });
  if (realGap) steps.push({ title: `Compará ${realGap.top.label} con ${realGap.bottom.label}`, text: `Son los dos extremos en ${realGap.metric}. Lo que hace distinto al primero puede servirle al último.` });
  if (forecast && forecast.lo != null && forecast.hi != null) steps.push({ title: 'Planificá con el rango', text: `Usá el piso (${fmt(forecast.lo)}) y el techo (${fmt(forecast.hi)}) de la estimación, no el número exacto.` });
  if (quality != null && quality < 80) steps.push({ title: 'Completá los datos que faltan', text: `La calidad de la planilla es ${quality}/100. Con menos huecos, el análisis gana precisión.` });
  if (segs.length >= 2) steps.push({ title: 'Mirá cada grupo por separado', text: `Hay ${segs.length} grupos con comportamientos distintos: un promedio general los esconde.` });

  return {
    charts, target, nRows, nCols, quality, trend, hasSeries,
    forecast, fChart, fMetrics, fErr, mape, hitRate,
    aChart, aPlottable, oddCount, oddShare, anomalyRecords, sampleRecords, tableColumns, columnRoles,
    fiChart, shapChart, feats, segChart, radarChart, segs,
    findings: findings.slice(0, 3), steps: steps.slice(0, 3),
  };
};
export type Model = ReturnType<typeof buildModel>;

/** Why there is no estimate, in plain words. The engine reports a raw error; this reads the usual causes. */
export const noForecastReason = (err: any): string => {
  const e = String(err || '').toLowerCase();
  if (/insuf|pocos|few|not enough|at least|m[ií]nim|too short|short/.test(e)) return 'Hay pocos datos en el tiempo para estimar con confianza. Con más meses de historia, MIO puede intentarlo.';
  if (/fecha|date|datetime|time index|frecuen|freq/.test(e)) return 'Las fechas de la planilla no forman una serie pareja (faltan días o hay saltos), y sin eso no se puede proyectar.';
  if (/constant|constante|varianza|variance|nan|null/.test(e)) return 'El dato elegido casi no cambia o tiene demasiados huecos, así que no hay nada que proyectar.';
  return 'MIO no pudo calcular una estimación confiable con estos datos, y prefiere decírtelo antes que inventar un número.';
};

/** Questions worth asking the chat about this result: each one points at something MIO found. */
export const suggestedQuestions = (m: Model): string[] => {
  const q: string[] = [];
  if (m.oddCount > 0) q.push(`¿Cuáles son los ${m.oddCount.toLocaleString('es-AR')} registros fuera de lo normal?`);
  if (m.trend && Math.abs(m.trend.change) >= 2) q.push(`¿Por qué ${m.trend.name} ${m.trend.change < 0 ? 'bajó' : 'subió'} en el período?`);
  if (m.feats.length) q.push(`¿Cómo influye ${m.feats[0].label}${m.target ? ` en ${m.target}` : ''}?`);
  if (m.segs.length >= 2) q.push(`¿En qué se diferencia ${m.segs[0].label} del resto?`);
  if (m.forecast?.v != null) q.push('¿Qué tan confiable es la estimación?');
  if (q.length < 3) q.push('¿Qué debería revisar primero?');
  if (q.length < 3) q.push('¿Qué columnas tienen más datos faltantes?');
  return q.slice(0, 3);
};

/** The forecast as a note: the estimate, its range, and how far to trust it. */
export const forecastInsight = (m: Model): Insight | null => {
  const f = m.forecast;
  if (!f || f.v == null) return null;
  const facts: Fact[] = [];
  if (f.lo != null && f.hi != null) facts.push({ label: 'Rango razonable', value: `de ${fmt(f.lo)} a ${fmt(f.hi)}` });
  if (m.hitRate != null) facts.push({ label: 'En las pruebas acertó', value: `cerca de ${m.hitRate} de cada 10` });
  if (m.mape != null) facts.push({ label: 'Se desvía en promedio', value: `${pct(m.mape)} %` });
  return {
    text: f.t != null ? `Para el ${fmtDate(f.t)}, MIO estima ${fmt(f.v)}.` : `MIO estima ${fmt(f.v)} para el final del período.`,
    big: fmt(f.v),
    bigLabel: f.t != null ? `estimado al ${fmtDate(f.t)}` : 'estimado',
    look: f.lo != null && f.hi != null
      ? 'Planificá con el rango, no con el número exacto: cuanto más lejos en el tiempo, más ancho se vuelve.'
      : 'Es una estimación: tomala como orientación y revisala cuando sumes datos nuevos.',
    facts,
    rank: [],
  };
};

/** The odd records as a note. */
export const anomalyInsight = (m: Model): Insight | null => {
  if (!m.aChart && !m.oddCount) return null;
  const n = m.oddCount;
  const facts: Fact[] = [];
  if (m.nRows != null) facts.push({ label: 'Registros revisados', value: m.nRows.toLocaleString('es-AR') });
  if (m.oddShare != null) facts.push({ label: 'Parte de la planilla', value: `${pct(m.oddShare)} %` });
  return {
    text: n > 0
      ? `${n.toLocaleString('es-AR')} ${n === 1 ? 'registro se aleja' : 'registros se alejan'} de lo que es normal en tu planilla.`
      : 'MIO no encontró registros fuera de lo normal.',
    big: n.toLocaleString('es-AR'),
    bigLabel: n === 1 ? 'registro para revisar' : 'registros para revisar',
    look: n > 0 ? 'Abrilos uno por uno: puede ser una venta extraordinaria o un error de carga. Solo vos sabés cuál.' : undefined,
    facts,
    rank: [],
  };
};

/** Every chart the result carries, in telling order, with its reading. Feeds the bento and the slides. */
export type ChartEntry = { key: string; chart: Chart; kicker: string; title: string; insight: Insight };
export const chartEntries = (m: Model): ChartEntry[] => {
  const out: ChartEntry[] = [];
  const push = (raw: Chart | undefined, key: string, kicker?: string, role?: Role) => {
    if (!raw || !(raw.dataset?.source?.length)) return;
    const chart = inValueOrder(raw);
    out.push({
      key,
      chart,
      kicker: kicker || (isHistogram(chart) ? 'Cómo se reparte' : kindOf(chart).kicker),
      title: tidy(chart.metadata?.title || 'Gráfico'),
      insight: describe(chart, role, m.target),
    });
  };
  m.charts.forEach((c, i) => push(c, `chart-${c.chartId || i}`));
  push(m.fiChart, 'fi', 'Por qué', 'importance');
  push(m.shapChart, 'shap', 'Por qué, registro por registro', 'shap');
  push(m.segChart, 'seg', 'Grupos parecidos', 'segments');
  push(m.radarChart, 'radar', 'Perfil de cada grupo', 'radar');
  return out;
};

/**
 * The short version: the charts with the most to tell, in their telling order, and the rest
 * apart. With few charts there is nothing to cut, so everything stays.
 */
export const pickFeatured = (entries: ChartEntry[], max = 6): { featured: ChartEntry[]; rest: ChartEntry[] } => {
  if (entries.length <= max + 1) return { featured: entries, rest: [] };
  const keep = new Set(
    entries
      .map((e, i) => ({ key: e.key, w: e.insight.weight ?? 0.1, i }))
      .sort((a, b) => b.w - a.w || a.i - b.i)
      .slice(0, max)
      .map((e) => e.key),
  );
  return { featured: entries.filter((e) => keep.has(e.key)), rest: entries.filter((e) => !keep.has(e.key)) };
};

/** The result as plain text, to paste in a chat or a mail. */
export const summaryText = (m: Model, filename: string): string => {
  const meta = [m.nRows != null && `${m.nRows.toLocaleString('es-AR')} filas`, m.nCols != null && `${m.nCols} columnas`].filter(Boolean).join(', ');
  const lines: string[] = [`Análisis de ${filename}${meta ? ` (${meta})` : ''}`];
  if (m.findings.length) {
    lines.push('', 'Lo que encontró MIO:');
    for (const f of m.findings) lines.push(`• ${f.tag}: ${f.big ? `${f.big} ` : ''}${f.text}`);
  } else {
    lines.push('', 'MIO procesó la planilla, pero no encontró nada para destacar con estos datos.');
  }
  if (m.steps.length) {
    lines.push('', 'Qué hacer ahora:');
    m.steps.forEach((s, i) => lines.push(`${i + 1}. ${s.title}. ${s.text}`));
  }
  lines.push('', 'Hecho con MIO');
  return lines.join('\n');
};
