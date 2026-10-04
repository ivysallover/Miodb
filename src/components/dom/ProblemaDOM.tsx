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
    tag: 'INGESTA + ANOMALÍAS',
    hoy: 'Horas limpiando fechas, monedas y duplicados. Y aun así se te cuela un outlier que te arruina el promedio.',
    mio: 'Normaliza formatos, completa vacíos y marca los desvíos con Isolation Forest, antes de que cierres el mes.',
  },
  {
    tag: 'AUTOML',
    hoy: 'Probás el único modelo que conocés y rezás para que ande.',
    mio: 'Prophet, ARIMA y Boosting compiten con validación temporal estricta. Gana el de menor error, con bandas de incertidumbre al 80 % y 95 %.',
  },
  {
    tag: 'EXPLICABILIDAD',
    hoy: 'El número subió y nadie sabe por qué. En el comité, silencio.',
    mio: 'Valores SHAP: qué variable movió el resultado y cuánto. Más un simulador what-if para probar precios y costos.',
  },
  {
    tag: 'COPILOTO',
    hoy: 'Un reporte de BI que tarda semanas y llega viejo.',
    mio: 'Le preguntás a tu planilla en lenguaje natural y exportás el resumen listo para el comité.',
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
            Cuatro tareas que hoy se hacen a mano, un viernes a las seis, antes del cierre. Así quedan con MIO.
          </p>
        </div>

        {/* column heads (desktop) */}
        <div
          aria-hidden
          className="hidden md:grid grid-cols-12 mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400"
        >
          <span className="col-span-5">Hoy</span>
          <span className="col-span-2" />
          <span className="col-span-5 text-[#602cd1] dark:text-[#bdf559]">Con MIO</span>
        </div>

        <div ref={listRef} className="space-y-6 sm:space-y-8">
          {ROWS.map((row, i) => (
            <article
              key={row.tag}
              data-row
              className={`grid grid-cols-1 md:grid-cols-12 border rounded-mio overflow-hidden ${
                isDark
                  ? 'border-white/10'
                  : 'border-black/10'
              }`}
            >
              <div
                data-hoy
                className={`md:col-span-5 p-6 sm:p-8 ${isDark ? 'bg-[#141124] text-zinc-200' : 'bg-white text-zinc-900'}`}
              >
                <span className="md:hidden block mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Hoy
                </span>
                <p className="text-base sm:text-lg leading-relaxed">
                  <span data-strike style={strikeStyle}>
                    {row.hoy}
                  </span>
                </p>
              </div>

              <div
                className={`md:col-span-2 flex md:flex-col items-center justify-between md:justify-center gap-2 px-6 py-3 md:p-4 border-y-2 md:border-y-0 md:border-x-2 ${
                  'border-white/10 bg-[#0b0914] text-white'
                }`}
              >
                <span className="font-mono text-xs font-bold text-[#bdf559]">0{i + 1}/04</span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                  {row.tag}
                </span>
              </div>

              <div data-mio className="md:col-span-5 p-6 sm:p-8 bg-[#bdf559] text-black">
                <span className="md:hidden block mb-2 font-mono text-[10px] font-bold uppercase tracking-wider">
                  Con MIO
                </span>
                <p className="text-base sm:text-lg leading-relaxed font-medium">{row.mio}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemaDOM;
