import React from 'react';
import { Stagger } from '@/components/ui/Stagger';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';

interface TeamMember {
  name: string;
  initials: string;
  role: string;
  bio: string;
  /** Optional: path under /public (e.g. '/images/tadeo.webp'). Without it, the monogram shows. */
  photo?: string;
  /** Optional: real profile URLs. Empty = the link is not rendered (no placeholder links). */
  linkedin?: string;
  github?: string;
}

const TEAM: TeamMember[] = [
  {
    name: 'Tadeo Muñoz Garcés',
    initials: 'TM',
    role: 'Cofundador · Producto y desarrollo',
    bio: 'Arma la parte que ves y usás: que subir una planilla y entender el resultado sea simple.',
  },
  {
    name: 'Milena Abraham',
    initials: 'MA',
    role: 'Cofundadora · Ciencia de datos',
    bio: 'Se ocupa de que los números sean confiables: detectar lo raro y probar cada predicción contra el pasado.',
  },
];

export const QuienesSomosDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const line = isDark ? 'border-white/15' : 'border-zinc-900/80';

  return (
    <section id="quienes-somos" className="py-24 sm:py-36 w-full select-none relative z-10">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-14 sm:mb-20">
          <div className="lg:col-span-8">
            <SectionPlate index="08" label="QUIÉNES SOMOS" tone="lime" className="mb-5" />
            <h2 className={`font-extrabold tracking-[-0.045em] leading-[0.98] text-4xl sm:text-6xl lg:text-7xl ${isDark ? 'text-white' : 'text-zinc-950'}`} style={{ textWrap: 'balance' }}>
              <FlipText>Dos personas, en Rosario,</FlipText>{' '}
              <span className="text-[#7647eb] dark:text-[#a78bfa]">
                <FlipText delayOffset={0.2}>detrás de cada número.</FlipText>
              </span>
            </h2>
          </div>
          <p className={`lg:col-span-4 text-base sm:text-lg leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Somos estudiantes de Ciencia de Datos. Armamos MIO para que nadie tenga que esperar semanas por un informe para saber qué pasa con sus números.
          </p>
        </div>

        <Stagger className={`grid grid-cols-1 md:grid-cols-2 border-t border-b ${line}`}>
          {TEAM.map((m, i) => (
            <article
              key={m.name}
              className={`group flex gap-6 sm:gap-8 py-10 sm:py-14 ${i === 0 ? `md:pr-12 border-b md:border-b-0 md:border-r ${line}` : 'md:pl-12'}`}
            >
              {m.photo ? (
                <img src={m.photo} alt={m.name} loading="lazy" className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-mio object-cover" />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-24 w-24 sm:h-32 sm:w-32 shrink-0 items-center justify-center rounded-mio bg-[#7647eb] font-climate text-3xl sm:text-4xl text-white transition-colors duration-300 group-hover:bg-[#bdf559] group-hover:text-black"
                >
                  {m.initials}
                </div>
              )}
              <div className="min-w-0">
                <h3 className={`font-extrabold tracking-[-0.035em] leading-tight text-2xl sm:text-4xl ${isDark ? 'text-white' : 'text-zinc-950'}`}>{m.name}</h3>
                <p className="mt-1.5 font-mono text-xs font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">{m.role}</p>
                <p className={`mt-4 text-base sm:text-lg leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>{m.bio}</p>
                {(m.linkedin || m.github) && (
                  <p className="mt-4 flex gap-5 text-sm font-medium">
                    {m.linkedin && (
                      <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="mio-link">LinkedIn</a>
                    )}
                    {m.github && (
                      <a href={m.github} target="_blank" rel="noopener noreferrer" className="mio-link">GitHub</a>
                    )}
                  </p>
                )}
              </div>
            </article>
          ))}
        </Stagger>
      </div>
    </section>
  );
};

export default QuienesSomosDOM;
