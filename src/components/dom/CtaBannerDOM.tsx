import React from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { Reveal } from '@/components/ui/Reveal';
import { DitherArt } from '@/components/ui/DitherArt';
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
        <div className="p-10 sm:p-16 lg:p-24 rounded-mio border border-white/10 bg-[#0e0d16] text-white relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.6]"
            style={{ WebkitMaskImage: 'radial-gradient(ellipse at 100% 100%, #000 0%, transparent 65%)', maskImage: 'radial-gradient(ellipse at 100% 100%, #000 0%, transparent 65%)' }}
            aria-hidden="true"
          >
            <DitherArt variant="texture" seed={9} tone="dark" pixelSize={4} />
          </div>
          <div className="max-w-4xl space-y-7 relative z-10 text-left">
            <SectionPlate index="09" label="GRATIS POR AHORA • EXCEL Y CSV" tone="lime" onDark />

            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.04] text-white">
              <FlipText>Subí una planilla.</FlipText>
              <br />
              <span className="text-[#a78bfa] inline-block">
                <FlipText delayOffset={0.25}>Mirá qué encuentra MIO.</FlipText>
              </span>
            </h2>

            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl font-normal leading-relaxed">
              Probalo con un archivo tuyo. Te mostramos qué se salió de lo normal, qué viene y por qué. Tus datos no se guardan.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-5">
              <BubbleArrowButton
                size="lg"
                variant="primary"
                onClick={() => {
                  try { localStorage.removeItem('mio_active_analysis'); } catch {}
                  window.history.pushState({}, '', '/dashboard?new=1');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
              >
                Probar con mi planilla
              </BubbleArrowButton>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem('mio_active_analysis'); } catch {}
                  window.history.pushState({}, '', '/dashboard?new=1&sample=1');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-sm font-medium text-zinc-300 hover:text-white underline underline-offset-4 decoration-1 cursor-pointer"
              >
                o probá con datos de ejemplo
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
