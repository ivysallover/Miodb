import React from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { DitherArt, type DitherVariant } from '@/components/ui/DitherArt';

const DOORS: { tag: string; title: string; text: string; art: DitherVariant; seed: number }[] = [
  {
    tag: 'TU PYME',
    title: 'Vendés, y decidís a ojo.',
    text: 'Tenés ventas, stock o turnos en Excel. MIO te dice qué se vende, qué se salió de lo normal y qué viene, sin que armes nada.',
    art: 'anomalies',
    seed: 4,
  },
  {
    tag: 'TU EMPRESA CHICA',
    title: 'Todos miran los mismos números.',
    text: 'Subís las planillas del equipo y cada análisis sale con el mismo criterio, con los resultados explicados para llevarlos a la reunión.',
    art: 'models',
    seed: 5,
  },
  {
    tag: 'PARA VOS',
    title: 'Tu plata, en claro.',
    text: 'Gastos del hogar, un emprendimiento chico, tus ahorros: subís la planilla y ves en qué se te va y cómo viene el mes.',
    art: 'shap',
    seed: 6,
  },
];

export const ParaQuienDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  return (
    <section id="para-quien" className="relative z-10 w-full py-24 sm:py-32 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="max-w-3xl mb-12 sm:mb-16">
          <SectionPlate index="06" label="PARA QUIÉN" className="mb-5" />
          <h2 className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.05] ${isDark ? 'text-white' : 'text-zinc-950'}`}>
            <FlipText>Hecho para quien no tiene un equipo de datos.</FlipText>
          </h2>
        </div>

        <div className="space-y-6">
          {DOORS.map((d, i) => (
            <article
              key={d.tag}
              className={`grid grid-cols-1 lg:grid-cols-12 rounded-mio border overflow-hidden ${
                isDark ? 'bg-[#0e0d16] border-white/[0.08]' : 'bg-white border-zinc-200/80'
              }`}
            >
              <div className={`lg:col-span-7 p-7 sm:p-10 flex flex-col justify-center ${i % 2 ? 'lg:order-2' : ''}`}>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">{d.tag}</span>
                <h3 className={`mt-3 text-2xl sm:text-4xl font-bold tracking-[-0.03em] leading-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>{d.title}</h3>
                <p className={`mt-4 text-base sm:text-lg leading-relaxed max-w-xl ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{d.text}</p>
              </div>
              <div className={`lg:col-span-5 relative min-h-[200px] lg:min-h-[280px] ${i % 2 ? 'lg:order-1' : ''}`}>
                <DitherArt variant={d.art} seed={d.seed} bleed={i % 2 ? 'left' : 'right'} tone={isDark ? 'dark' : 'light'} pixelSize={3} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ParaQuienDOM;
