import React, { useState } from 'react';
import { ArrowUpRight, FolderOpen, Trash2 } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { ago, extension, folderOf, num, type Project } from './desktop';

/** Contorno de foco del teclado y botón principal de la app (los usa toda la pantalla de escritorio). */
export const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7647eb]';
export const PRIMARY = `inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#bdf559] px-7 text-base font-bold text-zinc-950 transition-colors duration-200 hover:bg-[#c8ff6a] active:scale-[0.97] cursor-pointer disabled:opacity-50 ${FOCUS}`;

/** La losa obsidiana, apenas levantada en modo oscuro para que no se pierda contra la página. */
export const slab = (isDark: boolean) => (isDark ? 'bg-[#16122a]' : 'bg-[#0b0914]');

/** Una planilla guardada: se abre al instante; se puede quitar de la lista (el archivo no se toca). */
const ProjectTile: React.FC<{ p: Project; isDark: boolean; onOpen: () => void; onRemove: () => void }> = ({ p, isDark, onOpen, onRemove }) => {
  const [confirming, setConfirming] = useState(false);
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const tile = isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-[#f3f3f5] hover:bg-[#e9e3ff]';
  return (
    <li className={`group relative rounded-mio-sm transition-colors duration-150 ${tile}`}>
      <button type="button" onClick={onOpen} className={`block w-full rounded-mio-sm p-4 pr-12 text-left cursor-pointer ${FOCUS}`}>
        <span className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${isDark ? 'bg-[#7647eb]/30 text-[#d9ceff]' : 'bg-[#7647eb]/12 text-[#5b32cc]'}`}>{extension(p.path)}</span>
          <span className={`font-mono text-[11px] ${muted}`}>{ago(p.saved_at)}</span>
        </span>
        <span className="mt-2.5 block truncate text-[17px] font-extrabold tracking-[-0.02em]">{p.name}{p.hoja && <span className={`font-semibold ${muted}`}> · {p.hoja}</span>}</span>
        <span className={`mt-0.5 block truncate font-mono text-[11px] ${muted}`}>{folderOf(p.path)}</span>
        <span className={`mt-3 block text-[13px] ${muted}`}>
          {num(p.filas)} filas · {p.columnas} columnas · calidad {p.calidad}/100
        </span>
        <span className="mt-1 block truncate text-[13px] font-semibold">Lo analizado: {p.analizado.replace(/_/g, ' ')}</span>
      </button>
      <ArrowUpRight className="pointer-events-none absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden />
      {confirming ? (
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[12px] font-bold">
          <button type="button" onClick={onRemove} className={`rounded-full bg-[#7a1022] px-3 py-1.5 text-white cursor-pointer ${FOCUS}`}>Quitar</button>
          <button type="button" onClick={() => setConfirming(false)} className={`rounded-full px-3 py-1.5 cursor-pointer ${FOCUS} ${isDark ? 'bg-white/10' : 'bg-white'}`}>No</button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Quitar ${p.name} de los proyectos`}
          title="Quitar de los proyectos (tu archivo no se toca)"
          className={`absolute bottom-3 right-3 rounded-full p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-white'}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      )}
    </li>
  );
};

/** El inicio: abrir o soltar una planilla y, debajo, los proyectos guardados. */
export const Inicio: React.FC<{
  isDark: boolean;
  projects: Project[];
  onChoose: () => void;
  onOpen: (path: string, hoja: string | null) => void;
  onRemove: (id: string) => void;
}> = ({ isDark, projects, onChoose, onOpen, onRemove }) => {
  const surface = isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
        <section className={`relative flex flex-col justify-between overflow-hidden rounded-mio p-7 text-white sm:p-10 lg:col-span-8 lg:min-h-[420px] ${slab(isDark)}`}>
          {/* La planilla de fondo de la marca, que se apaga hacia el texto. */}
          <div
            aria-hidden
            className="mio-sheet-bg pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]"
            style={{ ['--mio-cell-line' as string]: 'rgba(205, 192, 255, 0.16)' }}
          />
          <div className="relative">
            <h1 className="max-w-[12ch] text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-[4.25rem]">Abrí tu planilla.</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#cfc8f5]">
              CSV o Excel, tal como está. MIO la limpia, arma los gráficos, busca lo que se sale de lo normal y proyecta lo que viene.
            </p>
          </div>
          <div className="relative mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="button" onClick={onChoose} className={PRIMARY}>
              <FolderOpen className="h-5 w-5" aria-hidden /> Elegir planilla
            </button>
            <span className="text-sm text-white/70">o soltala en cualquier parte de esta ventana</span>
          </div>
        </section>
        <section className="flex flex-col items-center justify-center gap-6 rounded-mio bg-[#7647eb] p-8 text-white lg:col-span-4">
          <MioPet2D mood="reposo" size={200} showShadow={false} animated />
          <p className="max-w-[24ch] text-center text-[15px] leading-snug text-[#ece6ff]">
            Todo pasa en esta compu: tu archivo no se sube a ningún lado ni se modifica.
          </p>
        </section>
      </div>

      <section className={`rounded-mio p-5 sm:p-7 ${surface}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Tus proyectos</h2>
          {projects.length > 0 && <span className={`text-sm ${muted}`}>Se abren al instante: no se vuelven a calcular si la planilla no cambió.</span>}
        </div>
        {projects.length > 0 ? (
          <ul className="mt-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectTile key={p.id} p={p} isDark={isDark} onOpen={() => onOpen(p.path, p.hoja)} onRemove={() => onRemove(p.id)} />
            ))}
          </ul>
        ) : (
          <p className={`mt-3 max-w-2xl text-base leading-relaxed ${muted}`}>
            Todavía no analizaste ninguna planilla. Cada una que abras queda guardada acá con su análisis, para volver a verla sin esperar.
          </p>
        )}
      </section>
    </>
  );
};
