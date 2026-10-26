import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAnalysisResponse } from '@/lib/api';
import { keepPref, readPref } from '@/utils/prefs';
import { EXTENSIONS, desktop, extension, fileName, inDesktop, type Opened, type Progress, type Project, type Result } from './desktop';

/** Lo que pasa con la planilla abierta. */
export type Phase =
  | { kind: 'nada' }
  | { kind: 'abriendo'; name: string }
  | { kind: 'listo'; paths: string[]; opened: Opened; result: Result }
  | { kind: 'error'; message: string };

/** Las pantallas del menú (y la del análisis abierto). */
export type Section = 'inicio' | 'proyectos' | 'guia' | 'cuenta' | 'ajustes' | 'analisis';

const GUIDE_KEY = 'mio_escritorio_guia_vista';
/** Las pantallas del menú, en orden: ⌘1 abre la primera, ⌘2 la segunda… */
export const MENU: { id: Exclude<Section, 'analisis'>; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'proyectos', label: 'Mis proyectos' },
  { id: 'guia', label: 'Guía' },
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'ajustes', label: 'Ajustes' },
];

const message = (e: any) => String(e?.message || e);

/**
 * Lo que hace la app de escritorio con la cuenta adentro: la pantalla del menú en la que se está,
 * abrir o soltar una planilla, analizar otra columna, los proyectos guardados y la guía de la primera
 * vez. El tema y las preferencias van aparte (`useTheme.ts`, `usePreferences.ts`); de ellas, acá
 * solo importa si al arrancar se abre el último proyecto (`reopenLast`).
 */
export function useDesktop({ reopenLast }: { reopenLast: boolean }) {
  const [section, setSection] = useState<Section>('inicio');
  const [phase, setPhase] = useState<Phase>({ kind: 'nada' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragging, setDragging] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [touring, setTouring] = useState(() => readPref(GUIDE_KEY) !== '1');
  const busy = phase.kind === 'abriendo' || reanalyzing;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const reopen = useRef(reopenLast);

  /** Vuelve a leer los proyectos guardados (y los devuelve). */
  const refresh = useCallback(
    () =>
      desktop
        .projects()
        .catch((): Project[] => [])
        .then((list) => {
          setProjects(list);
          return list;
        }),
    [],
  );

  const show = (paths: string[], opened: Opened) => setPhase({ kind: 'listo', paths, opened, result: normalizeAnalysisResponse(opened.analisis) });

  /**
   * Abre una planilla (en un Excel, la hoja pedida o la primera) o varias juntas (se unen:
   * `combine.rs`) y muestra su análisis.
   */
  const open = useCallback(async (paths: string[], hoja?: string | null) => {
    if (paths.length === 0) return;
    if (busyRef.current) return;
    busyRef.current = true;
    setProgress(null);
    setSection('analisis');
    const [first] = paths;
    setPhase({ kind: 'abriendo', name: paths.length > 1 ? `${paths.length} planillas` : hoja ? `${fileName(first)} · ${hoja}` : fileName(first) });
    try {
      show(paths, await (paths.length > 1 ? desktop.openMany(paths) : desktop.open(first, hoja)));
      refresh();
    } catch (e) {
      setPhase({ kind: 'error', message: message(e) });
    }
  }, [refresh]);

  const choose = useCallback(async () => open(await desktop.choose()), [open]);

  /** Abre un proyecto guardado (con todas sus planillas, si eran varias). */
  const openProject = useCallback((p: Project) => open(p.archivos.length > 1 ? p.archivos : [p.path], p.hoja), [open]);

  const reanalyze = async (column: string) => {
    if (busy || phase.kind !== 'listo') return;
    const { paths } = phase;
    setProgress(null);
    setReanalyzing(true);
    try {
      show(paths, await desktop.analyze(column));
      refresh();
    } catch (e) {
      setPhase({ kind: 'error', message: message(e) });
    } finally {
      setReanalyzing(false);
    }
  };

  const remove = async (id: string) => {
    await desktop.remove(id).catch(() => undefined);
    refresh();
  };

  /** Borra todos los proyectos guardados (las planillas no se tocan). */
  const clearProjects = async () => {
    await desktop.clearProjects().catch(() => undefined);
    refresh();
  };

  /** Empieza el recorrido de la guía, o lo da por visto al terminarlo o saltearlo. */
  const startTour = () => setTouring(true);
  const endTour = () => {
    keepPref(GUIDE_KEY, '1');
    setTouring(false);
  };

  // Los proyectos, el avance del análisis y soltar un archivo en cualquier parte de la ventana.
  useEffect(() => {
    if (!inDesktop()) return;
    refresh().then((list) => {
      // Una sola vez al arrancar, si se eligió en Ajustes: el último proyecto, de lo guardado.
      if (!reopen.current || !list[0]) return;
      reopen.current = false;
      openProject(list[0]);
    });
    const offs = [
      desktop.listen('progreso', (e) => setProgress(e.payload as Progress)),
      desktop.listen('tauri://drag-enter', () => setDragging(true)),
      desktop.listen('tauri://drag-leave', () => setDragging(false)),
      desktop.listen('tauri://drag-drop', (e) => {
        setDragging(false);
        open((e?.payload?.paths || []).filter((p: string) => EXTENSIONS.includes(extension(p))));
      }),
    ];
    return () => offs.forEach((p) => p.then((off) => off()));
  }, [refresh, open, openProject]);

  // Atajos de teclado: ⌘O abre una planilla; ⌘1 a ⌘4, las pantallas del menú.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (!busyRef.current) choose();
      } else if (MENU[Number(e.key) - 1]) {
        e.preventDefault();
        setSection(MENU[Number(e.key) - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose]);

  return {
    section, setSection, phase, busy, projects, dragging, reanalyzing, progress, touring, startTour, endTour,
    open, openProject, choose, reanalyze, remove, clearProjects,
  };
}
