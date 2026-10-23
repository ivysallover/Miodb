import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { slab } from './ui';
import { STAGES, num, type Progress } from './desktop';

/**
 * Mientras se abre y analiza una planilla: el MIO bot trabajando, las etapas que ya pasaron, la que
 * está corriendo (con cuánto lleva, si el motor lo sabe) y el tiempo desde que empezó.
 */
export const Analizando: React.FC<{ name: string; progress: Progress | null; isDark: boolean }> = ({ name, progress, isDark }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const current = progress ? STAGES.findIndex((s) => s.id === progress.etapa) : 0;
  return (
    <section className={`grid min-h-[min(560px,75vh)] grid-cols-1 items-center gap-10 rounded-mio p-8 text-white sm:p-12 lg:grid-cols-[auto_1fr] ${slab(isDark)}`} aria-live="polite">
      <div className="flex justify-center">
        <MioPet2D mood="trabajando" size={200} showShadow={false} animated />
      </div>
      <div className="min-w-0">
        <h1 className="max-w-[22ch] text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl [overflow-wrap:anywhere]">Analizando {name}</h1>
        <ol className="mt-7 space-y-2.5">
          {STAGES.map((s, i) => {
            const done = i < current;
            const now = i === current;
            const share = now && progress?.avance != null ? progress.avance : null;
            return (
              <li key={s.id} className={`flex items-center gap-3 text-[15px] transition-colors duration-200 ${done ? 'text-white/60' : now ? 'font-bold text-white' : 'text-white/35'}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-[#7647eb]' : now ? 'bg-[#bdf559]' : 'bg-white/10'}`} aria-hidden>
                  {done && <Check className="h-3 w-3" />}
                </span>
                <span>{s.label}</span>
                {share != null && <span className="font-mono text-[13px] tabular-nums text-[#bdf559]">{num(share * 100)} %</span>}
              </li>
            );
          })}
        </ol>
        {progress?.etapa === 'leyendo' && progress.avance != null && (
          <div className="mt-5 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round(progress.avance * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[#bdf559] transition-[width] duration-300 ease-out" style={{ width: `${progress.avance * 100}%` }} />
          </div>
        )}
        <p className="mt-6 font-mono text-sm tabular-nums text-white/60">{seconds} s</p>
      </div>
    </section>
  );
};
