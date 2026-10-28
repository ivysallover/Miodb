import React from 'react';
import type { Brand } from './usePreferences';
import { today, type Summary } from './resumen';

/** Arriba de lo que se imprime: el logo y el nombre de la empresa (de Ajustes), qué es y la fecha. */
export const Membrete: React.FC<{ brand: Brand; what: string; className?: string }> = ({ brand, what, className = '' }) => (
  <header className={`items-center justify-between gap-6 pb-5 ${className}`}>
    <div className="flex min-w-0 items-center gap-4">
      {brand.logo && <img src={brand.logo} alt="" className="h-12 max-w-[11rem] object-contain" />}
      {brand.empresa && <p className="text-xl font-extrabold tracking-[-0.02em]">{brand.empresa}</p>}
    </div>
    <p className="shrink-0 text-right text-sm text-zinc-600">
      {what}
      <br />
      {today()}
    </p>
  </header>
);

/**
 * El resumen de una página, solo para imprimir ("Resumen de una página" en Exportar): lo que se
 * analizó, los hallazgos principales, qué cambió desde la última vez y qué hacer ahora. Afuera de la
 * pantalla; `html.print-resumen` (ver `globals.css`) lo muestra a él solo al imprimir.
 */
export const ResumenImpreso: React.FC<{ summary: Summary; brand: Brand }> = ({ summary: s, brand }) => (
  <article className="mio-resumen hidden bg-white p-2 text-zinc-950">
    <Membrete brand={brand} what="Resumen de MIO" className="flex" />
    <h1 className="text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">
      {s.target} <span className="text-zinc-500">en</span> {s.filename}
    </h1>
    <p className="mt-2 font-mono text-[12px] text-zinc-600">{s.facts}</p>

    <h2 className="mt-8 text-lg font-extrabold">Lo principal</h2>
    <div className="mt-3 grid grid-cols-3 gap-2.5">
      {s.findings.map((f, i) => (
        <section key={f.tag} className={`rounded-mio p-5 ${i === 0 ? 'bg-[#7647eb] text-white' : 'bg-[#efeaff]'}`}>
          <p className="text-xs font-bold opacity-75">{f.tag}</p>
          {f.big && <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">{f.big}</p>}
          <p className="mt-1 text-[14px] leading-snug">{f.text}</p>
        </section>
      ))}
    </div>

    {s.changes && (
      <section className="mt-2.5 rounded-mio bg-[#f3f3f5] p-5">
        <p className="text-xs font-bold text-zinc-600">Desde la última vez</p>
        <p className="mt-1 text-[15px] leading-snug">{s.changes}</p>
      </section>
    )}

    {s.steps.length > 0 && (
      <>
        <h2 className="mt-8 text-lg font-extrabold">Qué hacer ahora</h2>
        <ol className="mt-3 space-y-3">
          {s.steps.map((st, i) => (
            <li key={st.title} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#bdf559] text-sm font-extrabold">{i + 1}</span>
              <p className="text-[15px] leading-snug">
                <strong className="font-bold">{st.title}.</strong> {st.text}
              </p>
            </li>
          ))}
        </ol>
      </>
    )}

    <p className="mt-10 text-xs text-zinc-500">Hecho con MIO, en esta compu: la planilla no salió de acá.</p>
  </article>
);
