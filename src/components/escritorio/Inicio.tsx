import React from 'react';
import { ArrowRight, FolderOpen, Play, Plus } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { ProjectTile } from './ProjectTile';
import { STEPS } from './ayuda';
import { num, type Project } from './desktop';
import { FOCUS, LINK, PRIMARY, lilac, muted, slab, slabText, soft, surface } from './ui';

/** Cuántos proyectos muestra el inicio; el resto está en "Mis proyectos". */
const LATEST = 4;

/** Lo que lleva hecho la persona con MIO, para el pie del bloque principal. */
const totals = (projects: Project[]) => [
  [projects.length === 1 ? 'proyecto' : 'proyectos', num(projects.length)],
  ['filas analizadas', num(projects.reduce((n, p) => n + p.filas, 0))],
  ['calidad promedio', num(projects.reduce((n, p) => n + p.calidad, 0) / projects.length)],
];

/** El inicio: abrir o soltar una planilla, los últimos proyectos y cómo se usa MIO. */
export const Inicio: React.FC<{
  isDark: boolean;
  projects: Project[];
  onChoose: () => void;
  onOpen: (path: string, hoja: string | null) => void;
  onRemove: (id: string) => void;
  onAll: () => void;
  onGuide: () => void;
  onTour: () => void;
}> = ({ isDark, projects, onChoose, onOpen, onRemove, onAll, onGuide, onTour }) => (
  <>
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-12">
      <section className={`relative flex flex-col justify-between overflow-hidden rounded-mio p-7 sm:p-10 xl:col-span-8 xl:min-h-[400px] ${slab(isDark)}`}>
        {/* La planilla de fondo de la marca, que se apaga hacia el texto. */}
        <div
          aria-hidden
          className="mio-sheet-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]"
          style={{ ['--mio-cell-line' as string]: isDark ? 'rgba(205, 192, 255, 0.16)' : 'rgba(118, 71, 235, 0.14)' }}
        />
        <div className="relative">
          <h1 className="max-w-[12ch] text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-[4.25rem]">Abrí tu planilla.</h1>
          <p className={`mt-5 max-w-xl text-lg leading-relaxed ${slabText(isDark)}`}>
            CSV o Excel, tal como está. MIO la limpia, arma los gráficos, busca lo que se sale de lo normal y proyecta lo que viene.
          </p>
        </div>
        <div className="relative mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="button" onClick={onChoose} className={PRIMARY}>
            <FolderOpen className="h-5 w-5" aria-hidden /> Elegir planilla
          </button>
          <span className={`text-sm ${slabText(isDark)}`}>o soltala en cualquier parte de esta ventana · ⌘O</span>
          {projects.length > 0 && (
            <dl className="ml-auto flex gap-6">
              {totals(projects).map(([label, value]) => (
                <div key={label} className="flex flex-col-reverse">
                  <dt className={`mt-1.5 text-[12px] ${slabText(isDark)}`}>{label}</dt>
                  <dd className="font-mono text-2xl font-bold tabular-nums leading-none">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
      <section className="flex flex-col items-center justify-center gap-6 rounded-mio bg-[#7647eb] p-8 text-white xl:col-span-4">
        <MioPet2D mood="reposo" size={180} showShadow={false} animated />
        <p className="max-w-[24ch] text-center text-[15px] leading-snug text-[#ece6ff]">
          Todo pasa en esta compu: tu archivo no se sube a ningún lado ni se modifica.
        </p>
      </section>
    </div>

    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-12">
      <section className={`rounded-mio p-5 sm:p-7 xl:col-span-8 ${surface(isDark)}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Últimos proyectos</h2>
          {projects.length > LATEST && (
            <button type="button" onClick={onAll} className={LINK}>
              Ver los {projects.length} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {projects.length > 0 ? (
          <ul className="mt-5 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {projects.slice(0, LATEST).map((p, i) => (
              <ProjectTile key={p.id} p={p} index={i} isDark={isDark} onOpen={() => onOpen(p.path, p.hoja)} onRemove={() => onRemove(p.id)} />
            ))}
            {/* Con pocos proyectos, el lugar que sobra sirve para abrir otro. */}
            {projects.length < LATEST && (
              <li className="mio-rise" style={{ animationDelay: `${projects.length * 35}ms` }}>
                <button
                  type="button"
                  onClick={onChoose}
                  className={`flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-3 rounded-mio-sm text-[15px] font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${isDark ? 'bg-[#7647eb]/15 text-[#d9ceff] hover:bg-[#7647eb]/25' : 'bg-[#e9e3ff] text-[#5b32cc] hover:bg-[#ddd3ff]'}`}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7647eb] text-white"><Plus className="h-5 w-5" aria-hidden /></span>
                  Analizar otra planilla
                </button>
              </li>
            )}
          </ul>
        ) : (
          <p className={`mt-3 max-w-2xl text-base leading-relaxed ${muted(isDark)}`}>
            Todavía no analizaste ninguna planilla. Cada una que abras queda guardada con su análisis, para volver a verla sin esperar.
          </p>
        )}
      </section>

      <section className={`flex flex-col rounded-mio p-5 sm:p-7 xl:col-span-4 ${lilac(isDark)}`}>
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Cómo se usa</h2>
        <ol className="mt-4 space-y-2.5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-baseline gap-3 text-[15px] font-semibold">
              <span className="font-mono text-[11px] font-bold text-[#7647eb]">{String(i + 1).padStart(2, '0')}</span>
              {s.title}
            </li>
          ))}
        </ol>
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <button type="button" onClick={onTour} className={soft(isDark)}>
            <Play className="h-4 w-4" aria-hidden /> Hacer el recorrido
          </button>
          <button type="button" onClick={onGuide} className={LINK}>
            Abrir la guía <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </section>
    </div>
  </>
);
