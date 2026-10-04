import React from 'react';
import { Linkedin, Github } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';
import { SectionPlate } from '@/components/ui/SectionPlate';
import { Reveal } from '@/components/ui/Reveal';

interface TeamMember {
  name: string;
  role: string;
  credentials: string;
  bio: string;
  linkedin: string;
  github: string;
  tag: string;
}

const TEAM: TeamMember[] = [
  {
    name: 'Tadeo Muñoz Garcés',
    role: 'Co-Fundador & Arquitectura de Sistemas',
    credentials: 'Ciencia de Datos • Especialista en Modelado Predictivo & Algoritmos',
    bio: 'Dedicado al diseño de arquitecturas de inferencia de baja latencia y motores de AutoML autónomos para transformar planillas complejas en decisiones ejecutivas de alta fidelidad.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    tag: 'SISTEMAS & MODELADO',
  },
  {
    name: 'Milena Abraham',
    role: 'Co-Fundadora & Ingeniería de Datos',
    credentials: 'Ciencia de Datos • Especialista en Detección de Anomalías & Series Temporales',
    bio: 'Enfocada en algoritmos de detección de outliers (Isolation Forest), imputación probabilística de datos faltantes y optimización de hiperparámetros multimodelo.',
    linkedin: 'https://linkedin.com',
    github: 'https://github.com',
    tag: 'DATA SCIENCE & AUTOML',
  },
];

export const QuienesSomosDOM: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <section
      id="quienes-somos"
      className="py-24 sm:py-36 w-full select-none relative z-10"
    >
      {/* Expansive Full Desktop Container */}
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        
        {/* Editorial Header */}
        <div className="max-w-3xl mb-16 sm:mb-20">
          <SectionPlate index="05" label="ORIGEN & EQUIPO FUNDADOR" tone="lime" className="mb-5" />
          <h2
            className={`text-3xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.035em] leading-[1.05] ${
              isDark ? 'text-white' : 'text-zinc-950'
            }`}
          >
            <FlipText>Dos estudiantes de Ciencia de Datos</FlipText>
            <br />
            <span className="text-[#7647eb] dark:text-[#a78bfa] inline-block">
              <FlipText delayOffset={0.25}>cansados de decidir a ciegas.</FlipText>
            </span>
          </h2>
          <p
            className={`mt-5 text-base sm:text-lg font-normal leading-relaxed ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Hecho en Rosario, Argentina. Armamos MIO para que nadie más tenga que esperar semanas por un reporte para saber qué está pasando con sus números.
          </p>
        </div>

        {/* 2-Column Desktop Grid for Co-Founders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {TEAM.map((member, i) => (
            <Reveal key={member.name} className="h-full [&>article]:h-full" delay={i * 0.14}>
            <article
              className={`p-8 sm:p-12 rounded-mio border transition-colors duration-200 flex flex-col justify-between ${
                isDark
                  ? 'bg-[#141124] border-white/10'
                  : 'bg-white border-black/10'
              }`}
            >
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold tracking-wider text-[#7647eb] dark:text-[#a78bfa] block mb-1">
                      {member.tag}
                    </span>
                    <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                      {member.name}
                    </h3>
                    <p className={`text-sm font-medium mt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {member.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? 'border-white/10 text-zinc-400 hover:text-[#bdf559] hover:border-[#bdf559]'
                          : 'border-zinc-200 text-zinc-700 hover:text-[#7647eb] hover:border-[#7647eb] bg-zinc-50'
                      }`}
                      aria-label={`LinkedIn de ${member.name}`}
                    >
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a
                      href={member.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-lg border transition-colors ${
                        isDark
                          ? 'border-white/10 text-zinc-400 hover:text-[#bdf559] hover:border-[#bdf559]'
                          : 'border-zinc-200 text-zinc-700 hover:text-[#7647eb] hover:border-[#7647eb] bg-zinc-50'
                      }`}
                      aria-label={`GitHub de ${member.name}`}
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <p className={`text-xs font-mono pt-2 border-t ${
                  isDark
                    ? 'border-white/[0.06] text-zinc-400'
                    : 'border-zinc-200 text-zinc-700 font-medium'
                }`}>
                  {member.credentials}
                </p>

                <p className={`text-sm font-normal leading-relaxed ${
                  isDark ? 'text-zinc-400' : 'text-zinc-600'
                }`}>
                  {member.bio}
                </p>
              </div>

              <div className={`mt-8 pt-6 border-t flex items-center justify-between text-xs font-mono ${
                isDark
                  ? 'border-white/[0.06] text-zinc-400'
                  : 'border-zinc-200 text-zinc-600'
              }`}>
                <span>MIO CORE TEAM</span>
                <span className="font-semibold">ROSARIO · AR</span>
              </div>
            </article>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
};

export default QuienesSomosDOM;
