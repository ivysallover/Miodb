import React from 'react';
import { DitherGeometricShape } from '@/components/canvas/DitherGeometricShape';
import { DitherMatrixCanvas } from '@/components/canvas/DitherMatrixCanvas';

/**
 * DitherFigureTransitionDOM:
 * Iconic Verde MIO (#bdf559) Architectural Monolith Module.
 * Replaces the previous plain white block with signature high-voltage Verde MIO,
 * featuring the live dither dot matrix wave background that reacts dynamically
 * to mouse hover, and the 3D mathematical Torus Knot in the center.
 */
export const DitherFigureTransitionDOM: React.FC = () => {
  return (
    <section
      aria-label="Núcleo Algorítmico MIO"
      className="relative w-full border-y select-none transition-colors duration-500 z-10 my-0 overflow-hidden bg-[#bdf559] text-zinc-950 border-black/20 shadow-lg"
    >
      {/* 0. Ambient Halftone / Dither Pixel Matrix Wave Background (reactive to mouse hovering) */}
      <DitherMatrixCanvas
        dotColor="rgba(4, 45, 20, 0.16)"
        accentColor="rgba(0, 0, 0, 0.32)"
        className="opacity-75"
      />

      {/* Edge gradient vignettes so the dither field blends smoothly */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-r from-[#bdf559]/60 via-transparent to-[#bdf559]/60" />
      <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(189,245,89,0.5)_85%)]" />

      {/* 1. Technical Marquee Datum Header */}
      <div className="relative z-10 w-full py-2.5 px-4 border-b border-black/15 bg-black/[0.08] text-[10px] sm:text-[11px] font-mono tracking-widest uppercase flex items-center overflow-hidden text-zinc-900 font-semibold">
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className="text-black">• CONVERGENCIA DETERMINÍSTICA</span>
          <span>• DE EXCEL CRUDO A DECISIÓN EJECUTIVA</span>
          <span>• 4 ARQUITECTURAS EN COMPETENCIA PARALELA</span>
          <span className="text-black">• INFERENCIA &lt; 8.2MS</span>
          <span>• SIN TARJETAS VACÍAS: RESULTADOS MATEMÁTICOS REALES</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10" aria-hidden="true">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className="text-black">• CONVERGENCIA DETERMINÍSTICA</span>
          <span>• DE EXCEL CRUDO A DECISIÓN EJECUTIVA</span>
          <span>• 4 ARQUITECTURAS EN COMPETENCIA PARALELA</span>
          <span className="text-black">• INFERENCIA &lt; 8.2MS</span>
          <span>• SIN TARJETAS VACÍAS: RESULTADOS MATEMÁTICOS REALES</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
      </div>

      {/* 2. Integrated Horizontal Architectural Datum Panel */}
      <div className="relative z-10 w-full max-w-[1520px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
        
        {/* 3-Column Integrated Pipeline Datum with protective backing for 100% typography legibility */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-black/15 border border-black/20 rounded-2xl overflow-hidden bg-[#bdf559]/92 backdrop-blur-md shadow-md">
          
          {/* Column 1: Entrada & Problema Resuelto */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded border uppercase bg-black/10 border-black/20 text-zinc-950 font-semibold">
                  01 // ENTRADA DE DATOS
                </span>
                <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-zinc-950">
                Planillas crudas sin preprocesar.
              </h3>
              
              <p className="text-xs sm:text-sm leading-relaxed mb-4 text-zinc-900 font-normal">
                Arrastrás tu archivo <strong className="text-black font-semibold">.xlsx</strong> o <strong className="text-black font-semibold">.csv</strong> tal como sale de tu ERP. MIO reconoce tipos, limpia filas vacías, imputa valores faltantes y aísla anomalías estadísticas (&gt;3σ) mediante Isolation Forest.
              </p>
            </div>

            <div className="pt-3 border-t border-black/15 flex items-center justify-between text-xs font-mono text-zinc-900">
              <span>Tiempo de ingesta:</span>
              <strong className="text-black font-bold font-mono">&lt; 15 segundos</strong>
            </div>
          </div>

          {/* Column 2: El Núcleo - 3D Dither Torus (Algorithmic Loop) */}
          <div className="lg:col-span-4 p-5 sm:p-7 flex flex-col justify-between items-center relative overflow-hidden bg-black/[0.02]">
            <div className="w-full flex items-center justify-between px-1 mb-2 z-10">
              <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-900 font-semibold">
                02 // TOPOLOGÍA TORUS (AUTOML)
              </span>
              <span className="text-[10px] font-mono font-bold text-black bg-black/10 px-2 py-0.5 rounded border border-black/15">
                LOSS: 0.0014
              </span>
            </div>

            {/* The 3D Dither Torus Knot - Perfectly framed with zero text overlap */}
            <div className="w-full h-44 sm:h-48 flex items-center justify-center relative overflow-hidden my-auto pointer-events-none">
              <DitherGeometricShape
                shapeType="torusKnot"
                size={260}
                colorMode="light"
                palette="obsidianOnLime"
                className="w-full h-full"
              />
            </div>

            <p className="text-[11px] font-mono text-center tracking-tight text-zinc-900 mt-2 z-10 font-medium">
              Bucle continuo: 4 arquitecturas compitiendo por validación cruzada temporal.
            </p>
          </div>

          {/* Column 3: Salida Ejecutiva & Utilidad Real */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded border uppercase bg-black/10 border-black/20 text-zinc-950 font-semibold">
                  03 // SALIDA & DECISIÓN
                </span>
                <span className="w-2 h-2 rounded-full bg-black" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2 text-zinc-950">
                Decisiones claras para Directorio.
              </h3>
              
              <p className="text-xs sm:text-sm leading-relaxed mb-4 text-zinc-900 font-normal">
                Proyecciones explicables en lenguaje de negocio con bandas de incertidumbre (80% y 95%). Simulador de escenarios What-If para evaluar precios y demanda antes de comprometer capital.
              </p>
            </div>

            <div className="pt-3 border-t border-black/15 flex items-center justify-between text-xs font-mono text-zinc-900">
              <span>Latencia de inferencia:</span>
              <strong className="text-black font-bold font-mono">8.2 ms (In-Memory)</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default DitherFigureTransitionDOM;
