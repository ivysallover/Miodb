import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { compact, num, type Changes } from './desktop';
import { lilac, muted, surface } from './ui';

/** Cómo se llama cada período, según la frecuencia de la predicción. */
const UNITS: Record<string, [string, string]> = { Diaria: ['día', 'días'], Semanal: ['semana', 'semanas'], Mensual: ['mes', 'meses'] };
const unit = (frecuencia: string, n: number) => (UNITS[frecuencia] ?? ['período', 'períodos'])[n === 1 ? 0 : 1];

/** "+13 %", "−4 %"; `null` si antes era cero. */
const change = (before: number, after: number) => (before === 0 ? null : ((after - before) / Math.abs(before)) * 100);

const day = (secs: number) => new Date(secs * 1000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

/** La diferencia, con su flecha (o "igual"). */
const Delta: React.FC<{ value: number; text: string }> = ({ value, text }) => {
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return value === 0 ? (
    <span className="text-sm font-bold opacity-60">igual</span>
  ) : (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-[#7647eb] px-2 py-0.5 text-xs font-bold text-white">
      <Icon className="h-3.5 w-3.5" aria-hidden /> {text}
    </span>
  );
};

/** Un número de antes y de ahora. */
const Tile: React.FC<{ label: string; value: string; detail: React.ReactNode; isDark: boolean }> = ({ label, value, detail, isDark }) => (
  <div className={`flex min-w-0 flex-col justify-between gap-4 rounded-mio-sm p-5 ${surface(isDark)}`}>
    <span className={`text-xs font-bold ${muted(isDark)} [overflow-wrap:anywhere]`}>{label}</span>
    <span>
      <span className="block text-3xl font-extrabold tabular-nums tracking-[-0.03em]">{value}</span>
      <span className={`mt-1 flex flex-wrap items-center gap-2 text-sm ${muted(isDark)}`}>{detail}</span>
    </span>
  </div>
);

/**
 * Cada período que la predicción de antes miraba como futuro: el rango que daba (la banda), lo que
 * predijo (la raya) y lo que pasó (el punto, violeta si cayó adentro del rango).
 */
const Exam: React.FC<{ periods: NonNullable<Changes['prediccion']>['periodos']; isDark: boolean }> = ({ periods, isDark }) => {
  const shown = periods.slice(-12);
  const [col, h, pad] = [36, 88, 6];
  const values = shown.flatMap((p) => [p.abajo, p.arriba, p.real]);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${shown.length * col} ${h}`} width={shown.length * col} height={h} className="max-w-full shrink-0" role="img" aria-label="La predicción de antes contra lo que pasó">
      {shown.map((p, i) => {
        const x = i * col + col / 2;
        const inside = p.real >= p.abajo && p.real <= p.arriba;
        return (
          <g key={p.fecha}>
            <rect x={x - 8} y={y(p.arriba)} width={16} height={Math.max(2, y(p.abajo) - y(p.arriba))} rx={8} className={isDark ? 'fill-white/10' : 'fill-[#7647eb]/15'} />
            <line x1={x - 8} x2={x + 8} y1={y(p.predicho)} y2={y(p.predicho)} strokeWidth={2} strokeLinecap="round" className={isDark ? 'stroke-white/50' : 'stroke-zinc-950/40'} />
            <circle cx={x} cy={y(p.real)} r={4.5} className={inside ? 'fill-[#7647eb]' : isDark ? 'fill-[#ff8a9b]' : 'fill-[#b4233a]'} />
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Cuando el archivo se actualizó (el mes nuevo): qué cambió desde el análisis anterior de esta misma
 * columna. Filas, el total de lo que se analiza, los valores raros (y cuántos son nuevos) y cómo le
 * fue a la predicción de entonces con lo que pasó de verdad.
 */
export const Cambios: React.FC<{ changes: Changes; target: string; isDark: boolean }> = ({ changes, target, isDark }) => {
  const { filas, total, raros, raros_nuevos: nuevos, prediccion: p } = changes;
  const rows = filas[1] - filas[0];
  // Con un decimal, como se muestra: un 0,04 % es "igual".
  const pct = total && change(total[0], total[1]);
  const totalPct = pct == null ? null : Math.round(pct * 10) / 10;
  const said = [
    rows > 0 ? `entraron ${num(rows)} filas nuevas` : rows < 0 ? `hay ${num(-rows)} filas menos` : 'las filas son las mismas',
    totalPct ? `${target} ${totalPct > 0 ? 'subió' : 'bajó'} ${num(Math.abs(totalPct), 1)} %` : null,
  ].filter(Boolean).join(' y ');

  return (
    <section className={`rounded-mio p-6 sm:p-8 ${lilac(isDark)}`}>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Desde la última vez</h2>
      <p className={`mt-1.5 text-base ${muted(isDark)}`}>
        Comparado con el análisis del {day(changes.desde)}: {said}.
      </p>
      <div className={`mt-5 grid grid-cols-1 gap-2.5 ${total ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Tile label="Filas" value={num(filas[1])} detail={<>antes {num(filas[0])} <Delta value={rows} text={`${rows > 0 ? '+' : '−'}${num(Math.abs(rows))}`} /></>} isDark={isDark} />
        {total && (
          <Tile
            label={`Total de ${target}`}
            value={compact(total[1])}
            detail={<>antes {compact(total[0])} {totalPct != null && <Delta value={totalPct} text={`${totalPct > 0 ? '+' : '−'}${num(Math.abs(totalPct), 1)} %`} />}</>}
            isDark={isDark}
          />
        )}
        <Tile label="Valores raros" value={num(raros[1] ?? 0)} detail={nuevos > 0 ? <strong className="font-bold text-current">{nuevos === 1 ? '1 nuevo' : `${num(nuevos)} nuevos`}</strong> : 'ninguno nuevo'} isDark={isDark} />
        <div className={`col-span-full flex min-w-0 flex-col gap-3 rounded-mio-sm p-5 ${surface(isDark)}`}>
          <span className={`text-xs font-bold ${muted(isDark)}`}>La predicción de entonces</span>
          {p ? (
            <div className="flex flex-wrap items-end justify-between gap-4">
              <span className="min-w-0">
                <span className="block text-2xl font-extrabold tracking-[-0.03em]">
                  Acertó {p.dentro} de {p.periodos.length} {unit(p.frecuencia, p.periodos.length)}
                </span>
                <span className={`mt-1 block text-sm ${muted(isDark)}`}>
                  lo que pasó cayó dentro del rango que dio{p.error_pct != null && ` · erró ${num(p.error_pct, 1)} % en promedio`} · {p.motor}
                </span>
                <span className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${muted(isDark)}`} aria-hidden>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#7647eb]" /> lo que pasó</span>
                  <span className="inline-flex items-center gap-1.5"><span className={`h-0.5 w-3 rounded-full ${isDark ? 'bg-white/50' : 'bg-zinc-950/40'}`} /> lo que predijo</span>
                  <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-[#7647eb]/15'}`} /> el rango que dio</span>
                </span>
              </span>
              <Exam periods={p.periodos} isDark={isDark} />
            </div>
          ) : (
            <span className="text-base">Todavía no se puede comparar: falta que se complete algún período de los que predijo.</span>
          )}
        </div>
      </div>
    </section>
  );
};
