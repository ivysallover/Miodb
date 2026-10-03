import React, { useEffect, useRef, useState } from 'react';
import { gsap } from '@/lib/gsap';
import { playMioDevSound } from '@/lib/sound';
import { Cpu, Database, Activity, Sparkles, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMioStore } from '@/utils/useMioStore';

interface ShockwaveRing {
  id: number;
}

export const MioNeuralFlow: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const containerRef = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const path3Ref = useRef<SVGPathElement>(null);
  const path4Ref = useRef<SVGPathElement>(null);
  const nexusRef = useRef<HTMLDivElement>(null);

  const [isNexusHovered, setIsNexusHovered] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [shockwaves, setShockwaves] = useState<ShockwaveRing[]>([]);
  const shockwaveIdCounter = useRef(0);

  const triggerShockwave = () => {
    playMioDevSound('shockwave');
    const newId = ++shockwaveIdCounter.current;
    setShockwaves((prev) => [...prev.slice(-3), { id: newId }]);

    setTimeout(() => {
      setShockwaves((prev) => prev.filter((s) => s.id !== newId));
    }, 1200);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const paths = [path1Ref.current, path2Ref.current, path3Ref.current, path4Ref.current].filter(
      Boolean
    ) as SVGPathElement[];

    paths.forEach((p) => {
      const len = p.getTotalLength();
      gsap.set(p, {
        strokeDasharray: len,
        strokeDashoffset: len,
      });
    });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: 'top 75%',
          end: 'center center',
          scrub: 0.8,
          invalidateOnRefresh: true,
          onEnter: () => {
            // Initiate flow
          },
          onLeave: () => {
            triggerShockwave();
          },
        },
      });

      paths.forEach((p, idx) => {
        tl.to(
          p,
          {
            strokeDashoffset: 0,
            ease: 'power1.out',
          },
          idx * 0.03
        );
      });

      if (nexusRef.current) {
        tl.fromTo(
          nexusRef.current,
          { scale: 0.82, opacity: 0.4, filter: 'brightness(0.7)' },
          { scale: 1, opacity: 1, filter: 'brightness(1.25)', ease: 'power2.out' },
          0.15
        );
      }
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      id="neural-flow"
      className={`relative w-full py-20 sm:py-28 backdrop-blur-md overflow-hidden select-none border-y transition-colors duration-500 ${
        isDark ? 'bg-[#050508]/85 border-white/10 text-white' : 'bg-[#f6f6f2]/90 border-black/10 text-zinc-950'
      }`}
    >
      {/* Precision matrix grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(to right, rgba(189, 245, 89, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(118, 71, 235, 0.15) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(0, 0, 0, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col items-center">
        {/* Header Telemetry Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 font-mono text-[10px] sm:text-xs uppercase tracking-widest mb-6 rounded-full border ${
          isDark ? 'bg-[#0f0a20] border-[#bdf559]/30 text-[#bdf559]' : 'bg-black/5 border-black/10 text-zinc-800'
        }`}>
          <Activity className="w-3.5 h-3.5 animate-pulse text-[#bdf559]" />
          <span>DATA PIPELINE TRANSITION // CONVERGENCIA DE FIBRA ÓPTICA</span>
        </div>

        <h3 className={`text-3xl sm:text-5xl font-semibold text-center tracking-tight max-w-3xl mb-3 ${
          isDark ? 'text-white' : 'text-zinc-950'
        }`}>
          De streams caóticos a{' '}
          <span
            className={
              isDark
                ? 'bg-gradient-to-r from-[#bdf559] via-[#d4ff7e] to-white bg-clip-text text-transparent'
                : 'bg-gradient-to-r from-[#2d6a00] via-[#5b24c6] to-black bg-clip-text text-transparent'
            }
          >
            decisiones ordenadas.
          </span>
        </h3>
        <p className="text-xs sm:text-sm font-mono text-zinc-400 text-center max-w-xl mb-10">
          4 flujos de datos corporativos convergen en vivo como pulsos fotónicos hacia el motor de inferencia AutoML. Hacé click en el Nexus para detonar un pulso de choque.
        </p>

        {/* SVG Data Stream Canvas with Dual-layer Glow */}
        <div className="relative w-full max-w-4xl h-72 sm:h-96 flex items-center justify-center">
          
          {/* Concentric Shockwave Rings Expanding from Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <AnimatePresence>
              {shockwaves.map((sw) => (
                <motion.div
                  key={sw.id}
                  initial={{ scale: 0.12, opacity: 0.95 }}
                  animate={{
                    scale: 1.15,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute w-[560px] h-[560px] rounded-full border-2 border-[#bdf559] shadow-[0_0_35px_#bdf559,inset_0_0_20px_#bdf559]"
                />
              ))}
            </AnimatePresence>
          </div>

          <svg
            className="absolute inset-0 w-full h-full overflow-visible"
            viewBox="0 0 800 340"
            fill="none"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="neuralFlowGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bdf559" />
                <stop offset="65%" stopColor="#7647eb" />
                <stop offset="100%" stopColor="#bdf559" />
              </linearGradient>
              <linearGradient id="neuralFlowGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7647eb" />
                <stop offset="70%" stopColor="#bdf559" />
                <stop offset="100%" stopColor="#7647eb" />
              </linearGradient>
              <filter id="laserBloom" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Stream 01: Top Left Ingest */}
            {/* Outer bloom */}
            <path
              d="M 50 40 C 220 40, 280 170, 400 170"
              stroke="#bdf559"
              strokeWidth="6"
              strokeOpacity={activeStreamId === 's1' ? 0.65 : 0.25}
              strokeLinecap="round"
            />
            {/* Core laser beam */}
            <path
              ref={path1Ref}
              d="M 50 40 C 220 40, 280 170, 400 170"
              stroke="url(#neuralFlowGrad1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#laserBloom)"
            />
            <circle r="4.5" fill="#bdf559" className="filter drop-shadow-[0_0_10px_#bdf559]">
              <animateMotion dur="2.2s" repeatCount="indefinite" path="M 50 40 C 220 40, 280 170, 400 170" />
            </circle>
            <circle r="3" fill="#ffffff" className="filter drop-shadow-[0_0_6px_#ffffff]">
              <animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path="M 50 40 C 220 40, 280 170, 400 170" />
            </circle>

            {/* Stream 02: Bottom Left Ingest */}
            <path
              d="M 50 300 C 240 300, 270 170, 400 170"
              stroke="#7647eb"
              strokeWidth="6"
              strokeOpacity={activeStreamId === 's2' ? 0.65 : 0.25}
              strokeLinecap="round"
            />
            <path
              ref={path2Ref}
              d="M 50 300 C 240 300, 270 170, 400 170"
              stroke="url(#neuralFlowGrad2)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#laserBloom)"
            />
            <circle r="4.5" fill="#7647eb" className="filter drop-shadow-[0_0_10px_#7647eb]">
              <animateMotion dur="2.6s" repeatCount="indefinite" path="M 50 300 C 240 300, 270 170, 400 170" />
            </circle>
            <circle r="3" fill="#bdf559" className="filter drop-shadow-[0_0_6px_#bdf559]">
              <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" path="M 50 300 C 240 300, 270 170, 400 170" />
            </circle>

            {/* Stream 03: Top Right Ingest */}
            <path
              d="M 750 40 C 580 40, 520 170, 400 170"
              stroke="#7647eb"
              strokeWidth="6"
              strokeOpacity={activeStreamId === 's3' ? 0.65 : 0.25}
              strokeLinecap="round"
            />
            <path
              ref={path3Ref}
              d="M 750 40 C 580 40, 520 170, 400 170"
              stroke="url(#neuralFlowGrad2)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#laserBloom)"
            />
            <circle r="4.5" fill="#7647eb" className="filter drop-shadow-[0_0_10px_#7647eb]">
              <animateMotion dur="2.4s" repeatCount="indefinite" path="M 750 40 C 580 40, 520 170, 400 170" />
            </circle>
            <circle r="3" fill="#bdf559" className="filter drop-shadow-[0_0_6px_#bdf559]">
              <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M 750 40 C 580 40, 520 170, 400 170" />
            </circle>

            {/* Stream 04: Bottom Right Ingest */}
            <path
              d="M 750 300 C 560 300, 530 170, 400 170"
              stroke="#bdf559"
              strokeWidth="6"
              strokeOpacity={activeStreamId === 's4' ? 0.65 : 0.25}
              strokeLinecap="round"
            />
            <path
              ref={path4Ref}
              d="M 750 300 C 560 300, 530 170, 400 170"
              stroke="url(#neuralFlowGrad1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#laserBloom)"
            />
            <circle r="4.5" fill="#bdf559" className="filter drop-shadow-[0_0_10px_#bdf559]">
              <animateMotion dur="2.3s" repeatCount="indefinite" path="M 750 300 C 560 300, 530 170, 400 170" />
            </circle>
            <circle r="3" fill="#ffffff" className="filter drop-shadow-[0_0_6px_#ffffff]">
              <animateMotion dur="2.3s" begin="1.15s" repeatCount="indefinite" path="M 750 300 C 560 300, 530 170, 400 170" />
            </circle>
          </svg>

          {/* Interactive Source Nodes */}
          <div
            onMouseEnter={() => {
              setActiveStreamId('s1');
              playMioDevSound('tick');
            }}
            onMouseLeave={() => setActiveStreamId(null)}
            className="absolute left-2 sm:left-4 top-4 flex items-center gap-2 px-3 py-1.5 bg-[#0e0a1c] border border-white/20 rounded-lg font-mono text-[9px] sm:text-[10px] text-zinc-300 shadow-[0_0_12px_rgba(0,0,0,0.8)] cursor-pointer hover:border-[#bdf559] transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-[#bdf559]" />
            <div>
              <span className="font-bold text-white block">ventas_retail_q4.xlsx</span>
              <span className="text-zinc-500 text-[8px]">14.2k filas · Stream 01</span>
            </div>
          </div>

          <div
            onMouseEnter={() => {
              setActiveStreamId('s2');
              playMioDevSound('tick');
            }}
            onMouseLeave={() => setActiveStreamId(null)}
            className="absolute left-2 sm:left-4 bottom-4 flex items-center gap-2 px-3 py-1.5 bg-[#0e0a1c] border border-white/20 rounded-lg font-mono text-[9px] sm:text-[10px] text-zinc-300 shadow-[0_0_12px_rgba(0,0,0,0.8)] cursor-pointer hover:border-[#7647eb] transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-violet-400" />
            <div>
              <span className="font-bold text-white block">clientes_crm.csv</span>
              <span className="text-zinc-500 text-[8px]">8.9k registros · Stream 02</span>
            </div>
          </div>

          <div
            onMouseEnter={() => {
              setActiveStreamId('s3');
              playMioDevSound('tick');
            }}
            onMouseLeave={() => setActiveStreamId(null)}
            className="absolute right-2 sm:right-4 top-4 flex items-center gap-2 px-3 py-1.5 bg-[#0e0a1c] border border-white/20 rounded-lg font-mono text-[9px] sm:text-[10px] text-zinc-300 shadow-[0_0_12px_rgba(0,0,0,0.8)] cursor-pointer hover:border-[#7647eb] transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-violet-400" />
            <div>
              <span className="font-bold text-white block">telemetria_eventos.json</span>
              <span className="text-zinc-500 text-[8px]">Realtime Stream 03</span>
            </div>
          </div>

          <div
            onMouseEnter={() => {
              setActiveStreamId('s4');
              playMioDevSound('tick');
            }}
            onMouseLeave={() => setActiveStreamId(null)}
            className="absolute right-2 sm:right-4 bottom-4 flex items-center gap-2 px-3 py-1.5 bg-[#0e0a1c] border border-white/20 rounded-lg font-mono text-[9px] sm:text-[10px] text-zinc-300 shadow-[0_0_12px_rgba(0,0,0,0.8)] cursor-pointer hover:border-[#bdf559] transition-colors"
          >
            <Database className="w-3.5 h-3.5 text-[#bdf559]" />
            <div>
              <span className="font-bold text-white block">transacciones.parquet</span>
              <span className="text-zinc-500 text-[8px]">Batch Ingest Stream 04</span>
            </div>
          </div>

          {/* Central Convergence Nexus (Interactive Shockwave Hub) */}
          <div
            ref={nexusRef}
            data-target-lock="data"
            onClick={triggerShockwave}
            onMouseEnter={() => {
              setIsNexusHovered(true);
              playMioDevSound('select');
            }}
            onMouseLeave={() => setIsNexusHovered(false)}
            className="relative z-20 flex flex-col items-center justify-center p-5 sm:p-6 rounded-3xl bg-[#0e0820] border-2 border-mio-lime shadow-[0_0_32px_rgba(189,245,89,0.4)] cursor-pointer group transition-all duration-300 hover:scale-110 hover:shadow-[0_0_55px_rgba(189,245,89,0.7)]"
            title="Hacé click para detonar un pulso de choque"
          >
            <div className="relative">
              <Cpu className="w-10 h-10 sm:w-12 sm:h-12 text-[#bdf559] animate-pulse" />
              <Sparkles className="w-5 h-5 text-white absolute -top-1 -right-1" />
              <Zap className="w-4 h-4 text-[#bdf559] absolute -bottom-1 -left-1 animate-ping" />
            </div>
            <span className="font-mono text-xs font-black text-white mt-2.5 tracking-wider">
              AUTOML K-TUNER
            </span>
            <span className="font-mono text-[9px] text-[#bdf559] font-bold mt-0.5">
              {isNexusHovered ? 'CLICK TO SHOCKWAVE // 4.8 GB/s' : 'CONVERGENCE NEXUS // 60s'}
            </span>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8 font-mono text-[10px] sm:text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#bdf559] shadow-[0_0_6px_#bdf559]" />
            INGEST RATE: 104K ROW/SEC
          </span>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7647eb] shadow-[0_0_6px_#7647eb]" />
            LATENCIA DE PIPELINE: 14MS
          </span>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <span className="text-white font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ZERO-KNOWLEDGE ENCRYPTION ACTIVE
          </span>
        </div>
      </div>
    </section>
  );
};

export default MioNeuralFlow;
