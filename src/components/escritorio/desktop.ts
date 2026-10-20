import { normalizeAnalysisResponse } from '@/lib/api';

/**
 * El puente con la app de escritorio (Tauri): los comandos de `desktop/src-tauri/src/main.rs`, lo que
 * devuelven, y cómo se escriben los datos de un archivo en pantalla.
 */

/** Extensiones que lee el motor (las de Excel son `EXCEL_EXTENSIONS` en `desktop/engine/src/sheet.rs`). */
export const EXTENSIONS = ['csv', 'tsv', 'txt', 'xlsx', 'xlsm', 'xls', 'ods'];

/** Lo que devuelven `abrir_planilla` y `analizar`. */
export type Opened = { analisis: unknown; bytes: number; filas_titulo: number; segundos: number; guardado?: boolean };
/** Un proyecto guardado (`projects::Meta`). */
export type Project = {
  id: string; path: string; name: string; bytes: number; modified: number; saved_at: number;
  filas: number; columnas: number; calidad: number; analizado: string;
};
export type Result = ReturnType<typeof normalizeAnalysisResponse>;

const api = () => (typeof window !== 'undefined' ? (window as any).__TAURI__ : undefined);

/** Si la pantalla corre dentro de la app de escritorio. */
export const inDesktop = () => !!api();

export const desktop = {
  open: (path: string): Promise<Opened> => api().core.invoke('abrir_planilla', { path }),
  analyze: (columna: string): Promise<Opened> => api().core.invoke('analizar', { columna }),
  projects: (): Promise<Project[]> => api().core.invoke('proyectos'),
  remove: (id: string): Promise<void> => api().core.invoke('borrar_proyecto', { id }),
  /** El diálogo del sistema para elegir una planilla (`null` si se cancela). */
  choose: async (): Promise<string | null> => {
    const picked = await api().dialog.open({ multiple: false, directory: false, filters: [{ name: 'Planillas', extensions: EXTENSIONS }] });
    return picked && !Array.isArray(picked) ? picked : null;
  },
  /** Escucha un evento de la ventana; devuelve cómo dejar de escucharlo. */
  listen: (event: string, fn: (e: any) => void): Promise<() => void> => api().event.listen(event, fn),
};

export const fileName = (path: string) => path.split(/[\\/]/).pop() || path;
export const folderOf = (path: string) => path.slice(0, Math.max(0, path.length - fileName(path).length - 1));
export const extension = (path: string) => (path.split('.').pop() || '').toLowerCase();
export const num = (n: number, d = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });
export const size = (bytes: number) => (bytes < 100_000 ? `${num(Math.max(1, bytes / 1000))} KB` : `${num(bytes / 1e6, 1)} MB`);

/** Hace cuánto, en palabras ("recién", "hace 5 min", "hace 2 d"), de un momento en segundos. */
export const ago = (secs: number) => {
  const min = Math.round((Date.now() / 1000 - secs) / 60);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};
