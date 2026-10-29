import React, { useEffect, useState } from 'react';
import { CalendarRange, Hash, Loader2, ShieldAlert, Tags, Type } from 'lucide-react';
import { compact, desktop, num, type Overview, type OverviewColumn } from './desktop';
import { lilac, muted, slab, slabText, surface } from './ui';

const KINDS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  numérica: { label: 'Números', icon: Hash },
  fecha: { label: 'Fechas', icon: CalendarRange },
  categórica: { label: 'Categoría', icon: Tags },
  texto: { label: 'Texto', icon: Type },
  identificador: { label: 'Código', icon: Type },
};

/** Barras verticales chicas (los tramos de una columna de números o las filas por mes). */
const Bars: React.FC<{ values: number[]; isDark: boolean; label: string }> = ({ values, isDark, label }) => {
  const max = Math.max(...values, 1);
  const [w, h, gap] = [240, 56, 2];
  const bw = (w - gap * (values.length - 1)) / values.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none" role="img" aria-label={label}>
      {values.map((v, i) => {
        const bh = v === 0 ? 0 : Math.max(2, (v / max) * h);
        return <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={2} className={v === 0 ? '' : isDark ? 'fill-[#a58bff]' : 'fill-[#7647eb]'} />;
      })}
    </svg>
  );
};

/** Una columna: su tipo, vacíos y distintos, y cómo se reparte según lo que es. */
const Columna: React.FC<{ c: OverviewColumn; rows: number; isDark: boolean }> = ({ c, rows, isDark }) => {
  const kind = KINDS[c.tipo] ?? KINDS.texto;
  const Icon = kind.icon;
  const empty = c.vacios / Math.max(1, rows);
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-mio p-5 ${surface(isDark)}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-lg font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">{c.nombre}</h3>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${lilac(isDark)}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden /> {kind.label}
        </span>
      </div>

      {c.numeros && (
        <>
          <Bars values={c.numeros.tramos.cuentas} isDark={isDark} label={`Cómo se reparten los valores de ${c.nombre}`} />
          <div className={`-mt-2 flex justify-between font-mono text-[11px] ${muted(isDark)}`}>
            <span>{compact(c.numeros.tramos.desde)}</span>
            <span>{c.numeros.alejados > 0 ? `${compact(c.numeros.tramos.hasta)} · hasta ${compact(c.numeros.max)}` : compact(c.numeros.tramos.hasta)}</span>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            {[['Promedio', c.numeros.promedio], ['Mediana', c.numeros.mediana], ['Total', c.numeros.suma]].map(([k, v]) => (
              <div key={k as string}>
                <dt className={`text-xs ${muted(isDark)}`}>{k}</dt>
                <dd className="font-bold tabular-nums">{compact(v as number)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {c.fechas && (
        <>
          <Bars values={c.fechas.meses.map(([, k]) => k)} isDark={isDark} label={`Filas por mes en ${c.nombre}`} />
          <p className="-mt-2 text-sm">
            Del <strong className="font-bold">{c.fechas.desde.split('-').reverse().join('/')}</strong> al <strong className="font-bold">{c.fechas.hasta.split('-').reverse().join('/')}</strong>
            <span className={muted(isDark)}> · {c.fechas.meses.length} {c.fechas.meses.length === 1 ? 'mes' : 'meses'}</span>
          </p>
        </>
      )}

      {c.valores && (
        <ul className="space-y-1.5 text-sm">
          {c.valores.comunes.map(([v, k]) => (
            <li key={v} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
              <span className="truncate" title={v}>{v}</span>
              <span className={`font-mono text-xs tabular-nums ${muted(isDark)}`}>{num(k)}</span>
              <span className={`col-span-2 mt-0.5 h-1.5 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-950/[0.06]'}`}>
                <span className={`block h-full rounded-full ${isDark ? 'bg-[#a58bff]' : 'bg-[#7647eb]'}`} style={{ width: `${(k / Math.max(1, rows)) * 100}%` }} />
              </span>
            </li>
          ))}
          {c.valores.resto > 0 && <li className={`text-xs ${muted(isDark)}`}>y {num(c.valores.resto)} filas con otros valores</li>}
        </ul>
      )}

      <p className={`mt-auto text-xs ${muted(isDark)}`}>
        {num(c.distintos)} {c.distintos === 1 ? 'valor distinto' : 'valores distintos'}
        {c.vacios > 0 && ` · ${num(c.vacios)} vacías (${num(empty * 100, 1)} %)`}
        {c.numeros && c.numeros.alejados > 0 && ` · ${num(c.numeros.alejados)} lejos del resto`}
      </p>
    </section>
  );
};

/** Color de una correlación: violeta si suben juntas, rojo si una sube cuando la otra baja. */
const tone = (r: number | null) => (r == null ? 'transparent' : r >= 0 ? `rgba(118, 71, 235, ${Math.abs(r)})` : `rgba(192, 38, 74, ${Math.abs(r)})`);

/** Qué columnas de números se mueven juntas: el mapa de todas contra todas y los pares fuertes, en palabras. */
const Relaciones: React.FC<{ r: NonNullable<Overview['relaciones']>; isDark: boolean }> = ({ r, isDark }) => (
  <section className={`grid grid-cols-1 gap-6 rounded-mio p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] ${surface(isDark)}`}>
    <div className="min-w-0">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Qué se mueve junto</h2>
      <p className={`mt-1 text-sm ${muted(isDark)}`}>Más violeta: suben y bajan juntas. Más rojo: cuando una sube, la otra baja.</p>
      <div className="mt-5 overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th />
              {r.columnas.map((c) => (
                <th key={c} scope="col" className="max-w-[6rem] truncate px-1 text-left font-bold" title={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.columnas.map((row, i) => (
              <tr key={row}>
                <th scope="row" className="max-w-[8rem] truncate pr-2 text-right font-bold" title={row}>{row}</th>
                {r.matriz[i].map((v, j) => (
                  <td key={j} className={`h-10 w-14 rounded-md text-center font-mono tabular-nums ${v != null && Math.abs(v) > 0.55 ? 'text-white' : ''}`} style={{ background: i === j ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,9,20,0.05)') : tone(v) }}>
                    {i === j || v == null ? '' : num(v, 2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <div>
      <h3 className="text-base font-extrabold">Lo más fuerte</h3>
      {r.fuertes.length ? (
        <ul className="mt-3 space-y-3">
          {r.fuertes.map((p) => (
            <li key={`${p.a}-${p.b}`} className={`rounded-mio-sm p-4 text-sm ${lilac(isDark)}`}>
              <strong className="font-bold">{p.a}</strong> y <strong className="font-bold">{p.b}</strong> {p.r >= 0 ? 'suben y bajan juntas' : 'van al revés: cuando una sube, la otra baja'}
              <span className={`block font-mono text-xs ${muted(isDark)}`}>correlación {num(p.r, 2)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-3 text-sm ${muted(isDark)}`}>Ningún par de columnas se mueve claramente junto. Acompañar no es causar: es una pista para mirar.</p>
      )}
    </div>
  </section>
);

/**
 * La vista general de la planilla abierta: toda la tabla de un vistazo, antes de elegir qué analizar
 * (`overview.rs` en el motor). De cada columna, cómo se reparte; qué números se mueven juntos; y lo que
 * conviene revisar. La pide al motor la primera vez que se muestra.
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
  const t = o.tipos;
  const kinds = [
    [t.numeros, 'con números'],
    [t.fechas, 'de fechas'],
    [t.categorias, 'de categorías'],
    [t.textos + t.codigos, 'de texto o códigos'],
  ].filter(([k]) => (k as number) > 0);
  return (
    <>
      <section className={`rounded-mio p-6 sm:p-8 ${slab(isDark)}`}>
        <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Toda la planilla</h2>
        <p className={`mt-2 max-w-3xl text-base leading-relaxed ${slabText(isDark)}`}>
          {num(o.filas)} filas y {o.columnas.length} columnas: {kinds.map(([k, l]) => `${k} ${l}`).join(', ')}. Calidad {o.calidad}/100.
          {o.filas_originales > o.filas && ` Quedaron afuera ${num(o.filas_originales - o.filas)} filas vacías o repetidas.`}
        </p>
      </section>

      {o.avisos.length > 0 && (
        <section className={`rounded-mio p-6 sm:p-8 ${lilac(isDark)}`}>
          <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.02em]">
            <ShieldAlert className="h-5 w-5 text-[#7647eb]" aria-hidden /> Para revisar antes de analizar
          </h2>
          <ul className="mt-3 space-y-1.5 text-[15px]">
            {o.avisos.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 2xl:grid-cols-3">
        {o.columnas.map((c) => <Columna key={c.nombre} c={c} rows={o.filas} isDark={isDark} />)}
      </div>

      {o.relaciones && <Relaciones r={o.relaciones} isDark={isDark} />}
    </>
  );
};
