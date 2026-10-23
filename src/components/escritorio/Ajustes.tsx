import React, { useEffect, useState } from 'react';
import { FolderSearch, Monitor, Moon, Play, Sun } from 'lucide-react';
import { originOf } from '@/lib/themeTransition';
import { ActivePill } from './ActivePill';
import { desktop } from './desktop';
import type { ThemeMode } from './useDesktop';
import { FOCUS, muted, soft, surface } from './ui';

const MODES: { id: ThemeMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'claro', label: 'Claro', icon: Sun },
  { id: 'oscuro', label: 'Oscuro', icon: Moon },
  { id: 'sistema', label: 'Como la compu', icon: Monitor },
];

/** Un ajuste, en su propio bloque: qué es, a la izquierda; cómo cambiarlo, a la derecha. */
const Row: React.FC<{ title: string; text: React.ReactNode; isDark: boolean; children?: React.ReactNode }> = ({ title, text, isDark, children }) => (
  <div className={`flex flex-col gap-4 rounded-mio p-5 sm:px-7 md:flex-row md:items-center md:justify-between ${surface(isDark)}`}>
    <div className="min-w-0">
      <h2 className="text-lg font-extrabold tracking-[-0.02em]">{title}</h2>
      <div className={`mt-1 max-w-xl text-[14px] leading-relaxed ${muted(isDark)}`}>{text}</div>
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

/** Ajustes: el tema (se guarda), dónde quedan los proyectos, la guía y la versión. */
export const Ajustes: React.FC<{
  isDark: boolean;
  themeMode: ThemeMode;
  projects: number;
  onThemeMode: (m: ThemeMode, from: { x: number; y: number }) => void;
  onTour: () => void;
}> = ({ isDark, themeMode, projects, onThemeMode, onTour }) => {
  const [folder, setFolder] = useState('');
  const [version, setVersion] = useState('');
  useEffect(() => {
    desktop.projectsFolder().then(setFolder).catch(() => setFolder(''));
    desktop.version().then(setVersion).catch(() => setVersion(''));
  }, []);
  const segment = (active: boolean) =>
    `relative isolate inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-150 cursor-pointer ${FOCUS} ${active ? 'text-white' : isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-white'}`;

  return (
    <section className="space-y-2.5 sm:space-y-3">
      <h1 className={`rounded-mio p-5 text-4xl font-extrabold tracking-[-0.04em] sm:px-7 ${surface(isDark)}`}>Ajustes</h1>
      <div className="space-y-2.5 sm:space-y-3">
        <Row title="Tema" text="Se guarda para la próxima vez. Como la compu sigue el modo claro u oscuro del sistema." isDark={isDark}>
          <div role="radiogroup" aria-label="Tema" className={`flex gap-1 rounded-full p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
            {MODES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="radio" aria-checked={themeMode === id} onClick={(e) => onThemeMode(id, originOf(e))} className={segment(themeMode === id)}>
                {themeMode === id && <ActivePill group="tema" />}
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>
        </Row>
        <Row
          title="Proyectos guardados"
          text={<>
            {projects === 1 ? '1 proyecto' : `${projects} proyectos`}, con su análisis, en esta compu. Quitarlos de la lista no toca tus planillas.
            {folder && <span className="mt-1 block truncate font-mono text-[11px]" title={folder}>{folder}</span>}
          </>}
          isDark={isDark}
        >
          <button type="button" onClick={() => desktop.reveal(folder)} disabled={!folder} className={soft(isDark)}>
            <FolderSearch className="h-4 w-4" aria-hidden /> Mostrar la carpeta
          </button>
        </Row>
        <Row title="Guía" text="El recorrido de la primera vez, de nuevo." isDark={isDark}>
          <button type="button" onClick={onTour} className={soft(isDark)}>
            <Play className="h-4 w-4" aria-hidden /> Hacer el recorrido
          </button>
        </Row>
        <Row title="Privacidad" text="Las planillas se leen y se analizan en esta compu. MIO para escritorio no las sube a ningún servidor." isDark={isDark} />
        <Row title="Versión" text={version ? `MIO ${version}` : 'MIO'} isDark={isDark} />
      </div>
    </section>
  );
};
