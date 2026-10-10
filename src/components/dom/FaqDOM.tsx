import React, { useState } from 'react';
import { Stagger } from '@/components/ui/Stagger';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { MioPet2D } from '@/components/pet/MioPet2D';

const FAQ: { q: string; a: string }[] = [
  { q: '¿Qué pasa con mi planilla?', a: 'Sin sesión iniciada no se guarda nada: el análisis se hace en el momento. Si entrás con tu cuenta, se guarda el resultado del análisis en tus proyectos para que lo retomes.' },
  { q: '¿Cuánto cuesta?', a: 'Por ahora es gratis.' },
  { q: '¿Necesito saber de datos?', a: 'No. Subís el Excel o el CSV como lo tenés y los resultados vienen en castellano, con el porqué de cada número.' },
  { q: '¿Y si está desordenada?', a: 'Es lo normal. MIO acomoda fechas y montos, completa vacíos y, antes de analizar, te muestra cómo entendió cada columna para que lo confirmes.' },
  { q: '¿Sirve para mi rubro?', a: 'Sirve para cualquier planilla con fechas y un número a seguir: ventas, turnos, gastos. Cuanta más historia tenga, mejor predice.' },
  { q: '¿Qué tan preciso es?', a: 'Depende de tus datos. En nuestra prueba con 138.116 ventas de un comercio, el error fue de 13,5 % contra 17,0 % de repetir lo que pasó la semana anterior. En cada análisis te mostramos el margen de error.' },
  { q: '¿Qué archivos acepta?', a: 'Excel (.xlsx) y CSV.' },
  { q: '¿Quién está detrás?', a: 'Tadeo Muñoz Garcés y Milena Abraham, estudiantes de Ciencia de Datos en Rosario, Santa Fe.' },
];

/**
 * Doubts as a conversation: pick a question, MIO answers. Every answer is also in the DOM for
 * screen readers and search engines (the visually hidden list at the end).
 */
export const FaqDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [i, setI] = useState(0);
  const cur = FAQ[i];

  return (
    <section id="dudas" className="relative z-10 w-full py-24 sm:py-32 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <SectionPlate index="07" label="DUDAS" className="mb-5" />
        <h2 className={`max-w-4xl font-extrabold tracking-[-0.045em] leading-[0.98] text-4xl sm:text-6xl lg:text-7xl ${isDark ? 'text-white' : 'text-zinc-950'}`} style={{ textWrap: 'balance' }}>
          <FlipText>Preguntale a MIO antes de subir nada.</FlipText>
        </h2>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <Stagger role="tablist" aria-label="Preguntas frecuentes" className="lg:col-span-5 flex flex-wrap gap-2.5">
            {FAQ.map((f, k) => (
              <button
                key={f.q}
                role="tab"
                aria-selected={k === i}
                type="button"
                onClick={() => setI(k)}
                className={`min-h-[44px] rounded-full border px-4 text-left text-sm sm:text-base font-medium transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
                  k === i
                    ? 'bg-[#7647eb] border-[#7647eb] text-white'
                    : isDark
                    ? 'border-white/20 text-zinc-200 hover:border-white/50 hover:-translate-y-0.5'
                    : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900 hover:-translate-y-0.5'
                }`}
              >
                {f.q}
              </button>
            ))}
          </Stagger>

          <div role="tabpanel" aria-live="polite" className={`lg:col-span-7 rounded-mio border p-6 sm:p-10 min-h-[300px] flex gap-5 sm:gap-8 ${isDark ? 'bg-[#0e0d16] border-white/10' : 'bg-[#0b0914] border-[#0b0914]'} text-white`}>
            <div className="shrink-0 hidden sm:block">
              <MioPet2D mood={i % 2 ? 'celebrando' : 'reposo'} material="violet" size={96} animated />
            </div>
            <div key={i} className="min-w-0">
              <p className="mio-swap font-mono text-xs font-bold uppercase tracking-wider text-[#bdf559]">{cur.q}</p>
              <p className="mio-pop mt-4 text-xl sm:text-3xl font-semibold leading-snug tracking-[-0.02em]" style={{ textWrap: 'pretty' }}>
                {cur.a}
              </p>
            </div>
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
