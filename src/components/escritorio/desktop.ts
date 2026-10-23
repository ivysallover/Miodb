import { normalizeAnalysisResponse } from '@/lib/api';

/**
 * El puente con la app de escritorio (Tauri): los comandos de `desktop/src-tauri/src/main.rs`, lo que
 * devuelven, y cómo se escriben los datos de un archivo en pantalla.
 */

/** Extensiones que lee el motor: de texto y de Excel (`EXCEL_EXTENSIONS` en `desktop/engine/src/sheet.rs`). */
export const CSV_EXTENSIONS = ['csv', 'tsv', 'txt'];
export const EXCEL_EXTENSIONS = ['xlsx', 'xlsm', 'xls', 'ods'];
export const EXTENSIONS = [...CSV_EXTENSIONS, ...EXCEL_EXTENSIONS];

/** Lo que devuelven `abrir_planilla` y `analizar`. */
export type Opened = {
  analisis: unknown; bytes: number; filas_titulo: number; segundos: number; guardado?: boolean;
  /** En un Excel: sus hojas y la que se leyó. */
  hojas: string[]; hoja: string | null;
};
/** Un proyecto guardado (`projects::Meta`). */
export type Project = {
  id: string; path: string; name: string; hoja: string | null; bytes: number; modified: number; saved_at: number;
  filas: number; columnas: number; calidad: number; analizado: string;
};
export type Result = ReturnType<typeof normalizeAnalysisResponse>;

/** Las etapas de abrir y analizar una planilla, en orden (`progress::Stage` del motor), con lo que dice la pantalla. */
export const STAGES = [
  { id: 'leyendo', label: 'Leer la planilla' },
  { id: 'limpiando', label: 'Limpiarla' },
  { id: 'graficos', label: 'Armar los gráficos' },
  { id: 'que_lo_mueve', label: 'Ver qué lo mueve' },
  { id: 'valores_raros', label: 'Buscar lo que se sale de lo normal' },
  { id: 'grupos', label: 'Armar grupos parecidos' },
  { id: 'pronostico', label: 'Poner a competir los modelos de predicción' },
] as const;
export type StageId = (typeof STAGES)[number]['id'];
/** Por dónde va: la etapa y, si se sabe, cuánto de ella (0 a 1). */
export type Progress = { etapa: StageId; avance: number | null };

/** Dónde está publicada la web de MIO. */
const WEB = 'https://miodb.pages.dev';

const api = () => (typeof window !== 'undefined' ? (window as any).__TAURI__ : undefined);

/** Si la pantalla corre dentro de la app de escritorio. */
export const inDesktop = () => !!api();

export const desktop = {
  open: (path: string, hoja?: string | null): Promise<Opened> => api().core.invoke('abrir_planilla', { path, hoja: hoja ?? null }),
  analyze: (columna: string): Promise<Opened> => api().core.invoke('analizar', { columna }),
  projects: (): Promise<Project[]> => api().core.invoke('proyectos'),
  remove: (id: string): Promise<void> => api().core.invoke('borrar_proyecto', { id }),
  /** El diálogo del sistema para elegir una planilla (`null` si se cancela). */
  choose: async (): Promise<string | null> => {
    const picked = await api().dialog.open({ multiple: false, directory: false, filters: [{ name: 'Planillas', extensions: EXTENSIONS }] });
    return picked && !Array.isArray(picked) ? picked : null;
  },
  /** La carpeta donde la app guarda los proyectos. */
  projectsFolder: (): Promise<string> => api().core.invoke('carpeta_proyectos'),
  /** Muestra un archivo o carpeta en el Finder (o el explorador de archivos). */
  reveal: (path: string): Promise<void> => api().opener.revealItemInDir(path),
  /** Si esta versión de la app puede entrar con Google. */
  googleAvailable: (): Promise<boolean> => api().core.invoke('google_disponible'),
  /** Entra con Google en el navegador de la compu (`google.rs`); devuelve el permiso para Firebase. */
  google: (): Promise<string> => api().core.invoke('ingresar_con_google'),
  /** Abre una página de MIO en la web (por ejemplo, la de arrepentimiento) en el navegador. */
  openWeb: (path: string): Promise<void> => api().opener.openUrl(`${WEB}${path}`),
  /** La versión de la app (`desktop/src-tauri/tauri.conf.json`). */
  version: (): Promise<string> => api().app.getVersion(),
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
