import React from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { DitherGeometricShape } from '@/components/canvas/DitherGeometricShape';

/**
 * DitherFigureTransitionDOM:
 * Slim, edge-to-edge architectural datum strip cutting between modules.
 * Inverted contrast: Dark in Light Mode, Light in Dark Mode for genuine "sensación de corte".
 * Explains clearly what MIO does without any floating cards.
 */
export const DitherFigureTransitionDOM: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Inverted theme logic:
  // If app is Light Mode -> Section is Dark (#07050f) cutting across white
  // If app is Dark Mode  -> Section is Light (#f4f3f9) cutting across obsidian
  const isBandDark = !isDark;

  return (
    <section
      aria-label="Núcleo Algorítmico MIO"
      className={`relative w-full border-y select-none transition-colors duration-500 z-10 my-0 overflow-hidden ${
        isBandDark
          ? 'bg-[#07050f] text-white border-white/10'
          : 'bg-[#f4f3f9] text-zinc-950 border-black/15 shadow-sm'
      }`}
    >
      {/* 1. Slim Technical Marquee Datum Header */}
      <div
        className={`w-full py-2 px-4 border-b text-[10px] sm:text-[11px] font-mono tracking-widest uppercase flex items-center overflow-hidden ${
          isBandDark
            ? 'bg-black/40 border-white/10 text-zinc-400'
            : 'bg-black/[0.03] border-black/10 text-zinc-600'
        }`}
      >
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10 font-medium">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className={isBandDark ? 'text-[#bdf559]' : 'text-[#602cd1]'}>• CONVERGENCIA DETERMINÍSTICA</span>
          <span>• DE EXCEL CRUDO A DECISIÓN EJECUTIVA</span>
          <span>• 4 ARQUITECTURAS EN COMPETENCIA PARALELA</span>
          <span className={isBandDark ? 'text-[#bdf559]' : 'text-[#602cd1]'}>• INFERENCIA &lt; 8.2MS</span>
          <span>• SIN TARJETAS VACÍAS: RESULTADOS MATEMÁTICOS REALES</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
        <div className="flex shrink-0 animate-marquee whitespace-nowrap gap-10 font-medium" aria-hidden="true">
          <span>// NÚCLEO CONTINUO MIO</span>
          <span className={isBandDark ? 'text-[#bdf559]' : 'text-[#602cd1]'}>• CONVERGENCIA DETERMINÍSTICA</span>
          <span>• DE EXCEL CRUDO A DECISIÓN EJECUTIVA</span>
          <span>• 4 ARQUITECTURAS EN COMPETENCIA PARALELA</span>
          <span className={isBandDark ? 'text-[#bdf559]' : 'text-[#602cd1]'}>• INFERENCIA &lt; 8.2MS</span>
          <span>• SIN TARJETAS VACÍAS: RESULTADOS MATEMÁTICOS REALES</span>
          <span>• ISOLATION FOREST + LIGHTGBM + PROPHET</span>
        </div>
      </div>

      {/* 2. Integrated Horizontal Architectural Datum Panel (Flush, No Floating Cards) */}
      <div className="w-full max-w-[1520px] mx-auto px-6 sm:px-10 lg:px-16 py-8 sm:py-10">
        
        {/* 3-Column Integrated Pipeline Datum */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x border rounded-xl overflow-hidden ${
          isBandDark ? 'border-white/10 divide-white/10 bg-white/[0.01]' : 'border-black/10 divide-black/10 bg-white'
        }`}>
          
          {/* Column 1: Entrada & Problema Resuelto */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-mono tracking-widest px-2 py-0.5 rounded border uppercase ${
                  isBandDark ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-black/5 border-black/10 text-zinc-700'
                }`}>
                  01 // ENTRADA DE DATOS
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${isBandDark ? 'bg-[#bdf559]' : 'bg-emerald-600'}`} />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Planillas crudas sin preprocesar.
              </h3>
              
              <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${
                isBandDark ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                Arrastrás tu archivo <strong>.xlsx</strong> o <strong>.csv</strong> tal como sale de tu ERP. MIO reconoce tipos, limpia filas vacías, imputa valores faltantes y aísla anomalías estadísticas (&gt;3σ) mediante Isolation Forest.
              </p>
            </div>

            <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono ${
              isBandDark ? 'border-white/10 text-zinc-400' : 'border-black/10 text-zinc-500'
            }`}>
              <span>Tiempo de ingesta:</span>
              <strong className={isBandDark ? 'text-[#bdf559]' : 'text-emerald-700'}>&lt; 15 segundos</strong>
            </div>
          </div>

          {/* Column 2: El Núcleo - 3D Dither Torus (Algorithmic Loop) */}
          <div className={`lg:col-span-4 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-hidden ${
            isBandDark ? 'bg-black/20' : 'bg-zinc-50/50'
          }`}>
            <div className="w-full flex items-center justify-between px-2 mb-1">
              <span className={`text-[10px] font-mono tracking-widest uppercase ${
                isBandDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}>
                02 // TOPOLOGÍA TORUS (AUTOML)
              </span>
              <span className={`text-[10px] font-mono font-bold ${
                isBandDark ? 'text-[#bdf559]' : 'text-[#602cd1]'
              }`}>
                LOSS: 0.0014
              </span>
            </div>

            {/* The 3D Dither Torus */}
            <div className="w-full h-44 sm:h-52 flex items-center justify-center relative">
              <DitherGeometricShape
                shapeType="torusKnot"
                size={340}
                colorMode={isBandDark ? 'dark' : 'light'}
                className="w-full h-full"
              />
            </div>

            <p className={`text-[11px] font-mono text-center tracking-tight ${
              isBandDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}>
              Bucle continuo: 4 arquitecturas compitiendo por validación cruzada temporal.
            </p>
          </div>

          {/* Column 3: Salida Ejecutiva & Utilidad Real */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-mono tracking-widest px-2 py-0.5 rounded border uppercase ${
                  isBandDark ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-black/5 border-black/10 text-zinc-700'
                }`}>
                  03 // SALIDA & DECISIÓN
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${isBandDark ? 'bg-[#bdf559]' : 'bg-[#602cd1]'}`} />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Decisiones claras para Directorio.
              </h3>
              
              <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${
                isBandDark ? 'text-zinc-300' : 'text-zinc-600'
              }`}>
                Proyecciones explicables en lenguaje de negocio con bandas de incertidumbre (80% y 95%). Simulador de escenarios What-If para evaluar precios y demanda antes de comprometer capital.
              </p>
            </div>

            <div className={`pt-3 border-t flex items-center justify-between text-xs font-mono ${
              isBandDark ? 'border-white/10 text-zinc-400' : 'border-black/10 text-zinc-500'
            }`}>
              <span>Latencia de inferencia:</span>
              <strong className={isBandDark ? 'text-[#bdf559]' : 'text-[#602cd1]'}>8.2 ms (In-Memory)</strong>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default DitherFigureTransitionDOM;
