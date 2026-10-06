import React from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';

const DOORS: { tag: string; title: string; text: string }[] = [
  {
    tag: 'TU PYME',
    title: 'Vendés, y decidís a ojo.',
    text: 'Tenés ventas, stock o turnos en Excel. MIO te dice qué se vende, qué se salió de lo normal y qué viene, sin que armes nada.',
  },
  {
    tag: 'TU EMPRESA CHICA',
    title: 'Todos miran los mismos números.',
    text: 'Subís las planillas del equipo y cada análisis sale con el mismo criterio, con los resultados explicados para llevarlos a la reunión.',
  },
  {
    tag: 'PARA VOS',
    title: 'Tu plata, en claro.',
    text: 'Gastos del hogar, un emprendimiento chico, tus ahorros: subís la planilla y ves en qué se te va y cómo viene el mes.',
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

        <ol className={`border-b ${isDark ? 'border-white/15' : 'border-zinc-900/80'}`}>
          {DOORS.map((d, i) => (
            <li
              key={d.tag}
              className={`group grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-10 items-baseline py-8 sm:py-12 border-t transition-colors duration-300 ${
                isDark ? 'border-white/15 hover:bg-white/[0.03]' : 'border-zinc-900/80 hover:bg-white'
              }`}
            >
              <span className="lg:col-span-2 font-mono text-xs font-bold tracking-wider text-[#7647eb] dark:text-[#a78bfa]">
                0{i + 1} · {d.tag}
              </span>
              <h3
                className={`lg:col-span-6 font-extrabold tracking-[-0.045em] leading-[0.98] text-4xl sm:text-6xl lg:text-7xl transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-2 ${
                  isDark ? 'text-white' : 'text-zinc-950'
                }`}
                style={{ textWrap: 'balance' }}
              >
                {d.title}
              </h3>
              <p className={`lg:col-span-4 text-base sm:text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{d.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default ParaQuienDOM;
