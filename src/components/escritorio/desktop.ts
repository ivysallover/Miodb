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
  /** Con varias planillas: qué se hizo con cada una (`combine.rs`). */
  combinado: CombineStep[];
};
/** Lo elegido al revisar la unión (`combine::Choices`): planillas afuera y, por planilla, con qué cruzarla o `null` = no cruzarla. */
export type UnionChoices = { fuera: string[]; claves: Record<string, [string, string] | null> };
/** Una clave posible para cruzar una planilla. */
export type UnionKey = { clave: string; clave_otra: string; encontradas: number; sugerida: boolean };
/** Cómo quedaría la unión (`revisar_union`). */
export type UnionPlan = {
  principal: string; filas: number; columnas: number; pasos: CombineStep[];
  archivos: {
    archivo: string; filas: number; columnas: number; apiladas: number;
    papel: 'principal' | 'cruzada' | 'sin_cruzar' | 'fuera';
    candidatas: UnionKey[]; elegida: [string, string] | null;
  }[];
};
/** Un paso de la unión de varias planillas (`combine::Step`). */
export type CombineStep =
  | { tipo: 'apilado'; archivos: string[]; filas: number }
  | { tipo: 'cruzado'; archivo: string; clave: string; clave_otra: string; encontradas: number; columnas: string[] }
  | { tipo: 'omitido'; archivo: string; motivo: string };
/** Un proyecto guardado (`projects::Meta`). */
export type Project = {
  id: string; path: string; name: string; hoja: string | null;
  /** Todos los archivos, si son varias planillas unidas (si es una sola, vacío). */
  archivos: string[];
  /** Cómo se unieron, si no fue lo sugerido. */
  union: UnionChoices | null; bytes: number; modified: number; saved_at: number;
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
  /** Cómo quedarían unidas varias planillas (`combine.rs`), sin analizarlas. */
  reviewUnion: (paths: string[], union?: UnionChoices | null): Promise<UnionPlan> => api().core.invoke('revisar_union', { paths, union: union ?? null }),
  /** Varias planillas juntas, unidas como dice `union` (o como sugiere MIO), analizadas. */
  openMany: (paths: string[], union?: UnionChoices | null): Promise<Opened> => api().core.invoke('abrir_varias', { paths, union: union ?? null }),
  /** Las planillas del ejemplo que trae la app, listas para abrir. */
  example: (): Promise<string[]> => api().core.invoke('ejemplo'),
  /** Cancela lo que se esté leyendo, uniendo o analizando (no se guarda nada). */
  cancel: (): Promise<void> => api().core.invoke('cancelar'),
  analyze: (columna: string): Promise<Opened> => api().core.invoke('analizar', { columna }),
  projects: (): Promise<Project[]> => api().core.invoke('proyectos'),
  remove: (id: string): Promise<void> => api().core.invoke('borrar_proyecto', { id }),
  /** El diálogo del sistema para elegir una o varias planillas (vacío si se cancela). */
  choose: async (): Promise<string[]> => {
    const picked = await api().dialog.open({ multiple: true, directory: false, filters: [{ name: 'Planillas', extensions: EXTENSIONS }] });
    return picked ? ([] as string[]).concat(picked) : [];
  },
  /** Cuánto ocupan los proyectos guardados, en bytes. */
  projectsSize: (): Promise<number> => api().core.invoke('espacio_proyectos'),
  /** Borra todos los proyectos guardados (las planillas no se tocan). */
  clearProjects: (): Promise<void> => api().core.invoke('borrar_proyectos'),
  /** El tamaño de todo lo que muestra la ventana (1 = normal). */
  setZoom: (zoom: number): Promise<void> => api().webview.getCurrentWebview().setZoom(zoom),
  /** El diálogo del sistema para elegir dónde guardar `name` (`null` si se cancela). */
  saveAs: (name: string, filters?: { name: string; extensions: string[] }[]): Promise<string | null> => api().dialog.save({ defaultPath: name, filters }),
  /** Escribe en `path` un archivo que arma la ventana (en base64). */
  writeFile: (path: string, base64: string): Promise<void> => api().core.invoke('guardar_archivo', { destino: path, datos: base64 }),
  /** Guarda la planilla abierta, limpia, en `path` (CSV o Excel). */
  exportData: (formato: 'csv' | 'xlsx', path: string): Promise<void> => api().core.invoke('exportar', { formato, destino: path }),
  /** El diálogo de impresión del sistema con lo que muestra la ventana (desde ahí, "Guardar como PDF"). */
  print: (): Promise<void> => api().core.invoke('imprimir'),
  /** La carpeta donde la app guarda los proyectos. */
  projectsFolder: (): Promise<string> => api().core.invoke('carpeta_proyectos'),
  /** Muestra un archivo o carpeta en el Finder (o el explorador de archivos). */
  reveal: (path: string): Promise<void> => api().opener.revealItemInDir(path),
  /**
   * Entra con Google en el navegador de la compu (`google.rs`); devuelve la credencial. La página de
   * ingreso la sirve la app; mientras se desarrolla, la de este mismo servidor.
   */
  google: (): Promise<string> =>
    api().core.invoke('ingresar_con_google', { pagina: location.protocol.startsWith('http') ? `${location.origin}/escritorio/google` : null }),
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
