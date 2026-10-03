import React from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { FlipText } from '@/components/ui/FlipText';
import { ShieldCheck, FileSpreadsheet } from 'lucide-react';

import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect';

export const CtaBannerDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <section id="cta" className="py-20 sm:py-32 w-full select-none relative z-10">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div
          className={`p-10 sm:p-16 lg:p-24 rounded-none border-2 transition-all duration-300 relative overflow-hidden shadow-[8px_8px_0px_rgba(0,0,0,0.8)] ${
            isDark
              ? 'bg-[#090614] border-[#7647eb]/50 text-white'
              : 'bg-zinc-950 border-black text-white'
          }`}
        >
          {/* Interactive Background Ripple Grid (safely positioned at z-0) */}
          <div className="absolute inset-0 z-0 overflow-hidden opacity-45 pointer-events-auto">
            <BackgroundRippleEffect rows={9} cols={30} cellSize={52} />
          </div>

          <div className="max-w-4xl space-y-7 relative z-20 text-left pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-none text-xs font-mono tracking-tight border bg-white/[0.08] border-white/20 text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-[#bdf559]" />
              <span>SIN COSTO DE INICIO • COMPATIBLE CON .XLSX Y .CSV</span>
            </div>

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.04] text-white">
              <FlipText>Dejá de adivinar con tus tablas.</FlipText>
              <br />
              <span className="text-[#a78bfa] inline-block">
                <FlipText delayOffset={0.25}>Empezá a predecir con certeza.</FlipText>
              </span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed">
              Subí una planilla de prueba hoy y obtené tu diagnóstico de anomalías, calibración de modelos y pronóstico multimodelo en menos de 60 segundos.
            </p>

            {/* Action buttons strictly at z-30 for unblocked click events */}
            <div className="pt-2 flex flex-wrap items-center gap-4 relative z-30 pointer-events-auto">
              <BubbleArrowButton
                size="lg"
                variant="primary"
                onClick={() => scrollTo('#hero')}
              >
                Cargar Planilla Ahora
              </BubbleArrowButton>

              <button
                type="button"
                onClick={() => scrollTo('#como-funciona')}
                className="px-6 py-4 rounded-none text-sm font-mono font-medium text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/20 transition-colors cursor-pointer"
              >
                Revisar Cómo Funciona
              </button>
            </div>

            <div className="pt-8 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-zinc-400 font-mono">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#bdf559]" />
                <span>Compatible con Excel (.xlsx) y CSV</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#bdf559]" />
                <span>Procesamiento privado en memoria</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span>Sin instalación requerida</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBannerDOM;
