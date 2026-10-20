import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeAnalysisResponse } from '@/lib/api';
import { useMioStore } from '@/utils/useMioStore';
import { EXTENSIONS, desktop, extension, fileName, inDesktop, type Opened, type Progress, type Project, type Result } from './desktop';

export type Phase =
  | { kind: 'inicio' }
  | { kind: 'abriendo'; name: string }
  | { kind: 'listo'; opened: Opened; result: Result }
  | { kind: 'error'; message: string };

const message = (e: any) => String(e?.message || e);

/**
 * Lo que hace la pantalla de escritorio: abrir o soltar una planilla, analizar otra columna, los
 * proyectos guardados, y seguir el modo claro u oscuro del sistema.
 */
export function useDesktop() {
  const setTheme = useMioStore((s) => s.setTheme);
  const [phase, setPhase] = useState<Phase>({ kind: 'inicio' });
  const [projects, setProjects] = useState<Project[]>([]);
  const [dragging, setDragging] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const busy = phase.kind === 'abriendo' || reanalyzing;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const refresh = useCallback(() => desktop.projects().then(setProjects).catch(() => setProjects([])), []);

  const show = (opened: Opened) => setPhase({ kind: 'listo', opened, result: normalizeAnalysisResponse(opened.analisis) });

  const open = useCallback(async (path: string) => {
    if (busyRef.current) return;
    setProgress(null);
    setPhase({ kind: 'abriendo', name: fileName(path) });
    try {
      show(await desktop.open(path));
      refresh();
    } catch (e) {
      setPhase({ kind: 'error', message: message(e) });
    }
  }, [refresh]);

  const choose = async () => {
    const path = await desktop.choose();
    if (path) open(path);
  };

  const reanalyze = async (column: string) => {
    if (busy) return;
    setProgress(null);
    setReanalyzing(true);
    try {
      show(await desktop.analyze(column));
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

  const home = () => setPhase({ kind: 'inicio' });

  useEffect(() => {
    if (!inDesktop()) return;
    refresh();
    // La ventana sigue la apariencia del sistema, como cualquier programa.
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setTheme(dark.matches ? 'dark' : 'light');
    apply();
    dark.addEventListener('change', apply);
    // Soltar un archivo en cualquier parte de la ventana lo abre.
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
    return () => {
      dark.removeEventListener('change', apply);
      offs.forEach((p) => p.then((off) => off()));
    };
  }, [refresh, setTheme, open]);

  return { phase, projects, dragging, reanalyzing, progress, open, choose, reanalyze, remove, home };
}
