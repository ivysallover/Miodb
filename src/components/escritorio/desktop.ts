import { normalizeAnalysisResponse } from '@/lib/api';

/**
 * El puente con la app de escritorio (Tauri): los comandos de `desktop/src-tauri/src/main.rs`, lo que
 * devuelven, y cómo se escriben los datos de un archivo en pantalla.
 */

/**
 * Extensiones que lee el motor: de texto, de Excel (`EXCEL_EXTENSIONS` en `desktop/engine/src/sheet.rs`),
 * bases SQLite, JSON y Parquet (`desktop/engine/src/formats.rs`).
 */
export const CSV_EXTENSIONS = ['csv', 'tsv', 'txt'];
export const EXCEL_EXTENSIONS = ['xlsx', 'xlsm', 'xls', 'ods'];
/** Bases SQLite: tienen tablas como un Excel tiene hojas. */
export const SQLITE_EXTENSIONS = ['sqlite', 'sqlite3', 'db', 'db3'];
const TYPED_EXTENSIONS = ['json', 'jsonl', 'ndjson', 'parquet', 'pq'];
export const EXTENSIONS = [...CSV_EXTENSIONS, ...EXCEL_EXTENSIONS, ...SQLITE_EXTENSIONS, ...TYPED_EXTENSIONS];

/** Lo que sabe la app del archivo abierto (`facts` en `main.rs`). */
type Facts = {
  bytes: number; filas_titulo: number;
  /** En un Excel: sus hojas y la que se leyó. */
  hojas: string[]; hoja: string | null;
  /** Con varias planillas: qué se hizo con cada una (`combine.rs`). */
  combinado: CombineStep[];
};
/** Un período que la predicción de antes miraba como futuro y ahora tiene dato. */
type Checked = { fecha: string; real: number; predicho: number; abajo: number; arriba: number };
/** Lo que cambió desde el análisis anterior de la misma columna, cuando el archivo se actualizó (`changes.rs`). */
export type Changes = {
  /** Cuándo fue el análisis anterior (segundos desde 1970). */
  desde: number;
  filas: [number, number];
  total: [number, number] | null;
  /** Cuántos valores raros había y hay (`null` si ese análisis no los buscó). */
  raros: [number | null, number | null];
  raros_nuevos: number;
  prediccion: { frecuencia: string; motor: string; dentro: number; error_pct: number | null; periodos: Checked[] } | null;
};
/** Un análisis: lo que devuelve `analizar` (y abrir, si estaba guardado). */
export type Opened = Facts & { analisis: unknown; segundos: number; guardado?: boolean; cambios?: Changes };
/** Algo que se puede analizar (`Sheet::choices`): de las numéricas, el total y la suma de cada mes, si hay fecha. */
export type Column = { nombre: string; tipo: 'numérica' | 'categórica'; distintos: number; sugerida: boolean; total?: number; meses?: number[] };
/** La planilla leída y limpia, antes del primer análisis: para elegir qué analizar. */
export type Choosing = Facts & { nombre: string; filas: number; n_columnas: number; calidad: number; columnas: Column[] };
/** Lo que devuelve abrir: lo último que se miró (si estaba guardado y no cambió) o qué analizar. */
export type Opening = { listo: Opened } | { elegir: Choosing };
/** Lo elegido al revisar la unión (`combine::Choices`): planillas afuera y, por planilla, con qué cruzarla o `null` = no cruzarla. */
export type UnionChoices = { fuera: string[]; claves: Record<string, [string, string] | null> };
/** Una clave posible para cruzar una planilla. */
type UnionKey = { clave: string; clave_otra: string; encontradas: number; sugerida: boolean };
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
/** Las filas de algunos valores de una columna (`filas`, `Sheet::rows_where`): de cada valor, cuántas son, la suma de lo analizado y las primeras. */
export type Rows = { columna: string; objetivo: string; columnas: string[]; grupos: { valor: string; filas: number; suma: number | null; muestra: unknown[][] }[] };

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
type StageId = (typeof STAGES)[number]['id'];
/** Por dónde va: la etapa y, si se sabe, cuánto de ella (0 a 1). */
export type Progress = { etapa: StageId; avance: number | null };

/** Dónde está publicada la web de MIO. */
const WEB = 'https://miodb.pages.dev';

const api = () => (typeof window !== 'undefined' ? (window as any).__TAURI__ : undefined);

/** Si la pantalla corre dentro de la app de escritorio. */
export const inDesktop = () => !!api();

export const desktop = {
  open: (path: string, hoja?: string | null): Promise<Opening> => api().core.invoke('abrir_planilla', { path, hoja: hoja ?? null }),
  /** Cómo quedarían unidas varias planillas (`combine.rs`), sin analizarlas. */
  reviewUnion: (paths: string[], union?: UnionChoices | null): Promise<UnionPlan> => api().core.invoke('revisar_union', { paths, union: union ?? null }),
  /** Varias planillas juntas, unidas como dice `union` (o como sugiere MIO). */
  openMany: (paths: string[], union?: UnionChoices | null): Promise<Opening> => api().core.invoke('abrir_varias', { paths, union: union ?? null }),
  /** Las planillas del ejemplo que trae la app, listas para abrir. */
  example: (): Promise<string[]> => api().core.invoke('ejemplo'),
  /** Cancela lo que se esté leyendo, uniendo o analizando (no se guarda nada). */
  cancel: (): Promise<void> => api().core.invoke('cancelar'),
  /** Las filas de la planilla abierta donde `columna` vale alguno de `valores`, con la suma de `objetivo`. */
  rows: (columna: string, valores: string[], objetivo: string): Promise<Rows> => api().core.invoke('filas', { columna, valores, objetivo }),
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
  /** La carpeta del registro de errores de esta compu. */
  logFolder: (): Promise<string> => api().core.invoke('carpeta_registro'),
  /** Anota un error de la pantalla en el registro de esta compu (nivel 5 = error, `tauri-plugin-log`). */
  logError: (message: string): Promise<void> => api().core.invoke('plugin:log|log', { level: 5, message }),
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
/** Un número grande en pocas cifras: "1,2 M", "35 mil". */
export const compact = (n: number) => n.toLocaleString('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
export const size = (bytes: number) => (bytes < 100_000 ? `${num(Math.max(1, bytes / 1000))} KB` : `${num(bytes / 1e6, 1)} MB`);

/** Hace cuánto, en palabras ("recién", "hace 5 min", "hace 2 d"), de un momento en segundos. */
export const ago = (secs: number) => {
  const min = Math.round((Date.now() / 1000 - secs) / 60);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};
