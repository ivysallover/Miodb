import React, { useEffect, useState } from 'react';
import { Block, FINDING_TONES, FindingBlock, H2, Sparkline, findingSpans } from '@/components/dashboard/blocks';
import { compact, desktop, num, type Overview, type OverviewColumn } from './desktop';
import { categoryColumns, dateColumn, day, edaFindings, month, monthStats, numberColumns } from './panorama';
import { Segmented } from './Segmented';
import { Leyendo } from './Selector';
import { FOCUS, muted, soft, surface } from './ui';

const KIND: Record<string, string> = { numérica: 'Números', fecha: 'Fechas', categórica: 'Categoría', texto: 'Texto', identificador: 'Código' };
const pct = (part: number, whole: number) => `${num((part / Math.max(1, whole)) * 100, part / whole < 0.1 ? 1 : 0)} %`;

/**
 * Barras verticales: los tramos de una columna de números o cada mes (los vacíos, en rojo). Al pasar por
 * encima de cualquier altura de la barra, se resalta y dice su dato (`tip`).
 */
const Bars: React.FC<{ values: number[]; tip: (i: number) => string; label: string; isDark: boolean; className: string; peak?: boolean }> = ({ values, tip, label, isDark, className, peak }) => {
  const max = Math.max(...values, 1);
  const top = peak ? values.indexOf(Math.max(...values)) : -1;
  const solid = isDark ? 'bg-pal-lavender-2' : 'bg-pal-violet';
  return (
    <div role="img" aria-label={label} className={`flex items-end gap-[3px] ${className}`}>
      {values.map((v, i) => (
        <span key={i} className="group relative flex h-full min-w-0 flex-1 items-end rounded-[4px] hover:bg-pal-violet/[0.08]">
          <span
            className={`w-full rounded-[4px] transition-opacity duration-100 group-hover:opacity-100 ${v === 0 ? (isDark ? 'bg-[#ff8a9b]/40' : 'bg-[#b4233a]/25') : solid} ${peak && i !== top ? 'opacity-55' : ''}`}
            style={{ height: v === 0 ? 4 : `${Math.max(3, (v / max) * 100)}%` }}
          />
          <span className={`pointer-events-none absolute bottom-full z-30 mb-1.5 hidden whitespace-nowrap rounded-mio-sm bg-pal-ink px-3 py-1.5 text-[13px] font-bold text-white group-hover:block ${i < values.length / 3 ? 'left-0' : i >= (values.length * 2) / 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
            {tip(i)}
          </span>
        </span>
      ))}
    </div>
  );
};

/** Un número exacto: sin decimales si no los tiene. */
const exact = (n: number) => num(n, Number.isInteger(n) ? 0 : 2);

/** Un dato chico en un panel, como los de las notas de Presentación. */
const Fact: React.FC<{ label: string; value: string; isDark: boolean }> = ({ label, value, isDark }) => (
  <div className={`min-w-0 rounded-mio-sm px-3.5 py-3 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
    <p className={`text-xs ${muted(isDark)}`}>{label}</p>
    <p className="mt-0.5 truncate text-lg font-extrabold tabular-nums tracking-[-0.02em]">{value}</p>
  </div>
);

/** Una columna de números: cómo se reparte, sus números y qué tan concentrada está. */
const Numeros: React.FC<{ c: OverviewColumn; span: number; rows: number; isDark: boolean; onAnalyze?: (column: string) => void }> = ({ c, span, rows, isDark, onAnalyze }) => {
  const n = c.numeros!;
  const { desde, hasta, cuentas } = n.tramos;
  const width = (hasta - desde) / Math.max(1, cuentas.length);
  const notes = [
    n.concentracion != null ? `El 10 % de las filas más altas suma el ${pct(n.concentracion, 1)} del total.` : null,
    n.alejados > 0 ? `${num(n.alejados)} filas muy lejos del resto quedan fuera del gráfico.` : null,
    n.ceros ? `${num(n.ceros)} en cero.` : null,
    n.negativos ? `${num(n.negativos)} negativas.` : null,
    c.vacios > 0 ? `${num(c.vacios)} venían vacías.` : 'Ninguna vacía.',
  ].filter(Boolean);
  return (
    <Block span={span} tone="white" kicker="Números" isDark={isDark} actions={onAnalyze && (
      <button type="button" onClick={() => onAnalyze(c.nombre)} className={`${soft(isDark)} min-h-[32px] px-3 text-[13px]`}>Analizar esta</button>
    )}>
      <h3 className="text-2xl font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere]">{c.nombre}</h3>
      <Bars
        values={cuentas}
        tip={(i) => `De ${compact(desde + i * width)} a ${compact(desde + (i + 1) * width)}: ${num(cuentas[i])} filas (${pct(cuentas[i], rows)})`}
        label={`Cómo se reparten los valores de ${c.nombre}`}
        isDark={isDark}
        className="mt-5 h-32"
      />
      <div className={`mt-2 flex justify-between font-mono text-[11px] ${muted(isDark)}`}>
        <span>{compact(desde)}</span>
        <span>{compact(hasta)}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact label="Total" value={exact(n.suma)} isDark={isDark} />
        <Fact label="Promedio" value={exact(n.promedio)} isDark={isDark} />
        <Fact label="Mediana" value={exact(n.mediana)} isDark={isDark} />
        <Fact label="Mínimo" value={exact(n.min)} isDark={isDark} />
        <Fact label="Máximo" value={exact(n.max)} isDark={isDark} />
        {n.p25 != null && n.p75 != null && <Fact label="La mitad del medio" value={`${compact(n.p25)} a ${compact(n.p75)}`} isDark={isDark} />}
      </div>
      <p className={`mt-auto pt-4 text-[13px] leading-relaxed ${muted(isDark)}`}>{notes.join(' ')}</p>
    </Block>
  );
};

/** Cuántos valores se ven de entrada de cada categoría. */
const FIRST_ROWS = 6;

/**
 * Una categoría: sus valores en lista, con su barra y sus números a la vista, ordenados por filas o por
 * el número principal. Al pasar por encima dice todo lo de ese valor; al tocarlo, filtra por él.
 */
const Categoria: React.FC<{ c: OverviewColumn; rows: number; main: { columna: string; total: number } | null; by: 'filas' | 'principal'; isDark: boolean; onFilter?: (column: string, value: string) => void }> = ({ c, rows, main, by, isDark, onFilter }) => {
  const [open, setOpen] = useState(false);
  const list = c.valores?.lista ?? c.valores?.comunes.map(([v, k]): [string, number, number | null] => [v, k, null]) ?? [];
  const useMain = by === 'principal' && !!main;
  const sorted = useMain ? [...list].sort((a, b) => (b[2] ?? 0) - (a[2] ?? 0)) : list;
  const shown = open ? sorted : sorted.slice(0, FIRST_ROWS);
  const max = Math.max(1e-9, ...sorted.map((r) => Math.abs(useMain ? r[2] ?? 0 : r[1])));
  return (
    <div className="min-w-0">
      <p className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-[17px] font-extrabold tracking-[-0.015em]" title={c.nombre}>{c.nombre}</span>
        <span className={`shrink-0 text-xs ${muted(isDark)}`}>{num(c.distintos)} {c.distintos === 1 ? 'valor' : 'valores'}</span>
      </p>
      <ul className="mt-2.5 space-y-0.5">
        {shown.map(([value, k, sum], i) => {
          const figure = useMain ? sum ?? 0 : k;
          const content = (
            <>
              <span className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate font-semibold">{value}</span>
                <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums">{useMain ? compact(figure) : num(k)} <span className={`font-medium ${muted(isDark)}`}>{useMain ? pct(figure, main!.total) : pct(k, rows)}</span></span>
              </span>
              <span className={`mt-1 block h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-950/[0.07]'}`}>
                <span className={`block h-full rounded-full ${i === 0 ? 'bg-pal-violet' : 'bg-pal-violet/50'}`} style={{ width: `${Math.max(1, (Math.abs(figure) / max) * 100)}%` }} />
              </span>
            </>
          );
          const whole = `${value}: ${num(k)} filas (${pct(k, rows)})${main && sum != null ? ` · ${exact(sum)} de ${main.columna} (${pct(sum, main.total)})` : ''}`;
          const row = `group relative block w-full rounded-mio-sm px-2 py-1.5 text-left ${isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-[#f3f3f5]'}`;
          const tip = (
            <span className={`pointer-events-none absolute bottom-full left-2 z-30 mb-1 hidden max-w-[calc(100%-1rem)] rounded-mio-sm bg-pal-ink px-3 py-1.5 text-[13px] font-bold leading-snug text-white group-hover:block group-focus-visible:block`}>
              {whole}{onFilter && <span className="font-medium text-white/75"> · tocá para ver solo esto</span>}
            </span>
          );
          return (
            <li key={value}>
              {onFilter
                ? <button type="button" onClick={() => onFilter(c.nombre, value)} aria-label={`${whole}. Filtrar por este valor`} className={`${row} cursor-pointer ${FOCUS}`}>{content}{tip}</button>
                : <div className={row}>{content}{tip}</div>}
            </li>
          );
        })}
      </ul>
      {sorted.length > FIRST_ROWS && (
        <button type="button" onClick={() => setOpen(!open)} className={`mt-1 rounded-full px-2 py-1 text-[13px] font-bold text-pal-violet underline-offset-4 hover:underline cursor-pointer ${FOCUS} ${isDark ? 'text-pal-lavender' : ''}`}>
          {open ? 'Ver menos' : `Ver ${num(sorted.length - FIRST_ROWS)} más`}
        </button>
      )}
      {open && c.distintos > sorted.length && <p className={`px-2 text-xs ${muted(isDark)}`}>Y {num(c.distintos - sorted.length)} valores más, que pesan poco.</p>}
    </div>
  );
};

const WEEK = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** El número principal en el tiempo: el total, cómo cerró y mes a mes; al lado, qué días pesa más. */
const Principal: React.FC<{ main: NonNullable<Overview['principal']>; isDark: boolean }> = ({ main, isDark }) => {
  const months = main.meses ?? [];
  const stats = monthStats(months);
  const week = main.dias_semana;
  const weekTop = week ? week.indexOf(Math.max(...week)) : -1;
  return (
    <>
      <Block span={week ? 8 : 12} tone="white" kicker={`Lo principal: ${main.columna}`} isDark={isDark}>
        <h3 className="text-4xl font-extrabold leading-none tracking-[-0.04em] text-pal-violet sm:text-5xl">{exact(main.total)}</h3>
        <p className={`mt-2 text-sm ${muted(isDark)}`}>de {main.columna} en toda la planilla.</p>
        {stats && (
          <>
            <Bars
              values={months.map(([, v]) => v)}
              tip={(i) => `${month(months[i][0])}: ${exact(months[i][1])}`}
              label={`${main.columna} mes a mes`}
              isDark={isDark}
              className="mt-7 h-40"
              peak
            />
            <div className={`mt-2 flex justify-between font-mono text-[11px] ${muted(isDark)}`}>
              <span>{month(months[0][0])}</span>
              {months.length > 2 && <span>{month(months[Math.floor(months.length / 2)][0])}</span>}
              <span>{month(months[months.length - 1][0])}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Fact label={`El mejor mes: ${month(stats.best[0])}`} value={compact(stats.best[1])} isDark={isDark} />
              <Fact label={`El más bajo: ${month(stats.worst[0])}`} value={compact(stats.worst[1])} isDark={isDark} />
              <Fact label={`Cerró en ${month(stats.last[0])}`} value={stats.change == null ? compact(stats.last[1]) : `${compact(stats.last[1])} (${stats.change >= 0 ? '+' : '−'}${num(Math.abs(stats.change) * 100, 0)} %)`} isDark={isDark} />
            </div>
          </>
        )}
      </Block>
      {week && (
        <Block span={4} tone="white" kicker="Por día de la semana" isDark={isDark}>
          <h3 className="text-2xl font-extrabold leading-tight tracking-[-0.03em]">El {WEEK[weekTop]} es el que más pesa.</h3>
          <Bars
            values={week}
            tip={(i) => `${WEEK[i]}: ${exact(week[i])} (${pct(week[i], main.total)})`}
            label={`${main.columna} por día de la semana`}
            isDark={isDark}
            className="mt-6 h-40"
            peak
          />
          <div className={`mt-2 flex gap-[3px] font-mono text-[11px] ${muted(isDark)}`}>
            {WEEK.map((d) => <span key={d} className="min-w-0 flex-1 text-center">{d.slice(0, 2)}</span>)}
          </div>
        </Block>
      )}
    </>
  );
};

/** Color de una correlación: violeta si suben juntas, rojo si van al revés. */
const corrTone = (r: number | null) => (r == null ? 'transparent' : r >= 0 ? `rgb(var(--pal-violet) / ${Math.abs(r)})` : `rgba(192, 38, 74, ${Math.abs(r)})`);

/**
 * La vista general de la planilla abierta: toda la tabla, antes de elegir qué analizar (`overview.rs`
 * en el motor), con el mismo lenguaje que el resultado: el panorama, lo que se ve de entrada
 * (`edaFindings`), qué revisar, el número principal en el tiempo, las filas por mes, cada número, cada
 * categoría, qué se mueve junto (con tres números o más; con dos lo dice un hallazgo) y el diccionario de
 * columnas. Pasando el mouse se lee cada dato; desde acá se puede analizar un número o filtrar por un valor.
 */
export const VistaGeneral: React.FC<{ isDark: boolean; onAnalyze?: (column: string) => void; onFilter?: (column: string, value: string) => void }> = ({ isDark, onAnalyze, onFilter }) => {
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [by, setBy] = useState<'filas' | 'principal'>('principal');
  const [pair, setPair] = useState<string | null>(null);
  useEffect(() => {
    desktop.overview().then(setO, (e) => setError(String(e?.message || e)));
  }, []);

  if (error) return <p className={`rounded-mio p-6 ${surface(isDark)}`}>{error}</p>;
  if (!o) {
    return <Leyendo isDark={isDark} />;
  }

  const findings = edaFindings(o);
  const spans = findingSpans(findings.length);
  const dates = dateColumn(o);
  const numbers = numberColumns(o);
  const categories = categoryColumns(o);
  const t = o.tipos;
  const kinds = ([[t.numeros, 'con números'], [t.fechas, 'de fechas'], [t.categorias, 'de categorías'], [t.textos + t.codigos, 'de texto o códigos']] as const).filter(([k]) => k > 0);
  const dropped = o.filas_originales - o.filas;
  const related = o.relaciones && o.relaciones.columnas.length >= 3 ? o.relaciones : null;
  const months = dates?.fechas?.meses ?? [];

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
      {/* 1. El panorama */}
      <Block span={8} tone="ink" kicker="Toda la planilla" isDark={isDark} sheet>
        <Sparkline values={months.map(([, k]) => k)} accent="text-pal-lime" />
        <h2 className="text-5xl font-extrabold leading-none tracking-[-0.045em] sm:text-7xl">{num(o.filas)} filas</h2>
        {dates?.fechas && (
          <p className="mt-3 text-2xl font-bold tracking-[-0.025em] text-white/85 sm:text-3xl">
            del {day(dates.fechas.desde)} al {day(dates.fechas.hasta)}
          </p>
        )}
        <p className="mt-auto max-w-2xl pt-5 text-base leading-relaxed text-white/80">
          {o.columnas.length} columnas: {kinds.map(([k, l]) => `${k} ${l}`).join(', ')}.
          {dropped > 0 && ` Quedaron afuera ${num(dropped)} filas vacías o repetidas.`}
        </p>
      </Block>
      <Block span={4} tone="violet" kicker="Calidad" isDark={isDark} sheet>
        <p className="text-6xl font-extrabold leading-none tracking-[-0.045em] text-pal-lime">{o.calidad}</p>
        <p className="mt-3 text-xl font-bold leading-snug tracking-[-0.02em]">sobre 100: qué tan lista está para analizar.</p>
        <p className="mt-auto pt-3 text-[13px] text-white/90">Bajan el puntaje las celdas vacías, las filas repetidas y tener pocos números o pocas filas.</p>
      </Block>

      {/* 2. Lo que se ve de entrada */}
      {findings.map((f, i) => (
        <FindingBlock key={f.tag} finding={f} span={spans[i]} tone={FINDING_TONES[i]} isDark={isDark} />
      ))}

      {/* 3. Qué revisar antes de analizar */}
      {o.avisos.length > 0 && (
        <Block span={12} tone="mute" kicker="Antes de analizar" isDark={isDark}>
          <ul className="grid gap-x-10 gap-y-2 text-[15px] lg:grid-cols-2">
            {o.avisos.map((a) => (
              <li key={a} className="flex gap-3"><span aria-hidden className="font-mono font-bold text-pal-violet">!</span><span>{a}</span></li>
            ))}
          </ul>
        </Block>
      )}

      {/* 4. El número principal */}
      {o.principal && <Principal main={o.principal} isDark={isDark} />}

      {/* 5. Cuántas filas hay en el tiempo */}
      {dates?.fechas && months.length > 0 && (
        <Block span={12} tone="white" kicker="En el tiempo" isDark={isDark}>
          <h3 className={H2}>Filas por mes, en «{dates.nombre}».</h3>
          <Bars values={months.map(([, k]) => k)} tip={(i) => `${month(months[i][0])}: ${num(months[i][1])} filas (${pct(months[i][1], o.filas)})`} label={`Filas por mes en ${dates.nombre}`} isDark={isDark} className="mt-6 h-32" />
          <div className={`mt-2 flex justify-between font-mono text-[11px] ${muted(isDark)}`}>
            <span>{month(months[0][0])}</span>
            {months.length > 2 && <span>{month(months[Math.floor(months.length / 2)][0])}</span>}
            <span>{month(months[months.length - 1][0])}</span>
          </div>
          <p className={`mt-4 text-[13px] ${muted(isDark)}`}>
            {dates.fechas.meses_vacios.length ? `Sin filas en ${dates.fechas.meses_vacios.map(month).join(', ')} (en rojo).` : 'Todos los meses tienen filas.'}
          </p>
        </Block>
      )}

      {/* 6. Cada número */}
      {numbers.map((c, i) => (
        <Numeros key={c.nombre} c={c} span={numbers.length % 2 === 1 && i === numbers.length - 1 ? 12 : 6} rows={o.filas} isDark={isDark} onAnalyze={onAnalyze} />
      ))}

      {/* 7. Cada categoría */}
      {categories.length > 0 && (
        <Block span={12} tone="white" kicker="Categorías" isDark={isDark}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={H2}>Dónde está cada cosa.</h3>
            {o.principal && (
              <Segmented label="Ordenar y medir por" group="general-por" value={by} isDark={isDark} onChange={setBy} options={[{ id: 'principal', label: o.principal.columna }, { id: 'filas', label: 'Filas' }]} />
            )}
          </div>
          <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((c) => <Categoria key={c.nombre} c={c} rows={o.filas} main={o.principal ?? null} by={by} isDark={isDark} onFilter={onFilter} />)}
          </div>
        </Block>
      )}

      {/* 8. Qué se mueve junto: el mapa, con tres números o más */}
      {related && (
        <Block span={12} tone="white" kicker="Qué se mueve junto" isDark={isDark}>
          <h3 className={H2}>Cada número contra los demás.</h3>
          <p className={`mt-2 min-h-[1.25rem] text-sm ${pair ? 'font-bold' : muted(isDark)}`} aria-live="polite">{pair ?? 'Más color: más se mueven juntas. Rojo: cuando una sube, la otra baja. Pasá por una celda para leerla.'}</p>
          <div className="mt-5 overflow-x-auto">
            <table className="border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th />
                  {related.columnas.map((c) => <th key={c} scope="col" className="max-w-[7rem] truncate px-1 text-left font-bold" title={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {related.columnas.map((row, i) => (
                  <tr key={row}>
                    <th scope="row" className="max-w-[9rem] truncate pr-2 text-right font-bold" title={row}>{row}</th>
                    {related.matriz[i].map((v, j) => (
                      <td key={j} onMouseEnter={() => setPair(i === j || v == null ? null : `${row} y ${related.columnas[j]}: ${num(v, 2)}. ${Math.abs(v) < 0.3 ? 'Casi no se relacionan.' : v > 0 ? 'Suben y bajan juntas.' : 'Cuando una sube, la otra baja.'}`)} onMouseLeave={() => setPair(null)} className={`h-11 w-16 rounded-md text-center font-mono tabular-nums ${v != null && Math.abs(v) > 0.55 ? 'text-white' : ''}`} style={{ background: i === j ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,9,20,0.05)') : corrTone(v) }}>
                        {i === j || v == null ? '' : num(v, 2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Block>
      )}

      {/* 9. El diccionario de columnas */}
      <Block span={12} tone="mute" kicker="Diccionario de la planilla" isDark={isDark}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className={muted(isDark)}>
                <th scope="col" className="pb-2 pr-4 text-xs font-bold">Columna</th>
                <th scope="col" className="pb-2 pr-4 text-xs font-bold">Tipo</th>
                <th scope="col" className="pb-2 pr-4 text-right text-xs font-bold">Vacías</th>
                <th scope="col" className="pb-2 text-right text-xs font-bold">Valores distintos</th>
              </tr>
            </thead>
            <tbody>
              {o.columnas.map((c) => (
                <tr key={c.nombre}>
                  <td className="max-w-[18rem] truncate py-1.5 pr-4 font-bold" title={c.nombre}>{c.nombre}</td>
                  <td className="py-1.5 pr-4">{KIND[c.tipo] ?? c.tipo}</td>
                  <td className="py-1.5 pr-4 text-right font-mono tabular-nums">{c.vacios > 0 ? `${num(c.vacios)} (${pct(c.vacios, o.filas)})` : '—'}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums">{num(c.distintos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>
    </div>
  );
};
