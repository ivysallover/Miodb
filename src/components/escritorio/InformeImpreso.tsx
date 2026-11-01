import React, { Suspense, lazy, useMemo } from 'react';
import { anomalyInsight, buildModel, cap, chartEntries, forecastInsight, tidy, type Chart, type Insight } from '@/components/dashboard/insights';
import { plainCleaning } from '@/components/dashboard/limpieza';
import { Membrete } from './Informe';
import type { Summary } from './resumen';
import type { Brand } from './usePreferences';
import type { Result } from './desktop';

const DynamicChartRenderer = lazy(() => import('@/components/DynamicChartRenderer'));
/** Cuántos valores raros van en la tabla del informe, y cuántas columnas (entran en una hoja A4). */
const ODD_ROWS = 15;
const ODD_COLUMNS = 6;
const cell = (v: unknown) => (v == null ? '' : typeof v === 'number' ? v.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : String(v).replace(/ 00:00:00$/, ''));

/** Un gráfico con lo que dice: su título, la frase que lo lee y sus datos. No se parte entre dos hojas. */
const Seccion: React.FC<{ kicker: string; title: string; chart: Chart; insight: Insight | null }> = ({ kicker, title, chart, insight }) => (
  <section className="mt-8 break-inside-avoid">
    <p className="text-xs font-bold text-pal-violet">{kicker}</p>
    <h2 className="mt-1 text-xl font-extrabold leading-tight tracking-[-0.025em]">{title}</h2>
    {insight?.text && <p className="mt-1.5 text-[14px] leading-snug text-zinc-700">{insight.text}</p>}
    <div className="mt-3 h-[260px] w-full">
      <Suspense fallback={null}>
        <DynamicChartRenderer payload={chart as never} height="fill" forPaper />
      </Suspense>
    </div>
    {insight && insight.facts.length > 0 && (
      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        {insight.facts.map((f) => (
          <div key={f.label} className="flex gap-1.5">
            <dt className="text-zinc-600">{f.label}:</dt>
            <dd className="font-bold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
    )}
  </section>
);

/**
 * El informe para la hoja A4: la carátula con el membrete y lo principal, cada gráfico con su lectura, los
 * valores raros en una tabla y lo que hizo la limpieza. Se arma recién al imprimir (`useImpresion`), en
 * claro y afuera de la pantalla, con el ancho de la hoja, así los gráficos se dibujan para el papel; con
 * `print-informe` en <html> (`globals.css`) se imprime él solo.
 */
export const InformeImpreso: React.FC<{ result: Result; summary: Summary; brand: Brand }> = ({ result, summary: s, brand }) => {
  const m = useMemo(() => buildModel(result), [result]);
  const forecast = forecastInsight(m);
  const odd = anomalyInsight(m);
  const entries = useMemo(() => chartEntries(m), [m]);
  const records = m.anomalyRecords.slice(0, ODD_ROWS);
  const columns = m.tableColumns.slice(0, ODD_COLUMNS);
  const actions = result.cleaningReport?.actions;
  const cleaning = Array.isArray(actions) ? plainCleaning(actions.map(String)) : [];

  return (
    <article className="mio-informe bg-white text-zinc-950">
      <Membrete brand={brand} what="Informe de MIO" className="flex" />
      <p className="mt-6 text-sm font-bold text-pal-violet">Análisis de {s.target}</p>
      <h1 className="mt-1 text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] [overflow-wrap:anywhere]">{s.filename}</h1>
      <p className="mt-2 font-mono text-[12px] text-zinc-600">{s.facts}</p>

      <h2 className="mt-8 text-lg font-extrabold">Lo principal</h2>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {s.findings.map((f, i) => (
          <section key={f.tag} className={`break-inside-avoid rounded-mio p-5 ${i === 0 ? 'bg-pal-violet text-white' : 'bg-pal-soft-3'}`}>
            <p className="text-xs font-bold opacity-75">{f.tag}</p>
            {f.big && <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{f.big}</p>}
            <p className="mt-1 text-[14px] leading-snug">{f.text}</p>
          </section>
        ))}
      </div>

      {s.changes && (
        <section className="mt-2.5 break-inside-avoid rounded-mio bg-[#f3f3f5] p-5">
          <p className="text-xs font-bold text-zinc-600">Desde la última vez</p>
          <p className="mt-1 text-[15px] leading-snug">{s.changes}</p>
        </section>
      )}

      {s.steps.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg font-extrabold">Qué hacer ahora</h2>
          <ol className="mt-3 space-y-3">
            {s.steps.map((st, i) => (
              <li key={st.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pal-lime text-sm font-extrabold">{i + 1}</span>
                <p className="text-[15px] leading-snug">
                  <strong className="font-bold">{st.title}.</strong> {st.text}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {m.fChart && forecast && <Seccion kicker="Qué viene" title={tidy(m.fChart.metadata?.title || 'Predicción')} chart={m.fChart} insight={forecast} />}
      {entries.map((e) => <Seccion key={e.key} kicker={e.kicker} title={cap(e.title)} chart={e.chart} insight={e.insight} />)}

      {records.length > 0 && columns.length > 0 && (
        <section className="mt-8">
          <p className="text-xs font-bold text-pal-violet">Para revisar</p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight tracking-[-0.025em]">Registros fuera de lo normal</h2>
          {odd?.text && <p className="mt-1.5 text-[14px] leading-snug text-zinc-700">{odd.text}</p>}
          <table className="mt-3 w-full text-left text-[12px]">
            <thead>
              <tr className="text-zinc-600">{columns.map((c) => <th key={c} scope="col" className="pb-1.5 pr-3 font-bold">{c}</th>)}</tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="break-inside-avoid">
                  {columns.map((c) => <td key={c} className="py-1 pr-3 tabular-nums">{cell((r as Record<string, unknown>)[c])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {m.oddCount > records.length && <p className="mt-2 text-xs text-zinc-600">Las primeras {records.length} de {m.oddCount.toLocaleString('es-AR')}.</p>}
        </section>
      )}

      {cleaning.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-lg font-extrabold">Qué hizo MIO con la planilla</h2>
          <ul className="mt-2 space-y-1 text-[13px] leading-snug">
            {cleaning.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>
      )}

      <p className="mt-10 text-xs text-zinc-500">Hecho con MIO, en esta compu: la planilla no salió de acá.</p>
    </article>
  );
};
