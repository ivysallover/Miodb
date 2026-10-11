import React, { useEffect, useRef, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { useTravellerEnabled } from '@/hooks/useTravellerEnabled';
import { petStory } from '@/lib/petStage';

const FAQ: { q: string; a: string }[] = [
  { q: '¿Qué pasa con mi planilla?', a: 'Para analizarla necesitás una cuenta, que es gratis. El resultado queda en tus proyectos para que lo retomes. Sin cuenta podés recorrer un ejemplo completo, ya analizado.' },
  { q: '¿Cuánto cuesta?', a: 'Por ahora es gratis.' },
  { q: '¿Necesito saber de datos?', a: 'No. Subís el Excel o el CSV como lo tenés y los resultados vienen en castellano, con el porqué de cada número.' },
  { q: '¿Y si está desordenada?', a: 'Es lo normal. MIO acomoda fechas y montos, completa vacíos y, antes de analizar, te muestra cómo entendió cada columna para que lo confirmes.' },
  { q: '¿Sirve para mi rubro?', a: 'Sirve para cualquier planilla con fechas y un número a seguir: ventas, turnos, gastos. Cuanta más historia tenga, mejor predice.' },
  { q: '¿Qué tan preciso es?', a: 'Depende de tus datos. En nuestra prueba con 138.116 ventas de un comercio, le escondimos 14 días y le pedimos que los prediga. Se acercó un 21 % más a lo que realmente se vendió que suponer que se repite la semana pasada. En cada análisis te mostramos el margen de error.' },
  { q: '¿Qué archivos acepta?', a: 'Excel (.xlsx) y CSV.' },
  { q: '¿Quién está detrás?', a: 'Tadeo Muñoz Garcés y Milena Abraham, estudiantes de Ciencia de Datos en Rosario, Santa Fe.' },
];

/**
 * Doubts as a conversation with MIO. The questions are a list on one side; on the other, the one
 * you asked sits as your message and MIO answers under it. On desktop the travelling 3D MIO walks
 * into the answer block (data-mio-anchor="dudas") and perks up every time it answers; elsewhere it
 * is the sprite. Every answer is also in the DOM for screen readers and search engines.
 */
export const FaqDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const traveller = useTravellerEnabled();
  const [i, setI] = useState(0);
  const [asked, setAsked] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const cur = FAQ[i];

  // MIO perks up when it answers, then settles.
  useEffect(() => {
    if (asked === 0) return;
    petStory.dudas = 'celebrando';
    const t = window.setTimeout(() => {
      petStory.dudas = null;
    }, 1400);
    return () => {
      clearTimeout(t);
      petStory.dudas = null;
    };
  }, [asked]);

  const ask = (k: number) => {
    setI(k);
    setAsked((n) => n + 1);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const k = (i + step + FAQ.length) % FAQ.length;
    ask(k);
    tabs.current[k]?.focus();
  };

  return (
    <section id="dudas" className="relative z-10 w-full py-24 sm:py-32 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <h2 className={`max-w-4xl font-extrabold tracking-[-0.045em] leading-[0.98] text-4xl sm:text-6xl lg:text-7xl ${isDark ? 'text-white' : 'text-zinc-950'}`} style={{ textWrap: 'balance' }}>
          <FlipText>Preguntale a MIO antes de subir nada.</FlipText>
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-2.5 lg:grid-cols-12">
          {/* The conversation */}
          <div
            role="tabpanel"
            id="dudas-respuesta"
            aria-live="polite"
            className={`order-2 flex min-h-[420px] flex-col justify-between gap-8 rounded-mio p-6 text-white sm:p-10 lg:order-1 lg:col-span-7 lg:min-h-[560px] ${isDark ? 'bg-[#14112a]' : 'bg-[#0b0914]'}`}
          >
            <p key={`q-${i}`} className="mio-slide max-w-[85%] self-end rounded-mio rounded-br-none bg-[#7647eb] px-5 py-3 text-base font-semibold leading-snug sm:text-lg">
              {cur.q}
            </p>

            <div className="flex items-end gap-5 sm:gap-8">
              {traveller ? (
                <div data-mio-anchor="dudas" className="pointer-events-none h-44 w-36 shrink-0 xl:h-56 xl:w-44" aria-hidden="true" />
              ) : (
                <div className="hidden shrink-0 sm:block" aria-hidden="true">
                  <MioPet2D mood={asked % 2 ? 'celebrando' : 'reposo'} material="violet" size={104} animated />
                </div>
              )}
              <p key={`a-${i}`} className="mio-pop min-w-0 origin-bottom-left pb-2 text-xl font-semibold leading-snug tracking-[-0.02em] sm:text-3xl" style={{ textWrap: 'pretty' }}>
                {cur.a}
              </p>
            </div>
          </div>

          {/* The questions */}
          <div role="tablist" aria-label="Preguntas frecuentes" aria-orientation="vertical" onKeyDown={onKey} className="order-1 flex flex-col gap-1.5 lg:order-2 lg:col-span-5">
            {FAQ.map((f, k) => (
              <button
                key={f.q}
                ref={(el) => { tabs.current[k] = el; }}
                role="tab"
                aria-selected={k === i}
                aria-controls="dudas-respuesta"
                tabIndex={k === i ? 0 : -1}
                type="button"
                onClick={() => ask(k)}
                className={`flex min-h-[56px] flex-1 items-center justify-between gap-4 rounded-mio-sm px-5 text-left text-base font-semibold transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985] cursor-pointer sm:text-lg ${
                  k === i
                    ? 'bg-[#7647eb] text-white'
                    : isDark
                    ? 'bg-white/[0.07] text-zinc-200 hover:bg-white/[0.13]'
                    : 'bg-[#e4dcff] text-zinc-950 hover:bg-[#d5c9fb]'
                }`}
              >
                {f.q}
                <span aria-hidden="true" className={`font-mono text-sm transition-transform duration-200 ${k === i ? 'translate-x-0 text-[#bdf559]' : '-translate-x-1 opacity-40'}`}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>

        <dl className="sr-only">
          {FAQ.map((f) => (
            <React.Fragment key={f.q}>
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </section>
  );
};

export default FaqDOM;
