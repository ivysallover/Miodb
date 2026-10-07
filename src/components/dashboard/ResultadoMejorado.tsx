import React, { useMemo, useState } from 'react';
import { AnomalyTableInspector } from '../../../dashboard-ia/frontend/src/features/dashboard/components/AnomalyTableInspector';
import { Block, ChartBlock, H2, NoteBody, type Tone } from './blocks';
import { anomalyInsight, buildModel, chartEntries, forecastInsight, isWide, kindOf, noForecastReason, pickFeatured, richness, tidy, type ChartEntry, type Insight } from './insights';

/**
 * "Presentación": the same analysis the "Trabajo" view shows, told in the order a business owner
 * asks (what MIO found → the charts that back it → what is coming → why → what to review → what
 * to do). Every chart sits next to a note that reads it out loud, so nobody has to know how to
 * read a chart to follow along.
 *
 * It draws every chart with the classic renderer (same chart selection, same tooltips), so it
 * works with any sheet the classic works with. Nothing here calls the API, and nothing is stated
 * unless the data for it is really there (see insights.ts).
 */

interface Props { result: any; isDark: boolean }

// [chart, note, note first]: sizes and sides rotate so the grid stays lively instead of a uniform stack.
const PATTERNS: [number, number, boolean][] = [[8, 4, false], [7, 5, true], [7, 5, false], [8, 4, true]];
const NOTE_TONES: Tone[] = ['lav', 'ink', 'violet', 'mute'];
const LIFT = 'transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1';
const COUNT = ['Una cosa', 'Dos cosas', 'Tres cosas'];

export const ResultadoMejorado: React.FC<Props> = ({ result, isDark }) => {
  const m = useMemo(() => buildModel(result), [result]);
  // The short version first: the charts with the most to tell. The rest is one click away.
  const { featured, rest } = useMemo(() => pickFeatured(chartEntries(m)), [m]);
  const [showAll, setShowAll] = useState(false);
  const fIns = useMemo(() => forecastInsight(m), [m]);
  const aIns = useMemo(() => anomalyInsight(m), [m]);

  const filename = String(result?.filename || 'dataset');
  const cleaning: string[] = Array.isArray(result?.cleaningReport?.actions) ? result.cleaningReport.actions.map(String) : [];

  // Advice that does not depend on the data ("correlation is not causation") is said the first time only.
  const saidLook = new Set<string>();
  const once = (i: Insight): Insight => {
    if (!i.look) return i;
    if (saidLook.has(i.look)) return { ...i, look: undefined };
    saidLook.add(i.look);
    return i;
  };
  let turn = 0;
  /** A chart and, next to it, the colour block that reads it. A note with little to say gets a narrow slot. */
  const pair = (e: Pick<ChartEntry, 'key' | 'chart' | 'kicker' | 'title'> & { insight: Insight }, noteKicker = 'En una frase') => {
    const idx = turn++;
    const wide = isWide(e.chart);
    const insight = once(e.insight);
    const rich = richness(insight) >= 3;
    const [cs, ns, noteFirst] = !rich ? ([9, 3, idx % 2 === 1] as [number, number, boolean]) : wide ? ([8, 4, idx % 2 === 1] as [number, number, boolean]) : PATTERNS[idx % PATTERNS.length];
    const tone = NOTE_TONES[idx % NOTE_TONES.length];
    const chart = <ChartBlock key={`${e.key}-chart`} span={cs} chart={e.chart} id={`${filename}-${e.key}`} kicker={e.kicker} title={e.title} isDark={isDark} minH={wide ? 440 : 400} />;
    const note = (
      <Block key={`${e.key}-note`} span={ns} tone={tone} kicker={noteKicker} isDark={isDark} className={`${LIFT} ${noteFirst ? 'lg:order-first' : ''}`}>
        <NoteBody insight={insight} tone={tone} isDark={isDark} size={ns <= 3 ? 'sm' : 'md'} hint={kindOf(e.chart).hint} />
      </Block>
    );
    // On a phone the chart always comes first and its note right under it; on desktop the side alternates.
    return (
      <div key={e.key} className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:col-span-12 lg:grid-cols-12">
        {chart}
        {note}
      </div>
    );
  };

  const findingTones: Tone[] = ['violet', 'lav', 'ink'];
  const fSpans = m.findings.length === 1 ? [12] : m.findings.length === 2 ? [7, 5] : [5, 4, 3];
  const stepsSpan = cleaning.length ? 7 : 12;

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
      {/* 1. What MIO found */}
      {m.findings.length > 0
        ? m.findings.map((f, i) => {
            const strong = findingTones[i] !== 'lav' || isDark;
            return (
              <Block key={`finding-${i}`} span={fSpans[i]} tone={findingTones[i]} kicker={f.tag} isDark={isDark} className="mio-pop">
                <div className="flex flex-1 flex-col gap-4">
                  {f.big && <p className={`font-extrabold leading-none tracking-[-0.045em] text-5xl sm:text-6xl ${strong ? 'text-[#bdf559]' : 'text-[#7647eb]'}`}>{f.big}</p>}
                  <p className={`font-bold leading-[1.15] tracking-[-0.025em] ${fSpans[i] <= 3 ? 'text-xl' : 'text-2xl sm:text-[1.7rem]'}`}>{f.text}</p>
                  {f.detail && <p className={`mt-auto pt-2 font-mono text-[11px] uppercase leading-relaxed tracking-wider ${strong ? 'text-white/65' : 'text-zinc-600'}`}>{f.detail}</p>}
                </div>
              </Block>
            );
          })
        : (
          <Block span={12} tone="mute" kicker="Resumen" isDark={isDark}>
            <p className="text-xl font-semibold">MIO procesó la planilla, pero no encontró nada para destacar con estos datos.</p>
          </Block>
        )}

      {/* 2. What is coming: the classic forecast chart, read out loud */}
      {m.fChart && fIns
        ? pair({ key: 'forecast', chart: m.fChart, kicker: 'Qué viene', title: tidy(m.fChart.metadata?.title || 'Predicción'), insight: fIns }, m.fLocal ? 'Proyección simple' : 'La estimación')
        : m.hasSeries && (
            <Block span={12} tone="ink" kicker="Qué viene" isDark={isDark}>
              <div className="lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-12">
                <h3 className={H2}>Sin predicción esta vez.</h3>
                <div className="mt-3 lg:mt-0">
                  <p className="max-w-2xl text-base leading-relaxed text-white/75">{noForecastReason(m.fErr)}</p>
                  {m.fErr && (
                    <details className="mt-3 text-sm text-white/60">
                      <summary className="cursor-pointer font-medium">Detalle técnico</summary>
                      <p className="mt-2 font-mono text-xs">{String(m.fErr)}</p>
                    </details>
                  )}
                </div>
              </div>
            </Block>
          )}

      {/* 3. The charts behind the findings: same selection the classic panel makes */}
      {featured.map((e) => pair(e))}
      {rest.length > 0 && (
        <Block span={12} tone="mute" isDark={isDark}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-base font-semibold leading-snug sm:text-lg">
              Estos son los {featured.length} gráficos con más para contar. {rest.length === 1 ? 'Queda 1 más' : `Quedan ${rest.length} más`}, con menos novedad.
            </p>
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
              className="min-h-[44px] shrink-0 rounded-full bg-[#7647eb] px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#602cd1] active:scale-[0.97] cursor-pointer"
            >
              {showAll ? 'Ocultar el resto' : `Ver ${rest.length === 1 ? 'el que falta' : `los ${rest.length} que faltan`}`}
            </button>
          </div>
        </Block>
      )}
      {showAll && rest.map((e) => pair(e))}

      {/* 4. What to review */}
      {m.aChart && aIns && (
        <>
          {m.aPlottable
            ? pair({ key: 'anomalies', chart: m.aChart, kicker: 'Para revisar', title: tidy(m.aChart.metadata?.title || 'Registros fuera de lo normal'), insight: aIns }, 'Fuera de lo normal')
            : (
              <Block span={4} tone="ink" kicker="Para revisar" isDark={isDark} className={LIFT}>
                <NoteBody insight={aIns} tone="ink" isDark={isDark} />
              </Block>
            )}
          {(m.anomalyRecords.length > 0 || m.sampleRecords.length > 0) && (
            <Block span={m.aPlottable ? 12 : 8} tone="white" kicker="Uno por uno" isDark={isDark}>
              <details open={!m.aPlottable}>
                <summary className="cursor-pointer text-lg font-bold">Ver los registros fuera de lo normal</summary>
                <div className="mt-4">
                  <AnomalyTableInspector anomalyRecords={m.anomalyRecords} sampleRecords={m.sampleRecords} tableColumns={m.tableColumns} columnRoles={m.columnRoles} filename={filename} />
                </div>
              </details>
            </Block>
          )}
        </>
      )}

      {/* 5. What to do now, and what MIO did to the sheet */}
      {m.steps.length > 0 && (
        <Block span={stepsSpan} tone="violet" kicker="Qué hacer ahora" isDark={isDark}>
          <h3 className={H2}>{COUNT[m.steps.length - 1]} para hacer con esto.</h3>
          <ol className={`mt-6 grid flex-1 gap-2.5 ${stepsSpan === 12 ? 'sm:grid-cols-3' : ''}`}>
            {m.steps.map((s, i) => (
              <li key={i} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 rounded-mio-sm bg-white/[0.1] p-4 sm:p-5">
                <span className="font-mono text-sm font-bold text-[#bdf559]">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <p className="text-lg font-bold leading-tight tracking-[-0.02em]">{s.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/80">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Block>
      )}
      {cleaning.length > 0 && (
        <Block span={m.steps.length ? 5 : 12} tone="mute" kicker="Antes de analizar" isDark={isDark}>
          <h3 className="text-xl font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-2xl">Qué hizo MIO con tu planilla.</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {cleaning.slice(0, 5).map((a, i) => (
              <li key={i} className="flex gap-3"><span aria-hidden className="font-mono text-[#7647eb]">✓</span><span>{a}</span></li>
            ))}
          </ul>
          {cleaning.length > 5 && (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-bold">Ver {cleaning.length - 5} más</summary>
              <ul className="mt-2 space-y-2">
                {cleaning.slice(5).map((a, i) => (
                  <li key={i} className="flex gap-3"><span aria-hidden className="font-mono text-[#7647eb]">✓</span><span>{a}</span></li>
                ))}
              </ul>
            </details>
          )}
        </Block>
      )}
    </div>
  );
};

export default ResultadoMejorado;
