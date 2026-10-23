import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { STEPS } from './ayuda';
import { FOCUS, PRIMARY, slab, slabHover, slabText, track } from './ui';

/**
 * El recorrido de la primera vez (y cuando se pide desde la guía): los pasos de `ayuda.ts`, uno por
 * vez. Se avanza con los botones o las flechas; Esc o "Saltear" lo cierran y queda como visto.
 */
export const Recorrido: React.FC<{ isDark: boolean; onEnd: () => void }> = ({ isDark, onEnd }) => {
  const [i, setI] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const last = i === STEPS.length - 1;
  const step = STEPS[i];

  useEffect(() => next.current?.focus(), [i]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEnd();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, STEPS.length - 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEnd]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0b0914]/70 p-6 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="recorrido-titulo" className={`grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-mio sm:grid-cols-[240px_1fr] ${slab(isDark)}`}>
        <div className="flex items-center justify-center bg-[#7647eb] p-8">
          <MioPet2D key={i} mood={step.mood} size={160} showShadow={false} animated />
        </div>
        <div className="flex min-h-[340px] flex-col p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <span className={`font-mono text-[11px] font-bold ${slabText(isDark)}`}>{i + 1} de {STEPS.length}</span>
            <button type="button" onClick={onEnd} className={`rounded-full px-2 py-1 text-sm font-bold cursor-pointer ${FOCUS} ${slabText(isDark)} ${slabHover(isDark)}`}>Saltear</button>
          </div>
          <h2 id="recorrido-titulo" className="mt-6 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em]">{step.title}</h2>
          <p className={`mt-3 text-base leading-relaxed ${slabText(isDark)}`} aria-live="polite">{step.text}</p>
          <div className="mt-auto flex items-center justify-between gap-3 pt-8">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((s, n) => <span key={s.title} className={`h-1.5 rounded-full transition-all duration-200 ${n === i ? 'w-6 bg-[#7647eb]' : `w-1.5 ${track(isDark)}`}`} />)}
            </div>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <button type="button" onClick={() => setI(i - 1)} aria-label="Paso anterior" className={`rounded-full p-3 cursor-pointer ${FOCUS} ${slabHover(isDark)}`}>
                  <ArrowLeft className="h-5 w-5" aria-hidden />
                </button>
              )}
              <button ref={next} type="button" onClick={() => (last ? onEnd() : setI(i + 1))} className={PRIMARY}>
                {last ? 'Empezar' : 'Siguiente'} {!last && <ArrowRight className="h-5 w-5" aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
