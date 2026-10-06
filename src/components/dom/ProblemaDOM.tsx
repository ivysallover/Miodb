import React, { useEffect, useRef } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { gsap } from '@/lib/gsap';

interface PainRow {
  tag: string;
  hoy: string;
  mio: string;
}

/**
 * Act 2 of the story. The old "capabilities" grid is folded in here as a contrast:
 * what hurts today (struck through as the row enters) vs. what MIO does about it.
 * Every claim on the right comes from the product's existing scope.
 */
const ROWS: PainRow[] = [
  {
    tag: 'PLANILLA',
    hoy: 'Horas arreglando fechas, montos y filas repetidas. Y una venta rara te cambia todo el promedio sin que te des cuenta.',
    mio: 'Acomoda fechas y montos, completa los vacíos y te marca las ventas que se salen de lo normal, con el motivo.',
  },
  {
    tag: 'PREDICCIÓN',
    hoy: 'Calculás el promedio de siempre y esperás que este mes se parezca al anterior.',
    mio: 'Prueba varios modelos con tus propios datos y se queda con el que menos se equivoca. Te muestra el margen de error, sin maquillarlo.',
  },
  {
    tag: 'EXPLICACIÓN',
    hoy: 'La venta subió o bajó y nadie sabe por qué. En la reunión, silencio.',
    mio: 'Te dice qué factor movió el número (precio, descuento, día, categoría) y te deja probar "¿y si subo un 10 %?" antes de decidir.',
  },
  {
    tag: 'PREGUNTAS',
    hoy: 'Un informe que tarda semanas y llega viejo.',
    mio: 'Le preguntás a tu planilla en castellano y bajás el resumen listo para compartir.',
  },
];

const strikeStyle: React.CSSProperties = {
  backgroundImage: 'linear-gradient(#7647eb, #7647eb)',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: '0 58%',
  backgroundSize: 'var(--strike, 0%) 3px',
  WebkitBoxDecorationBreak: 'clone',
  boxDecorationBreak: 'clone',
};

export const ProblemaDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-row]'));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      rows.forEach((row) => {
        row.querySelector<HTMLElement>('[data-strike]')?.style.setProperty('--strike', '100%');
        row.querySelector<HTMLElement>('[data-hoy]')?.style.setProperty('opacity', '0.6');
      });
      return;
    }

    const ctx = gsap.context(() => {
      rows.forEach((row) => {
        const strike = row.querySelector<HTMLElement>('[data-strike]');
        const hoy = row.querySelector<HTMLElement>('[data-hoy]');
        const mio = row.querySelector<HTMLElement>('[data-mio]');

        const tl = gsap.timeline({
          scrollTrigger: { trigger: row, start: 'top 80%', once: true },
        });
        // 1. the pain gets crossed out, left to right
        if (strike) tl.to(strike, { '--strike': '100%', duration: 0.55, ease: 'power2.inOut' }, 0);
        if (hoy) tl.to(hoy, { opacity: 0.6, duration: 0.3 }, 0.4);
        // 2. the answer opens like a panel
        if (mio) {
          tl.fromTo(
            mio,
            { clipPath: 'inset(0% 100% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.7, ease: 'expo.out', clearProps: 'clipPath', immediateRender: false },
            0.45
          );
        }
      });
    }, list);

    return () => ctx.revert();
  }, []);

  return (
    <section id="problema" className="py-24 sm:py-36 w-full select-none relative z-10">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-3xl mb-14 sm:mb-20">
          <SectionPlate index="02" label="EL PROBLEMA // LO QUE HOY SE HACE A MANO" className="mb-5" />
          <h2
            className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.05] ${
              isDark ? 'text-white' : 'text-zinc-950'
            }`}
          >
            <FlipText>Tu planilla ya tiene la respuesta.</FlipText>
            <br />
            <span className="text-[#7647eb] dark:text-[#a78bfa] inline-block">
              <FlipText delayOffset={0.25}>Nadie tiene tiempo de preguntarle.</FlipText>
            </span>
          </h2>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Cuatro cosas que hoy se hacen a mano, un viernes a las seis, antes del cierre. Así quedan con MIO.
          </p>
        </div>

        {/* column heads (desktop) */}
        <div
          aria-hidden
          className="hidden md:grid grid-cols-12 mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
        >
          <span className="col-span-5">Hoy</span>
          <span className="col-span-2" />
          <span className="col-span-5 text-[#7647eb] dark:text-[#a78bfa] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
            Con MIO
          </span>
        </div>

        <div ref={listRef} className="space-y-6 sm:space-y-8">
          {ROWS.map((row, i) => (
            <article
              key={row.tag}
              data-row
              className={`grid grid-cols-1 md:grid-cols-12 rounded-mio overflow-hidden border transition-all duration-300 ${
                isDark
                  ? 'border-white/[0.08] bg-[#0e0d16]'
                  : 'border-zinc-200/80 bg-white'
              }`}
            >
              <div
                data-hoy
                className={`md:col-span-5 p-6 sm:p-8 ${
                  isDark ? 'bg-[#09080e] text-zinc-300' : 'bg-zinc-50/70 text-zinc-800'
                }`}
              >
                <span className="inline-block mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Hoy
                </span>
                <p className="text-base sm:text-lg leading-relaxed">
                  <span data-strike style={strikeStyle}>
                    {row.hoy}
                  </span>
                </p>
              </div>

              <div
                className={`md:col-span-2 flex md:flex-col items-center justify-between md:justify-center gap-2 px-6 py-4 md:p-4 border-y md:border-y-0 md:border-x ${
                  isDark ? 'border-white/[0.06] bg-[#0c0b12] text-white' : 'border-zinc-200/60 bg-zinc-100/60 text-zinc-900'
                }`}
              >
                <span className="font-mono text-xs font-bold text-[#bdf559]">0{i + 1}/04</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-center leading-tight text-zinc-400">
                  {row.tag}
                </span>
              </div>

              <div
                data-mio
                className={`md:col-span-5 p-6 sm:p-8 ${
                  isDark
                    ? 'bg-[#0e0d16] text-white'
                    : 'bg-white text-zinc-950'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#bdf559]/15 text-[#bdf559] dark:text-[#bdf559] text-[10px] font-mono font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
                    Con MIO
                  </span>
                </div>
                <p className={`text-base sm:text-lg leading-relaxed font-normal ${
                  isDark ? 'text-zinc-200' : 'text-zinc-800'
                }`}>
                  {row.mio}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemaDOM;
