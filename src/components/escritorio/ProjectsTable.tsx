import React, { useState } from 'react';
import { ArrowDown, ArrowUp, FolderSearch, Trash2 } from 'lucide-react';
import { ago, desktop, extension, fileName, folderOf, num, type Project } from './desktop';
import { FOCUS, muted, track } from './ui';

/** Cómo se puede ordenar la tabla: cada columna con datos ordena por lo suyo. */
export const SORTS = {
  nombre: { label: 'Planilla', by: (a: Project, b: Project) => a.name.localeCompare(b.name, 'es') },
  filas: { label: 'Filas', by: (a: Project, b: Project) => b.filas - a.filas },
  calidad: { label: 'Calidad', by: (a: Project, b: Project) => b.calidad - a.calidad },
  recientes: { label: 'Guardado', by: (a: Project, b: Project) => b.saved_at - a.saved_at },
};
export type Sort = keyof typeof SORTS;

/** Una fila: se abre al tocarla; a la derecha, mostrarla en su carpeta o quitarla (con confirmación). */
const Row: React.FC<{ p: Project; index: number; isDark: boolean; onOpen: () => void; onRemove: () => void }> = ({ p, index, isDark, onOpen, onRemove }) => {
  const [confirming, setConfirming] = useState(false);
  const many = p.archivos.length > 1;
  const icon = `rounded-full p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-white'}`;
  const cell = 'px-3 py-3.5 align-middle';
  return (
    <tr
      onClick={onOpen}
      className={`mio-rise group cursor-pointer transition-colors duration-150 ${isDark ? 'hover:bg-[#7647eb]/15' : 'hover:bg-[#e9e3ff]'} [&>td:first-child]:rounded-l-mio-sm [&>td:last-child]:rounded-r-mio-sm`}
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <td className={`${cell} max-w-0`}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className={`flex min-w-0 max-w-full items-center gap-2.5 rounded-mio-sm text-left ${FOCUS}`}>
          <span className={`w-12 shrink-0 rounded-full py-0.5 text-center font-mono text-[10px] font-bold uppercase ${isDark ? 'bg-[#7647eb]/30 text-[#d9ceff]' : 'bg-[#7647eb]/12 text-[#5b32cc]'}`} title={many ? `${p.archivos.length} planillas unidas` : undefined}>
            {many ? `${p.archivos.length} arch` : extension(p.path)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-extrabold tracking-[-0.01em]">
              {p.name}
              {p.hoja && <span className={`font-semibold ${muted(isDark)}`}> · {p.hoja}</span>}
            </span>
            <span className={`block truncate text-[12px] ${muted(isDark)}`} title={many ? p.archivos.join('\n') : p.path}>
              {many ? p.archivos.map(fileName).join(' · ') : folderOf(p.path)}
            </span>
          </span>
        </button>
      </td>
      <td className={`${cell} text-right font-mono text-[14px] tabular-nums`}>{num(p.filas)}</td>
      <td className={`${cell}`}>
        <span className="flex items-center gap-2.5">
          <span className="w-7 text-right font-mono text-[14px] tabular-nums">{p.calidad}</span>
          <span className={`h-1.5 w-16 overflow-hidden rounded-full ${track(isDark)}`} aria-hidden>
            <span className="block h-full rounded-full bg-[#7647eb]" style={{ width: `${p.calidad}%`, opacity: p.calidad >= 80 ? 1 : p.calidad >= 55 ? 0.7 : 0.45 }} />
          </span>
        </span>
      </td>
      <td className={`${cell} max-w-0 truncate text-[14px] font-semibold`}>{p.analizado.replace(/_/g, ' ')}</td>
      <td className={`${cell} whitespace-nowrap text-[13px] ${muted(isDark)}`}>{ago(p.saved_at)}</td>
      <td className={`${cell} text-right`} onClick={(e) => e.stopPropagation()}>
        {confirming ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold">
            <button type="button" onClick={onRemove} className={`rounded-full bg-[#7a1022] px-3 py-1.5 text-white cursor-pointer ${FOCUS}`}>Quitar</button>
            <button type="button" onClick={() => setConfirming(false)} className={`rounded-full px-3 py-1.5 cursor-pointer ${FOCUS} ${isDark ? 'bg-white/10' : 'bg-white'}`}>No</button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5">
            <button type="button" onClick={() => desktop.reveal(p.path)} aria-label={`Mostrar ${p.name} en su carpeta`} title="Mostrar en la carpeta" className={icon}>
              <FolderSearch className="h-4 w-4" aria-hidden />
            </button>
            <button type="button" onClick={() => setConfirming(true)} aria-label={`Quitar ${p.name} de los proyectos`} title="Quitar de los proyectos (tu archivo no se toca)" className={icon}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </span>
        )}
      </td>
    </tr>
  );
};

/**
 * Los proyectos como lo que son, planillas: una tabla con lo que importa de cada una. Con `sort`, las
 * columnas con datos ordenan al tocarlas. La usan el inicio (los últimos) y "Mis proyectos" (todos).
 */
export const ProjectsTable: React.FC<{
  projects: Project[];
  isDark: boolean;
  onOpen: (p: Project) => void;
  onRemove: (id: string) => void;
  sort?: Sort;
  onSort?: (s: Sort) => void;
}> = ({ projects, isDark, onOpen, onRemove, sort, onSort }) => {
  const head = (label: string, key?: Sort, align = 'text-left') => {
    const active = key && sort === key;
    const Arrow = key === 'nombre' ? ArrowUp : ArrowDown;
    return (
      <th scope="col" aria-sort={active ? (key === 'nombre' ? 'ascending' : 'descending') : undefined} className={`px-3 pb-2 text-[12px] font-bold ${align} ${muted(isDark)}`}>
        {key && onSort ? (
          <button type="button" onClick={() => onSort(key)} className={`inline-flex items-center gap-1 rounded-full hover:text-current cursor-pointer ${FOCUS} ${active ? (isDark ? 'text-white' : 'text-zinc-950') : ''}`}>
            {label} {active && <Arrow className="h-3 w-3" aria-hidden />}
          </button>
        ) : (
          label
        )}
      </th>
    );
  };
  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <colgroup>
        <col className="w-[38%]" />
        <col className="w-[12%]" />
        <col className="w-[15%]" />
        <col />
        <col className="w-[11%]" />
        <col className="w-[92px]" />
      </colgroup>
      <thead>
        <tr>
          {head('Planilla', 'nombre')}
          {head('Filas', 'filas', 'text-right')}
          {head('Calidad', 'calidad')}
          {head('Lo analizado')}
          {head('Guardado', 'recientes')}
          <th scope="col"><span className="sr-only">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        {projects.map((p, i) => (
          <Row key={p.id} p={p} index={i} isDark={isDark} onOpen={() => onOpen(p)} onRemove={() => onRemove(p.id)} />
        ))}
      </tbody>
    </table>
  );
};
