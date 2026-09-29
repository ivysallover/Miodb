import React from 'react';
import { DitherGeometricShape } from '@/components/canvas/DitherGeometricShape';
import { DitherMatrixCanvas } from '@/components/canvas/DitherMatrixCanvas';

/**
 * DitherFigureTransitionDOM:
 * Slim, edge-to-edge architectural datum monolith module.
 * Features the signature background animated dither pixel matrix wave (matching case study banner)
 * with the 3D Torus knot algorithmic engine rendered in Verde MIO (#bdf559).
 */
export const DitherFigureTransitionDOM: React.FC = () => {
  return (
    <section
      aria-label="Núcleo Algorítmico MIO"
      className="relative w-full border-y select-none transition-colors duration-500 z-10 my-0 overflow-hidden bg-[#06040e] text-white border-zinc-700/60 dark:border-white/10 shadow-sm"
    >
      {/* 0. Ambient Halftone / Dither Pixel Matrix Wave Background (matching case study banner) */}
      <DitherMatrixCanvas
        dotColor="#312e81"
        accentColor="#7647eb"
        className="opacity-70"
      />

      {/* Ambient Vignette Gradients for depth and focus */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-r from-[#06040e] via-[#06040e]/75 to-[#06040e]/90" />
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#06040e_85%)]" />

      {/* 1. Slim Technical Marquee Datum Header */}
      <div className="relative z-10 w-full py-2.5 px-4 border-b border-white/10 bg-black/50 backdrop-blur-sm text-[10px] sm:text-[11px] font-mono tracking-widest uppercase flex items-center overflow-hidden text-zinc-400">
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10 font-medium">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className="text-[#bdf559]">• CONVERGENCIA DETERMINÍSTICA</span>
          <span>• DE EXCEL CRUDO A DECISIÓN EJECUTIVA</span>
          <span>• 4 ARQUITECTURAS EN COMPETENCIA PARALELA</span>
          <span className="text-[#bdf559]">• INFERENCIA &lt; 8.2MS</span>
          <span>• SIN TARJETAS VACÍAS: RESULTADOS MATEMÁTICOS REALES</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10 font-medium" aria-hidden="true">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className="text-[#bdf559]">• CONVERGENCIA DETERMINÍSTICA</span>
          <span>• DE EXCEL CRUDO A DECISIÓN EJECUTIVA</span>
          <span>• 4 ARQUITECTURAS EN COMPETENCIA PARALELA</span>
          <span className="text-[#bdf559]">• INFERENCIA &lt; 8.2MS</span>
          <span>• SIN TARJETAS VACÍAS: RESULTADOS MATEMÁTICOS REALES</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
      </div>

      {/* 2. Integrated Horizontal Architectural Datum Panel */}
      <div className="relative z-10 w-full max-w-[1520px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
        
        {/* 3-Column Integrated Pipeline Datum */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/10 border border-white/10 rounded-xl overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
          
          {/* Column 1: Entrada & Problema Resuelto */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded border uppercase bg-white/5 border-white/10 text-zinc-300">
                  01 // ENTRADA DE DATOS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-white">
                Planillas crudas sin preprocesar.
              </h3>
              
              <p className="text-xs sm:text-sm leading-relaxed mb-4 text-zinc-300">
                Arrastrás tu archivo <strong className="text-white font-semibold">.xlsx</strong> o <strong className="text-white font-semibold">.csv</strong> tal como sale de tu ERP. MIO reconoce tipos, limpia filas vacías, imputa valores faltantes y aísla anomalías estadísticas (&gt;3σ) mediante Isolation Forest.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Tiempo de ingesta:</span>
              <strong className="text-[#bdf559]">&lt; 15 segundos</strong>
            </div>
          </div>

          {/* Column 2: El Núcleo - 3D Dither Torus (Algorithmic Loop) in Verde MIO */}
          <div className="lg:col-span-4 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden bg-white/[0.02]">
            <div className="w-full flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
                02 // TOPOLOGÍA TORUS (AUTOML)
              </span>
              <span className="text-[10px] font-mono font-bold text-[#bdf559]">
                LOSS: 0.0014
              </span>
            </div>

            {/* The 3D Dither Torus Knot in Authentic Verde MIO */}
            <div className="w-full h-44 sm:h-52 flex items-center justify-center relative">
              <DitherGeometricShape
                shapeType="torusKnot"
                size={340}
                colorMode="dark"
                palette="lime"
                className="w-full h-full"
              />
            </div>

            <p className="text-[11px] font-mono text-center tracking-tight text-zinc-400">
              Bucle continuo: 4 arquitecturas compitiendo por validación cruzada temporal.
            </p>
          </div>

          {/* Column 3: Salida Ejecutiva & Utilidad Real */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded border uppercase bg-white/5 border-white/10 text-zinc-300">
                  03 // SALIDA & DECISIÓN
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-white">
                Decisiones claras para Directorio.
              </h3>
              
              <p className="text-xs sm:text-sm leading-relaxed mb-4 text-zinc-300">
                Proyecciones explicables en lenguaje de negocio con bandas de incertidumbre (80% y 95%). Simulador de escenarios What-If para evaluar precios y demanda antes de comprometer capital.
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Latencia de inferencia:</span>
              <strong className="text-[#bdf559]">8.2 ms (In-Memory)</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default DitherFigureTransitionDOM;
