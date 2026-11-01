import React, { Suspense, lazy, useRef, useState } from 'react';
import type { Chart, DataShape, Finding, Insight } from './insights';

/**
 * The building blocks of the "Presentación" view and of the slides: solid colour blocks,
 * a chart that fills its block, and the note that reads the chart out loud.
 */

const DynamicChartRenderer = lazy(() => import('@/components/DynamicChartRenderer'));
const capture = () => import('../../../dashboard-ia/frontend/src/components/charts/capture');

export type Tone = 'white' | 'violet' | 'ink' | 'lav' | 'mute';
export const tonesFor = (isDark: boolean): Record<Tone, string> => ({
  white: isDark ? 'bg-pal-surface-dark text-white' : 'bg-white text-zinc-950',
  violet: 'bg-pal-violet text-white',
  ink: isDark ? 'bg-black text-white' : 'bg-pal-ink text-white',
  lav: isDark ? 'bg-pal-night text-white' : 'bg-pal-soft text-zinc-950',
  mute: isDark ? 'bg-pal-night-3 text-zinc-200' : 'bg-pal-mute text-zinc-800',
});
/** Saturated or black blocks: the only ones that get the lima spark. */
export const strongTone = (t: Tone, isDark: boolean) => t === 'violet' || t === 'ink' || (isDark && t === 'lav');
/** Blocks with a dark background, where text is white. */
export const darkTone = (t: Tone, isDark: boolean) => isDark || t === 'violet' || t === 'ink';
const accentFor = (t: Tone, isDark: boolean) => (strongTone(t, isDark) ? 'text-pal-lime' : isDark ? 'text-pal-lavender' : 'text-pal-violet');
export const SPAN: Record<number, string> = {
  3: 'lg:col-span-3', 4: 'lg:col-span-4', 5: 'lg:col-span-5', 6: 'lg:col-span-6',
  7: 'lg:col-span-7', 8: 'lg:col-span-8', 9: 'lg:col-span-9', 12: 'lg:col-span-12',
};
export const H2 = 'font-extrabold tracking-[-0.035em] leading-[1.05] text-2xl sm:text-4xl';

interface BlockProps {
  span: number;
  tone: Tone;
  kicker?: string;
  isDark: boolean;
  className?: string;
  actions?: React.ReactNode;
  id?: string;
  /** The brand's sheet grid inside the block, fading towards the text. */
  sheet?: boolean;
  children: React.ReactNode;
}
export const Block: React.FC<BlockProps> = ({ span, tone, kicker, isDark, className = '', actions, id, sheet, children }) => (
  <section id={id} className={`relative flex min-w-0 flex-col rounded-mio p-6 sm:p-8 ${sheet ? 'isolate overflow-hidden' : ''} ${SPAN[span] || ''} ${tonesFor(isDark)[tone]} ${className}`}>
    {sheet && <div aria-hidden className="mio-sheet-bg mio-block-sheet pointer-events-none absolute inset-0 -z-10" />}
    {(kicker || actions) && (
      <div className="mb-3 flex min-h-[28px] items-start justify-between gap-3">
        {kicker && (
          <p className={`text-[13px] font-bold ${accentFor(tone, isDark)}`}>{kicker}</p>
        )}
        {actions}
      </div>
    )}
    {children}
  </section>
);

/**
 * The shape of the data behind a block, drawn in its corner under the text (no axes: the charts carry the
 * reading). A line for a series; columns for groups, the first one in the accent. Goes in a `sheet` block.
 */
export const DataDrawing: React.FC<{ shape: DataShape; accent: string; className?: string }> = ({ shape, accent, className = 'h-1/2 w-[56%]' }) => {
  const values = shape.values;
  const hi = Math.max(...values), lo = shape.kind === 'bars' ? Math.min(0, ...values) : Math.min(...values);
  const y = (v: number) => (hi > lo ? 96 - ((v - lo) / (hi - lo)) * 92 : 50);
  if (values.length < 2) return null;
  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className={`pointer-events-none absolute bottom-0 right-0 -z-10 ${accent} ${className}`}>
      {shape.kind === 'line' ? (
        <>
          <polygon points={`0,100 ${values.map((v, k) => `${(k / (values.length - 1)) * 100},${y(v)}`).join(' ')} 100,100`} fill="currentColor" opacity="0.1" />
          <polyline points={values.map((v, k) => `${(k / (values.length - 1)) * 100},${y(v)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.45" />
        </>
      ) : (
        values.map((v, k) => {
          const w = 100 / values.length;
          return <rect key={k} x={k * w + w * 0.14} y={y(v)} width={w * 0.72} height={100 - y(v)} rx="1" fill="currentColor" opacity={k === 0 ? 0.38 : 0.15} />;
        })
      )}
    </svg>
  );
};

/** The findings arrive one after the other, in the order of `FINDING_TONES`. */
const POP_DELAY: Partial<Record<Tone, string>> = { lav: '[animation-delay:70ms]', ink: '[animation-delay:140ms]' };

/** What MIO found, as a block of colour: the big number, the sentence that reads it, a detail, and an action under it if there is one. */
export const FindingBlock: React.FC<{ finding: Finding; span: number; tone: Tone; isDark: boolean; children?: React.ReactNode }> = ({ finding: f, span, tone, isDark, children }) => {
  const strong = tone !== 'lav' || isDark;
  return (
    <Block span={span} tone={tone} kicker={f.tag} isDark={isDark} className={`mio-pop ${POP_DELAY[tone] ?? ''}`} sheet={strong}>
      {f.shape && <DataDrawing shape={f.shape} accent={strong ? 'text-pal-lime' : 'text-pal-violet'} />}
      <div className="flex flex-1 flex-col gap-4">
        {f.big && <p className={`font-extrabold leading-none tracking-[-0.045em] text-5xl sm:text-6xl ${strong ? 'text-pal-lime' : 'text-pal-violet'}`}>{f.big}</p>}
        <p className={`font-bold leading-[1.15] tracking-[-0.025em] ${span <= 3 ? 'text-xl' : 'text-2xl sm:text-[1.7rem]'}`}>{f.text}</p>
        {f.detail && <p className={`mt-auto pt-2 text-[13px] leading-relaxed ${strong ? 'text-white/90' : 'text-zinc-600'}`}>{f.detail}</p>}
        {children}
      </div>
    </Block>
  );
};

/** The finding tones and widths, in order, for one, two or three findings in a row. */
export const FINDING_TONES: Tone[] = ['violet', 'lav', 'ink'];
export const findingSpans = (n: number) => (n === 1 ? [12] : n === 2 ? [7, 5] : [5, 4, 3]);

/** PNG and CSV of one chart. `host` is any element that contains the drawn chart. */
export const ChartActions: React.FC<{ chart: Chart; name: string; host: React.RefObject<HTMLElement>; isDark: boolean }> = ({ chart, name, host, isDark }) => {
  const [busy, setBusy] = useState(false);
  const btn = `min-h-[28px] rounded-full px-3 text-[12px] font-bold transition-colors duration-200 cursor-pointer disabled:opacity-40 ${
    isDark ? 'bg-white/[0.07] text-zinc-300 hover:bg-white/15 hover:text-white' : 'bg-[#f3f3f5] text-zinc-600 hover:bg-pal-soft hover:text-zinc-950'
  }`;
  const run = async (kind: 'png' | 'csv') => {
    setBusy(true);
    try {
      const c = await capture();
      if (kind === 'png') {
        const url = c.chartPng(host.current, isDark);
        if (url) c.save(url, `${c.slug(name)}.png`);
      } else {
        c.saveText(c.chartCsv(chart), `${c.slug(name)}.csv`);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex shrink-0 gap-1.5 print:hidden" data-no-slide>
      <button type="button" className={btn} disabled={busy} onClick={() => run('png')} title="Guardar el gráfico como imagen">Imagen</button>
      <button type="button" className={btn} disabled={busy} onClick={() => run('csv')} title="Guardar los datos del gráfico para Excel">Datos</button>
    </div>
  );
};

/** A chart block whose chart stretches to whatever height the row ends up with. */
export const ChartBlock: React.FC<{
  span: number; chart: Chart; id: string; kicker: string; title: string; isDark: boolean; minH?: number; className?: string;
}> = ({ span, chart, id, kicker, title, isDark, minH = 400, className = '' }) => {
  const host = useRef<HTMLDivElement>(null);
  return (
    <Block span={span} tone="white" kicker={kicker} isDark={isDark} className={className} actions={<ChartActions chart={chart} name={title} host={host} isDark={isDark} />}>
      <h3 className="text-xl font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-2xl">{title}</h3>
      <div ref={host} className="relative mt-4 w-full flex-1" style={{ minHeight: minH }}>
        <div className="absolute inset-0">
          <Suspense fallback={<div className={`h-full w-full animate-pulse rounded-mio-sm ${tonesFor(isDark).mute}`} />}>
            <DynamicChartRenderer key={id} payload={chart as any} height="fill" />
          </Suspense>
        </div>
      </div>
    </Block>
  );
};

/**
 * What a chart says, filled top to bottom: the sentence, the headline figure, what to look at,
 * a short ranking and the supporting numbers. Nothing is shown that the data did not give.
 */
export type NoteShape = 'figure' | 'ranking' | 'quote';
/**
 * Three ways to read a chart out loud, picked from what the data gave so a page of notes does
 * not read as one block repeated: the figure leads (a trend, a relation), the ranking leads
 * (groups, weights, shares), or only the sentence (a chart that found nothing to stress).
 */
export const shapeOf = (i: Insight): NoteShape => ((i.weight ?? 0.5) < 0.25 ? 'quote' : i.rank.length ? 'ranking' : 'figure');

export const NoteBody: React.FC<{ insight: Insight; tone: Tone; isDark: boolean; size?: 'sm' | 'md' | 'lg'; hint?: string; fit?: boolean }> = ({ insight: i, tone, isDark, size = 'md', hint, fit }) => {
  const dark = darkTone(tone, isDark);
  const strong = strongTone(tone, isDark);
  const shape = shapeOf(i);
  const headline = {
    sm: 'text-xl sm:text-[1.35rem]', md: 'text-2xl sm:text-[1.7rem]', lg: 'text-3xl sm:text-[2.6rem]',
  }[size];
  // The sentence is the hero of a quote; in the other shapes it steps back for the figure or the ranking.
  const quoteHeadline = size === 'sm' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-[2.4rem]';
  const bigSize = shape === 'figure'
    ? { sm: 'text-6xl', md: 'text-7xl', lg: 'text-7xl sm:text-8xl' }[size]
    : { sm: 'text-3xl', md: 'text-4xl', lg: 'text-5xl sm:text-6xl' }[size];
  const label = `text-[12px] font-semibold ${dark ? 'text-white/90' : 'text-zinc-600'}`;
  const panel = dark ? 'bg-white/[0.09]' : 'bg-white/70';
  const spark = accentFor(tone, isDark);
  const barTop = strong ? 'bg-pal-lime' : dark ? 'bg-pal-lavender' : 'bg-pal-violet';
  const barRest = dark ? 'bg-white/55' : 'bg-pal-violet/45';

  const sentence = (
    <p className={`font-bold leading-[1.13] tracking-[-0.025em] ${shape === 'quote' ? quoteHeadline : headline}`}>{i.text}</p>
  );
  // When the sentence already says the number: no figure beside a ranking, and only the figure when it leads.
  const said = !!i.big && i.text.includes(i.big);
  const figure = i.big && shape !== 'quote' && !(shape === 'ranking' && said) && (
    <div>
      <p className={`font-extrabold leading-none tracking-[-0.045em] ${bigSize} ${spark}`}>{i.big}</p>
      {i.bigLabel && <p className={`mt-2 ${label}`}>{i.bigLabel}</p>}
    </div>
  );
  const look = i.look && (
    shape === 'figure'
      // Under a big figure the advice is a single quiet line, not a panel of its own.
      ? <p className={`border-l-2 pl-3 text-sm font-medium leading-snug sm:text-[15px] ${dark ? 'border-white/30 text-white/85' : 'border-pal-violet/40 text-zinc-800'}`}>{i.look}</p>
      : (
        <div className={`rounded-mio-sm p-4 ${panel}`}>
          <p className={label}>Qué mirar</p>
          <p className={`mt-1.5 font-medium leading-snug ${size === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-[15px]'}`}>{i.look}</p>
        </div>
      )
  );
  const ranking = shape === 'ranking' && i.rank.length > 0 && (
    <div className={`rounded-mio-sm p-4 ${panel}`}>
      {i.rankTitle && <p className={label}>{i.rankTitle}</p>}
      <ul className="mt-2 space-y-2.5">
        {i.rank.map((r, k) => (
          <li key={k} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm" title={`${r.label}: ${r.value}`}>
            <span className="truncate font-semibold">{r.label}</span>
            <span className="font-mono text-[13px] font-bold tabular-nums">{r.value}</span>
            <span className={`col-span-2 h-2 overflow-hidden rounded-full ${dark ? 'bg-white/15' : 'bg-zinc-950/10'}`}>
              <span
                className={`block h-full rounded-full ${k === 0 ? barTop : barRest}`}
                style={{ width: `${Math.max(4, Math.min(100, r.share * 100))}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
  const facts = shape !== 'quote' && i.facts.length > 0 && (
    <dl className={`grid grid-cols-2 gap-2 ${fit && i.rank.length ? '[@media(max-height:780px)]:hidden' : ''}`}>
      {i.facts.map((f, k) => (
        <div key={k} className={`min-w-0 rounded-mio-sm px-3.5 py-3 ${panel} ${i.facts.length % 2 === 1 && k === i.facts.length - 1 ? 'col-span-2' : ''}`}>
          <dt className={label}>{f.label}</dt>
          <dd className="mt-1 text-sm font-bold leading-snug [overflow-wrap:anywhere]">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
  const bare = !i.look && !i.rank.length && !i.facts.length;

  // Ranking leads: the sentence, then the ranking, then the figure small beside the advice.
  if (shape === 'ranking') {
    return (
      <div className="flex flex-1 flex-col gap-4">
        {sentence}
        {ranking}
        <div className="mt-auto flex flex-col gap-3">
          {figure}
          {look}
          {facts}
        </div>
      </div>
    );
  }
  // Figure leads: a short sentence, the big figure, a single line of advice, the facts at the foot.
  return (
    <div className="flex flex-1 flex-col gap-5">
      {!(said && i.bigLabel) && sentence}
      {figure}
      <div className="mt-auto flex flex-col gap-3">
        {look}
        {facts}
        {bare && hint && <p className={`text-sm ${dark ? 'text-white/70' : 'text-zinc-600'}`}>{hint}</p>}
      </div>
    </div>
  );
};
