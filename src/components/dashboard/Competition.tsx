import React from 'react';
import { pct, type Competition } from './insights';

/**
 * Who competed for the forecast and how wrong each one was on the stretches of the sheet that were
 * hidden from it. Shorter bar = closer to what really happened. The simple rule (repeat what came
 * before) is drawn as the line to beat.
 */
export const CompetitionBlock: React.FC<{ c: Competition; isDark: boolean; className?: string }> = ({ c, isDark, className = '' }) => {
  const max = Math.max(...c.entries.map((e) => e.error), c.simple ?? 0) || 1;
  const n = c.entries.length;
  const pair = c.entries.filter((e) => e.winner).length > 1;
  const stretch = c.puntos ? `${c.tramos} tramos de ${c.puntos} ${c.unidad}` : `${c.tramos} tramos`;
  const verdict = c.shown
    ? `Ganó ${pair ? 'el promedio de ' : ''}${c.ganador.replace(' + ', ' y ')}: es la estimación que ves.`
    : 'Ninguno se acercó más que repetir lo de antes, así que no te mostramos una estimación.';

  return (
    <section className={`rounded-mio p-6 sm:p-8 lg:col-span-12 ${isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950'} ${className}`}>
      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        <div>
          <h3 className="text-2xl sm:text-3xl font-extrabold leading-[1.08] tracking-[-0.035em]">
            Compitieron {n} modelos por la estimación.
          </h3>
          <p className={`mt-3 max-w-xl text-[15px] leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            Escondimos {stretch} de tu planilla y cada modelo intentó predecirlos. {verdict}
          </p>
        </div>

        <ul className="mt-6 space-y-3 lg:mt-1" aria-label="Cuánto se equivocó cada modelo, en promedio">
          {c.entries.map((e) => (
            <li key={e.nombre}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={e.winner ? 'font-bold' : ''}>{e.nombre}{e.winner && c.shown ? ' · ganó' : ''}</span>
                <span className="tabular-nums font-semibold">{pct(e.error)} %</span>
              </div>
              <div className={`mt-1.5 h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-[#f3f3f5]'}`} aria-hidden>
                <div
                  className={`h-full rounded-full ${e.winner && c.shown ? 'bg-[#7647eb]' : isDark ? 'bg-white/35' : 'bg-zinc-400'}`}
                  style={{ width: `${Math.max(3, (e.error / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
          {c.simple != null && (
            <li>
              <div className={`flex items-baseline justify-between gap-3 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                <span>Repetir lo de antes (la regla a superar)</span>
                <span className="tabular-nums font-semibold">{pct(c.simple)} %</span>
              </div>
              <div className={`mt-1.5 h-2.5 overflow-hidden rounded-full ${isDark ? 'bg-white/[0.08]' : 'bg-[#f3f3f5]'}`} aria-hidden>
                <div className={`h-full rounded-full ${isDark ? 'bg-[#bdf559]/70' : 'bg-[#0b0914]'}`} style={{ width: `${Math.max(3, (c.simple / max) * 100)}%` }} />
              </div>
            </li>
          )}
        </ul>
      </div>
      <p className={`mt-6 text-[13px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        El número es cuánto se equivocó cada uno en promedio sobre lo que escondimos. Más corto es mejor.
      </p>
    </section>
  );
};
