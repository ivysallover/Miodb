import React, { useMemo } from 'react';
import { ColumnChart, LineChart, RankBars, fmtCompact, fmtDate, fmtFull, type ForecastPoint, type SeriesPoint } from './charts';

/**
 * "MIO mejorado": the same analysis result, told in the order a business owner asks:
 * what did MIO find → what happened → what is coming → why → the detail.
 * Read-only over the result the backend already returns; nothing here calls the API.
 */

type AnyRow = Record<string, any>;
const num = (v: any): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const toTime = (v: any): number | null => {
  if (v == null) return null;
  const t = new Date(String(v).replace(' ', 'T')).getTime();
  return Number.isFinite(t) ? t : null;
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pct = (x: number) => Math.abs(x).toLocaleString('es-AR', { maximumFractionDigits: Math.abs(x) < 10 ? 1 : 0 });
/** "59.2K - 67.4K" → 59200, so ranges can be put in value order. */
const rangeStart = (label: string): number => {
  const m = String(label).match(/-?[\d.,]+\s*[KkMm]?/);
  if (!m) return 0;
  const raw = m[0].trim();
  const mult = /[Mm]$/.test(raw) ? 1e6 : /[Kk]$/.test(raw) ? 1e3 : 1;
  return (parseFloat(raw.replace(/[KkMm]/, '').replace(',', '.')) || 0) * mult;
};

interface Props { result: any; isDark: boolean }

export const ResultadoMejorado: React.FC<Props> = ({ result, isDark }) => {
  const model = useMemo(() => {
    const anomDs = result?.anomalies?.chartData?.dataset;
    const evo = (result?.charts || []).find((c: any) => c?.layoutDirectives?.chartType === 'LineChart' || c?.layoutDirectives?.xAxisType === 'time');
    const src: AnyRow[] = anomDs?.source?.length ? anomDs.source : evo?.dataset?.source || [];
    const dims: string[] = (anomDs?.source?.length ? anomDs.dimensions : evo?.dataset?.dimensions) || [];
    const dateKey = dims[0];
    const valKey = dims.find((d) => d !== dateKey && !d.startsWith('_')) || dims[1];

    const points: SeriesPoint[] = [];
    for (const r of src) {
      const t = toTime(r[dateKey]);
      const v = num(r[valKey]);
      if (t == null || v == null) continue;
      points.push({ t, v, flag: r._anomaly === -1 || r._is_anomaly === true });
    }
    points.sort((a, b) => a.t - b.t);

    // Trend on the smoothed (weekly) series when there is one, so one odd day does not decide it.
    const trendSrc: AnyRow[] = evo?.dataset?.source || [];
    const tk = evo?.dataset?.dimensions?.[0];
    const tv = evo?.dataset?.dimensions?.[1];
    const trendPts = (trendSrc.length ? trendSrc.map((r) => ({ t: toTime(r[tk]), v: num(r[tv]) })) : points)
      .filter((p: any) => p.t != null && p.v != null) as { t: number; v: number }[];
    const first = trendPts[0], last = trendPts[trendPts.length - 1];
    const change = first && last && first.v ? ((last.v - first.v) / Math.abs(first.v)) * 100 : null;

    const med = median(points.map((p) => p.v));
    const odd = points.filter((p) => p.flag).map((p) => ({ ...p, dev: med ? ((p.v - med) / Math.abs(med)) * 100 : 0 }));
    const strongest = [...odd].sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev))[0];

    const fSrc: AnyRow[] = result?.forecast?.chartData?.dataset?.source || [];
    const fDate = result?.forecast?.chartData?.dataset?.dimensions?.[0];
    const forecast: ForecastPoint[] = fSrc
      .filter((r) => r.forecast != null)
      .map((r) => {
        const lo = num(r.lower);
        const hi = num(r.upper) ?? (lo != null && num(r.band_width) != null ? lo + (num(r.band_width) as number) : null);
        return { t: toTime(r[fDate]) as number, v: num(r.forecast) as number, lo: lo ?? undefined, hi: hi ?? undefined };
      })
      .filter((p) => p.t != null && p.v != null);

    const feats: { label: string; value: number }[] = (result?.featureImportance?.metrics?.topFeatures || [])
      .map((f: any) => ({ label: String(f.feature ?? f.name ?? f.variable ?? ''), value: num(f.importance ?? f.value ?? f.shap) ?? 0 }))
      .filter((f: any) => f.label)
      .sort((a: any, b: any) => Math.abs(b.value) - Math.abs(a.value))
      .slice(0, 8);

    const hist = (result?.charts || []).find((c: any) => c?.chartId === 'dist_hist' || c?.layoutDirectives?.chartType === 'HorizontalBar');
    const hk = hist?.dataset?.dimensions || [];
    const bins: { label: string; value: number }[] = (hist?.dataset?.source || [])
      .map((r: AnyRow) => ({ label: String(r[hk[0]]), value: num(r[hk[1]]) ?? 0 }))
      .sort((a: any, b: any) => rangeStart(a.label) - rangeStart(b.label));

    return { points, valKey: String(valKey || result?.targetCol || 'valor'), first, last, change, med, odd, strongest, forecast, feats, bins };
  }, [result]);

  const name = cap(model.valKey);
  // No cards: sections are separated by ink rules on the sheet, like a printed report.
  // Only the plots get a surface, and it is square: data containers are mechanical.
  const rule = isDark ? 'border-white/20' : 'border-zinc-900/80';
  const sec = `border-t ${rule} pt-8 sm:pt-10`;
  const plot = `border p-3 sm:p-5 ${isDark ? 'bg-[#0e0d16] border-white/10' : 'bg-white border-zinc-200'}`;
  const fg = isDark ? 'text-white' : 'text-zinc-950';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const kicker = 'font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]';
  const H2 = `font-extrabold tracking-[-0.035em] leading-[1.05] text-2xl sm:text-4xl ${fg}`;

  const fErr = result?.forecast?.metrics?.error;
  const fiErr = result?.featureImportance?.metrics?.error;
  const lastF = model.forecast[model.forecast.length - 1];
  const p = result?.profile || {};
  const nRows = p.nRows ?? p.n_rows, nCols = p.nCols ?? p.n_cols, quality = p.qualityScore ?? p.quality_score;
  const actions: string[] = result?.cleaningReport?.actions || [];
  const k = result?.kpis || {};

  const trendTitle = model.change == null
    ? `${name} en el tiempo`
    : Math.abs(model.change) < 2
    ? `${name} se mantuvo estable`
    : `${name} ${model.change < 0 ? 'bajó' : 'subió'} ${pct(model.change)} %`;

  const findings = [
    {
      tag: 'Qué pasó',
      text: model.change == null || !model.first || !model.last
        ? 'No hay una serie en el tiempo para comparar.'
        : Math.abs(model.change) < 2
        ? `${name} casi no cambió entre ${fmtDate(model.first.t)} y ${fmtDate(model.last.t)}: ronda ${fmtCompact(model.last.v)}.`
        : `${name} ${model.change < 0 ? 'bajó' : 'subió'} ${pct(model.change)} % entre ${fmtDate(model.first.t)} y ${fmtDate(model.last.t)}: de ${fmtCompact(model.first.v)} a ${fmtCompact(model.last.v)}.`,
    },
    {
      tag: 'Fuera de lo normal',
      text: !model.odd.length
        ? 'No encontramos valores que se salgan de lo normal.'
        : `${model.odd.length} ${model.odd.length === 1 ? 'registro se salió' : 'registros se salieron'} de lo normal. El más marcado: ${fmtDate(model.strongest.t)}, con ${fmtCompact(model.strongest.v)} (${pct(model.strongest.dev)} % ${model.strongest.dev < 0 ? 'abajo' : 'arriba'} de lo habitual).`,
    },
    {
      tag: 'Qué viene',
      text: lastF
        ? `Para el ${fmtDate(lastF.t)} MIO estima ${fmtCompact(lastF.v)}${lastF.lo != null && lastF.hi != null ? `, entre ${fmtCompact(lastF.lo)} y ${fmtCompact(lastF.hi)}` : ''}.`
        : 'Con esta planilla MIO no pudo calcular una predicción.',
      off: !lastF,
    },
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* 1. The answer first */}
      <section aria-label="Hallazgos" className={`grid grid-cols-1 lg:grid-cols-3 border-t border-b ${rule}`}>
        {findings.map((f, i) => (
          <article key={f.tag} className={`mio-pop py-6 sm:py-8 ${i > 0 ? `lg:pl-8 border-t lg:border-t-0 lg:border-l ${rule}` : ''} ${i < 2 ? 'lg:pr-8' : ''}`} style={{ animationDelay: `${i * 90}ms` }}>
            <div className="mb-3 flex items-center gap-3">
              <span className={`inline-flex h-7 w-7 items-center justify-center font-mono text-xs font-bold ${f.off ? 'bg-zinc-300 text-zinc-700 dark:bg-white/15 dark:text-zinc-300' : 'bg-[#7647eb] text-white'}`}>{i + 1}</span>
              <span className={kicker}>{f.tag}</span>
            </div>
            <p className={`text-xl sm:text-2xl font-semibold leading-snug tracking-[-0.01em] ${f.off ? muted : fg}`}>{f.text}</p>
          </article>
        ))}
      </section>
      <p className={`font-mono text-[11px] uppercase tracking-wider ${muted}`}>
        {[nRows != null && `${Number(nRows).toLocaleString('es-AR')} filas`, nCols != null && `${nCols} columnas`, quality != null && `calidad de datos ${quality}/100`].filter(Boolean).join(' · ')}
      </p>

      {/* 2. What happened (+ what is coming, on the same axis) */}
      {model.points.length > 1 && (
        <section className={sec}>
          <p className={kicker}>{model.forecast.length ? 'Qué pasó y qué viene' : 'Qué pasó'}</p>
          <h2 className={`mt-2 ${H2}`}>{trendTitle}</h2>
          <div className={`mt-2 mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm ${muted}`}>
            <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[#7647eb]" />{name}</span>
            {model.odd.length > 0 && (
              <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#bdf559] ring-1 ring-black/70" />Fuera de lo normal ({model.odd.length})</span>
            )}
            {model.forecast.length > 0 && (
              <span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-[#7647eb]" />Estimación de MIO, con su margen</span>
            )}
          </div>
          <div className={plot}>
            <LineChart points={model.points} forecast={model.forecast} isDark={isDark} label={name} />
          </div>
        </section>
      )}

      {/* 3 + 4. What is coming / why: shown when the data allows it, explained when it does not */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 border-t ${rule}`}>
        {!lastF && (
          <section className="py-8 sm:py-10 lg:pr-10">
            <p className={kicker}>Qué viene</p>
            <h2 className={`mt-2 ${H2}`}>Sin predicción esta vez.</h2>
            <p className={`mt-3 text-base leading-relaxed ${muted}`}>
              MIO no pudo calcular una estimación confiable con estos datos, y prefiere decírtelo antes que inventar un número.
            </p>
            {fErr && (
              <details className={`mt-4 text-sm ${muted}`}>
                <summary className="cursor-pointer font-medium">Detalle técnico</summary>
                <p className="mt-2 font-mono text-xs">{String(fErr)}</p>
              </details>
            )}
          </section>
        )}
        <section className={`py-8 sm:py-10 ${lastF ? 'lg:col-span-2' : `lg:pl-10 border-t lg:border-t-0 lg:border-l ${rule}`}`}>
          <p className={kicker}>Por qué</p>
          {model.feats.length ? (
            <>
              <h2 className={`mt-2 mb-6 ${H2}`}>Lo que más pesó: {model.feats[0].label}.</h2>
              <RankBars items={model.feats} isDark={isDark} />
            </>
          ) : (
            <>
              <h2 className={`mt-2 ${H2}`}>Falta con qué comparar.</h2>
              <p className={`mt-3 text-base leading-relaxed ${muted}`}>
                Para explicar el porqué hacen falta otras columnas además de la fecha y el número, por ejemplo precio, categoría o descuento.
              </p>
              {fiErr && (
                <details className={`mt-4 text-sm ${muted}`}>
                  <summary className="cursor-pointer font-medium">Detalle técnico</summary>
                  <p className="mt-2 font-mono text-xs">{String(fiErr)}</p>
                </details>
              )}
            </>
          )}
        </section>
      </div>

      {/* 5. How the values are spread, in value order */}
      {model.bins.length > 1 && (
        <section className={sec}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            <div className="lg:col-span-4">
              <p className={kicker}>Cómo se reparte</p>
              <h2 className={`mt-2 ${H2}`}>Lo más común: {[...model.bins].sort((a, b) => b.value - a.value)[0].label.replace(' - ', ' a ')}.</h2>
              <dl className="mt-6 grid grid-cols-3 gap-3 font-mono">
                {[['Mínimo', k.Minimo ?? k.minimo], ['Promedio', k.Promedio ?? k.promedio], ['Máximo', k.Maximo ?? k.maximo]].filter(([, v]) => v != null).map(([l, v]) => (
                  <div key={String(l)}>
                    <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{l}</dt>
                    <dd className={`mt-1 text-lg font-bold ${fg}`}>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="lg:col-span-8">
              <div className={plot}>
                <ColumnChart items={model.bins.map((b) => ({ label: `desde ${b.label.split(' - ')[0]}`, detail: `De ${b.label.replace(' - ', ' a ')}`, value: b.value }))} isDark={isDark} />
              </div>
              <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-zinc-500">Rangos de {model.valKey}, de menor a mayor · el número de arriba es la cantidad de registros</p>
            </div>
          </div>
        </section>
      )}

      {/* 6. The odd records, in plain words */}
      {model.odd.length > 0 && (
        <section className={sec}>
          <p className={kicker}>Para revisar</p>
          <h2 className={`mt-2 mb-5 ${H2}`}>{model.odd.length} {model.odd.length === 1 ? 'registro' : 'registros'} fuera de lo normal.</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className={`border-b font-mono text-[11px] uppercase tracking-wider ${isDark ? 'border-white/15 text-zinc-400' : 'border-zinc-300 text-zinc-500'}`}>
                  <th className="py-2.5 pr-4 font-bold">Fecha</th>
                  <th className="py-2.5 pr-4 font-bold text-right">{name}</th>
                  <th className="py-2.5 font-bold">Cuánto se aleja de lo habitual</th>
                </tr>
              </thead>
              <tbody>
                {model.odd.map((o) => (
                  <tr key={o.t} title={`${fmtDate(o.t)}: ${fmtFull(o.v)}`} className={`group border-b transition-colors ${isDark ? 'border-white/[0.07] hover:bg-white/[0.04]' : 'border-zinc-200 hover:bg-white'}`}>
                    <td className={`py-3 pr-4 font-mono text-sm ${fg}`}>{fmtDate(o.t)}</td>
                    <td className={`py-3 pr-4 font-mono text-sm font-bold text-right tabular-nums ${fg}`}>{fmtFull(o.v)}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-3">
                        <span className={`block h-2 w-28 ${isDark ? 'bg-white/10' : 'bg-zinc-900/[0.06]'}`}>
                          <span className="block h-full origin-left bg-[#7647eb] transition-transform duration-200 group-hover:scale-y-150" style={{ width: `${Math.min(100, Math.abs(o.dev))}%` }} />
                        </span>
                        <span className={`text-sm ${muted}`}>{pct(o.dev)} % {o.dev < 0 ? 'abajo' : 'arriba'}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`mt-3 text-sm ${muted}`}>"Lo habitual" es el valor del medio de toda la planilla ({fmtCompact(model.med)}).</p>
        </section>
      )}

      {/* 7. What MIO did to the sheet */}
      {actions.length > 0 && (
        <details className={`border-t border-b ${rule} py-5`}>
          <summary className={`cursor-pointer text-base font-semibold ${fg}`}>Qué hizo MIO con tu planilla antes de analizarla</summary>
          <ul className={`mt-4 space-y-2 text-sm ${muted}`}>
            {actions.map((a, i) => (
              <li key={i} className="flex gap-3"><span aria-hidden className="font-mono text-[#7647eb]">✓</span>{String(a)}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};

export default ResultadoMejorado;
