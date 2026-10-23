import React, { useState } from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { ActivePill } from './ActivePill';
import { PARTS, SHORTCUTS, STEPS } from './ayuda';
import { FOCUS, PRIMARY, lilac, muted, slab, slabText, surface } from './ui';

/**
 * Los pasos, uno por vez: a la izquierda la lista, a la derecha el elegido, con el MIO bot en el
 * ánimo de ese paso.
 */
const Pasos: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  return (
    <section className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <ol className={`rounded-mio p-3 ${surface(isDark)}`} aria-label="Pasos">
        {STEPS.map((s, n) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setI(n)}
              aria-current={n === i ? 'step' : undefined}
              className={`relative isolate flex w-full min-h-[56px] items-center gap-4 rounded-mio-sm px-4 text-left text-[16px] font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${n === i ? 'text-white' : isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-[#f3f3f5]'}`}
            >
              {n === i && <ActivePill group="paso" className="rounded-mio-sm" />}
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] tabular-nums ${n === i ? 'bg-white text-[#5b32cc]' : isDark ? 'bg-white/10' : 'bg-[#e9e3ff] text-[#5b32cc]'}`}>{n + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="flex min-h-[320px] flex-col justify-between gap-6 rounded-mio bg-[#7647eb] p-7 text-white sm:flex-row sm:items-center sm:p-9" aria-live="polite">
        <div className="max-w-md">
          <h2 className="text-3xl font-extrabold leading-[1.05] tracking-[-0.035em]">{step.title}</h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#ece6ff]">{step.text}</p>
          {i < STEPS.length - 1 && (
            <button type="button" onClick={() => setI(i + 1)} className={`mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-[#3d1f8a] transition-colors duration-200 hover:bg-[#ece6ff] active:scale-[0.97] cursor-pointer ${FOCUS}`}>
              Siguiente paso <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <div className="flex shrink-0 justify-center">
          <MioPet2D key={i} mood={step.mood} size={150} showShadow={false} animated />
        </div>
      </div>
    </section>
  );
};

/** La guía: los pasos, qué quiere decir cada parte del resultado y los atajos de teclado. */
export const Guia: React.FC<{ isDark: boolean; onTour: () => void }> = ({ isDark, onTour }) => (
  <>
    <section className={`flex flex-col gap-6 rounded-mio p-7 sm:p-10 lg:flex-row lg:items-end lg:justify-between ${slab(isDark)}`}>
      <div>
        <h1 className="text-5xl font-extrabold leading-[0.98] tracking-[-0.04em]">Guía</h1>
        <p className={`mt-4 max-w-xl text-lg leading-relaxed ${slabText(isDark)}`}>De la planilla al diagnóstico en cinco pasos, y qué mirar en cada parte del resultado.</p>
      </div>
      <button type="button" onClick={onTour} className={PRIMARY}>
        <Play className="h-5 w-5" aria-hidden /> Hacer el recorrido
      </button>
    </section>

    <Pasos isDark={isDark} />

    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-12">
      <section className={`rounded-mio p-5 sm:p-7 xl:col-span-8 ${surface(isDark)}`}>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Qué quiere decir cada parte</h2>
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {PARTS.map((p) => (
            <div key={p.title}>
              <dt className="text-[15px] font-extrabold">{p.title}</dt>
              <dd className={`mt-1 text-[14px] leading-relaxed ${muted(isDark)}`}>{p.text}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={`rounded-mio p-5 sm:p-7 xl:col-span-4 ${lilac(isDark)}`}>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Atajos</h2>
        <dl className="mt-5 space-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4">
              <dt className="text-[15px] font-semibold">{s.text}</dt>
              <dd><kbd className={`rounded-mio-sm px-2 py-1 font-mono text-[12px] font-bold ${isDark ? 'bg-white/10' : 'bg-white'}`}>{s.keys}</kbd></dd>
            </div>
          ))}
        </dl>
        <p className={`mt-5 text-[13px] ${muted(isDark)}`}>En Windows, Ctrl en lugar de ⌘.</p>
      </section>
    </div>
  </>
);
