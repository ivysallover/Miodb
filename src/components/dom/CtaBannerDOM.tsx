import React from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { Reveal } from '@/components/ui/Reveal';
import { ShieldCheck, FileSpreadsheet } from 'lucide-react';

export const CtaBannerDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <section id="cta" className="py-20 sm:py-32 w-full select-none relative z-10">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal from="left">
        {/* Solid obsidian slab: clean architectural anchor */}
        <div className="p-10 sm:p-16 lg:p-24 rounded-3xl border border-white/10 bg-[#0e0d16] text-white relative shadow-2xl">
          <div className="max-w-4xl space-y-7 relative z-10 text-left">
            <SectionPlate index="07" label="SIN COSTO DE INICIO • COMPATIBLE CON .XLSX Y .CSV" tone="lime" onDark />

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.04] text-white">
              <FlipText>Subí una planilla.</FlipText>
              <br />
              <span className="text-[#a78bfa] inline-block">
                <FlipText delayOffset={0.25}>Mirá qué encuentra MIO.</FlipText>
              </span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed">
              Probalo con un archivo tuyo. Te devolvemos las anomalías, el modelo que ganó y por qué ganó.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <BubbleArrowButton
                size="lg"
                variant="primary"
                onClick={() => scrollTo('#hero')}
              >
                Cargar planilla
              </BubbleArrowButton>

              <button
                type="button"
                onClick={() => scrollTo('#como-funciona')}
                className="px-6 py-3.5 rounded-full text-sm font-medium text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/20 hover:border-white/40 transition-all font-mono uppercase tracking-wider text-xs cursor-pointer active:scale-[0.97]"
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
        </Reveal>
      </div>
    </section>
  );
};

export default CtaBannerDOM;
