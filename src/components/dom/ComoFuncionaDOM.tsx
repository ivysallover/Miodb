import React, { useRef, useState, useEffect } from 'react';
import { ScrollTrigger, gsap } from '@/lib/gsap';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { playMioDevSound } from '@/lib/sound';
import {
  FileSpreadsheet,
  Cpu,
  Sliders,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface StepData {
  index: number;
  num: string;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  bullets: string[];
}

const PHASES: StepData[] = [
  {
    index: 0,
    num: '01',
    tag: 'FASE DE INGESTA & HIGIENE',
    title: 'Carga tus archivos sin preparar',
    subtitle: 'Olvidate de limpiar filas vacías o corregir fechas a mano.',
    description:
      'Carga tus archivos sin preparar. MIO reconoce la estructura, normaliza tipos numéricos y fechas, imputa valores faltantes y aísla anomalías estadísticas mediante Isolation Forest en menos de 15 segundos.',
    bullets: [
      'Normalización automática de fechas, monedas y categorizaciones',
      'Imputación probabilística de valores nulos sin sesgar la media',
      'Aislamiento de outliers con significancia estadística (>3σ)',
    ],
  },
  {
    index: 1,
    num: '02',
    tag: 'FASE AUTOML & EVALUACIÓN',
    title: 'Competencia multimodelo con validación matemática',
    subtitle: 'El mejor algoritmo para tu negocio, elegido con rigor científico.',
    description:
      'MIO entrena en paralelo familias de series temporales y machine learning (Prophet, ARIMA, XGBoost, LightGBM). Utiliza validación cruzada temporal estricta para evitar sobreajuste y selecciona el modelo con menor error cuadrático.',
    bullets: [
      'Entrenamiento simultáneo de 4 arquitecturas predictivas',
      'Cross-validation temporal rigurosa para evitar data leakage',
      'Cálculo de bandas de incertidumbre probabilística al 80% y 95%',
    ],
  },
  {
    index: 2,
    num: '03',
    tag: 'FASE EJECUTIVA & SIMULACIÓN',
    title: 'Decisiones en lenguaje natural y escenarios What-If',
    subtitle: 'Explicabilidad causal total y proyecciones para tu directorio.',
    description:
      'Descubrí con valores SHAP exactamente qué factores impulsan tus números. Simulá variaciones de precios o costos en vivo y preguntale a tus planillas en lenguaje natural antes de tomar decisiones de inversión.',
    bullets: [
      'Explicabilidad transparente de impacto por variable (SHAP)',
      'Simulador interactivo de escenarios alternativos en tiempo real',
      'Copiloto de conversación en lenguaje natural sobre tus datos',
    ],
  },
];

export const ComoFuncionaDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const sectionRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [whatIfMultiplier, setWhatIfMultiplier] = useState<number>(1.15); // +15% default
  const [animatedRevenue, setAnimatedRevenue] = useState<number>(120520);
  const [animatedMargin, setAnimatedMargin] = useState<number>(27.8);

  // Smooth Spring Interpolation for What-If Numbers (Emil Kowalski / Apple standard)
  useEffect(() => {
    const targetRevenue = Math.round(104800 * whatIfMultiplier);
    const targetMargin = parseFloat((24.2 * whatIfMultiplier).toFixed(1));

    let animId: number;
    const lerpSpring = () => {
      setAnimatedRevenue((prev) => {
        const diff = targetRevenue - prev;
        if (Math.abs(diff) <= 1) return targetRevenue;
        return prev + Math.round(diff * 0.22);
      });

      setAnimatedMargin((prev) => {
        const diff = targetMargin - prev;
        if (Math.abs(diff) <= 0.05) return targetMargin;
        return parseFloat((prev + diff * 0.22).toFixed(1));
      });

      if (
        Math.abs(targetRevenue - animatedRevenue) > 1 ||
        Math.abs(targetMargin - animatedMargin) > 0.05
      ) {
        animId = requestAnimationFrame(lerpSpring);
      }
    };

    animId = requestAnimationFrame(lerpSpring);
    return () => cancelAnimationFrame(animId);
  }, [whatIfMultiplier, animatedRevenue, animatedMargin]);

  // Scrollytelling: Synchronize ScrollTrigger with Stacking Cards
  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      [0, 1, 2].forEach((idx) => {
        ScrollTrigger.create({
          trigger: `#stack-card-${idx}`,
          start: 'top 50%',
          end: 'bottom 50%',
          onEnter: () => {
            setActiveStep(idx);
          },
          onEnterBack: () => {
            setActiveStep(idx);
          },
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleStepJump = (idx: number) => {
    playMioDevSound('tick');
    setActiveStep(idx);
    scrollTo(`#stack-card-${idx}`);
  };

  const currentPhase = PHASES[activeStep] || PHASES[0];

  return (
    <section
      ref={sectionRef}
      id="como-funciona"
      className="relative w-full pt-24 sm:pt-32 lg:pt-36 pb-36 lg:pb-48 select-none"
    >
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">

        {/* STICKY SPLIT-SCREEN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start relative">
          
          {/* ================================================================ */}
          {/* LEFT COLUMN: Sticky Split-Column Navigation (5 cols)             */}
          {/* Anchored at top-36/top-40 with luxurious clearance below navbar  */}
          {/* ================================================================ */}
          <div className="lg:col-span-5 lg:sticky lg:top-36 xl:top-40 space-y-6 self-start z-20">
            
            {/* Integrated Section Eyebrow & Title inside the Sticky Column */}
            <div className="space-y-3">
              <SectionPlate index="04" label="ARQUITECTURA DE DATOS // PIPELINE OPERATIVO" />
              <h2
                className={`text-2xl sm:text-4xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold tracking-[-0.035em] leading-[1.08] ${
                  isDark ? 'text-white' : 'text-zinc-950'
                }`}
              >
                <FlipText>Cómo funciona MIO con tus datos.</FlipText>
              </h2>
              <p
                className={`text-sm sm:text-base font-normal leading-relaxed ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}
              >
                Un flujo continuo en tres fases automatizadas: desde la ingesta de tus archivos crudos hasta la simulación ejecutiva.
              </p>
            </div>

            {/* Active Phase Live Pill */}
            <div className={`flex items-center justify-between p-4 rounded-none border transition-colors ${
              isDark
                ? 'bg-zinc-900/80 border-white/[0.08]'
                : 'bg-white/90 border-zinc-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-[#7647eb] opacity-75" />
                  <span className="relative inline-flex rounded-none h-2.5 w-2.5 bg-[#7647eb]" />
                </span>
                <span className={`text-xs font-mono font-bold tracking-wider ${
                  isDark ? 'text-white' : 'text-zinc-950'
                }`}>
                  FASE EN PANTALLA // 0{activeStep + 1} DE 03
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa]">
                {currentPhase.tag}
              </span>
            </div>

            {/* Phase Selector Navigation Tabs */}
            <div className="space-y-2.5">
              {PHASES.map((phase) => {
                const isSelected = activeStep === phase.index;
                return (
                  <button
                    key={phase.num}
                    type="button"
                    onClick={() => handleStepJump(phase.index)}
                    className={`w-full text-left p-4 sm:p-5 rounded-none border transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? isDark
                          ? 'bg-zinc-900 border-[#7647eb]/80 ring-1 ring-[#7647eb]/40'
                          : 'bg-white border-[#7647eb]/60 ring-1 ring-[#7647eb]/30'
                        : isDark
                        ? 'bg-zinc-950/40 border-white/[0.06] hover:border-white/20 text-zinc-400'
                        : 'bg-zinc-50/70 border-zinc-200/80 hover:border-zinc-300 text-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-8 h-8 rounded-none flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-[#7647eb] text-white'
                            : isDark
                            ? 'bg-white/10 text-zinc-400 group-hover:text-white'
                            : 'bg-zinc-200/80 text-zinc-700 group-hover:text-zinc-950'
                        }`}
                      >
                        {phase.num}
                      </div>
                      <div>
                        <div
                          className={`text-sm sm:text-base font-bold transition-colors ${
                            isSelected
                              ? isDark
                                ? 'text-white'
                                : 'text-zinc-950'
                              : isDark
                              ? 'text-zinc-300'
                              : 'text-zinc-800'
                          }`}
                        >
                          {phase.title}
                        </div>
                        <div className="text-xs text-zinc-500 font-normal line-clamp-1 mt-0.5">
                          {phase.subtitle}
                        </div>
                      </div>
                    </div>
                    <ArrowRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSelected
                          ? 'text-[#7647eb] dark:text-[#bdf559] translate-x-1'
                          : 'text-zinc-400 opacity-50 group-hover:opacity-100'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Active Step Bullets Breakdown */}
            <div className={`p-5 rounded-none border space-y-2.5 ${
              isDark
                ? 'bg-zinc-900/50 border-white/[0.06]'
                : 'bg-zinc-50 border-zinc-200'
            }`}>
              <div className={`text-xs font-mono font-bold uppercase tracking-wider mb-1 ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                Garantías de la fase {currentPhase.num}
              </div>
              {currentPhase.bullets.map((bullet, i) => (
                <div key={i} className={`flex items-start gap-2.5 text-xs leading-normal ${
                  isDark ? 'text-zinc-300' : 'text-zinc-700'
                }`}>
                  <span className="w-4 h-4 rounded-none flex items-center justify-center shrink-0 mt-0.5 bg-[#7647eb]/15 text-[#7647eb] dark:text-[#a78bfa]">
                    <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            {/* Quick Action Button */}
            <div className="pt-1">
              <BubbleArrowButton
                size="md"
                variant="primary"
                onClick={() => handleStepJump(2)}
              >
                Probar Escenario What-If
              </BubbleArrowButton>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT COLUMN: Stacking Cards Scrollytelling Deck (7 cols)       */}
          {/* Tactile Card Overlap Offsets: top-36, top-44, top-52             */}
          {/* ================================================================ */}
          <div className="lg:col-span-7 space-y-24 sm:space-y-32 lg:space-y-40 pb-32">
            
            {/* -------------------------------------------------------------- */}
            {/* CARD 1: Ingesta & Higiene de Planillas (.xlsx / .csv)           */}
            {/* -------------------------------------------------------------- */}
            <div
              id="stack-card-0"
              className={`relative lg:sticky lg:top-36 xl:top-40 z-10 rounded-none p-6 sm:p-8 lg:p-10 border-2 transition-all duration-300 ${
                isDark
                  ? 'bg-[#0f0e1a] border-white/20 shadow-[6px_6px_0_#7647eb]'
                  : 'bg-white border-black shadow-[6px_6px_0_#111111]'
              }`}
              style={{
                boxShadow: isDark
                  ? '0 25px 60px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 20px 45px -10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
              }}
            >
              {/* Card Header */}
              <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
                isDark ? 'border-white/[0.08]' : 'border-zinc-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-[#7647eb]/10 text-[#7647eb] dark:text-[#a78bfa] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] block">
                      FASE 01 // HIGIENE ESTADÍSTICA
                    </span>
                    <h3 className={`text-xl sm:text-2xl font-bold ${
                      isDark ? 'text-white' : 'text-zinc-950'
                    }`}>
                      Carga directa de .xlsx o .csv
                    </h3>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-none text-xs font-mono font-bold border ${
                  isDark
                    ? 'bg-white/10 text-[#bdf559] border-white/15'
                    : 'bg-zinc-100 text-zinc-900 border-zinc-200'
                }`}>
                  &lt; 15s SYNC
                </span>
              </div>

              {/* Simulated File Dropper Display with Click-to-Ingest Action */}
              <div
                onClick={() => {
                  playMioDevSound('select');
                  window.dispatchEvent(new CustomEvent('mio:open-consent-modal'));
                }}
                className={`rounded-none p-4 sm:p-5 border border-dashed mb-6 cursor-pointer group transition-all ${
                  isDark
                    ? 'border-white/15 bg-white/[0.02] hover:border-[#bdf559]/50 hover:bg-white/[0.04]'
                    : 'border-zinc-300 bg-zinc-50 hover:border-[#7647eb]/50 hover:bg-white'
                }`}
                title="Hacé click para cargar tu propia planilla"
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-mono font-bold text-xs group-hover:scale-105 transition-transform">
                      XLSX
                    </div>
                    <div>
                      <div className={`text-sm font-mono font-bold ${
                        isDark ? 'text-zinc-100' : 'text-zinc-900'
                      }`}>
                        ventas_trimestrales_auditadas_2026.xlsx
                      </div>
                      <div className={`text-xs font-mono ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                        14,200 filas · 18 columnas · 1.4 MB • <span className="underline text-[#7647eb] dark:text-[#a78bfa] font-bold">Hacé click para cargar la tuya</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-none">
                    <Check className="w-3.5 h-3.5" />
                    <span>NORMALIZADO</span>
                  </div>
                </div>
              </div>

              {/* Micro Data Table Preview with Isolation Forest Flags */}
              <div className={`rounded-none overflow-hidden border mb-6 ${
                isDark ? 'border-white/[0.08]' : 'border-zinc-200'
              }`}>
                <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
                  isDark
                    ? 'bg-white/[0.04] border-white/[0.06] text-zinc-400'
                    : 'bg-zinc-100 border-zinc-200 text-zinc-700 font-semibold'
                }`}>
                  <span>PREVIEW DE FILAS (MUESTRA 3/14,200)</span>
                  <span className="text-[#7647eb] dark:text-[#a78bfa] font-bold">ISOLATION FOREST: 2 OUTLIERS</span>
                </div>
                <div className={`divide-y font-mono text-xs ${
                  isDark ? 'divide-white/[0.04]' : 'divide-zinc-200'
                }`}>
                  <div className={`p-3 flex items-center justify-between ${
                    isDark ? 'bg-transparent' : 'bg-white'
                  }`}>
                    <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>2026-03-14 // SKU-4921</span>
                    <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>$42,800 USD</span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">NOMINAL (0.2σ)</span>
                  </div>
                  <div className={`p-3 flex items-center justify-between ${
                    isDark ? 'bg-rose-500/[0.06]' : 'bg-rose-50'
                  }`}>
                    <span className={isDark ? 'text-zinc-300' : 'text-zinc-800'}>2026-03-15 // SKU-8802</span>
                    <span className={`font-bold ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>$340,000 USD</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      isDark
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}>
                      OUTLIER AISLADO (5.4σ)
                    </span>
                  </div>
                  <div className={`p-3 flex items-center justify-between ${
                    isDark ? 'bg-transparent' : 'bg-white'
                  }`}>
                    <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>2026-03-16 // SKU-1120</span>
                    <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>$48,100 USD</span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">NOMINAL (0.1σ)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Feature Badges */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className={`p-3 rounded-none border ${
                  isDark
                    ? 'bg-white/[0.02] border-white/[0.06]'
                    : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className={`text-base font-bold font-mono ${
                    isDark ? 'text-white' : 'text-zinc-950'
                  }`}>
                    0 nulos
                  </div>
                  <div className={`text-[11px] font-normal ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    Imputación prob.
                  </div>
                </div>
                <div className={`p-3 rounded-none border ${
                  isDark
                    ? 'bg-white/[0.02] border-white/[0.06]'
                    : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="text-base font-bold font-mono text-emerald-700 dark:text-[#bdf559]">
                    100%
                  </div>
                  <div className={`text-[11px] font-normal ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    Fechas tipificadas
                  </div>
                </div>
                <div className={`p-3 rounded-none border ${
                  isDark
                    ? 'bg-white/[0.02] border-white/[0.06]'
                    : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="text-base font-bold font-mono text-[#7647eb] dark:text-[#a78bfa]">
                    3.5σ
                  </div>
                  <div className={`text-[11px] font-normal ${
                    isDark ? 'text-zinc-400' : 'text-zinc-600'
                  }`}>
                    Filtro de ruido
                  </div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* CARD 2: Torneo AutoML Competitivo & Validación Cruzada          */}
            {/* -------------------------------------------------------------- */}
            <div
              id="stack-card-1"
              className={`relative lg:sticky lg:top-44 xl:top-48 z-20 rounded-none p-6 sm:p-8 lg:p-10 border-2 transition-all duration-300 ${
                isDark
                  ? 'bg-[#111020] border-white/20 shadow-[6px_6px_0_#7647eb]'
                  : 'bg-white border-black shadow-[6px_6px_0_#111111]'
              }`}
              style={{
                boxShadow: isDark
                  ? '0 25px 60px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 20px 45px -10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
              }}
            >
              {/* Card Header */}
              <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
                isDark ? 'border-white/[0.08]' : 'border-zinc-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-indigo-500/10 text-[#7647eb] dark:text-[#a78bfa] flex items-center justify-center">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] block">
                      FASE 02 // TORNEO AUTOML
                    </span>
                    <h3 className={`text-xl sm:text-2xl font-bold ${
                      isDark ? 'text-white' : 'text-zinc-950'
                    }`}>
                      Competencia multimodelo
                    </h3>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-none text-xs font-mono font-bold bg-[#7647eb] text-white">
                  R²: 0.984 ÓPTIMO
                </span>
              </div>

              {/* Leaderboard Multi-Model CV Display */}
              <div className="space-y-3 mb-6">
                <div className={`p-3.5 rounded-none border flex items-center justify-between ${
                  isDark
                    ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                    : 'border-emerald-300 bg-emerald-50/70'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <div className={`text-xs font-mono font-bold ${
                        isDark ? 'text-white' : 'text-zinc-950'
                      }`}>
                        LightGBM (Gradient Boosted Trees)
                      </div>
                      <div className={`text-[11px] font-mono ${
                        isDark ? 'text-zinc-400' : 'text-zinc-600'
                      }`}>
                        Validación cruzada temporal de 5 folds
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-emerald-700 dark:text-[#bdf559]">
                      R² 0.984
                    </div>
                    <div className={`text-[10px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      RMSE: 1.2k
                    </div>
                  </div>
                </div>

                <div className={`p-3.5 rounded-none border flex items-center justify-between ${
                  isDark
                    ? 'border-white/[0.06] bg-white/[0.01]'
                    : 'border-zinc-200 bg-zinc-50'
                }`}>
                  <div>
                    <div className={`text-xs font-mono font-bold ${
                      isDark ? 'text-zinc-200' : 'text-zinc-900'
                    }`}>
                      Prophet + Fourier Term Expansion
                    </div>
                    <div className={`text-[11px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      Descomposición de estacionalidad anual
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${
                      isDark ? 'text-zinc-300' : 'text-zinc-800'
                    }`}>
                      R² 0.942
                    </div>
                    <div className={`text-[10px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      RMSE: 1.8k
                    </div>
                  </div>
                </div>

                <div className={`p-3.5 rounded-none border flex items-center justify-between ${
                  isDark
                    ? 'border-white/[0.06] bg-white/[0.01]'
                    : 'border-zinc-200 bg-zinc-50'
                }`}>
                  <div>
                    <div className={`text-xs font-mono font-bold ${
                      isDark ? 'text-zinc-200' : 'text-zinc-900'
                    }`}>
                      XGBoost v2.0 Temporal Regressor
                    </div>
                    <div className={`text-[11px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      Lag features + media móvil calibrada
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-bold ${
                      isDark ? 'text-zinc-300' : 'text-zinc-800'
                    }`}>
                      R² 0.918
                    </div>
                    <div className={`text-[10px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      RMSE: 2.1k
                    </div>
                  </div>
                </div>
              </div>

              {/* Curve Telemetry Footer: Always crisp dark console bar */}
              <div className="p-4 rounded-none bg-zinc-950 text-white flex items-center justify-between border border-zinc-800">
                <div>
                  <div className="text-[10px] font-mono text-zinc-400">PROYECCIÓN CALIBRADA P95</div>
                  <div className="text-2xl font-mono font-bold text-[#bdf559] mt-0.5">$104,800 USD</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-zinc-400">BANDA DE CONFIANZA 95%</div>
                  <div className="text-xs font-mono text-zinc-200">[$98,400 — $111,200]</div>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------- */}
            {/* CARD 3: Decisiones Ejecutivas & Escenarios What-If              */}
            {/* -------------------------------------------------------------- */}
            <div
              id="stack-card-2"
              className={`relative lg:sticky lg:top-52 xl:top-56 z-30 rounded-none p-6 sm:p-8 lg:p-10 border-2 transition-all duration-300 ${
                isDark
                  ? 'bg-[#131224] border-white/20 shadow-[6px_6px_0_#7647eb]'
                  : 'bg-white border-black shadow-[6px_6px_0_#111111]'
              }`}
              style={{
                boxShadow: isDark
                  ? '0 25px 60px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 20px 45px -10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
              }}
            >
              {/* Card Header */}
              <div className={`flex items-center justify-between pb-4 border-b mb-6 ${
                isDark ? 'border-white/[0.08]' : 'border-zinc-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-none bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 block">
                      FASE 03 // SIMULADOR WHAT-IF & SHAP
                    </span>
                    <h3 className={`text-xl sm:text-2xl font-bold ${
                      isDark ? 'text-white' : 'text-zinc-950'
                    }`}>
                      Decisiones en lenguaje natural
                    </h3>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-none text-xs font-mono font-bold border ${
                  isDark
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  SHAP AUDITABLE
                </span>
              </div>

              {/* Interactive What-If Slider Simulator */}
              <div className={`p-4 sm:p-5 rounded-none border mb-6 space-y-4 ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={`font-bold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    ESCENARIO ALTERNATIVO: PRECIO UNITARIO
                  </span>
                  <span className="text-[#7647eb] dark:text-[#bdf559] font-bold text-sm">
                    {Math.round((whatIfMultiplier - 1) * 100) >= 0 ? '+' : ''}
                    {Math.round((whatIfMultiplier - 1) * 100)}%
                  </span>
                </div>

                <input
                  type="range"
                  min="0.9"
                  max="1.35"
                  step="0.05"
                  value={whatIfMultiplier}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setWhatIfMultiplier(val);
                    playMioDevSound('tick');
                  }}
                  className="w-full accent-[#7647eb] cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className={`p-3 rounded-none border ${
                    isDark
                      ? 'bg-zinc-900 border-white/[0.08]'
                      : 'bg-white border-zinc-200'
                  }`}>
                    <div className={`text-[10px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      FACTURACIÓN SIMULADA
                    </div>
                    <div className={`text-lg font-mono font-bold ${
                      isDark ? 'text-white' : 'text-zinc-950'
                    }`}>
                      ${animatedRevenue.toLocaleString()} USD
                    </div>
                  </div>
                  <div className={`p-3 rounded-none border ${
                    isDark
                      ? 'bg-zinc-900 border-white/[0.08]'
                      : 'bg-white border-zinc-200'
                  }`}>
                    <div className={`text-[10px] font-mono ${
                      isDark ? 'text-zinc-400' : 'text-zinc-600'
                    }`}>
                      MARGEN ESTIMADO
                    </div>
                    <div className="text-lg font-mono font-bold text-emerald-700 dark:text-[#bdf559]">
                      +{animatedMargin}% EBITDA
                    </div>
                  </div>
                </div>
              </div>

              {/* SHAP Impact Explanations */}
              <div className="space-y-2 mb-6">
                <div className={`text-xs font-mono font-bold mb-2 ${
                  isDark ? 'text-zinc-400' : 'text-zinc-700'
                }`}>
                  PESO CAUSAL DE VARIABLES (SHAP VALUES)
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-800'}>Precio promedio por unidad</span>
                  <span className="font-bold text-emerald-700 dark:text-[#bdf559]">+42.8%</span>
                </div>
                <div className={`w-full h-1.5 rounded-none overflow-hidden ${
                  isDark ? 'bg-white/[0.08]' : 'bg-zinc-200'
                }`}>
                  <div className="h-full bg-emerald-500 rounded-none w-[85%]" />
                </div>

                <div className="flex items-center justify-between text-xs font-mono pt-1">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-800'}>Estacionalidad Q4 / Black Week</span>
                  <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">+31.2%</span>
                </div>
                <div className={`w-full h-1.5 rounded-none overflow-hidden ${
                  isDark ? 'bg-white/[0.08]' : 'bg-zinc-200'
                }`}>
                  <div className="h-full bg-[#7647eb] rounded-none w-[62%]" />
                </div>
              </div>

              {/* Direct Link to Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => scrollTo('#hero')}
                  className="w-full py-3.5 px-4 rounded-none bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-medium text-xs font-mono tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>CARGAR PLANILLA Y OBTENER DIAGNÓSTICO</span>
                  <ArrowRight className="w-4 h-4 text-[#bdf559] dark:text-[#7647eb]" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default ComoFuncionaDOM;
