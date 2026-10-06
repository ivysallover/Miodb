import React, { useRef, useEffect } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { MioDitherBotHeroStage } from '@/components/canvas/MioDitherBotHeroStage';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { FlipText } from '@/components/ui/FlipText';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { isBootDone, onBootDone } from '@/lib/boot';
import { playMioDevSound } from '@/lib/sound';

export const HeroDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const deviceColRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Kinetic type: Climate Crisis has a YEAR axis (1979 solid → 2050 melted). Scrolling out of the
  // hero "melts" the headline, a nod to the font's own story. Only writes one CSS variable per frame.
  useEffect(() => {
    const hero = document.getElementById('hero');
    const headline = headlineRef.current;
    if (!hero || !headline) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const st = ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        const year = Math.round(1979 + (2050 - 1979) * self.progress);
        headline.style.setProperty('--mio-year', String(year));
      },
      onLeaveBack: () => headline.style.setProperty('--mio-year', '1979'),
    });
    return () => {
      st.kill();
      headline.style.removeProperty('--mio-year');
    };
  }, []);

  // GSAP ScrollTrigger Entrance & Decoupled 5-Layer Parallax
  useEffect(() => {
    if (!sectionRef.current) return;

    // The entrance waits for the MIO OS boot to hand over (instant if it was skipped or already seen).
    let offBoot: () => void = () => {};

    const ctx = gsap.context(() => {
      // 1. Entrance animation with staggered reveal
      const tlEntrance = gsap.timeline({ defaults: { ease: 'power3.out' }, paused: !isBootDone() });
      if (!isBootDone()) offBoot = onBootDone(() => tlEntrance.play());

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

    return () => {
      offBoot();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative pt-6 sm:pt-10 lg:pt-12 pb-14 sm:pb-20 w-full select-none overflow-x-hidden flex flex-col justify-center"
    >
      {/* Full Desktop Container */}
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">
          
          {/* LEFT COLUMN: Monumental Left-Aligned Typography (7 cols on Laptop, 6 on Ultra-Wide) */}
          <div className="lg:col-span-7 xl:col-span-6 flex flex-col items-start text-left space-y-6 z-10">
            {/* Layer 2: Category Eyebrow Badge with MIO Violet & Lime (Depth 0.4x) */}
            <div ref={badgeRef} className="max-w-full">
              <SectionPlate
                index="01"
                label="MIO // INTELLIGENT DATA OPERATIONS & AUTOML"
                aside="EDICIÓN 2026"
                tone="lime"
                live
              />
            </div>

            {/* Layer 3: Monumental Headline — Climate Crisis dominates with proper line spacing */}
            <h1
              ref={headlineRef}
              className={`font-climate text-3xl sm:text-5xl lg:text-[2.65rem] xl:text-[3.25rem] 2xl:text-[3.75rem] leading-[1.18] sm:leading-[1.16] transition-colors ${
                isDark ? 'text-white' : 'text-zinc-950'
              }`}
              style={{ fontVariationSettings: "'YEAR' var(--mio-year, 1979)" }}
            >
              <FlipText delayOffset={0}>Convertí planillas en</FlipText>{' '}
              <span className="text-[#7647eb] dark:text-[#a78bfa] inline-block">
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
              Cargás tu Excel o CSV tal cual. MIO detecta lo raro, prueba varios modelos y te dice cuál gana y por qué. Sin escribir código.
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
                Cargar planilla
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
                Ver cómo funciona
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: MIO Bot Monumental en Halftone Dither 3D (Inclinado 14° a la derecha) */}
          <div
            ref={deviceColRef}
            className="lg:col-span-5 xl:col-span-6 relative flex items-center justify-center lg:justify-end overflow-visible"
          >
            <MioDitherBotHeroStage className="w-full max-w-[480px] lg:max-w-[560px]" />
          </div>
        </div>

        {/* Demo run: Nothing Tech style precision hardware terminal */}
        <div
          ref={statsRef}
          className={`mt-14 sm:mt-20 w-full rounded-mio overflow-hidden border transition-all duration-300 ${
            isDark
              ? 'border-white/[0.08] bg-[#0e0d16]'
              : 'border-zinc-200/80 bg-white'
          }`}
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6 py-2.5 border-b font-mono text-[11px] ${
              isDark
                ? 'border-white/[0.06] bg-[#09080e] text-zinc-300'
                : 'border-zinc-100 bg-zinc-50/80 text-zinc-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400/40 dark:bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400/40 dark:bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-400/40 dark:bg-zinc-700" />
              </div>
              <span className="font-bold uppercase tracking-wider text-xs ml-1 text-zinc-800 dark:text-zinc-200">
                BENCHMARK VERIFICABLE (ROLLING ORIGIN)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
              <span className="hidden sm:inline">Dataset real: ecommerce_sales_138k.csv (2021-2025)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
            </div>
          </div>
          <dl className={`grid grid-cols-2 md:grid-cols-4 gap-px ${isDark ? 'bg-white/[0.04]' : 'bg-zinc-100'}`}>
            {[
              { k: 'Transacciones auditadas', v: <AnimatedCounter value={138116} /> },
              { k: 'Anomalías detectadas', v: <AnimatedCounter value={108} /> },
              { k: 'Horizonte de predicción', v: <span>14 días (Fold 4)</span> },
              { k: 'sMAPE (vs 17.0% Naïve)', v: <span>13.5%</span> },
            ].map((cell) => (
              <div key={cell.k} className={`p-5 sm:p-6 ${isDark ? 'bg-[#0e0d16]' : 'bg-white'}`}>
                <dt className={`font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {cell.k}
                </dt>
                <dd className={`mt-1.5 font-mono text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {cell.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

      </div>
    </section>
  );
};

export default HeroDOM;
