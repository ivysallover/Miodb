import React from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { num, type Asking } from './desktop';
import { PRIMARY, lilac, muted, slab, slabText, soft } from './ui';

const when = (secs: number) => new Date(secs * 1000).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Un resultado calculado con una versión anterior de MIO: se muestra igual (la planilla no cambió) y se
 * recalcula cuando la persona quiere, porque con una planilla grande puede tardar mucho.
 */
export const Desactualizado: React.FC<{ busy: boolean; isDark: boolean; onRecalculate: () => void }> = ({ busy, isDark, onRecalculate }) => (
  <section className={`flex flex-col gap-4 rounded-mio p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${lilac(isDark)}`} data-no-print>
    <div className="min-w-0">
      <h2 className="text-lg font-extrabold tracking-[-0.02em]">Hay una versión nueva de MIO.</h2>
      <p className={`mt-1 max-w-3xl text-[14px] leading-relaxed ${muted(isDark)}`}>
        Esto se calculó con la anterior. ¿Te gustaría recalcular este proyecto? Los números pueden cambiar un poco con las correcciones; con una planilla grande puede tardar, y mientras tanto sigue a la vista este resultado.
      </p>
    </div>
    <button type="button" onClick={onRecalculate} disabled={busy} className={`${soft(isDark)} shrink-0`}>
      <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden /> {busy ? 'Recalculando…' : 'Recalcular'}
    </button>
  </section>
);

/**
 * Un proyecto de una base: de la base no se guardan filas, así que mostrarlo es consultarla de nuevo. Con
 * una base grande son horas, así que primero se pregunta, con lo que se sabe de la última vez.
 */
export const Consultar: React.FC<{ asking: Asking; isDark: boolean; onQuery: () => void; onBack: () => void }> = ({ asking, isDark, onQuery, onBack }) => (
  <section className={`grid grid-cols-1 items-center gap-8 rounded-mio p-7 sm:p-10 lg:grid-cols-[1fr_auto] ${slab(isDark)}`}>
    <div className="min-w-0">
      <h1 className="text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-5xl">{asking.nombre}</h1>
      <p className={`mt-4 max-w-2xl text-lg leading-relaxed ${slabText(isDark)}`}>
        La última consulta fue el {when(asking.desde)}: {num(asking.filas)} filas, analizando «{asking.columna}». De la base no se guarda ninguna fila, así que para verlo hay que consultarla de nuevo; con una base grande puede tardar mucho. Después te digo qué cambió desde esa vez.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={onQuery} className={PRIMARY}>
          <Database className="h-5 w-5" aria-hidden /> Consultar ahora
        </button>
        <button type="button" onClick={onBack} className={soft(isDark)}>Ahora no</button>
      </div>
    </div>
    <div className="hidden justify-center lg:flex" aria-hidden>
      <MioPet2D mood="reposo" size={150} showShadow={false} animated />
    </div>
  </section>
);
