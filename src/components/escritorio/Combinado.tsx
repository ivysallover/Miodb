import React from 'react';
import { CircleSlash, Layers, Link2 } from 'lucide-react';
import { num, type CombineStep } from './desktop';
import { lilac, muted } from './ui';

/** "a, b y c" */
const list = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);
const pct = (x: number) => (x >= 0.995 ? 'todas las filas' : `el ${num(x * 100)} % de las filas`);

/** Un paso, en palabras. */
const say = (s: CombineStep): { icon: React.FC<{ className?: string }>; title: string; text: string } => {
  switch (s.tipo) {
    case 'apilado':
      return { icon: Layers, title: `Apilé ${list(s.archivos)}`, text: `Tienen las mismas columnas: quedaron ${num(s.filas)} filas, una debajo de la otra. La columna "archivo" dice de dónde salió cada una.` };
    case 'cruzado':
      return {
        icon: Link2,
        title: `Crucé ${s.archivo} por ${s.clave === s.clave_otra ? s.clave : `${s.clave} = ${s.clave_otra}`}`,
        text: `Encontró su pareja ${pct(s.encontradas)}${s.encontradas < 0.995 ? '; el resto queda con esas columnas vacías, sin perder filas' : ''}. Sumé ${list(s.columnas.map((c) => `"${c}"`))}.`,
      };
    case 'omitido':
      return { icon: CircleSlash, title: `No uní ${s.archivo}`, text: s.motivo };
  }
};

/** Cómo se unieron las planillas: cada paso en palabras, con lo que no se pudo unir y por qué. */
export const Combinado: React.FC<{ steps: CombineStep[]; isDark: boolean }> = ({ steps, isDark }) => (
  <section className={`rounded-mio p-6 sm:p-8 ${lilac(isDark)}`}>
    <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Cómo uní las planillas</h2>
    <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
      {steps.map((s, i) => {
        const { icon: Icon, title, text } = say(s);
        return (
          <li key={i} className="flex gap-3.5">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.tipo === 'omitido' ? (isDark ? 'bg-white/10' : 'bg-white') : 'bg-[#7647eb] text-white'}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-bold [overflow-wrap:anywhere]">{title}</span>
              <span className={`mt-1 block text-[14px] leading-relaxed ${muted(isDark)}`}>{text}</span>
            </span>
          </li>
        );
      })}
    </ul>
  </section>
);
