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
        if (hoy) tl.to(hoy, { opacity: 0.45, duration: 0.3 }, 0.4);
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
            <FlipText>Viernes, seis de la tarde.</FlipText>
            <br />
            <span className="text-[#7647eb] dark:text-[#a78bfa] inline-block">
              <FlipText delayOffset={0.25}>Cierre de mes, a mano.</FlipText>
            </span>
          </h2>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Cuatro cosas que hoy se arreglan a mano antes de cerrar el mes. Así quedan con MIO.
          </p>
        </div>

        <div ref={listRef} className={`border-b ${isDark ? 'border-white/15' : 'border-zinc-900/80'}`}>
          {ROWS.map((row, i) => (
            <article
              key={row.tag}
              data-row
              className={`grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-10 py-9 sm:py-12 border-t ${isDark ? 'border-white/15' : 'border-zinc-900/80'}`}
            >
              <div className="lg:col-span-2 flex lg:flex-col gap-3 lg:gap-1 font-mono text-xs font-bold tracking-wider">
                <span className="text-[#7647eb] dark:text-[#a78bfa]">0{i + 1}</span>
                <span className="text-zinc-500">{row.tag}</span>
              </div>

              <p data-hoy className={`lg:col-span-5 text-xl sm:text-2xl lg:text-[1.7rem] leading-snug font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <span className="block mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500">Hoy</span>
                <span data-strike style={strikeStyle}>
                  {row.hoy}
                </span>
              </p>

              <p data-mio className={`lg:col-span-5 text-xl sm:text-2xl lg:text-[1.7rem] leading-snug font-semibold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                <span className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">
                  <span className="w-2 h-2 bg-[#bdf559] border border-black/40" />
                  Con MIO
                </span>
                {row.mio}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemaDOM;
