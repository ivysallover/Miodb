import React from 'react';
import { DitherGeometricShape } from '@/components/canvas/DitherGeometricShape';
import { DitherMatrixCanvas } from '@/components/canvas/DitherMatrixCanvas';
import { Cpu, ShieldCheck, TrendingUp, Sparkles, Activity } from 'lucide-react';

/**
 * DitherFigureTransitionDOM:
 * Monumental Verde MIO (#bdf559) Architectural Monolith Module.
 * Redesigned to high-end design engineering standards:
 * - Grand Monumental 3D Torus Knot (size 460px, h-460px) in Electric Royal Violet & Obsidian.
 * - Interactive dither matrix wave background reactive to mouse hover.
 * - Double-Bezel (Doppelrand) nested architectural cards with tactile telemetry.
 * - Ultra-high contrast: Electric Violet on High-Voltage Lime.
 */
export const DitherFigureTransitionDOM: React.FC = () => {
  return (
    <section
      id="nucleo-algoritmico"
      aria-label="Núcleo Algorítmico MIO"
      className="relative w-full border-y select-none transition-colors duration-500 z-10 my-0 overflow-hidden bg-[#bdf559] text-zinc-950 border-black/20 shadow-xl"
    >
      {/* 0. Ambient Halftone / Dither Pixel Matrix Wave Background (reactive to mouse hover) */}
      <DitherMatrixCanvas
        dotColor="rgba(8, 45, 20, 0.18)"
        accentColor="rgba(109, 40, 217, 0.28)"
        className="opacity-80"
      />

      {/* Edge gradient vignettes so the dither field blends smoothly */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-r from-[#bdf559]/70 via-transparent to-[#bdf559]/70" />
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(189,245,89,0.55)_85%)]" />

      {/* 1. Technical Marquee Datum Header */}
      <div className="relative z-10 w-full py-2.5 px-4 border-b border-black/15 bg-black/[0.08] text-[10px] sm:text-[11px] font-mono tracking-widest uppercase flex items-center overflow-hidden text-zinc-900 font-semibold">
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className="text-black font-bold">• TOPOLOGÍA TORUS 3D EN TIEMPO REAL</span>
          <span>• 138,116 REGISTROS AUDITADOS</span>
          <span className="text-black font-bold">• SMAPE: 13.50% (VS 17.01% NAÏVE)</span>
          <span>• 108 ANOMALÍAS AISLADAS</span>
          <span className="text-black font-bold">• MOTOR IN-MEMORY VOLÁTIL</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10" aria-hidden="true">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className="text-black font-bold">• TOPOLOGÍA TORUS 3D EN TIEMPO REAL</span>
          <span>• 138,116 REGISTROS AUDITADOS</span>
          <span className="text-black font-bold">• SMAPE: 13.50% (VS 17.01% NAÏVE)</span>
          <span>• 108 ANOMALÍAS AISLADAS</span>
          <span className="text-black font-bold">• MOTOR IN-MEMORY VOLÁTIL</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
      </div>

      {/* 2. Main Monumental Architectural Chamber */}
      <div className="relative z-10 w-full max-w-[1520px] mx-auto px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-20">
        
        {/* Section Plate Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/10 border border-black/20 text-xs font-mono font-bold uppercase tracking-widest text-zinc-950 mb-4">
            <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span>05 // NÚCLEO MATEMÁTICO AUTOML</span>
          </div>
          <h2 className="font-climate text-3xl sm:text-4xl lg:text-5xl text-zinc-950 tracking-tight leading-tight">
            Topología Continua en Memoria
          </h2>
          <p className="mt-3 text-sm sm:text-base text-zinc-900 font-medium max-w-lg leading-relaxed">
            Un bucle de 4 arquitecturas algorítmicas compitiendo en paralelo con validación temporal estricta y sin data leakage.
          </p>
        </div>

        {/* MONUMENTAL 3D TORUS STAGE ("Agrandalo & Cambiale el color") */}
        <div className="relative w-full max-w-4xl mx-auto h-[340px] sm:h-[420px] lg:h-[460px] flex items-center justify-center my-6 sm:my-8 overflow-visible select-none">
          {/* Subtle Ambient Vignette Behind the Torus */}
          <div className="absolute inset-0 bg-radial-gradient from-purple-900/10 via-transparent to-transparent pointer-events-none rounded-full blur-2xl" />

          {/* Grand 3D Dither Torus Knot in High-Contrast Electric Violet */}
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
            <DitherGeometricShape
              shapeType="torusKnot"
              size={460}
              colorMode="light"
              palette="electricViolet"
              className="w-full h-full"
            />
          </div>

          {/* Floating High-Tech Telemetry Tags */}
          <div className="absolute top-2 left-2 sm:top-6 sm:left-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/15 border border-black/25 backdrop-blur-md text-[11px] font-mono font-bold text-zinc-950">
            <Activity className="w-3.5 h-3.5 text-zinc-900" />
            <span>TOPOLOGÍA: TORUS KNOT [2, 3]</span>
          </div>

          <div className="absolute top-2 right-2 sm:top-6 sm:right-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/15 border border-black/25 backdrop-blur-md text-[11px] font-mono font-bold text-zinc-950">
            <Sparkles className="w-3.5 h-3.5 text-purple-900" />
            <span>PALETA: ROYAL VIOLET DITHER</span>
          </div>

          <div className="absolute bottom-2 left-2 sm:bottom-6 sm:left-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/15 border border-black/25 backdrop-blur-md text-[11px] font-mono font-bold text-zinc-950">
            <span>AUDITADO: 138K REGISTROS</span>
          </div>

          <div className="absolute bottom-2 right-2 sm:bottom-6 sm:right-6 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/15 border border-black/25 backdrop-blur-md text-[11px] font-mono font-bold text-zinc-950">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
            <span>sMAPE 13.50% (ÓPTIMO)</span>
          </div>
        </div>

        {/* 3. Double-Bezel Control Deck Cards (Doppelrand Architecture) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mt-10">
          
          {/* Card 1: Entrada y Limpieza */}
          <div className="group p-2 rounded-[2rem] bg-black/10 border border-black/15 shadow-sm transition-all duration-300 hover:-translate-y-1">
            <div className="h-full rounded-[calc(2rem-0.5rem)] bg-[#bdf559]/95 backdrop-blur-md p-6 sm:p-7 border border-black/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-2 rounded-xl bg-black/10 text-zinc-950">
                    <Cpu className="w-4 h-4 text-zinc-950" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 rounded-md bg-black/10 border border-black/15 text-zinc-950">
                    01 // INGESTA
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-950 mb-2">
                  Planillas crudas sin preparar
                </h3>
                <p className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-medium">
                  Subí tu archivo <strong className="text-black font-bold">.xlsx</strong> o <strong className="text-black font-bold">.csv</strong> tal cual. MIO infiere tipos, limpia nulos y tipifica fechas sin mezclar el futuro con el pasado.
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-black/15 flex items-center justify-between text-xs font-mono font-bold text-zinc-950">
                <span>Tiempo de ingesta:</span>
                <span className="px-2 py-0.5 rounded bg-black/10">&lt; 15 segundos</span>
              </div>
            </div>
          </div>

          {/* Card 2: Isolation Forest & Torus */}
          <div className="group p-2 rounded-[2rem] bg-black/10 border border-black/15 shadow-sm transition-all duration-300 hover:-translate-y-1">
            <div className="h-full rounded-[calc(2rem-0.5rem)] bg-[#bdf559]/95 backdrop-blur-md p-6 sm:p-7 border border-black/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-2 rounded-xl bg-black/10 text-zinc-950">
                    <ShieldCheck className="w-4 h-4 text-purple-900" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 rounded-md bg-black/10 border border-black/15 text-zinc-950">
                    02 // TORNEO AUTOML
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-950 mb-2">
                  Aislamiento & Torneo
                </h3>
                <p className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-medium">
                  Isolation Forest separa 108 anomalías multivariadas mientras LightGBM, Prophet y XGBoost compiten con validación cruzada temporal de 4 folds.
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-black/15 flex items-center justify-between text-xs font-mono font-bold text-zinc-950">
                <span>Error sMAPE:</span>
                <span className="px-2 py-0.5 rounded bg-black/10 text-purple-950">13.50% vs 17.01%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Salida y Certeza */}
          <div className="group p-2 rounded-[2rem] bg-black/10 border border-black/15 shadow-sm transition-all duration-300 hover:-translate-y-1">
            <div className="h-full rounded-[calc(2rem-0.5rem)] bg-[#bdf559]/95 backdrop-blur-md p-6 sm:p-7 border border-black/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="p-2 rounded-xl bg-black/10 text-zinc-950">
                    <TrendingUp className="w-4 h-4 text-zinc-950" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 rounded-md bg-black/10 border border-black/15 text-zinc-950">
                    03 // DECISIÓN
                  </span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-zinc-950 mb-2">
                  Certeza cuantificada P95
                </h3>
                <p className="text-xs sm:text-sm text-zinc-900 leading-relaxed font-medium">
                  Pronósticos en lenguaje de negocio con abanicos de incertidumbre (80% y 95%) y simulador de elasticidad de demanda para evaluar precios.
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-black/15 flex items-center justify-between text-xs font-mono font-bold text-zinc-950">
                <span>Inferencia:</span>
                <span className="px-2 py-0.5 rounded bg-black/10">In-Memory Volátil</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default DitherFigureTransitionDOM;
