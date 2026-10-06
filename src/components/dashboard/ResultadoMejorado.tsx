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
  // "Planilla viva": the report is one solid sheet. Cells are merged blocks with flat colour fills,
  // packed edge to edge inside a single frame, with column letters and row numbers like the real
  // thing. No floating cards, no hairline-and-air layout.
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const H2 = 'font-extrabold tracking-[-0.035em] leading-[1.03] text-3xl sm:text-5xl';
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

  const TONES = {
    white: isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950',
    violet: 'bg-[#7647eb] text-white',
    ink: isDark ? 'bg-black text-white' : 'bg-[#0b0914] text-white',
    lav: isDark ? 'bg-[#2a1766] text-white' : 'bg-[#e4dcff] text-zinc-950',
    mute: isDark ? 'bg-[#14121f] text-zinc-200' : 'bg-zinc-100 text-zinc-800',
  } as const;
  type Tone = keyof typeof TONES;
  const SPAN: Record<number, string> = { 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6', 7: 'lg:col-span-7', 8: 'lg:col-span-8', 12: 'lg:col-span-12' };
  const onColour = (t: Tone) => t === 'violet' || t === 'ink';

  const Cell: React.FC<{ span: number; tone: Tone; at: string; kicker?: string; className?: string; children: React.ReactNode }> = ({ span, tone, at, kicker: kick, className = '', children }) => (
    <section className={`relative min-w-0 p-5 sm:p-7 ${SPAN[span]} ${TONES[tone]} ${className}`}>
      <div className="mb-4 flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
        <span className={onColour(tone) ? 'text-[#bdf559]' : 'text-[#7647eb] dark:text-[#a78bfa]'}>{kick}</span>
        <span className="opacity-50">{at}</span>
      </div>
      {children}
    </section>
  );
  const Row: React.FC<{ n: number }> = ({ n }) => (
    <div aria-hidden="true" className={`hidden lg:flex items-start justify-center pt-3 font-mono text-[10px] ${TONES.mute}`}><span className="opacity-60">{n}</span></div>
  );
  const soft = (t: Tone) => (onColour(t) ? 'text-white/75' : muted);

  return (
    <div className={`grid grid-cols-1 gap-px border lg:grid-cols-[36px_repeat(12,minmax(0,1fr))] ${isDark ? 'border-white/30 bg-white/25' : 'border-zinc-950 bg-zinc-950'}`}>
      {/* Column letters */}
      <div aria-hidden="true" className={`hidden lg:block ${TONES.mute}`} />
      {'ABCDEFGHIJKL'.split('').map((c) => (
        <div key={c} aria-hidden="true" className={`hidden lg:block py-1 text-center font-mono text-[10px] ${TONES.mute}`}><span className="opacity-60">{c}</span></div>
      ))}

      {/* Formula bar: the headline finding, as the sheet would show it */}
      <div aria-hidden="true" className={`hidden lg:flex items-center justify-center font-mono text-[11px] italic ${TONES.mute}`}>fx</div>
      <p className={`lg:col-span-12 px-5 py-3 font-mono text-xs sm:text-sm ${TONES.white}`}>
        <span className="text-[#7647eb] dark:text-[#a78bfa]">=RESUMEN({model.valKey})</span>
        <span className={`ml-3 ${muted}`}>
          {[nRows != null && `${Number(nRows).toLocaleString('es-AR')} filas`, nCols != null && `${nCols} columnas`, quality != null && `calidad de datos ${quality}/100`].filter(Boolean).join(' · ')}
        </span>
      </p>

      {/* 1. The answer first: three merged cells, flat colour */}
      <Row n={1} />
      {findings.map((f, i) => {
        const tone: Tone = i === 0 ? 'violet' : i === 1 ? 'lav' : f.off ? 'mute' : 'ink';
        return (
          <Cell key={f.tag} span={4} tone={tone} at={['A1', 'E1', 'I1'][i]} kicker={f.tag} className="mio-pop">
            <p className={`text-xl sm:text-[1.7rem] font-bold leading-[1.15] tracking-[-0.02em] ${f.off ? soft(tone) : ''}`}>{f.text}</p>
          </Cell>
        );
      })}

      {/* 2. What happened (+ what is coming, on the same axis) */}
      {model.points.length > 1 && (
        <>
          <Row n={2} />
          <Cell span={12} tone="white" at="A2" kicker={model.forecast.length ? 'Qué pasó y qué viene' : 'Qué pasó'}>
            <h2 className={H2}>{trendTitle}</h2>
            <div className={`mt-3 mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm ${muted}`}>
              <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[#7647eb]" />{name}</span>
              {model.odd.length > 0 && (
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#bdf559] ring-1 ring-black/70" />Fuera de lo normal ({model.odd.length})</span>
              )}
              {model.forecast.length > 0 && (
                <span className="flex items-center gap-2"><span className="h-0.5 w-5 border-t-2 border-dashed border-[#7647eb]" />Estimación de MIO, con su margen</span>
              )}
            </div>
            <LineChart points={model.points} forecast={model.forecast} isDark={isDark} label={name} />
          </Cell>
        </>
      )}

      {/* 3. What is coming / why */}
      <Row n={3} />
      {!lastF && (
        <Cell span={6} tone="ink" at="A3" kicker="Qué viene">
          <h2 className={H2}>Sin predicción esta vez.</h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/75">
            MIO no pudo calcular una estimación confiable con estos datos, y prefiere decírtelo antes que inventar un número.
          </p>
          {fErr && (
            <details className="mt-4 text-sm text-white/60">
              <summary className="cursor-pointer font-medium">Detalle técnico</summary>
              <p className="mt-2 font-mono text-xs">{String(fErr)}</p>
            </details>
          )}
        </Cell>
      )}
      <Cell span={lastF ? 12 : 6} tone={model.feats.length ? 'white' : 'mute'} at={lastF ? 'A3' : 'G3'} kicker="Por qué">
        {model.feats.length ? (
          <>
            <h2 className={`mb-6 ${H2}`}>Lo que más pesó: {model.feats[0].label}.</h2>
            <RankBars items={model.feats} isDark={isDark} />
          </>
        ) : (
          <>
            <h2 className={H2}>Falta con qué comparar.</h2>
            <p className={`mt-4 max-w-md text-base leading-relaxed ${muted}`}>
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
      </Cell>

      {/* 4. How the values are spread, in value order */}
      {model.bins.length > 1 && (
        <>
          <Row n={4} />
          <Cell span={4} tone="lav" at="A4" kicker="Cómo se reparte">
            <h2 className={H2}>Lo más común: {[...model.bins].sort((a, b) => b.value - a.value)[0].label.replace(' - ', ' a ')}.</h2>
            <dl className="mt-8 grid grid-cols-3 gap-3 font-mono">
              {[['Mínimo', k.Minimo ?? k.minimo], ['Promedio', k.Promedio ?? k.promedio], ['Máximo', k.Maximo ?? k.maximo]].filter(([, v]) => v != null).map(([l, v]) => (
                <div key={String(l)}>
                  <dt className="text-[10px] uppercase tracking-wider opacity-60">{l}</dt>
                  <dd className="mt-1 text-lg font-bold">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </Cell>
          <Cell span={8} tone="white" at="E4" kicker={`Rangos de ${model.valKey}, de menor a mayor`}>
            <ColumnChart items={model.bins.map((b) => ({ label: `desde ${b.label.split(' - ')[0]}`, detail: `De ${b.label.replace(' - ', ' a ')}`, value: b.value }))} isDark={isDark} />
          </Cell>
        </>
      )}

      {/* 5. The odd records: an actual sheet range */}
      {model.odd.length > 0 && (
        <>
          <Row n={5} />
          <Cell span={12} tone="white" at="A5" kicker="Para revisar" className="!pb-0">
            <div className="pb-5">
              <h2 className={H2}>{model.odd.length} {model.odd.length === 1 ? 'registro' : 'registros'} fuera de lo normal.</h2>
            </div>
            <div className="-mx-5 sm:-mx-7 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className={`font-mono text-[11px] uppercase tracking-wider ${TONES.ink}`}>
                    <th className="px-5 sm:px-7 py-3 font-bold">Fecha</th>
                    <th className="px-4 py-3 font-bold text-right">{name}</th>
                    <th className="px-5 sm:px-7 py-3 font-bold">Cuánto se aleja de lo habitual</th>
                  </tr>
                </thead>
                <tbody>
                  {model.odd.map((o) => (
                    <tr key={o.t} title={`${fmtDate(o.t)}: ${fmtFull(o.v)}`} className={`group border-t transition-colors ${isDark ? 'border-white/15 hover:bg-white/[0.06]' : 'border-zinc-950/15 hover:bg-[#e4dcff]'}`}>
                      <td className="px-5 sm:px-7 py-3.5 font-mono text-sm">{fmtDate(o.t)}</td>
                      <td className="px-4 py-3.5 font-mono text-sm font-bold text-right tabular-nums">
                        <span className="inline-block bg-[#bdf559] px-1.5 text-black transition-transform duration-200 group-hover:-translate-y-0.5">{fmtFull(o.v)}</span>
                      </td>
                      <td className="px-5 sm:px-7 py-3.5">
                        <span className="flex items-center gap-3">
                          <span className={`block h-2.5 w-32 ${isDark ? 'bg-white/10' : 'bg-zinc-950/10'}`}>
                            <span className="block h-full origin-left bg-[#7647eb] transition-transform duration-200 group-hover:scale-y-150" style={{ width: `${Math.min(100, Math.abs(o.dev))}%` }} />
                          </span>
                          <span className="text-sm font-medium">{pct(o.dev)} % {o.dev < 0 ? 'abajo' : 'arriba'}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`-mx-5 sm:-mx-7 px-5 sm:px-7 py-4 text-sm ${TONES.mute}`}>"Lo habitual" es el valor del medio de toda la planilla ({fmtCompact(model.med)}).</p>
          </Cell>
        </>
      )}

      {/* 6. What MIO did to the sheet */}
      {actions.length > 0 && (
        <>
          <Row n={6} />
          <Cell span={12} tone="mute" at="A6" kicker="Antes de analizar">
            <details>
              <summary className="cursor-pointer text-lg font-bold">Qué hizo MIO con tu planilla</summary>
              <ul className="mt-4 space-y-2 text-sm">
                {actions.map((a, i) => (
                  <li key={i} className="flex gap-3"><span aria-hidden className="font-mono text-[#7647eb]">✓</span>{String(a)}</li>
                ))}
              </ul>
            </details>
          </Cell>
        </>
      )}
    </div>
  );
};

export default ResultadoMejorado;
