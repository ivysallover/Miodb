import React, { useMemo, useState } from 'react';
import { FolderOpen, Search } from 'lucide-react';
import { ActivePill } from './ActivePill';
import { ProjectTile } from './ProjectTile';
import { CSV_EXTENSIONS, extension, type Project } from './desktop';
import { FOCUS, PRIMARY, field, muted, surface } from './ui';

const SORTS = {
  recientes: { label: 'Más recientes', by: (a: Project, b: Project) => b.saved_at - a.saved_at },
  nombre: { label: 'Nombre', by: (a: Project, b: Project) => a.name.localeCompare(b.name, 'es') },
  filas: { label: 'Más filas', by: (a: Project, b: Project) => b.filas - a.filas },
  calidad: { label: 'Mejor calidad', by: (a: Project, b: Project) => b.calidad - a.calidad },
};
type Sort = keyof typeof SORTS;

const KINDS = { todos: 'Todos', csv: 'CSV', excel: 'Excel' } as const;
type Kind = keyof typeof KINDS;
const kindOf = (p: Project): Kind => (CSV_EXTENSIONS.includes(extension(p.path)) ? 'csv' : 'excel');

/** Todos los proyectos guardados: buscar por nombre, carpeta, hoja o lo analizado; ordenar y filtrar por formato. */
export const Proyectos: React.FC<{
  isDark: boolean;
  projects: Project[];
  onChoose: () => void;
  onOpen: (path: string, hoja: string | null) => void;
  onRemove: (id: string) => void;
}> = ({ isDark, projects, onChoose, onOpen, onRemove }) => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recientes');
  const [kind, setKind] = useState<Kind>('todos');
  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('es');
    return projects
      .filter((p) => kind === 'todos' || kindOf(p) === kind)
      .filter((p) => !q || [p.name, p.path, p.hoja ?? '', p.analizado].some((t) => t.toLocaleLowerCase('es').includes(q)))
      .sort(SORTS[sort].by);
  }, [projects, query, sort, kind]);
  const chip = (active: boolean) =>
    `relative isolate min-h-[40px] rounded-full px-4 text-sm font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${active ? 'text-white' : isDark ? 'bg-white/[0.06] hover:bg-white/[0.12]' : 'bg-[#f3f3f5] hover:bg-[#e4dcff]'}`;

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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-4xl font-extrabold tracking-[-0.04em]">Mis proyectos</h1>
        <p className={`text-sm ${muted(isDark)}`} aria-live="polite">
          {shown.length === projects.length ? `${projects.length} guardados` : `${shown.length} de ${projects.length}`}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">Buscar</span>
          <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${muted(isDark)}`} aria-hidden />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, carpeta, hoja o columna" className={`${field(isDark)} w-full pl-9`} />
        </label>
        <div role="group" aria-label="Formato" className="flex gap-1.5">
          {(Object.keys(KINDS) as Kind[]).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={chip(kind === k)}>
              {kind === k && <ActivePill group="formato" />}
              {KINDS[k]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-bold">
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${field(isDark)} cursor-pointer`}>
            {(Object.keys(SORTS) as Sort[]).map((s) => <option key={s} value={s}>{SORTS[s].label}</option>)}
          </select>
        </label>
      </div>
      {shown.length > 0 ? (
        <ul className="mt-5 grid grid-cols-1 gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((p, i) => (
            <ProjectTile key={p.id} p={p} index={i} isDark={isDark} onOpen={() => onOpen(p.path, p.hoja)} onRemove={() => onRemove(p.id)} />
          ))}
        </ul>
      ) : (
        <p className={`mt-6 text-base ${muted(isDark)}`}>Ningún proyecto coincide con lo que buscás.</p>
      )}
    </section>
  );
};
