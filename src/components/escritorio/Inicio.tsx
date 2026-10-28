import React from 'react';
import { ArrowRight, FolderOpen, Play, Sparkles } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { ProjectsTable } from './ProjectsTable';
import type { Project } from './desktop';
import { FOCUS, LINK, PRIMARY, muted, slab, slabText, soft, surface } from './ui';

/** Cuántos proyectos muestra el inicio; el resto está en "Mis proyectos". */
const LATEST = 5;

/** El inicio: abrir o soltar una planilla, el MIO bot con la guía y los últimos proyectos. */
export const Inicio: React.FC<{
  isDark: boolean;
  projects: Project[];
  onChoose: () => void;
  onOpen: (p: Project) => void;
  onRemove: (id: string) => void;
  onAll: () => void;
  onGuide: () => void;
  onTour: () => void;
  onExample: () => void;
}> = ({ isDark, projects, onChoose, onOpen, onRemove, onAll, onGuide, onTour, onExample }) => {
  const last = projects[0];
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 xl:grid-cols-12">
        <section className={`relative flex flex-col justify-between overflow-hidden rounded-mio p-7 sm:p-10 xl:col-span-8 xl:min-h-[380px] ${slab(isDark)}`}>
          {/* La planilla de fondo de la marca, que se apaga hacia el texto. */}
          <div
            aria-hidden
            className="mio-sheet-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]"
            style={{ ['--mio-cell-line' as string]: isDark ? 'rgba(205, 192, 255, 0.16)' : 'rgba(118, 71, 235, 0.14)' }}
          />
          <div className="relative">
            <h1 className="max-w-[12ch] text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-[4.25rem]">Abrí tu planilla.</h1>
            <p className={`mt-5 max-w-xl text-lg leading-relaxed ${slabText(isDark)}`}>
              CSV o Excel, tal como está; si son varias, elegilas juntas y MIO las une. Limpia los datos, arma los gráficos, busca lo que se sale de lo normal y proyecta lo que viene.
            </p>
          </div>
          <div className="relative mt-10">
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={onChoose} className={PRIMARY}>
                <FolderOpen className="h-5 w-5" aria-hidden /> Elegir planilla
              </button>
              {/* Seguir donde quedaste o, la primera vez, ver a MIO andar con el ejemplo que trae. */}
              {last ? (
                <button type="button" onClick={() => onOpen(last)} className={`${soft(isDark)} min-h-[52px] max-w-[22rem] px-6 text-base`} title={last.path}>
                  <span className="truncate">Seguir con {last.name}</span> <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              ) : (
                <button type="button" onClick={onExample} className={`${soft(isDark)} min-h-[52px] px-6 text-base`}>
                  <Sparkles className="h-4 w-4" aria-hidden /> Probar con un ejemplo
                </button>
              )}
            </div>
            <p className={`mt-4 text-sm ${slabText(isDark)}`}>
              o soltala en cualquier parte de esta ventana · <kbd className="font-mono">⌘O</kbd>
            </p>
          </div>
        </section>

        <section className="relative flex min-h-[300px] flex-col justify-between gap-6 overflow-hidden rounded-mio bg-[#7647eb] p-7 text-white xl:col-span-4">
          <p className="max-w-[20ch] text-[19px] font-extrabold leading-snug tracking-[-0.02em]">Todo pasa en esta compu: tu archivo no se sube a ningún lado ni se modifica.</p>
          {/* El MIO bot asoma desde la esquina, al lado de la invitación a la guía. */}
          <div aria-hidden className="pointer-events-none absolute -bottom-3 -right-3">
            <MioPet2D mood="reposo" size={150} showShadow={false} animated />
          </div>
          <div className="relative pr-[136px]">
            <p className="text-[15px] leading-relaxed text-[#ece6ff]">¿Primera vez? En un minuto te muestro cómo se usa.</p>
            <div className="mt-4 flex flex-col items-start gap-1">
              <button type="button" onClick={onTour} className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 text-sm font-bold text-[#3d1f8a] transition-colors duration-200 hover:bg-[#ece6ff] active:scale-[0.97] cursor-pointer ${FOCUS}`}>
                <Play className="h-4 w-4" aria-hidden /> Hacer el recorrido
              </button>
              <button type="button" onClick={onGuide} className={`${LINK} px-1 text-white`}>
                Abrir la guía <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className={`rounded-mio p-5 sm:p-7 ${surface(isDark)}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Últimos proyectos</h2>
          {projects.length > LATEST && (
            <button type="button" onClick={onAll} className={LINK}>
              Ver los {projects.length} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        {projects.length > 0 ? (
          <div className="mt-5">
            <ProjectsTable projects={projects.slice(0, LATEST)} isDark={isDark} onOpen={onOpen} onRemove={onRemove} />
          </div>
        ) : (
          <p className={`mt-3 max-w-2xl text-base leading-relaxed ${muted(isDark)}`}>
            Todavía no analizaste ninguna planilla. Cada una que abras queda guardada acá con su análisis, para volver a verla sin esperar.
          </p>
        )}
      </section>
    </>
  );
};
