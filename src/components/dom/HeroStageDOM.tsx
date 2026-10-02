import React, { useRef, useEffect } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { MioDevCanvas } from '@/components/canvas/MioDevCanvas';
import { MioHeroStage } from '@/components/canvas/MioHeroStage';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { FlipText } from '@/components/ui/FlipText';
import { gsap } from '@/lib/gsap';
import { playMioDevSound } from '@/lib/sound';

export const HeroStageDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [climateYear, setClimateYear] = useState(1979);

  const sectionRef = useRef<HTMLElement>(null);
  const haloRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const deviceColRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // GSAP ScrollTrigger Entrance & Decoupled 5-Layer Parallax
  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // 1. Entrance animation with staggered reveal
      const tlEntrance = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (badgeRef.current) {
        tlEntrance.from(badgeRef.current, { y: 20, opacity: 0, duration: 0.7 }, 0.1);
      }
      if (subtitleRef.current) {
        tlEntrance.from(subtitleRef.current, { y: 25, opacity: 0, duration: 0.8 }, 0.35);
      }
      if (actionsRef.current) {
        tlEntrance.from(actionsRef.current, { y: 20, opacity: 0, duration: 0.8 }, 0.45);
      }
      if (deviceColRef.current) {
        tlEntrance.from(deviceColRef.current, { x: 70, opacity: 0, duration: 1.2 }, 0.3);
      }

      // 2. Decoupled 5-Layer Parallax on Scroll (Apple & Emil Compliance)
      const tlParallax = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.2,
          invalidateOnRefresh: true,
        },
      });

      // Layer 1: Ambient volumetric depth (speed: 0.2x)
      if (haloRef.current) {
        tlParallax.to(haloRef.current, { y: 40, opacity: 0.4, ease: 'none' }, 0);
      }
      // Layer 2: Eyebrow badge (speed: 0.4x)
      if (badgeRef.current) {
        tlParallax.to(badgeRef.current, { y: 50, opacity: 0.7, ease: 'none' }, 0);
      }
      // Layer 3: Monumental Headline & Subtitle (speed: 0.7x)
      if (headlineRef.current) {
        tlParallax.to(headlineRef.current, { y: 75, ease: 'none' }, 0);
      }
      if (subtitleRef.current) {
        tlParallax.to(subtitleRef.current, { y: 60, ease: 'none' }, 0);
      }
      if (actionsRef.current) {
        tlParallax.to(actionsRef.current, { y: 50, ease: 'none' }, 0);
      }
      // Layer 4: Track Record Bar (speed: 0.85x)
      if (statsRef.current) {
        tlParallax.to(statsRef.current, { y: 45, ease: 'none' }, 0);
      }
      // Layer 5: MIO-DEV Hardware (speed: 1.15x smooth vertical elevation)
      if (deviceColRef.current) {
        tlParallax.to(
          deviceColRef.current,
          {
            y: -45,
            ease: 'none',
          },
          0
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative pt-6 sm:pt-10 lg:pt-12 pb-14 sm:pb-20 w-full select-none overflow-x-hidden flex flex-col justify-center"
    >
      {/* Layer 1: Ambient Volumetric Light Halo (Depth 0.2x) */}
      <div
        ref={haloRef}
        className="pointer-events-none absolute -top-32 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px] opacity-20 dark:opacity-10 transition-opacity"
        style={{
          background: isDark
            ? 'radial-gradient(circle, rgba(118,71,235,0.4) 0%, rgba(189,245,89,0.15) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(118,71,235,0.2) 0%, rgba(189,245,89,0.12) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Full Desktop Container */}
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
          
          {/* LEFT COLUMN: Monumental Left-Aligned Typography (7 cols on Laptop, 6 on Ultra-Wide) */}
          <div className="lg:col-span-7 xl:col-span-6 flex flex-col items-start text-left space-y-6 z-10">
            {/* Layer 2: Category Eyebrow Badge with MIO Violet & Lime (Depth 0.4x) */}
            <div
              ref={badgeRef}
              className="inline-flex flex-wrap items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4 py-1.5 rounded-2xl sm:rounded-full text-[11px] sm:text-xs font-mono tracking-tight transition-colors border bg-[#bdf559]/[0.08] border-[#bdf559]/30 text-zinc-900 dark:text-zinc-100 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse shrink-0" />
              <span>MIO // STAGE 3D ESPÉCIMEN 01</span>
              <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline">•</span>
              <span className="text-[#7647eb] dark:text-[#bdf559] font-bold">NUEVO LANDING</span>
            </div>

            {/* Layer 3: Monumental Headline — Climate Crisis kinetic variable axis (1979-2050) */}
            <h1
              ref={headlineRef}
              onMouseEnter={() => setClimateYear(2035)}
              onMouseLeave={() => setClimateYear(1979)}
              className={`font-climate text-3xl sm:text-5xl lg:text-[2.65rem] xl:text-[3.25rem] 2xl:text-[3.75rem] leading-[1.18] sm:leading-[1.16] transition-colors cursor-default select-none ${
                isDark ? 'text-white' : 'text-zinc-950'
              }`}
              style={{
                fontVariationSettings: `'YEAR' ${climateYear}`,
                transition: 'font-variation-settings 0.55s cubic-bezier(0.23, 1, 0.32, 1)',
              }}
              title="Tipografía cinética: Climate Crisis Variable Axis (1979–2050)"
            >
              <FlipText delayOffset={0}>Convertí planillas en</FlipText>{' '}
              <span className="text-[#7647eb] dark:text-[#bdf559] inline-block">
                <FlipText delayOffset={0.16}>decisiones.</FlipText>
              </span>
            </h1>

            {/* Subtitle Grounded strictly in Real MIO Scope */}
            <p
              ref={subtitleRef}
              className={`text-base sm:text-lg md:text-xl max-w-xl font-normal leading-relaxed transition-colors ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              Cargá tus archivos sin preparar. MIO aísla anomalías estadísticas con Isolation Forest y calibra modelos predictivos en menos de 60 segundos.
            </p>

            {/* Action Row */}
            <div ref={actionsRef} className="pt-2 flex flex-wrap items-center gap-4">
              <BubbleArrowButton
                size="lg"
                variant="primary"
                onClick={() => {
                  playMioDevSound('select');
                  try { localStorage.removeItem('mio_active_analysis'); } catch {}
                  window.history.pushState({}, '', '/dashboard?new=1');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                Cargar Planilla y Diagnosticar
              </BubbleArrowButton>

              <button
                type="button"
                onClick={() => scrollTo('#como-funciona')}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
                  isDark
                    ? 'text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10'
                    : 'text-zinc-800 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 shadow-sm'
                }`}
              >
                Ver Metodología en 3 Pasos
              </button>

              <button
                type="button"
                onClick={() => {
                  playMioDevSound('toggle');
                  window.history.pushState({}, '', '/');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className={`group px-5 py-3 rounded-full text-xs font-mono font-semibold tracking-wider uppercase transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer inline-flex items-center gap-2 border ${
                  isDark
                    ? 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/10 hover:border-white/20'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 hover:text-zinc-950 border-zinc-200 shadow-sm'
                }`}
                title="Volver al Landing Original (Dither Torus)"
              >
                <span className="transition-transform group-hover:-translate-x-1">←</span>
                <span>Landing Original</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: The Real MIO-DEV 01 Hardware Precision Station + MIO Espécimen 01 3D companion */}
          <div
            ref={deviceColRef}
            className="lg:col-span-5 xl:col-span-6 relative flex items-center justify-center lg:justify-end overflow-visible"
          >
            <div className="w-full max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl relative z-10 flex justify-center lg:justify-end">
              <MioDevCanvas />
            </div>

            {/* MIO Espécimen 01 — live 3D companion standing on a dither pad, in front of the console.
                Canvas is pointer-events:none, so it never blocks the device controls underneath. */}
            <MioHeroStage
              className="absolute z-20 pointer-events-none left-0 -bottom-8 sm:-left-8 sm:-bottom-10 lg:-left-48 lg:-bottom-14 w-[240px] h-[240px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px]"
            />
          </div>
        </div>

        {/* BOTTOM PROOF & TRACK RECORD BAR with Live Telemetry Counters */}
        <div ref={statsRef} className="mt-14 sm:mt-20 w-full border-t border-b border-zinc-300 dark:border-white/10 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left">
            <div className="space-y-1">
              <div className={`text-3xl sm:text-4xl font-bold tracking-tight font-mono ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                &lt; <AnimatedCounter value={60} suffix="s" />
              </div>
              <p className={`text-xs sm:text-sm font-normal leading-snug ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                De planilla cruda a pronósticos ejecutivos y bandas de confianza.
              </p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight font-mono text-[#7647eb] dark:text-[#a78bfa]">
                <AnimatedCounter value={0.984} decimals={3} suffix=" R²" />
              </div>
              <p className={`text-xs sm:text-sm font-normal leading-snug ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Validación cruzada multimodelo y explicabilidad SHAP sin sesgos.
              </p>
            </div>

            <div className="space-y-1">
              <div className={`text-3xl sm:text-4xl font-bold tracking-tight font-mono ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                <AnimatedCounter value={100} suffix="%" />
              </div>
              <p className={`text-xs sm:text-sm font-normal leading-snug ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Imputa nulos, tipifica columnas y elimina outliers automáticamente.
              </p>
            </div>

            <div className="space-y-1">
              <div className={`text-3xl sm:text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                Zero Code
              </div>
              <p className={`text-xs sm:text-sm font-normal leading-snug ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Consultas en lenguaje natural sin depender de equipos de BI.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroStageDOM;
