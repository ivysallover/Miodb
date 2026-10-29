import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Block, FINDING_TONES, FindingBlock, H2, findingSpans } from '@/components/dashboard/blocks';
import { compact, desktop, num, type Overview, type OverviewColumn } from './desktop';
import { categoryColumns, dateColumn, day, edaFindings, month, numberColumns } from './panorama';
import { muted, surface } from './ui';

const KIND: Record<string, string> = { numérica: 'Números', fecha: 'Fechas', categórica: 'Categoría', texto: 'Texto', identificador: 'Código' };
/** Los tramos de una categoría partida, del valor más común al menos (el resto, gris). */
const RAMP = { light: ['#7647eb', '#9b7cf3', '#b9a5ff', '#d3c6ff', '#e9e3ff'], dark: ['#7647eb', '#8f6ff0', '#a58bff', '#c0adff', '#ddd3ff'] };
const pct = (part: number, whole: number) => `${num((part / Math.max(1, whole)) * 100, part / whole < 0.1 ? 1 : 0)} %`;

/** Barras verticales: los tramos de una columna de números o las filas de cada mes (los meses sin filas, en rojo). */
const Bars: React.FC<{ values: number[]; label: string; isDark: boolean; className: string }> = ({ values, label, isDark, className }) => {
  const max = Math.max(...values, 1);
  return (
    <div role="img" aria-label={label} className={`flex items-end gap-[3px] ${className}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`min-w-0 flex-1 rounded-[4px] ${v === 0 ? (isDark ? 'bg-[#ff8a9b]/40' : 'bg-[#b4233a]/25') : isDark ? 'bg-[#a58bff]' : 'bg-[#7647eb]'}`}
          style={{ height: v === 0 ? 4 : `${Math.max(4, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
};

/** Un dato chico en un panel, como los de las notas de Presentación. */
const Fact: React.FC<{ label: string; value: string; isDark: boolean }> = ({ label, value, isDark }) => (
  <div className={`min-w-0 rounded-mio-sm px-3.5 py-3 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
    <p className={`text-xs ${muted(isDark)}`}>{label}</p>
    <p className="mt-0.5 truncate text-lg font-extrabold tabular-nums tracking-[-0.02em]">{value}</p>
  </div>
);

/** Una columna de números: cómo se reparte y sus números. */
const Numeros: React.FC<{ c: OverviewColumn; span: number; isDark: boolean }> = ({ c, span, isDark }) => {
  const n = c.numeros!;
  return (
    <Block span={span} tone="white" kicker="Números" isDark={isDark}>
      <h3 className="text-2xl font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere]">{c.nombre}</h3>
      <Bars values={n.tramos.cuentas} label={`Cómo se reparten los valores de ${c.nombre}`} isDark={isDark} className="mt-5 h-28" />
      <div className={`mt-2 flex justify-between font-mono text-[11px] ${muted(isDark)}`}>
        <span>{compact(n.tramos.desde)}</span>
        <span>{compact(n.tramos.hasta)}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Promedio" value={compact(n.promedio)} isDark={isDark} />
        <Fact label="Mediana" value={compact(n.mediana)} isDark={isDark} />
        <Fact label="Total" value={compact(n.suma)} isDark={isDark} />
        <Fact label="De punta a punta" value={`${compact(n.min)} a ${compact(n.max)}`} isDark={isDark} />
      </div>
      <p className={`mt-auto pt-4 text-[13px] ${muted(isDark)}`}>
        {n.alejados > 0 ? `${num(n.alejados)} filas muy lejos del resto quedan fuera del gráfico. ` : ''}
        {c.vacios > 0 ? `${num(c.vacios)} venían vacías.` : 'Ninguna vacía.'}
      </p>
    </Block>
  );
};

/** Una categoría en una línea: cómo se reparte en tramos de color, con los tres valores más comunes. */
const Categoria: React.FC<{ c: OverviewColumn; rows: number; isDark: boolean }> = ({ c, rows, isDark }) => {
  const v = c.valores!;
  const ramp = RAMP[isDark ? 'dark' : 'light'];
  const shown = v.comunes.slice(0, ramp.length);
  const others = rows - shown.reduce((a, [, k]) => a + k, 0);
  return (
    <li className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:items-center lg:gap-6">
      <div className="min-w-0">
        <p className="truncate text-[16px] font-extrabold tracking-[-0.01em]" title={c.nombre}>{c.nombre}</p>
        <p className={`text-xs ${muted(isDark)}`}>{num(c.distintos)} {c.distintos === 1 ? 'valor' : 'valores distintos'}</p>
      </div>
      <div className="min-w-0">
        <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`Cómo se reparte ${c.nombre}`}>
          {shown.map(([label, k], i) => (
            <span key={label} title={`${label}: ${pct(k, rows)}`} style={{ width: `${(k / Math.max(1, rows)) * 100}%`, background: ramp[i] }} />
          ))}
          {others > 0 && <span title={`Otros: ${pct(others, rows)}`} className={`flex-1 ${isDark ? 'bg-white/15' : 'bg-zinc-950/10'}`} />}
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[13px]">
          {v.comunes.slice(0, 3).map(([label, k], i) => (
            <span key={label} className="inline-flex min-w-0 items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: ramp[i] }} />
              <span className="max-w-[12rem] truncate">{label}</span>
              <span className={`font-mono text-xs tabular-nums ${muted(isDark)}`}>{pct(k, rows)}</span>
            </span>
          ))}
        </p>
      </div>
    </li>
  );
};

/** Color de una correlación: violeta si suben juntas, rojo si van al revés. */
const corrTone = (r: number | null) => (r == null ? 'transparent' : r >= 0 ? `rgba(118, 71, 235, ${Math.abs(r)})` : `rgba(192, 38, 74, ${Math.abs(r)})`);

/**
 * La vista general de la planilla abierta: toda la tabla, antes de elegir qué analizar (`overview.rs`
 * en el motor), con el mismo lenguaje que el resultado: el panorama, lo que se ve de entrada
 * (`edaFindings`), qué revisar, el tiempo, cada número, cómo se reparten las categorías, qué se mueve
 * junto (con tres números o más; con dos lo dice un hallazgo) y el diccionario de columnas.
 */
export const VistaGeneral: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [o, setO] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    desktop.overview().then(setO, (e) => setError(String(e?.message || e)));
  }, []);

  if (error) return <p className={`rounded-mio p-6 ${surface(isDark)}`}>{error}</p>;
  if (!o) {
    return (
      <p className={`flex items-center gap-2 rounded-mio p-6 ${surface(isDark)} ${muted(isDark)}`}>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Mirando toda la planilla…
      </p>
    );
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
      <Block span={8} tone="ink" kicker="Toda la planilla" isDark={isDark}>
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
      <Block span={4} tone="violet" kicker="Calidad" isDark={isDark}>
        <p className="text-6xl font-extrabold leading-none tracking-[-0.045em] text-[#bdf559]">{o.calidad}</p>
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
              <li key={a} className="flex gap-3"><span aria-hidden className="font-mono font-bold text-[#7647eb]">!</span><span>{a}</span></li>
            ))}
          </ul>
        </Block>
      )}

      {/* 4. El tiempo */}
      {dates?.fechas && months.length > 0 && (
        <Block span={12} tone="white" kicker="En el tiempo" isDark={isDark}>
          <h3 className={H2}>Filas por mes, en «{dates.nombre}».</h3>
          <Bars values={months.map(([, k]) => k)} label={`Filas por mes en ${dates.nombre}`} isDark={isDark} className="mt-6 h-36" />
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

      {/* 5. Cada número */}
      {numbers.map((c, i) => (
        <Numeros key={c.nombre} c={c} span={numbers.length % 2 === 1 && i === numbers.length - 1 ? 12 : 6} isDark={isDark} />
      ))}

      {/* 6. Cómo se reparten las categorías */}
      {categories.length > 0 && (
        <Block span={12} tone="white" kicker="Categorías" isDark={isDark}>
          <h3 className={H2}>Cómo se reparten.</h3>
          <ul className="mt-6 space-y-5">
            {categories.map((c) => <Categoria key={c.nombre} c={c} rows={o.filas} isDark={isDark} />)}
          </ul>
        </Block>
      )}

      {/* 7. Qué se mueve junto: el mapa, con tres números o más */}
      {related && (
        <Block span={12} tone="white" kicker="Qué se mueve junto" isDark={isDark}>
          <h3 className={H2}>Cada número contra los demás.</h3>
          <p className={`mt-2 text-sm ${muted(isDark)}`}>Más violeta: suben y bajan juntas. Más rojo: cuando una sube, la otra baja.</p>
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
                      <td key={j} className={`h-11 w-16 rounded-md text-center font-mono tabular-nums ${v != null && Math.abs(v) > 0.55 ? 'text-white' : ''}`} style={{ background: i === j ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,9,20,0.05)') : corrTone(v) }}>
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

      {/* 8. El diccionario de columnas */}
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
