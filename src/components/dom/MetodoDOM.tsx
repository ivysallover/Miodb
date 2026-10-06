import React, { useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from '@/lib/gsap';
import { useMioStore } from '@/utils/useMioStore';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { DitherArt, type DitherVariant } from '@/components/ui/DitherArt';
import { emitGuide, type GuideCue } from '@/lib/guide';

interface Scene {
  num: string;
  tag: string;
  title: string;
  text: string;
  bullets: string[];
  art: DitherVariant;
  cue: GuideCue;
}

const SCENES: Scene[] = [
  {
    num: '01',
    tag: 'LIMPIEZA',
    title: 'Subís la planilla tal como está.',
    text: 'MIO entiende las columnas, acomoda fechas y montos, completa los vacíos y marca las ventas que se salen de lo normal.',
    bullets: ['Acomoda formatos, monedas y fechas', 'Completa los datos que faltan', 'Marca lo raro y te dice por qué'],
    art: 'anomalies',
    cue: { mood: 'anomalia', line: 'Fase 1: entra la planilla cruda. Limpio, completo los vacíos y marco lo raro.' },
  },
  {
    num: '02',
    tag: 'PREDICCIÓN',
    title: 'Varios modelos compiten con tus datos.',
    text: 'Les escondemos los últimos días, les pedimos que los adivinen y comparamos con lo que pasó. Gana el que menos se equivoca.',
    bullets: ['Prueba varios modelos a la vez', 'Nunca usa datos del futuro', 'Te muestra el margen de error'],
    art: 'models',
    cue: { mood: 'trabajando', line: 'Fase 2: los modelos compiten. Gana el que se equivoca menos.' },
  },
  {
    num: '03',
    tag: 'DECISIÓN',
    title: 'Te explica el porqué y te deja probar.',
    text: 'Ves qué factores pesaron en cada número y simulás cambios antes de decidir. También le preguntás a tu planilla en castellano.',
    bullets: ['Qué factor pesó más en cada resultado', 'Simulador de "¿y si cambio el precio?"', 'Preguntas en castellano'],
    art: 'shap',
    cue: { mood: 'celebrando', line: 'Fase 3: te explico por qué dio ese número y probás escenarios.' },
  },
];

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

export const MetodoDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  // GSAP wraps the pinned node in a spacer. Pinning an inner div (never the node React mounts into
  // <main>) keeps React able to remove the section on route changes.
  const sectionRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const artRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [price, setPrice] = useState(10); // % change in price

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    let st: ScrollTrigger | null = null;
    let last = -1;
    st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: mq.matches ? '+=260%' : '+=220%',
      pin: true,
      anticipatePin: 1,
      scrub: true,
      onUpdate: (self) => {
        const i = Math.min(2, Math.floor(self.progress * 3));
        if (barRef.current) barRef.current.style.transform = `scaleX(${self.progress})`;
        // The illustration draws itself left to right inside its own third of the scroll.
        artRefs.current.forEach((a, k) => {
          if (!a) return;
          const local = Math.min(1, Math.max(0, self.progress * 3 - k));
          const reveal = Math.min(1, local * 2.4);
          a.style.clipPath = `inset(0 ${((1 - reveal) * 100).toFixed(1)}% 0 0)`;
        });
        if (i !== last) {
          last = i;
          setActive(i);
          emitGuide(SCENES[i].cue);
        }
      },
    });
    return () => st?.kill();
  }, []);

  // Demo simulator (price elasticity -0.65, same assumption the old card used).
  const m = 1 + price / 100;
  const revenue = 104800 * m * (1 + (m - 1) * -0.65);
  const margin = 24.2 + (m - 1) * 18;

  const fg = isDark ? 'text-white' : 'text-zinc-950';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';

  return (
    <section id="como-funciona" className="relative w-full select-none">
      <div ref={sectionRef} className={`mio-sheet-bg relative w-full h-[100dvh] min-h-[640px] overflow-hidden ${isDark ? 'bg-[#07070a]' : 'bg-[#f3f3f5]'}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-black/5">
        <div ref={barRef} className="h-full origin-left bg-[#7647eb]" style={{ transform: 'scaleX(0)' }} />
      </div>

      <div className="relative h-full w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 pt-24 sm:pt-28 pb-8 flex flex-col">
        <div className="flex items-center justify-between">
          <SectionPlate index="04" label="EL MÉTODO // TRES FASES" />
          <span className="font-mono text-xs font-bold tracking-wider text-zinc-500">
            0{active + 1} / 03
          </span>
        </div>

        <div className="relative flex-1 mt-6 lg:mt-10">
          {SCENES.map((sc, i) => {
            const on = i === active;
            return (
              <div
                key={sc.num}
                aria-hidden={!on}
                className={`absolute inset-0 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                  on ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
                }`}
              >
                <div className="lg:col-span-6 flex flex-col gap-4 sm:gap-6">
                  <div className="flex items-baseline gap-4">
                    <span className="font-climate text-6xl sm:text-8xl lg:text-[9rem] leading-none text-[#7647eb]/90">{sc.num}</span>
                    <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-[#7647eb] dark:text-[#a78bfa]">{sc.tag}</span>
                  </div>
                  <h2 className={`font-extrabold tracking-[-0.04em] leading-[1.02] text-3xl sm:text-5xl lg:text-6xl ${fg}`} style={{ textWrap: 'balance' }}>
                    {sc.title}
                  </h2>
                  <p className={`text-base sm:text-lg leading-relaxed max-w-xl ${muted}`}>{sc.text}</p>
                  <ul className={`hidden sm:grid gap-2 font-mono text-[13px] ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {sc.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-3">
                        <span className="w-2 h-2 bg-[#bdf559] border border-black/40 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-6 relative h-[34vh] lg:h-[62vh] lg:-mr-16 xl:-mr-[calc((100vw-1440px)/2+4rem)]">
                  <div ref={(el) => { artRefs.current[i] = el; }} className={`absolute inset-0 rounded-mio lg:rounded-r-none border overflow-hidden ${isDark ? 'bg-[#0e0d16] border-white/10' : 'bg-white border-zinc-200/80'}`}>
                    <DitherArt variant={sc.art} seed={i + 11} pixelSize={4} bleed={i === 1 ? 'none' : 'right'} tone={isDark ? 'dark' : 'light'} />
                  </div>

                  {i === 2 && (
                    <div className={`absolute left-4 right-4 bottom-4 sm:left-6 sm:bottom-6 sm:right-auto sm:w-[22rem] rounded-mio border p-4 backdrop-blur ${isDark ? 'bg-[#0b0914]/90 border-white/15 text-white' : 'bg-white/95 border-zinc-200 text-zinc-950'}`}>
                      <label htmlFor="price" className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                        <span>¿Y si subo el precio?</span>
                        <span className="text-[#7647eb] dark:text-[#a78bfa]">+{price} %</span>
                      </label>
                      <input
                        id="price"
                        type="range"
                        min={0}
                        max={30}
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full mt-3 accent-[#7647eb]"
                      />
                      <div className="mt-3 grid grid-cols-2 gap-3 font-mono">
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500">Ventas del mes</div>
                          <div className="text-xl font-bold">{fmt(revenue)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-zinc-500">Margen</div>
                          <div className="text-xl font-bold">{margin.toFixed(1).replace('.', ',')} %</div>
                        </div>
                      </div>
                      <p className="mt-2 text-[10px] font-mono text-zinc-500">Ejemplo con datos de demostración. Es una estimación, no una garantía.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
};

export default MetodoDOM;
