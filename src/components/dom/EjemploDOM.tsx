import React, { useEffect, useRef, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { DitherArt } from '@/components/ui/DitherArt';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { gsap } from '@/lib/gsap';

interface Finding {
  tag: string;
  text: string;
}
interface Rubro {
  id: string;
  label: string;
  file: string;
  seed: number;
  findings: Finding[];
}

/** Illustrative scenarios. Every figure here is demonstration data, labelled as such on the page. */
const RUBROS: Rubro[] = [
  {
    id: 'comercio',
    label: 'Comercio',
    file: 'ventas_ferreteria.xlsx',
    seed: 3,
    findings: [
      { tag: 'SE SALIÓ DE LO NORMAL', text: 'El 14/03 vendiste $184.200, 3,1 veces lo habitual. ¿Fue una venta grande o un error de carga?' },
      { tag: 'QUÉ VIENE', text: 'Si seguís así, la semana próxima vendés entre $412.000 y $468.000.' },
      { tag: 'POR QUÉ', text: 'Los descuentos del 15 % no subieron las ventas: te bajaron el margen.' },
    ],
  },
  {
    id: 'gastronomia',
    label: 'Gastronomía',
    file: 'caja_restaurante.csv',
    seed: 6,
    findings: [
      { tag: 'PATRÓN', text: 'Los jueves a la noche facturás 28 % más que los miércoles, pero comprás insumos igual para los dos.' },
      { tag: 'SE SALIÓ DE LO NORMAL', text: 'Una mesa de $96.500 el 2/05 es 4 veces tu ticket normal. Revisá si fue un evento.' },
      { tag: 'QUÉ VIENE', text: 'Para el finde largo, la proyección ronda entre 310 y 360 cubiertos.' },
    ],
  },
  {
    id: 'servicios',
    label: 'Servicios',
    file: 'turnos_consultorio.xlsx',
    seed: 9,
    findings: [
      { tag: 'PATRÓN', text: 'Los lunes se cancelan 1 de cada 4 turnos.' },
      { tag: 'QUÉ VIENE', text: 'Sin cambios, el mes que viene entran entre 182 y 205 turnos.' },
      { tag: 'POR QUÉ', text: 'Los días con recordatorio por mensaje tienen menos ausencias.' },
    ],
  },
  {
    id: 'particular',
    label: 'Para mí',
    file: 'gastos_hogar.csv',
    seed: 12,
    findings: [
      { tag: 'SE SALIÓ DE LO NORMAL', text: 'En mayo el delivery se disparó: $58.300 contra $21.000 en un mes común.' },
      { tag: 'QUÉ VIENE', text: 'A este ritmo cerrás el mes con $14.000 menos de lo que planeaste.' },
      { tag: 'POR QUÉ', text: 'Lo que más explica la diferencia con otros meses es transporte.' },
    ],
  },
];

export const EjemploDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const rubro = RUBROS[active];

  useEffect(() => {
    const list = listRef.current;
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = list.querySelectorAll('[data-finding]');
    const tw = gsap.fromTo(
      items,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.09, clearProps: 'transform' }
    );
    return () => {
      tw.kill();
    };
  }, [active]);

  const goTry = (sample: boolean) => {
    try { localStorage.removeItem('mio_active_analysis'); } catch {}
    window.history.pushState({}, '', sample ? '/dashboard?new=1&sample=1' : '/dashboard?new=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const card = isDark ? 'bg-[#0e0d16] border-white/[0.08]' : 'bg-white border-zinc-200/80';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <section id="ejemplo" className="relative z-10 w-full py-24 sm:py-32 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-3xl mb-10 sm:mb-14">
          <SectionPlate index="03" label="UN EJEMPLO // DE LA PLANILLA AL DIAGNÓSTICO" className="mb-5" />
          <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.05] ${isDark ? 'text-white' : 'text-zinc-950'}`}>
            <FlipText>Lo que MIO te cuenta de tus números.</FlipText>
          </h2>
          <p className={`mt-5 text-base sm:text-lg leading-relaxed ${muted}`}>
            Elegí un rubro. A la izquierda, una planilla como las que ya tenés. A la derecha, lo que MIO encuentra.
          </p>
        </div>

        <div role="tablist" aria-label="Rubro del ejemplo" className="flex flex-wrap gap-2 mb-8">
          {RUBROS.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={i === active}
              type="button"
              onClick={() => setActive(i)}
              className={`min-h-[44px] px-5 rounded-full text-sm font-medium border transition-colors duration-200 cursor-pointer active:scale-[0.97] ${
                i === active
                  ? 'bg-[#7647eb] border-[#7647eb] text-white'
                  : isDark
                  ? 'border-white/15 text-zinc-300 hover:border-white/30'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-500'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <figure className={`lg:col-span-5 rounded-mio border overflow-hidden flex flex-col ${card}`}>
            <figcaption className={`flex items-center justify-between px-4 py-2.5 border-b font-mono text-[11px] uppercase tracking-wider ${isDark ? 'border-white/[0.08] text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}>
              <span>{rubro.file}</span>
              <span className="text-zinc-500">Tu planilla</span>
            </figcaption>
            <div className="relative flex-1 min-h-[300px] lg:min-h-[420px] p-3">
              <DitherArt variant="sheet" seed={rubro.seed} tone={isDark ? 'dark' : 'light'} pixelSize={3} />
            </div>
          </figure>

          <div ref={listRef} className="lg:col-span-7 grid gap-4 content-start">
            {rubro.findings.map((f, i) => (
              <article key={`${rubro.id}-${i}`} data-finding className={`rounded-mio border p-5 sm:p-6 ${card}`}>
                <div className="flex items-center gap-3 mb-2.5">
                  <span className="inline-flex w-7 h-7 items-center justify-center bg-[#7647eb] text-white font-mono text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">{f.tag}</span>
                </div>
                <p className={`text-lg sm:text-xl leading-snug font-medium ${isDark ? 'text-white' : 'text-zinc-950'}`}>{f.text}</p>
              </article>
            ))}
            <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              Ejemplo ilustrativo con datos de demostración, no son clientes reales.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <BubbleArrowButton size="lg" variant="primary" onClick={() => goTry(false)}>
            Probar con mi planilla
          </BubbleArrowButton>
          <button
            type="button"
            onClick={() => goTry(true)}
            className={`text-sm font-medium underline underline-offset-4 decoration-1 cursor-pointer ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-950'}`}
          >
            o probá con datos de ejemplo
          </button>
        </div>
      </div>
    </section>
  );
};

export default EjemploDOM;
