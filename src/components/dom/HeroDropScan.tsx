import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { playMioDevSound } from '@/lib/sound';
import { quickScan, type QuickScan } from '@/lib/quickScan';
import { nudgePet } from '@/components/dom/HeroLiveDemo';

const fmtInt = (n: number) => n.toLocaleString('es-AR');
const fmtPct = (f: number) => (f * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' %';
const fmtTimes = (t: number) => t.toLocaleString('es-AR', { maximumFractionDigits: 1 });

interface Result {
  name: string;
  scan: QuickScan | null;
  error?: string;
}

/**
 * Drop a CSV anywhere on the landing and MIO reads it in the hero, right there: how big it is, what
 * is missing and which value sits far from the rest. It is read in the browser and never uploaded.
 * The full diagnosis (prediction, why) is the dashboard's job and the card says so.
 */
export const HeroDropScan: React.FC<{ className?: string }> = ({ className = '' }) => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const { scrollTo } = useSmoothScroll();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const depth = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const read = useCallback(
    async (file: File) => {
      const lower = file.name.toLowerCase();
      setBusy(true);
      scrollTo('#hero', { offset: 0, duration: 0.8 });
      playMioDevSound('select');
      nudgePet('trabajando', 1500);

      let next: Result;
      if (!/\.(csv|tsv|txt)$/.test(lower)) {
        next = {
          name: file.name,
          scan: null,
          error: 'Esta vista previa lee CSV. Los .xlsx los lee el análisis completo.',
        };
      } else {
        try {
          // First 3 MB: enough to know the sheet, light enough to be instant.
          const text = await file.slice(0, 3_000_000).text();
          const scan = quickScan(text);
          next = scan
            ? { name: file.name, scan }
            : { name: file.name, scan: null, error: 'No pude leer filas y columnas en ese archivo.' };
          if (scan && file.size > 3_000_000) scan.truncated = true;
        } catch {
          next = { name: file.name, scan: null, error: 'No pude abrir ese archivo.' };
        }
      }

      // A short beat, so the reading is felt before the answer lands.
      window.setTimeout(() => {
        setResult(next);
        setBusy(false);
        const found = (next.scan?.oddCount ?? 0) > 0;
        playMioDevSound(found ? 'shockwave' : 'buttonA');
        nudgePet(found ? 'anomalia' : 'celebrando', 2200);
      }, 900);
    },
    [scrollTo]
  );

  // Window-wide drop target. Only reacts to real files being dragged.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) void read(f);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [read]);

  const goFull = () => {
    playMioDevSound('select');
    try {
      localStorage.removeItem('mio_active_analysis');
    } catch {
      /* private mode */
    }
    window.history.pushState({}, '', '/dashboard?new=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const card = isDark ? 'bg-[#0e0d16] text-white border border-white/10' : 'bg-white text-zinc-950 border border-zinc-200';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const scan = result?.scan;
  const top = scan?.odd[0];

  return (
    <>
      {/* The invitation: a quiet line under the hero actions, usable without a drag. */}
      <div className={className}>
        <input
          ref={input}
          type="file"
          accept=".csv,.tsv,.txt,text/csv"
          className="sr-only"
          aria-label="Elegir un CSV para que MIO lo mire en tu navegador"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`text-left font-mono text-[11px] leading-snug underline underline-offset-4 decoration-1 cursor-pointer transition-colors ${
            isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-950'
          }`}
        >
          Soltá un CSV en cualquier parte y MIO lo mira acá, sin subirlo.
        </button>
      </div>

      {/* Full-screen target while a file is being dragged */}
      {dragging && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-[#3d1f8a]/85"
        >
          <div className="mio-pop rounded-mio border-2 border-dashed border-[#bdf559] px-10 py-8 text-center text-white">
            <p className="text-3xl font-extrabold tracking-[-0.03em] sm:text-5xl">Soltalo y MIO lo mira.</p>
            <p className="mt-2 font-mono text-xs text-white/75">Se lee en tu navegador. No se sube.</p>
          </div>
        </div>
      )}

      {/* Reading */}
      {busy && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[110] flex justify-center px-3" role="status">
          <span className="mio-pop rounded-full bg-[#0b0914] px-5 py-3 font-mono text-xs text-white mio-caret">
            MIO está leyendo tu planilla
          </span>
        </div>
      )}

      {/* Answer */}
      {result && !busy && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[110] flex justify-center px-3">
        <div
          role="dialog"
          aria-label="Lo que MIO vio en tu planilla"
          className={`pointer-events-auto w-[min(94vw,640px)] rounded-mio p-5 sm:p-6 mio-pop ${card}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-mono text-[11px] font-bold text-[#7647eb] dark:text-[#a78bfa]">{result.name}</p>
              <p className={`font-mono text-[11px] ${muted}`}>Leído en tu navegador. No salió de tu computadora.</p>
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              aria-label="Cerrar"
              className={`-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg leading-none cursor-pointer ${
                isDark ? 'hover:bg-white/10' : 'hover:bg-zinc-100'
              }`}
            >
              ×
            </button>
          </div>

          {scan ? (
            <>
              <p className="mt-3 text-2xl font-extrabold tracking-[-0.035em] sm:text-3xl">
                {fmtInt(scan.rows)}
                {scan.truncated ? '+' : ''} filas, {scan.cols} columnas.
              </p>
              <ul className={`mt-3 space-y-1.5 text-base leading-snug ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                <li>
                  {scan.missing < 0.001
                    ? 'No le faltan datos.'
                    : `Le falta el ${fmtPct(scan.missing)} de los datos.`}
                </li>
                {scan.oddCount === 0 ? (
                  <li>No vi valores que se salgan de lo normal en las columnas con números.</li>
                ) : (
                  <li>
                    Vi <strong>{scan.oddCount}</strong> {scan.oddCount === 1 ? 'valor que se sale' : 'valores que se salen'} de lo normal
                    {top ? (
                      <>
                        : el más raro está en la fila {fmtInt(top.row + 1)} de <strong>{top.column}</strong>, unas{' '}
                        {fmtTimes(top.times)} veces lo habitual.
                      </>
                    ) : null}
                  </li>
                )}
              </ul>
              <p className={`mt-3 text-sm ${muted}`}>
                Esto es una primera mirada. Qué viene y por qué lo explica el análisis completo.
              </p>
            </>
          ) : (
            <p className="mt-3 text-lg leading-snug">{result.error}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={goFull}
              className="min-h-[44px] rounded-full bg-[#bdf559] px-5 text-sm font-bold text-black cursor-pointer transition-transform duration-150 active:scale-[0.97]"
            >
              Ver el diagnóstico completo
            </button>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className={`text-sm font-medium underline underline-offset-4 cursor-pointer ${muted}`}
            >
              Probar con otro archivo
            </button>
          </div>
        </div>
        </div>
      )}
    </>
  );
};

export default HeroDropScan;
