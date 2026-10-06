import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { DitherMatrixCanvas } from '@/components/canvas/DitherMatrixCanvas';
import { ArrowUpRight, Database, Terminal, FileCode2, BarChart3 } from 'lucide-react';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { DitherArt } from '@/components/ui/DitherArt';
import { playMioDevSound } from '@/lib/sound';
import { AuditDrawerDOM } from '@/components/dom/AuditDrawerDOM';


const BigStat: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const num = numRef.current;
    if (!el || !num) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const o = { v: 0 };
    num.textContent = '0,0';
    const ctx = gsap.context(() => {
      gsap.to(o, {
        v: 13.5,
        duration: 1.6,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 75%', once: true },
        onUpdate: () => {
          num.textContent = o.v.toFixed(1).replace('.', ',');
        },
      });
      gsap.from(el.querySelectorAll('[data-bar]'), {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.15,
        scrollTrigger: { trigger: el, start: 'top 70%', once: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-16 sm:mb-20">
      <div className="lg:col-span-7">
        <div className="font-extrabold leading-[0.82] tracking-[-0.06em] text-[#bdf559] text-[30vw] sm:text-[22vw] lg:text-[17rem] whitespace-nowrap">
          <span ref={numRef}>13,5</span>
          <span className="text-[0.4em] align-top tracking-normal"> %</span>
        </div>
      </div>
      <div className="lg:col-span-5 space-y-5 pb-2">
        <p className="text-xl sm:text-2xl font-semibold leading-snug text-white">
          de error al predecir las ventas de los últimos días. Si solo repetís lo de ayer, el error es de 17,0 %.
        </p>
        <div className="space-y-3 font-mono text-xs text-zinc-400">
          <div>
            <div className="mb-1 flex justify-between"><span>MIO</span><span>13,5 %</span></div>
            <div className="h-3 bg-white/10"><div data-bar className="h-full bg-[#bdf559]" style={{ width: `${(13.5 / 17) * 100}%` }} /></div>
          </div>
          <div>
            <div className="mb-1 flex justify-between"><span>Repetir lo de ayer</span><span>17,0 %</span></div>
            <div className="h-3 bg-white/10"><div data-bar className="h-full bg-zinc-500" style={{ width: '100%' }} /></div>
          </div>
        </div>
        <p className="font-mono text-[11px] text-zinc-500">Menos es mejor. 138.116 ventas reales, 2021-2025.</p>
      </div>
    </div>
  );
};

export const FullBleedCaseStudyDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      <section
        ref={sectionRef}
        id="casos-estudio"
        className="w-full select-none relative overflow-hidden my-0 border-y bg-[#07070a] text-white border-white/10"
      >
        {/* Dither texture: one gamma, fades out toward the content */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{ WebkitMaskImage: 'radial-gradient(ellipse at 85% 10%, #000 0%, transparent 70%)', maskImage: 'radial-gradient(ellipse at 85% 10%, #000 0%, transparent 70%)' }}
          aria-hidden="true"
        >
          <DitherArt variant="texture" seed={5} tone="dark" pixelSize={4} />
        </div>

        {/* 1. Header Ribbon */}
        <div className="w-full border-b border-white/10 py-3 overflow-hidden relative bg-black/40">
          <div className="flex shrink-0 animate-telemetry-scroll whitespace-nowrap will-change-transform text-white/90">
            {[0, 1].map((replica) => (
              <div
                key={`tape-${replica}`}
                className="flex shrink-0 items-center gap-8 sm:gap-12 pr-8 sm:pr-12 text-sm font-mono font-bold uppercase tracking-wider text-zinc-400"
              >
                <span>VENTAS REALES: 138.116</span>
                <span className="text-[#bdf559]">•</span>
                <span>PROBADO CONTRA EL PASADO</span>
                <span className="text-[#7647eb]">•</span>
                <span>ERROR: 13,5 % VS 17,0 % DE REPETIR AYER</span>
                <span className="text-[#bdf559]">•</span>
                <span>108 VENTAS RARAS DETECTADAS</span>
                <span className="text-[#7647eb]">•</span>
                <span>SIN USAR DATOS DEL FUTURO</span>
                <span className="text-[#bdf559]">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Main Content Container */}
        <div className="relative w-full py-16 sm:py-24 px-6 sm:px-12 lg:px-20 max-w-[1520px] mx-auto">
          {/* Top Eyebrow */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-6 mb-12 gap-4">
            <div>
              <SectionPlate index="05" label="LA PRUEBA // CON VENTAS REALES" tone="lime" onDark live />
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-3 leading-tight">
                Probado con 138.116 ventas reales.
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 self-start sm:self-auto bg-white/[0.04] px-3.5 py-1.5 rounded-full border border-white/10">
              <Terminal className="w-3.5 h-3.5 text-[#bdf559]" />
              <span>Ventas reales 2021-2025</span>
            </div>
          </div>

          <BigStat />

          {/* 3. Legency-Style Double-Bezel 2-Column Cards (Image 4 Inspiration) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            
            {/* Card 1: Benchmark de Series Temporales */}
            <article className="rounded-mio border border-white/10 bg-[#0e0d16] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-white/20">
              {/* Top Visual Half: Interactive Dither Canvas */}
              <div className="relative h-60 sm:h-72 w-full overflow-hidden border-b border-white/10 bg-[#05040a]">
                <DitherMatrixCanvas
                  dotColor="#312e81"
                  accentColor="#7647eb"
                  className="opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d16] via-transparent to-transparent pointer-events-none" />
                
                {/* Visual Label Tag */}
                <div className="absolute top-5 left-6 z-10">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-[#bdf559] bg-black/60 px-3 py-1 rounded-full border border-[#bdf559]/30">
                    PRUEBA 1 // QUÉ TAN BIEN PREDICE
                  </span>
                </div>
              </div>

              {/* Bottom Information & Metrics Half */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                    Acertamos más que repetir lo de ayer.
                  </h3>
                  <p className="text-sm text-zinc-400 font-normal leading-relaxed mb-6">
                    Probamos MIO con 5 años de ventas diarias (2021-2025): le escondimos los últimos días, le pedimos que los prediga y comparamos con lo que pasó de verdad. La prueba se repite cuatro veces y nunca ve el futuro.
                  </p>

                  {/* Telemetry Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Error de MIO</div>
                      <div className="font-mono text-xl font-bold text-[#bdf559]">13,5 %</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">repetir lo de ayer: 17,0 %</div>
                    </div>
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Ventas raras</div>
                      <div className="font-mono text-xl font-bold text-white">108</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Detectadas</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Predice a</div>
                      <div className="font-mono text-xl font-bold text-white">14 días</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Por delante</div>
                    </div>
                  </div>
                </div>

                {/* Audit citation & Split Action Button */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-zinc-500 font-mono">
                    Probado contra ventas que el modelo no había visto
                  </div>
                  
                  {/* Legency Split Button */}
                  <button
                    type="button"
                    onClick={() => {
                      playMioDevSound('select');
                      setIsDrawerOpen(true);
                    }}
                    className="group inline-flex items-center gap-1.5 p-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
                  >
                    <span className="font-mono text-xs font-semibold text-white px-3 py-1">
                      Ver las 108 ventas raras
                    </span>
                    <span className="w-7 h-7 rounded-full bg-[#bdf559] text-black flex items-center justify-center transition-transform group-hover:rotate-45">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            </article>

            {/* Card 2: Explicabilidad y Sensibilidad */}
            <article className="rounded-mio border border-white/10 bg-[#0e0d16] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-white/20">
              {/* Top Visual Half: Interactive Dither Canvas */}
              <div className="relative h-60 sm:h-72 w-full overflow-hidden border-b border-white/10 bg-[#05040a]">
                <DitherMatrixCanvas
                  dotColor="#1e1b4b"
                  accentColor="#bdf559"
                  className="opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0d16] via-transparent to-transparent pointer-events-none" />
                
                {/* Visual Label Tag */}
                <div className="absolute top-5 left-6 z-10">
                  <span className="font-mono text-[10px] tracking-widest uppercase text-white bg-black/60 px-3 py-1 rounded-full border border-white/20">
                    PRUEBA 2 // POR QUÉ DIO ESE NÚMERO
                  </span>
                </div>
              </div>

              {/* Bottom Information & Metrics Half */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                    Te explica el número, sin inventar causas.
                  </h3>
                  <p className="text-sm text-zinc-400 font-normal leading-relaxed mb-6">
                    Te dice qué factores pesaron más en cada resultado y te deja simular cambios de precio con lo que muestran tus propios datos históricos. Es una estimación, no una garantía.
                  </p>

                  {/* Telemetry Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Qué pesó</div>
                      <div className="font-mono text-xl font-bold text-white">Factores</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Por factor</div>
                    </div>
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Simulador</div>
                      <div className="font-mono text-xl font-bold text-[#bdf559]">Y si…</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Cambiá un dato</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Tus datos</div>
                      <div className="font-mono text-xl font-bold text-white">Privados</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">No se guardan</div>
                    </div>
                  </div>
                </div>

                {/* Audit citation & Split Action Button */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-zinc-500 font-mono">
                    Estimación con tus propios datos
                  </div>
                  
                  {/* Legency Split Button */}
                  <button
                    type="button"
                    onClick={() => scrollTo('#como-funciona')}
                    className="group inline-flex items-center gap-1.5 p-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
                  >
                    <span className="font-mono text-xs font-semibold text-white px-3 py-1">
                      Cómo lo hace
                    </span>
                    <span className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center transition-transform group-hover:rotate-45">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            </article>

          </div>
        </div>
      </section>

      {/* Slide-over Drawer for Anomaly Inspection */}
      <AuditDrawerDOM
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};

export default FullBleedCaseStudyDOM;
