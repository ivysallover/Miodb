import React, { useRef, useState, useEffect } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { DitherMatrixCanvas } from '@/components/canvas/DitherMatrixCanvas';
import { PixelateRevealCanvas } from '@/components/canvas/PixelateRevealCanvas';
import { ArrowUpRight, Database, Layers } from 'lucide-react';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { playMioDevSound } from '@/lib/sound';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { AuditDrawerDOM } from '@/components/dom/AuditDrawerDOM';

export const FullBleedCaseStudyDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const [pixelDissolveStep, setPixelDissolveStep] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pixel dissolve reveal simulation on timer
  useEffect(() => {
    const interval = setInterval(() => {
      setPixelDissolveStep((prev) => (prev + 1) % 6);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <section
        ref={sectionRef}
        id="casos-estudio"
        className="w-full select-none relative overflow-hidden my-0 border-y bg-[#06040e] text-white border-zinc-300 dark:border-white/10 shadow-sm"
      >
        {/* ==================================================================== */}
        {/* 1. TOP HORIZONTAL RIBBON / TAPE                                      */}
        {/* ==================================================================== */}
        <div className="w-full border-b py-2.5 sm:py-3 overflow-hidden relative bg-[#090716] border-zinc-700/60 dark:border-white/10">
          <div className="flex shrink-0 animate-telemetry-scroll whitespace-nowrap will-change-transform text-white/90">
            {[0, 1].map((replica) => (
              <div
                key={`tape-${replica}`}
                className="flex shrink-0 items-center gap-8 sm:gap-12 pr-8 sm:pr-12 text-sm sm:text-base lg:text-lg font-mono font-bold uppercase tracking-wider"
              >
                <span>AUTOMATED MACHINE LEARNING</span>
                <span className="text-[#7647eb]">•</span>
                <span>DETECCIÓN DE ANOMALÍAS</span>
                <span className="text-[#bdf559]">•</span>
                <span>EXPLICABILIDAD SHAP</span>
                <span className="text-[#7647eb]">•</span>
                <span>ZERO CODE ANALYTICS</span>
                <span className="text-[#bdf559]">•</span>
                <span>VALIDACIÓN R²: 0.984</span>
                <span className="text-[#7647eb]">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. FULL-BLEED MONOLITHIC CASE STUDY (Legency Media Architectural Cut) */}
        {/* ==================================================================== */}
        <div className="relative w-full py-12 sm:py-16 px-6 sm:px-12 lg:px-20 overflow-hidden">
          {/* Halftone / Dither Pixel Particle Wave in Background */}
          <DitherMatrixCanvas
            dotColor="#312e81"
            accentColor="#7647eb"
            className="opacity-70"
          />

          {/* Ambient Vignette */}
          <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-r from-[#06040e] via-[#06040e]/75 to-transparent" />

          {/* Direct Edge-to-Edge Grid (No Disconnected Floating Card in the Middle) */}
          <div className="relative z-10 max-w-[1520px] mx-auto">
            {/* Top Eyebrow & Category */}
            <div className="flex items-center justify-between border-b border-white/10 pb-5 mb-8">
              <SectionPlate index="03" label="CASO DE ESTUDIO // AUDITORÍA CORPORATIVA" tone="lime" onDark live />
              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
                <Layers className="w-3.5 h-3.5 text-[#bdf559]" />
                <span>RETAIL ENTERPRISE • 14,200 SKUS</span>
              </div>
            </div>

            {/* Split Architectural Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Quantitative Results & Narrative (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.08] text-white">
                  <FlipText>Optimización de capital y precisión de demanda en Retail Enterprise.</FlipText>
                </h2>

                <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed">
                  Redujimos la desviación de stock de{' '}
                  <strong className="text-rose-400 font-mono font-bold line-through">48%</strong> a{' '}
                  <strong className="text-[#bdf559] font-mono font-bold text-xl">
                    <AnimatedCounter value={7.4} decimals={1} suffix="%" />
                  </strong>
                  , aislando{' '}
                  <strong className="text-white font-mono font-bold">
                    <AnimatedCounter value={1280} prefix="+" /> anomalías
                  </strong>{' '}
                  y liberando{' '}
                  <strong className="text-white font-mono font-bold text-xl">
                    <AnimatedCounter value={340000} prefix="$" suffix=" USD" />
                  </strong>{' '}
                  en capital inmovilizado.
                </p>

                <p className="text-xs sm:text-sm text-zinc-400 font-normal leading-relaxed">
                  Auditoría en series temporales multimodelo (LightGBM + Prophet + Isolation Forest). Mismo conjunto de datos de 14,200 SKUs evaluado sobre 3 años con validación cruzada temporal estricta para evitar fuga de información.
                </p>

                {/* Tactile Drawer Trigger Button */}
                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      playMioDevSound('select');
                      setIsDrawerOpen(true);
                    }}
                    className="inline-flex items-center gap-3 px-6 py-3.5 rounded-none border-2 border-black bg-[#bdf559] text-black font-semibold text-xs font-mono tracking-wider uppercase hover:bg-[#c8ff6a] transition-[transform,box-shadow] duration-150 cursor-pointer shadow-[3px_3px_0_#7647eb] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#7647eb] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#7647eb]"
                  >
                    <span>Auditar las 1,280 anomalías</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playMioDevSound('select');
                      scrollTo('#como-funciona');
                    }}
                    className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    <span>Ver Metodología en 3 Pasos</span>
                  </button>
                </div>
              </div>

              {/* Right Column: 4K Pixelate Matrix & Live Telemetry (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                {/* 4K WebGL Shader Canvas */}
                <PixelateRevealCanvas
                  className="w-full border border-white/15 shadow-2xl"
                  initialGranularity={56.0}
                  durationMs={950}
                />

                {/* Bottom Telemetry Bar */}
                <div className="flex items-center justify-between text-xs font-mono py-2.5 px-3 border border-white/10 bg-black/40">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Database className="w-3.5 h-3.5 text-[#a78bfa]" />
                    <span>DATASET: AUDIT_RETAIL_14K.XLSX</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-none transition-all duration-500 ${
                            i <= pixelDissolveStep ? 'bg-[#bdf559]' : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[#bdf559] font-bold">R²: 0.984</span>
                  </div>
                </div>

                {/* Metrics Triple Ticker */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 border border-white/10 bg-white/[0.02]">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">RMSE</div>
                    <div className="text-lg font-bold font-mono text-[#bdf559]">
                      <AnimatedCounter value={6.8} decimals={1} suffix="%" />
                    </div>
                  </div>
                  <div className="p-3 border border-white/10 bg-white/[0.02]">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">Outliers</div>
                    <div className="text-lg font-bold font-mono text-white">
                      <AnimatedCounter value={1280} prefix="+" />
                    </div>
                  </div>
                  <div className="p-3 border border-white/10 bg-white/[0.02]">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase">Confianza</div>
                    <div className="text-lg font-bold font-mono text-[#a78bfa]">
                      <AnimatedCounter value={98.4} decimals={1} suffix="%" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. BOTTOM HORIZONTAL RIBBON / TAPE                                   */}
        {/* ==================================================================== */}
        <div className="w-full border-t py-2.5 sm:py-3 overflow-hidden relative bg-[#090716] border-zinc-700/60 dark:border-white/10">
          <div className="flex shrink-0 animate-telemetry-scroll whitespace-nowrap will-change-transform text-white/90" style={{ animationDirection: 'reverse' }}>
            {[0, 1].map((replica) => (
              <div
                key={`tape-bottom-${replica}`}
                className="flex shrink-0 items-center gap-8 sm:gap-12 pr-8 sm:pr-12 text-sm sm:text-base lg:text-lg font-mono font-bold uppercase tracking-wider"
              >
                <span>ROSARIO, ARGENTINA</span>
                <span className="text-[#bdf559]">•</span>
                <span>AUDITORÍA EN TIEMPO REAL</span>
                <span className="text-[#7647eb]">•</span>
                <span>ISOLATION FOREST v2.4</span>
                <span className="text-[#bdf559]">•</span>
                <span>INFRAESTRUCTURA ZERO DATA LEAKAGE</span>
                <span className="text-[#7647eb]">•</span>
                <span>LIGHTGBM + PROPHET</span>
                <span className="text-[#bdf559]">•</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tactile Audit Drawer (Punto D) */}
      <AuditDrawerDOM
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
};

export default FullBleedCaseStudyDOM;
