import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAnalysisResponse } from '@/lib/api';
import { useMioStore } from '@/utils/useMioStore';
import { keepPref, readPref } from '@/utils/prefs';
import { EXTENSIONS, desktop, extension, fileName, inDesktop, type Opened, type Progress, type Project, type Result } from './desktop';

/** Lo que pasa con la planilla abierta. */
export type Phase =
  | { kind: 'nada' }
  | { kind: 'abriendo'; name: string }
  | { kind: 'listo'; path: string; opened: Opened; result: Result }
  | { kind: 'error'; message: string };

/** Las pantallas del menú (y la del análisis abierto). */
export type Section = 'inicio' | 'proyectos' | 'guia' | 'ajustes' | 'analisis';
/** El tema elegido: como el sistema, claro u oscuro (se guarda). */
export type ThemeMode = 'sistema' | 'claro' | 'oscuro';

const THEME_KEY = 'mio_escritorio_tema';
const GUIDE_KEY = 'mio_escritorio_guia_vista';
/** Las pantallas del menú, en orden: ⌘1 abre la primera, ⌘2 la segunda… */
export const MENU: { id: Exclude<Section, 'analisis'>; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'proyectos', label: 'Mis proyectos' },
  { id: 'guia', label: 'Guía' },
  { id: 'ajustes', label: 'Ajustes' },
];

const message = (e: any) => String(e?.message || e);
const savedMode = (): ThemeMode => {
  const v = readPref(THEME_KEY);
  return v === 'claro' || v === 'oscuro' ? v : 'sistema';
};

/**
 * Lo que hace la app de escritorio: la pantalla del menú en la que se está, abrir o soltar una
 * planilla, analizar otra columna, los proyectos guardados, el tema (guardado) y la guía de la
 * primera vez.
 */
export function useDesktop() {
  const setTheme = useMioStore((s) => s.setTheme);
  const [section, setSection] = useState<Section>('inicio');
  const [phase, setPhase] = useState<Phase>({ kind: 'nada' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragging, setDragging] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(savedMode);
  const [touring, setTouring] = useState(() => readPref(GUIDE_KEY) !== '1');
  const busy = phase.kind === 'abriendo' || reanalyzing;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const refresh = useCallback(() => desktop.projects().then(setProjects).catch(() => setProjects([])), []);

  const show = (path: string, opened: Opened) => setPhase({ kind: 'listo', path, opened, result: normalizeAnalysisResponse(opened.analisis) });

  /** Abre una planilla (en un Excel, la hoja pedida o la primera) y muestra su análisis. */
  const open = useCallback(async (path: string, hoja?: string | null) => {
    if (busyRef.current) return;
    setProgress(null);
    setSection('analisis');
    setPhase({ kind: 'abriendo', name: hoja ? `${fileName(path)} · ${hoja}` : fileName(path) });
    try {
      show(path, await desktop.open(path, hoja));
      refresh();
    } catch (e) {
      setPhase({ kind: 'error', message: message(e) });
    }
  }, [refresh]);

  const choose = useCallback(async () => {
    const path = await desktop.choose();
    if (path) open(path);
  }, [open]);

  const reanalyze = async (column: string) => {
    if (busy || phase.kind !== 'listo') return;
    const path = phase.path;
    setProgress(null);
    setReanalyzing(true);
    try {
      show(path, await desktop.analyze(column));
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

  const setThemeMode = (mode: ThemeMode) => {
    keepPref(THEME_KEY, mode);
    setThemeModeState(mode);
  };

  /** Empieza el recorrido de la guía, o lo da por visto al terminarlo o saltearlo. */
  const startTour = () => setTouring(true);
  const endTour = () => {
    keepPref(GUIDE_KEY, '1');
    setTouring(false);
  };

  // El tema: el elegido o, si es "como el sistema", el de la compu (y sigue sus cambios).
  useEffect(() => {
    if (!inDesktop()) return;
    if (themeMode !== 'sistema') {
      setTheme(themeMode === 'oscuro' ? 'dark' : 'light');
      return;
    }
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setTheme(dark.matches ? 'dark' : 'light');
    apply();
    dark.addEventListener('change', apply);
    return () => dark.removeEventListener('change', apply);
  }, [themeMode, setTheme]);

  // Los proyectos, el avance del análisis y soltar un archivo en cualquier parte de la ventana.
  useEffect(() => {
    if (!inDesktop()) return;
    refresh();
    const offs = [
      desktop.listen('progreso', (e) => setProgress(e.payload as Progress)),
      desktop.listen('tauri://drag-enter', () => setDragging(true)),
      desktop.listen('tauri://drag-leave', () => setDragging(false)),
      desktop.listen('tauri://drag-drop', (e) => {
        setDragging(false);
        const path = (e?.payload?.paths || []).find((p: string) => EXTENSIONS.includes(extension(p)));
        if (path) open(path);
      }),
    ];
    return () => offs.forEach((p) => p.then((off) => off()));
  }, [refresh, open]);

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
    section, setSection, phase, busy, projects, dragging, reanalyzing, progress, themeMode, setThemeMode, touring, startTour, endTour,
    open, choose, reanalyze, remove,
  };
}
