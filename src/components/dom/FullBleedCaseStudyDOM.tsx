import React, { useRef, useState } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { DitherMatrixCanvas } from '@/components/canvas/DitherMatrixCanvas';
import { ArrowUpRight, Database, Terminal, FileCode2, BarChart3 } from 'lucide-react';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { DitherArt } from '@/components/ui/DitherArt';
import { playMioDevSound } from '@/lib/sound';
import { AuditDrawerDOM } from '@/components/dom/AuditDrawerDOM';

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
                <span>DATASET REAL: 138,116 FILAS</span>
                <span className="text-[#bdf559]">•</span>
                <span>ROLLING-ORIGIN BACKTESTING</span>
                <span className="text-[#7647eb]">•</span>
                <span>sMAPE: 13.5% vs 17.0% NAÏVE</span>
                <span className="text-[#bdf559]">•</span>
                <span>108 ANOMALÍAS AISLADAS</span>
                <span className="text-[#7647eb]">•</span>
                <span>ZERO DATA LEAKAGE</span>
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
              <SectionPlate index="04" label="LA PRUEBA // CORRIDA DE BENCHMARK REAL" tone="lime" onDark live />
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-3 leading-tight">
                Métricas reales. Código auditable.
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 self-start sm:self-auto bg-white/[0.04] px-3.5 py-1.5 rounded-full border border-white/10">
              <Terminal className="w-3.5 h-3.5 text-[#bdf559]" />
              <span>python scripts/benchmark_retail.py</span>
            </div>
          </div>

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
                    DATASET AUDITADO // ECOMMERCE 138K
                  </span>
                </div>
              </div>

              {/* Bottom Information & Metrics Half */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                    138,116 transacciones analizadas en memoria.
                  </h3>
                  <p className="text-sm text-zinc-400 font-normal leading-relaxed mb-6">
                    Corrida sobre 5 años de ventas diarias reales (2021-2025). Validación temporal estricta de 4 folds secuenciales sin filtración de datos futuros (*zero data leakage*).
                  </p>

                  {/* Telemetry Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">MIO sMAPE</div>
                      <div className="font-mono text-xl font-bold text-[#bdf559]">13.5%</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">vs 17.0% Naïve</div>
                    </div>
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Anomalías</div>
                      <div className="font-mono text-xl font-bold text-white">108</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Desvío MAD</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Horizonte</div>
                      <div className="font-mono text-xl font-bold text-white">14 días</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Fold 4</div>
                    </div>
                  </div>
                </div>

                {/* Audit citation & Split Action Button */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-zinc-500 font-mono">
                    Reproducible vía script open-source
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
                      Auditar 108 anomalías
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
                    ATRIBUCIÓN &amp; WHAT-IF // SIN HUMO
                  </span>
                </div>
              </div>

              {/* Bottom Information & Metrics Half */}
              <div className="p-6 sm:p-8 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
                    Sensibilidad paramétrica sin promesas falsas.
                  </h3>
                  <p className="text-sm text-zinc-400 font-normal leading-relaxed mb-6">
                    Atribución de variables calculada mediante valores SHAP. Simulador *ceteris paribus* basado en la elasticidad empírica observada en los datos históricos, sin inventar causalidad.
                  </p>

                  {/* Telemetry Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Atribución</div>
                      <div className="font-mono text-xl font-bold text-white">SHAP</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Pesos relativos</div>
                    </div>
                    <div className="p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Sensibilidad</div>
                      <div className="font-mono text-xl font-bold text-[#bdf559]">Elasticidad</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">Ceteris paribus</div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-3.5 rounded-mio-sm bg-white/[0.03] border border-white/10">
                      <div className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Inferencia</div>
                      <div className="font-mono text-xl font-bold text-white">&lt; 15s</div>
                      <div className="font-mono text-[10px] text-zinc-400 mt-0.5">En memoria</div>
                    </div>
                  </div>
                </div>

                {/* Audit citation & Split Action Button */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs text-zinc-500 font-mono">
                    Modelado auditable en navegador
                  </div>
                  
                  {/* Legency Split Button */}
                  <button
                    type="button"
                    onClick={() => scrollTo('#como-funciona')}
                    className="group inline-flex items-center gap-1.5 p-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 transition-all cursor-pointer"
                  >
                    <span className="font-mono text-xs font-semibold text-white px-3 py-1">
                      Ver Metodología
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
