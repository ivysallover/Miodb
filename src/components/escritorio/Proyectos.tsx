import React, { useMemo, useState } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import { ActivePill } from './ActivePill';
import { ProjectsTable, SORTS, type Sort } from './ProjectsTable';
import { CSV_EXTENSIONS, extension, num, type Project } from './desktop';
import { FOCUS, PRIMARY, field, muted, surface } from './ui';

const KINDS = { todos: 'Todos', csv: 'CSV', excel: 'Excel', varias: 'Unidas' } as const;
type Kind = keyof typeof KINDS;
const kindOf = (p: Project): Kind => (p.archivos.length > 1 ? 'varias' : CSV_EXTENSIONS.includes(extension(p.path)) ? 'csv' : 'excel');

/** Todos los proyectos guardados: buscar por nombre, carpeta, hoja o lo analizado; filtrar por formato y ordenar por columna. */
export const Proyectos: React.FC<{
  isDark: boolean;
  projects: Project[];
  onChoose: () => void;
  onOpen: (p: Project) => void;
  onRemove: (id: string) => void;
}> = ({ isDark, projects, onChoose, onOpen, onRemove }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recientes');
  const [kind, setKind] = useState<Kind>('todos');
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    return projects
      .filter((p) => kind === 'todos' || kindOf(p) === kind)
      .filter((p) => !q || [p.name, p.path, ...p.archivos, p.hoja ?? '', p.analizado].some((t) => t.toLocaleLowerCase('es').includes(q)))
      .sort(SORTS[sort].by);
  }, [projects, query, sort, kind]);
  const rows = projects.reduce((n, p) => n + p.filas, 0);
  const chip = (active: boolean) =>
    `relative isolate min-h-[40px] rounded-full px-4 text-sm font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${active ? 'text-white' : isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-white'}`;

  if (projects.length === 0) {
    return (
      <section className={`rounded-mio p-7 sm:p-10 ${surface(isDark)}`}>
        <h1 className="text-4xl font-extrabold tracking-[-0.04em]">Mis proyectos</h1>
        <p className={`mt-3 max-w-2xl text-base leading-relaxed ${muted(isDark)}`}>
          Acá queda cada planilla que analices, con su análisis, para volver a verla sin esperar. Todavía no hay ninguna.
        </p>
        <button type="button" onClick={onChoose} className={`${PRIMARY} mt-7`}>
          <FolderOpen className="h-5 w-5" aria-hidden /> Elegir planilla
        </button>
      </section>
    );
  }

  return (
    <section className={`rounded-mio p-5 sm:p-7 ${surface(isDark)}`}>
      <h1 className="text-4xl font-extrabold tracking-[-0.04em]">Mis proyectos</h1>
      <p className={`mt-2 text-[15px] ${muted(isDark)}`}>
        {projects.length === 1 ? 'Una planilla' : `${num(projects.length)} planillas`} con {num(rows)} filas analizadas, guardadas en esta compu.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">Buscar</span>
          <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted(isDark)}`} aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, carpeta, hoja o columna" className={`${field(isDark)} w-full pl-9`} />
        </label>
        <div role="group" aria-label="Formato" className={`flex gap-1 rounded-full p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
              {kind === k && <ActivePill group="formato" />}
              {KINDS[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6" aria-live="polite">
        {shown.length > 0 ? (
          <ProjectsTable projects={shown} isDark={isDark} onOpen={onOpen} onRemove={onRemove} sort={sort} onSort={setSort} />
        ) : (
          <p className={`text-base ${muted(isDark)}`}>Ningún proyecto coincide con lo que buscás.</p>
        )}
      </div>
    </section>
  );
};
