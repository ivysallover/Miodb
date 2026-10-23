import React from 'react';
import { Play } from 'lucide-react';
import { PARTS, SHORTCUTS, STEPS } from './ayuda';
import { PRIMARY, lilac, muted, slab, surface } from './ui';

/** La guía: los pasos, qué quiere decir cada parte del resultado y los atajos de teclado. */
export const Guia: React.FC<{ isDark: boolean; onTour: () => void }> = ({ isDark, onTour }) => (
  <>
    <section className={`flex flex-col gap-6 rounded-mio p-7 text-white sm:p-10 lg:flex-row lg:items-end lg:justify-between ${slab(isDark)}`}>
      <div>
        <h1 className="text-5xl font-extrabold leading-[0.98] tracking-[-0.04em]">Guía</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#cfc8f5]">De la planilla al diagnóstico en cinco pasos, y qué mirar en cada parte del resultado.</p>
      </div>
      <button type="button" onClick={onTour} className={PRIMARY}>
        <Play className="h-5 w-5" aria-hidden /> Hacer el recorrido
      </button>
    </section>

    <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 2xl:grid-cols-5">
      {STEPS.map((s, i) => (
        <li key={s.title} className={`rounded-mio p-5 ${i === 0 ? 'bg-[#7647eb] text-white sm:col-span-2 2xl:col-span-1' : surface(isDark)}`}>
          <span className={`font-mono text-[11px] font-bold ${i === 0 ? 'text-[#ece6ff]' : 'text-[#7647eb]'}`}>{String(i + 1).padStart(2, '0')}</span>
          <h2 className="mt-2 text-lg font-extrabold leading-tight tracking-[-0.02em]">{s.title}</h2>
          <p className={`mt-2 text-[14px] leading-relaxed ${i === 0 ? 'text-[#ece6ff]' : muted(isDark)}`}>{s.text}</p>
        </li>
      ))}
    </ol>

    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-12">
      <section className={`rounded-mio p-5 sm:p-7 xl:col-span-8 ${surface(isDark)}`}>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Qué quiere decir cada parte</h2>
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {PARTS.map((p) => (
            <div key={p.title}>
              <dt className="text-[15px] font-extrabold">{p.title}</dt>
              <dd className={`mt-1 text-[14px] leading-relaxed ${muted(isDark)}`}>{p.text}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className={`rounded-mio p-5 sm:p-7 xl:col-span-4 ${lilac(isDark)}`}>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Atajos</h2>
        <dl className="mt-5 space-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between gap-4">
              <dt className="text-[15px] font-semibold">{s.text}</dt>
              <dd><kbd className={`rounded-mio-sm px-2 py-1 font-mono text-[12px] font-bold ${isDark ? 'bg-white/10' : 'bg-white'}`}>{s.keys}</kbd></dd>
            </div>
          ))}
        </dl>
        <p className={`mt-5 text-[13px] ${muted(isDark)}`}>En Windows, Ctrl en lugar de ⌘.</p>
      </section>
    </div>
  </>
);
