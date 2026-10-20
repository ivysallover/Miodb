import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, FileSpreadsheet, FolderOpen } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { normalizeAnalysisResponse } from '@/lib/api';
import { ResultadoMejorado } from '@/components/dashboard/ResultadoMejorado';
import { MioPet2D, type MioPetMood } from '@/components/pet/MioPet2D';

/**
 * La pantalla de la app de escritorio (Tauri). Se elige o se suelta una planilla (CSV o Excel) y el
 * motor en Rust la lee, la limpia y la analiza en esta compu, sin subir nada. El resultado tiene el
 * mismo formato que el del motor de la web, así que se muestra con la misma vista de resultados
 * (`ResultadoMejorado`). Los comandos están en `desktop/src-tauri/src/main.rs`.
 */

/** Extensiones que lee el motor (las de Excel son `EXCEL_EXTENSIONS` en `desktop/engine/src/sheet.rs`). */
const EXTENSIONS = ['csv', 'tsv', 'txt', 'xlsx', 'xlsm', 'xls', 'ods'];
const RECENT_KEY = 'mio-escritorio-recientes';
const RECENT_MAX = 6;

type Opened = { analisis: unknown; bytes: number; filas_titulo: number; segundos: number };
type Recent = { path: string; name: string; at: number };
type Phase =
  | { kind: 'inicio' }
  | { kind: 'abriendo'; name: string }
  | { kind: 'listo'; path: string; opened: Opened; result: ReturnType<typeof normalizeAnalysisResponse> }
  | { kind: 'error'; message: string };

const tauri = () => (typeof window !== 'undefined' ? (window as any).__TAURI__ : undefined);
const fileName = (path: string) => path.split(/[\\/]/).pop() || path;
const folderOf = (path: string) => path.slice(0, Math.max(0, path.length - fileName(path).length - 1));
const num = (n: number, d = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });
const size = (bytes: number) => (bytes < 100_000 ? `${num(Math.max(1, bytes / 1000))} KB` : `${num(bytes / 1e6, 1)} MB`);
const ago = (t: number) => {
  const min = Math.round((Date.now() - t) / 60_000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};

/** Planillas abiertas hace poco (solo en esta compu; si el navegador no deja guardar, no hay lista). */
const readRecent = (): Recent[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((r) => r && typeof r.path === 'string') : [];
  } catch {
    return [];
  }
};
const remember = (path: string): Recent[] => {
  const next = [{ path, name: fileName(path), at: Date.now() }, ...readRecent().filter((r) => r.path !== path)].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento: la lista no se guarda */
  }
  return next;
};

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7647eb]';
const PRIMARY = `inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#bdf559] px-7 text-base font-bold text-zinc-950 transition-colors duration-200 hover:bg-[#c8ff6a] active:scale-[0.97] cursor-pointer disabled:opacity-50 ${FOCUS}`;

export const EscritorioPage: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const setTheme = useMioStore((s) => s.setTheme);
  const [phase, setPhase] = useState<Phase>({ kind: 'inicio' });
  const [recent, setRecent] = useState<Recent[]>(readRecent);
  const [dragging, setDragging] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [reanalyzing, setReanalyzing] = useState(false);
  const t = tauri();
  const busy = phase.kind === 'abriendo' || reanalyzing;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const open = useCallback(async (path: string) => {
    if (busyRef.current) return;
    setPhase({ kind: 'abriendo', name: fileName(path) });
    try {
      const opened: Opened = await t.core.invoke('abrir_planilla', { path });
      setRecent(remember(path));
      setPhase({ kind: 'listo', path, opened, result: normalizeAnalysisResponse(opened.analisis) });
    } catch (e: any) {
      setPhase({ kind: 'error', message: String(e?.message || e) });
    }
  }, [t]);

  const choose = async () => {
    const picked = await t.dialog.open({ multiple: false, directory: false, filters: [{ name: 'Planillas', extensions: EXTENSIONS }] });
    if (picked && !Array.isArray(picked)) open(picked);
  };

  const reanalyze = async (column: string) => {
    if (phase.kind !== 'listo' || busy) return;
    setReanalyzing(true);
    try {
      const opened: Opened = await t.core.invoke('analizar', { columna: column });
      setPhase({ ...phase, opened, result: normalizeAnalysisResponse(opened.analisis) });
    } catch (e: any) {
      setPhase({ kind: 'error', message: String(e?.message || e) });
    } finally {
      setReanalyzing(false);
    }
  };

  // La ventana sigue la apariencia del sistema (claro u oscuro), como cualquier programa.
  useEffect(() => {
    if (!t) return;
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setTheme(dark.matches ? 'dark' : 'light');
    apply();
    dark.addEventListener('change', apply);
    return () => dark.removeEventListener('change', apply);
  }, [t, setTheme]);

  // Soltar un archivo en cualquier parte de la ventana lo abre.
  useEffect(() => {
    if (!t?.event) return;
    const offs = [
      t.event.listen('tauri://drag-enter', () => setDragging(true)),
      t.event.listen('tauri://drag-leave', () => setDragging(false)),
      t.event.listen('tauri://drag-drop', (e: any) => {
        setDragging(false);
        const path = (e?.payload?.paths || []).find((p: string) => EXTENSIONS.includes(p.split('.').pop()?.toLowerCase() || ''));
        if (path) open(path);
      }),
    ];
    return () => offs.forEach((p: Promise<() => void>) => p.then((off) => off()));
  }, [t, open]);

  // Segundos desde que empezó a abrir la planilla (el motor no avisa el avance; esto es lo que se sabe).
  useEffect(() => {
    if (phase.kind !== 'abriendo') return;
    setSeconds(0);
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [phase.kind]);

  const surface = isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950';
  // La losa obsidiana, apenas levantada en modo oscuro para que no se pierda contra la página.
  const slab = isDark ? 'bg-[#16122a]' : 'bg-[#0b0914]';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';

  if (!t) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className={`rounded-mio p-6 sm:p-8 ${surface}`}>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em]">Esta pantalla es de la app de escritorio.</h1>
          <p className={`mt-3 text-base ${muted}`}>Abrila desde MIO para escritorio: ahí la planilla se analiza en tu compu, sin subirla.</p>
        </div>
      </main>
    );
  }

  const bot = (mood: MioPetMood, px: number) => <MioPet2D mood={mood} size={px} showShadow={false} animated />;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-2.5 px-4 py-6 sm:space-y-3 sm:px-6 sm:py-8">
      {dragging && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-mio bg-[#7647eb]/95 text-white">
          <div className="flex items-center gap-6">
            {bot('celebrando', 120)}
            <p className="text-4xl font-extrabold tracking-[-0.04em]">Soltala y la analizo.</p>
          </div>
        </div>
      )}

      {phase.kind === 'inicio' && (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
            <section className={`flex flex-col justify-between rounded-mio p-7 text-white sm:p-10 lg:col-span-8 lg:min-h-[440px] ${slab}`}>
              <div>
                <h1 className="max-w-[14ch] text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] sm:text-6xl">Abrí tu planilla.</h1>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#cfc8f5]">
                  CSV o Excel, tal como está. MIO la limpia, arma los gráficos y proyecta lo que viene con cinco modelos que compiten entre sí.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
                <button type="button" onClick={choose} className={PRIMARY}>
                  <FolderOpen className="h-5 w-5" aria-hidden /> Elegir planilla
                </button>
                <span className="text-sm text-white/70">o soltala en cualquier parte de esta ventana</span>
              </div>
            </section>
            <section className="flex flex-col items-center justify-center gap-5 rounded-mio bg-[#7647eb] p-8 text-white lg:col-span-4">
              {bot('reposo', 210)}
              <p className="max-w-[24ch] text-center text-[15px] leading-snug text-[#ece6ff]">
                Se analiza en esta compu. Tu archivo no se sube a ningún lado ni se modifica.
              </p>
            </section>
          </div>

          {recent.length > 0 && (
            <section className={`rounded-mio p-5 sm:p-7 ${surface}`}>
              <h2 className="text-xl font-extrabold tracking-[-0.03em]">Abiertas hace poco</h2>
              <ul className="mt-4 grid grid-cols-1 gap-1.5 md:grid-cols-2">
                {recent.map((r) => (
                  <li key={r.path}>
                    <button
                      type="button"
                      onClick={() => open(r.path)}
                      className={`group flex w-full items-center gap-4 rounded-mio-sm px-4 py-3 text-left transition-colors duration-150 cursor-pointer ${FOCUS} ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.09]' : 'bg-[#f3f3f5] hover:bg-[#e4dcff]'}`}
                    >
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-[#7647eb]" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">{r.name}</span>
                        <span className={`block truncate font-mono text-[11px] ${muted}`}>{folderOf(r.path)}</span>
                      </span>
                      <span className={`shrink-0 font-mono text-[11px] ${muted}`}>{ago(r.at)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {phase.kind === 'abriendo' && (
        <section className={`flex min-h-[min(560px,75vh)] flex-col items-center justify-center gap-8 rounded-mio p-8 text-center text-white sm:p-12 ${slab}`} aria-live="polite">
          {bot('trabajando', 200)}
          <div className="min-w-0">
            <h1 className="mx-auto max-w-[22ch] text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl [overflow-wrap:anywhere]">Analizando {phase.name}</h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#cfc8f5]">
              La leo entera, la limpio, armo los gráficos y pongo a competir cinco modelos de predicción con tus datos.
            </p>
            <p className="mt-6 font-mono text-sm tabular-nums text-white/70">{seconds} s</p>
          </div>
        </section>
      )}

      {phase.kind === 'error' && (
        <section role="alert" className={`flex flex-col items-start gap-6 rounded-mio p-7 sm:flex-row sm:items-center sm:p-10 ${isDark ? 'bg-[#3a1220] text-[#ffd5dc]' : 'bg-[#ffe3e6] text-[#7a1022]'}`}>
          {bot('anomalia', 120)}
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-[-0.035em]">No pude abrir esta planilla.</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed">{phase.message}</p>
            <button type="button" onClick={choose} className={`${PRIMARY} mt-6`}>
              <FolderOpen className="h-5 w-5" aria-hidden /> Elegir otra planilla
            </button>
          </div>
        </section>
      )}

      {phase.kind === 'listo' && (
        <>
          <ResultHeader phase={phase} busy={reanalyzing} isDark={isDark} onChoose={choose} onAnalyze={reanalyze} surface={surface} muted={muted} />
          <ResultadoMejorado result={phase.result} isDark={isDark} />
        </>
      )}
    </main>
  );
};

/** Lo que se analizó, cómo se leyó y qué otra columna mirar. */
const ResultHeader: React.FC<{
  phase: Extract<Phase, { kind: 'listo' }>;
  busy: boolean;
  isDark: boolean;
  surface: string;
  muted: string;
  onChoose: () => void;
  onAnalyze: (column: string) => void;
}> = ({ phase, busy, isDark, surface, muted, onChoose, onAnalyze }) => {
  const { result, opened } = phase;
  const p = result.profile;
  const columns = [...new Set([result.targetCol, ...p.numericColumns, ...p.categoricalColumns])];
  const facts = [
    size(opened.bytes),
    `${num(p.nRows)} filas`,
    `${p.nCols} columnas`,
    `calidad ${p.qualityScore}/100`,
    opened.filas_titulo > 0 ? `${opened.filas_titulo} filas de título salteadas` : null,
    `analizada en ${num(opened.segundos, 1)} s`,
  ].filter(Boolean);
  return (
    <section className={`rounded-mio p-5 sm:p-7 ${surface}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl [overflow-wrap:anywhere]">{result.filename}</h1>
          <p className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${muted}`}>{facts.join(' · ')}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Lo que se analiza</span>
            <select
              value={result.targetCol}
              disabled={busy}
              onChange={(e) => onAnalyze(e.target.value)}
              className={`min-h-[44px] min-w-[14rem] rounded-mio-sm px-3 text-base font-medium cursor-pointer disabled:opacity-60 ${FOCUS} ${isDark ? 'bg-white/[0.08] text-white' : 'bg-[#f3f3f5] text-zinc-950'}`}
            >
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <button
            type="button"
            onClick={onChoose}
            disabled={busy}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors duration-200 active:scale-[0.97] cursor-pointer disabled:opacity-50 ${FOCUS} ${isDark ? 'bg-white/[0.08] hover:bg-white/[0.16]' : 'bg-[#f3f3f5] hover:bg-[#e4dcff]'}`}
          >
            <FolderOpen className="h-4 w-4" aria-hidden /> {busy ? 'Analizando…' : 'Abrir otra'}
          </button>
        </div>
      </div>
    </section>
  );
};

export default EscritorioPage;
