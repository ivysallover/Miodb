import React, { useState } from 'react';
import { ArrowUpRight, FolderSearch, Trash2 } from 'lucide-react';
import { ago, desktop, extension, folderOf, num, size, type Project } from './desktop';
import { FOCUS, muted } from './ui';

/**
 * Una planilla guardada: se abre al instante, se puede mostrar en su carpeta y quitar de la lista
 * (con confirmación; el archivo no se toca). La usan el inicio y "Mis proyectos".
 */
export const ProjectTile: React.FC<{ p: Project; isDark: boolean; onOpen: () => void; onRemove: () => void }> = ({ p, isDark, onOpen, onRemove }) => {
  const [confirming, setConfirming] = useState(false);
  const tile = isDark ? 'bg-white/[0.04] hover:bg-white/[0.08]' : 'bg-[#f3f3f5] hover:bg-[#e9e3ff]';
  const icon = `rounded-full p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-white'}`;
  return (
    <li className={`group relative rounded-mio-sm transition-colors duration-150 ${tile}`}>
      <button type="button" onClick={onOpen} className={`block w-full rounded-mio-sm p-4 pr-12 text-left cursor-pointer ${FOCUS}`}>
        <span className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${isDark ? 'bg-[#7647eb]/30 text-[#d9ceff]' : 'bg-[#7647eb]/12 text-[#5b32cc]'}`}>{extension(p.path)}</span>
          <span className={`font-mono text-[11px] ${muted(isDark)}`}>{ago(p.saved_at)} · {size(p.bytes)}</span>
        </span>
        <span className="mt-2.5 block truncate text-[17px] font-extrabold tracking-[-0.02em]">
          {p.name}
          {p.hoja && <span className={`font-semibold ${muted(isDark)}`}> · {p.hoja}</span>}
        </span>
        <span className={`mt-0.5 block truncate font-mono text-[11px] ${muted(isDark)}`}>{folderOf(p.path)}</span>
        <span className={`mt-3 block text-[13px] ${muted(isDark)}`}>{num(p.filas)} filas · {p.columnas} columnas · calidad {p.calidad}/100</span>
        <span className="mt-1 block truncate text-[13px] font-semibold">Lo analizado: {p.analizado.replace(/_/g, ' ')}</span>
      </button>
      <ArrowUpRight className="pointer-events-none absolute right-4 top-4 h-4 w-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden />
      {confirming ? (
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[12px] font-bold">
          <button type="button" onClick={onRemove} className={`rounded-full bg-[#7a1022] px-3 py-1.5 text-white cursor-pointer ${FOCUS}`}>Quitar</button>
          <button type="button" onClick={() => setConfirming(false)} className={`rounded-full px-3 py-1.5 cursor-pointer ${FOCUS} ${isDark ? 'bg-white/10' : 'bg-white'}`}>No</button>
        </span>
      ) : (
        <span className="absolute bottom-3 right-3 flex items-center gap-0.5">
          <button type="button" onClick={() => desktop.reveal(p.path)} aria-label={`Mostrar ${p.name} en su carpeta`} title="Mostrar en la carpeta" className={icon}>
            <FolderSearch className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Quitar ${p.name} de los proyectos`} title="Quitar de los proyectos (tu archivo no se toca)" className={icon}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </span>
      )}
    </li>
  );
};
