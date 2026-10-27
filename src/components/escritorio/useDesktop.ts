import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAnalysisResponse } from '@/lib/api';
import { keepPref, readPref } from '@/utils/prefs';
import { EXTENSIONS, desktop, extension, fileName, inDesktop, type Opened, type Progress, type Project, type Result, type UnionChoices, type UnionPlan } from './desktop';

/** Lo que pasa con la planilla abierta. */
export type Phase =
  | { kind: 'nada' }
  | { kind: 'abriendo'; name: string }
  /** Varias planillas, antes de analizarlas: cómo quedarían unidas y lo elegido. */
  | { kind: 'uniendo'; paths: string[]; plan: UnionPlan; choices: UnionChoices; updating: boolean }
  | { kind: 'listo'; paths: string[]; opened: Opened; result: Result; union: UnionChoices | null }
  | { kind: 'error'; message: string };

/** Las pantallas del menú (y la del análisis abierto). */
export type Section = 'inicio' | 'proyectos' | 'guia' | 'cuenta' | 'ajustes' | 'analisis';

const GUIDE_KEY = 'mio_escritorio_guia_vista';
/** Sin elegir nada: todas adentro y las claves que sugiere MIO. */
const SUGGESTED: UnionChoices = { fuera: [], claves: {} };
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

  /** El resultado listo para mostrar. */
  const ready = (paths: string[], opened: Opened, union: UnionChoices | null = null): Phase => ({
    kind: 'listo', paths, opened, result: normalizeAnalysisResponse(opened.analisis), union,
  });

  /**
   * Cada trabajo (leer, unir, analizar) lleva un número: si se cancela o empieza otro, lo que conteste
   * el anterior ya no se muestra.
   */
  const job = useRef(0);

  /** Hace `task` mostrando la espera (`name`) y después lo que devuelve; si falla, lo dice. Una sola cosa por vez. */
  const run = useCallback(async (name: string, task: () => Promise<Phase>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const id = ++job.current;
    setProgress(null);
    setSection('analisis');
    setPhase({ kind: 'abriendo', name });
    try {
      const next = await task();
      if (id !== job.current) return;
      setPhase(next);
      refresh();
    } catch (e) {
      if (id === job.current) setPhase({ kind: 'error', message: message(e) });
    }
  }, [refresh]);

  /** Varias planillas: primero se revisa cómo quedarían unidas (con `union`, o lo sugerido). */
  const review = useCallback(
    (paths: string[], union: UnionChoices | null) =>
      run(`${paths.length} planillas`, async () => ({ kind: 'uniendo', paths, plan: await desktop.reviewUnion(paths, union), choices: union ?? SUGGESTED, updating: false })),
    [run],
  );

  /**
   * Abre una planilla (en un Excel, la hoja pedida o la primera) y muestra su análisis; con varias,
   * primero la revisión de cómo se unen.
   */
  const open = useCallback(async (paths: string[], hoja?: string | null) => {
    if (paths.length > 1) return review(paths, null);
    const [first] = paths;
    if (!first) return;
    await run(hoja ? `${fileName(first)} · ${hoja}` : fileName(first), async () => ready(paths, await desktop.open(first, hoja)));
  }, [run, review]);

  const choose = useCallback(async () => open(await desktop.choose()), [open]);

  /** Abre un proyecto guardado: con varias planillas, unidas como se eligió la vez anterior (sin revisar de nuevo). */
  const openProject = useCallback((p: Project) => {
    if (p.archivos.length < 2) return open([p.path], p.hoja);
    return run(p.name, async () => ready(p.archivos, await desktop.openMany(p.archivos, p.union), p.union));
  }, [open, run]);

  /** Cambia algo de la unión que se está revisando y muestra cómo quedaría. */
  const setUnion = async (choices: UnionChoices) => {
    if (phase.kind !== 'uniendo') return;
    const { paths } = phase;
    setPhase({ ...phase, choices, updating: true });
    try {
      setPhase({ kind: 'uniendo', paths, plan: await desktop.reviewUnion(paths, choices), choices, updating: false });
    } catch (e) {
      setPhase({ kind: 'error', message: message(e) });
    }
  };

  /** Analiza las planillas unidas como se eligió. */
  const confirmUnion = () => {
    if (phase.kind !== 'uniendo') return;
    const { paths, choices } = phase;
    const union = choices.fuera.length || Object.keys(choices.claves).length ? choices : null;
    return run(`${paths.length} planillas`, async () => ready(paths, await desktop.openMany(paths, union), union));
  };

  /** Vuelve a la revisión de la unión de lo que está abierto. */
  const changeUnion = () => {
    if (phase.kind === 'listo' && phase.paths.length > 1) review(phase.paths, phase.union);
  };

  /** Deja la revisión sin analizar. */
  const cancelUnion = () => {
    setPhase({ kind: 'nada' });
    setSection('inicio');
  };

  /** Analiza otra columna de lo que está abierto (sigue a la vista lo de antes mientras tanto). */
  const reanalyze = async (column: string) => {
    if (busy || phase.kind !== 'listo') return;
    const { paths, union } = phase;
    const id = ++job.current;
    setProgress(null);
    setReanalyzing(true);
    try {
      const opened = await desktop.analyze(column);
      if (id !== job.current) return;
      setPhase(ready(paths, opened, union));
      refresh();
    } catch (e) {
      if (id === job.current) setPhase({ kind: 'error', message: message(e) });
    } finally {
      if (id === job.current) setReanalyzing(false);
    }
  };

  /**
   * Cancela lo que está en curso: el motor corta en la próxima etapa y no guarda nada. Si era otra
   * columna, queda a la vista el resultado de antes; si era abrir, se vuelve al inicio.
   */
  const cancel = () => {
    job.current++;
    desktop.cancel().catch(() => undefined);
    busyRef.current = false;
    if (reanalyzing) {
      setReanalyzing(false);
    } else if (phase.kind === 'abriendo') {
      setPhase({ kind: 'nada' });
      setSection('inicio');
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
    open, openProject, choose, reanalyze, cancel, remove, clearProjects, setUnion, confirmUnion, changeUnion, cancelUnion,
  };
}
