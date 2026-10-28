import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { compact, desktop, num, type Rows } from './desktop';
import { FOCUS, muted, slab, soft } from './ui';

/** Una celda como texto para la tabla. */
const show = (v: unknown) => (v == null ? '' : typeof v === 'number' ? v.toLocaleString('es-AR', { maximumFractionDigits: 2 }) : String(v).replace(/ 00:00:00$/, ''));

/**
 * "Ver las filas" de un hallazgo: las filas de la planilla detrás de cada valor que compara (por
 * ejemplo, las dos sucursales de "Dónde está la diferencia"), con cuántas son y cuánto suman. Se pide al
 * motor, que tiene la planilla en esta compu. Se cierra con Esc o tocando afuera.
 */
export const Filas: React.FC<{ column: string; values: string[]; target: string; isDark: boolean; onClose: () => void }> = ({ column, values, target, isDark, onClose }) => {
  const [rows, setRows] = useState<Rows | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    desktop.rows(column, values, target).then(setRows, (e) => setError(String(e?.message || e)));
  }, [column, values, target]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const group = rows?.grupos[tab];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b0914]/40 p-3 sm:items-center" data-no-print onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Las filas de ${column}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className={`flex max-h-[85vh] w-full max-w-5xl flex-col rounded-mio p-5 sm:p-7 ${slab(isDark)}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">De dónde sale</h2>
            <p className={`mt-1 text-sm ${muted(isDark)}`}>Las filas de tu planilla, ya limpia, según «{column}».</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {error && <p className="mt-6 text-base">{error}</p>}
        {!rows && !error && (
          <p className={`mt-6 flex items-center gap-2 text-base ${muted(isDark)}`}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Buscando las filas…
          </p>
        )}
        {rows && group && (
          <>
            <div role="tablist" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {rows.grupos.map((g, i) => (
                <button
                  key={g.valor}
                  type="button"
                  role="tab"
                  aria-selected={i === tab}
                  onClick={() => setTab(i)}
                  className={`rounded-mio-sm p-4 text-left transition-colors duration-200 cursor-pointer ${FOCUS} ${i === tab ? 'bg-[#7647eb] text-white' : isDark ? 'bg-white/[0.06] hover:bg-white/[0.1]' : 'bg-[#f3f3f5] hover:bg-[#e9e3ff]'}`}
                >
                  <span className="block truncate text-lg font-extrabold">{g.valor}</span>
                  <span className={`block text-sm ${i === tab ? 'text-white/80' : muted(isDark)}`}>
                    {num(g.filas)} {g.filas === 1 ? 'fila' : 'filas'}{g.suma != null && ` · ${rows.objetivo} suma ${compact(g.suma)}`}
                  </span>
                </button>
              ))}
            </div>
            <div className={`mt-3 min-h-0 flex-1 overflow-auto rounded-mio-sm ${isDark ? 'bg-white/[0.04]' : 'bg-[#f3f3f5]'}`}>
              <table className="w-full border-separate border-spacing-0 text-left text-[13px]">
                <thead className={`sticky top-0 ${isDark ? 'bg-[#1c1735]' : 'bg-[#e9e3ff]'}`}>
                  <tr>
                    {rows.columnas.map((c) => (
                      <th key={c} scope="col" className={`whitespace-nowrap px-3 py-2 font-bold ${c === rows.columna || c === rows.objetivo ? 'text-[#7647eb]' : ''}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.muestra.map((r, i) => (
                    <tr key={i} className={i % 2 ? (isDark ? 'bg-white/[0.03]' : 'bg-white/60') : ''}>
                      {r.map((v, j) => (
                        <td key={j} className={`whitespace-nowrap px-3 py-1.5 ${typeof v === 'number' ? 'text-right tabular-nums' : ''}`}>{show(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm ${muted(isDark)}`}>
                {group.filas > group.muestra.length ? `Las primeras ${num(group.muestra.length)} de ${num(group.filas)}. Todas están en la planilla limpia (Exportar → Excel).` : group.filas === 0 ? 'Ninguna fila tiene este valor.' : 'Todas las filas.'}
              </p>
              <button type="button" onClick={onClose} className={soft(isDark)}>Cerrar</button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
