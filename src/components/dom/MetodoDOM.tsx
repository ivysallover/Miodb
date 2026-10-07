import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollTrigger, createScrollTrigger } from '@/lib/gsap';
import { useMioStore } from '@/utils/useMioStore';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
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
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/**
 * The method as a horizontal track: three solid blocks side by side while the page holds still and
 * the scroll slides the track. The next block always peeks in, so the sequence is visible before it
 * is read. On phones, with reduced motion, or without pointer scrolling it is three blocks stacked.
 */
export const MetodoDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const { lenis } = useSmoothScroll();
  // GSAP wraps the pinned node in a spacer. Pinning an inner div (never the node React mounts into
  // <main>) keeps React able to remove the section on route changes.
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const artRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [price, setPrice] = useState(10); // % change in price
  const [wide, setWide] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const q = [window.matchMedia('(min-width: 1024px)'), window.matchMedia('(prefers-reduced-motion: reduce)')];
    const update = () => setWide(q[0].matches && !q[1].matches);
    q.forEach((m) => m.addEventListener('change', update));
    return () => q.forEach((m) => m.removeEventListener('change', update));
  }, []);

  useEffect(() => {
    const pin = pinRef.current;
    const track = trackRef.current;
    artRefs.current.forEach((a) => { if (a) a.style.clipPath = ''; });
    if (track) track.style.transform = '';
    if (!wide || !pin || !track) {
      stRef.current = null;
      return;
    }
    let last = -1;
    const distance = () => Math.max(1, track.scrollWidth - window.innerWidth);
    const st = createScrollTrigger({
      trigger: pin,
      start: 'top top',
      end: () => `+=${Math.round(distance() * 1.15)}`,
      pin: true,
      anticipatePin: 1,
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // The track slides; each block's drawing is revealed as it takes the middle of the screen.
        track.style.transform = `translate3d(${(-self.progress * distance()).toFixed(1)}px,0,0)`;
        artRefs.current.forEach((a, k) => {
          if (!a) return;
          const reveal = clamp01((1.2 - Math.abs(self.progress * 2 - k)) * 1.7);
          a.style.clipPath = `inset(0 ${((1 - reveal) * 100).toFixed(1)}% 0 0)`;
        });
        const i = Math.round(self.progress * (SCENES.length - 1));
        if (i !== last) {
          last = i;
          setActive(i);
          emitGuide(SCENES[i].cue);
        }
      },
    });
    stRef.current = st;
    return () => {
      st?.kill();
      stRef.current = null;
    };
  }, [wide]);

  /** Jump to a step: on the wide layout that is a scroll position inside the pinned range. */
  const goTo = useCallback((i: number) => {
    const st = stRef.current;
    if (!st) {
      document.getElementById(`metodo-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const y = st.start + (st.end - st.start) * (i / (SCENES.length - 1));
    if (lenis) lenis.scrollTo(y, { duration: 1 });
    else window.scrollTo({ top: y, behavior: 'smooth' });
  }, [lenis]);

  // Demo simulator (price elasticity -0.65, same assumption the old card used).
  const m = 1 + price / 100;
  const revenue = 104800 * m * (1 + (m - 1) * -0.65);
  const margin = 24.2 + (m - 1) * 18;

  const panel = [
    { block: 'bg-[#7647eb] text-white', sub: 'text-white/80', chip: 'bg-white/15 text-white', num: 'text-[#bdf559]', tag: 'text-white/70', art: 'bg-[#0b0914]', tone: 'dark' as const },
    { block: isDark ? 'bg-[#17142a] text-white' : 'bg-[#0b0914] text-white', sub: 'text-white/75', chip: 'bg-white/10 text-white', num: 'text-[#bdf559]', tag: 'text-white/60', art: 'bg-[#1d1933]', tone: 'dark' as const },
    { block: isDark ? 'bg-[#2a1766] text-white' : 'bg-[#e4dcff] text-zinc-950', sub: isDark ? 'text-white/80' : 'text-zinc-700', chip: isDark ? 'bg-white/12 text-white' : 'bg-white/75 text-zinc-900', num: isDark ? 'text-[#bdf559]' : 'text-[#7647eb]', tag: isDark ? 'text-white/65' : 'text-zinc-600', art: isDark ? 'bg-[#0e0d16]' : 'bg-white', tone: (isDark ? 'dark' : 'light') as 'dark' | 'light' },
  ];

  return (
    <section id="como-funciona" className="relative w-full select-none">
      <div ref={pinRef} className={`mio-sheet-bg relative w-full overflow-hidden ${wide ? 'h-[100dvh] min-h-[640px]' : 'py-16 sm:py-20'} ${isDark ? 'bg-[#07070a]' : 'bg-[#f3f3f5]'}`}>
        <div className={`flex w-full flex-col ${wide ? 'h-full pt-24 pb-6' : ''}`}>
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 sm:px-10 lg:px-16">
            <SectionPlate index="04" label="EL MÉTODO // TRES FASES" />
            {wide && (
              <nav aria-label="Fases del método" className="flex gap-1.5">
                {SCENES.map((sc, i) => (
                  <button
                    key={sc.num}
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === active ? 'step' : undefined}
                    className={`rounded-full px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-[background-color,color] duration-200 cursor-pointer ${
                      i === active
                        ? 'bg-[#7647eb] text-white'
                        : isDark ? 'bg-white/[0.07] text-zinc-400 hover:text-white' : 'bg-white text-zinc-600 hover:text-zinc-950'
                    }`}
                  >
                    {sc.num} · {sc.tag}
                  </button>
                ))}
              </nav>
            )}
          </div>

          {/* The track: a row on wide screens (moved by the scroll), a stack otherwise. */}
          <div className={`${wide ? 'mt-6 min-h-0 flex-1' : 'mt-8'}`}>
            <div
              ref={trackRef}
              className={`flex will-change-transform ${wide ? 'h-full flex-row gap-3 px-16' : 'flex-col gap-2.5 px-4 sm:gap-3 sm:px-8'}`}
            >
              {SCENES.map((sc, i) => (
                <article
                  id={`metodo-${i}`}
                  key={sc.num}
                  onFocusCapture={() => wide && i !== active && goTo(i)}
                  className={`relative grid shrink-0 gap-6 overflow-hidden rounded-mio p-6 sm:p-8 ${panel[i].block} ${
                    wide ? 'h-full w-[min(86vw,1180px)] grid-cols-12 items-center gap-10 p-10 xl:p-12' : 'grid-cols-1'
                  }`}
                >
                  <div className={`flex flex-col gap-4 sm:gap-5 ${wide ? 'col-span-5' : ''}`}>
                    <div className="flex items-baseline gap-4">
                      <span className={`font-climate text-7xl leading-none sm:text-8xl ${wide ? 'xl:text-[8.5rem]' : ''} ${panel[i].num}`}>{sc.num}</span>
                      <span className={`font-mono text-xs font-bold tracking-widest sm:text-sm ${panel[i].tag}`}>{sc.tag}</span>
                    </div>
                    <h2 className="text-3xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-4xl xl:text-5xl" style={{ textWrap: 'balance' }}>
                      {sc.title}
                    </h2>
                    <p className={`max-w-xl text-base leading-relaxed sm:text-lg ${panel[i].sub}`}>{sc.text}</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {sc.bullets.map((b) => (
                        <li key={b} className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${panel[i].chip}`}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`relative ${wide ? 'col-span-7 h-full min-h-0' : 'h-[34vh] sm:h-[40vh]'}`}>
                    <div
                      ref={(el) => { artRefs.current[i] = el; }}
                      className={`absolute inset-0 overflow-hidden rounded-mio ${panel[i].art}`}
                    >
                      <DitherArt variant={sc.art} seed={i + 11} pixelSize={4} bleed={i === 1 ? 'none' : 'right'} tone={panel[i].tone} />
                    </div>

                    {i === 2 && (
                      <div className="absolute inset-x-3 bottom-3 rounded-mio bg-[#0b0914] p-4 text-white sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[22rem]">
                        <label htmlFor="price" className="flex items-center justify-between font-mono text-[11px] font-bold uppercase tracking-wider">
                          <span>¿Y si subo el precio?</span>
                          <span className="text-[#bdf559]">+{price} %</span>
                        </label>
                        <input
                          id="price"
                          type="range"
                          min={0}
                          max={30}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="mt-3 w-full"
                        />
                        <div className="mt-3 grid grid-cols-2 gap-3 font-mono">
                          <div>
                            <div className="text-[10px] uppercase text-white/55">Ventas del mes</div>
                            <div className="text-xl font-bold tabular-nums">{fmt(revenue)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-white/55">Margen</div>
                            <div className="text-xl font-bold tabular-nums">{margin.toFixed(1).replace('.', ',')} %</div>
                          </div>
                        </div>
                        <p className="mt-2 font-mono text-[10px] text-white/55">Ejemplo con datos de demostración. Es una estimación, no una garantía.</p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MetodoDOM;
