import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, ExternalLink, Link2, Loader2, Trash2, X } from 'lucide-react';
import { myShares, share, sharePath, unshare, type Expiry, type Share } from '@/lib/compartir';
import { Segmented } from './Segmented';
import { WEB, desktop } from './desktop';
import { FOCUS, PRIMARY, lilac, muted, slab, soft } from './ui';

const day = (d: Date | null) => (d ? d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '');
const message = (e: unknown) => {
  const code = (e as { code?: string })?.code;
  if (code === 'permission-denied') return 'Tu cuenta no puede compartir todavía. Si recién la creaste, verificá el mail y probá de nuevo.';
  if (code === 'unavailable') return 'No hay conexión. Compartir necesita internet.';
  return String((e as Error)?.message || e);
};

/**
 * Compartir el análisis que se está mirando: se sube el resultado (no la planilla) y queda un enlace que se
 * abre en la web, solo para mirar. Antes de subir se dice qué sale de la compu; abajo, los enlaces de la
 * cuenta, para dejar de compartirlos.
 */
export const Compartir: React.FC<{
  uid: string;
  /** El análisis como lo devolvió el motor. */
  analisis: unknown;
  nombre: string;
  columna: string;
  isDark: boolean;
  onClose: () => void;
}> = ({ uid, analisis, nombre, columna, isDark, onClose }) => {
  const [rows, setRows] = useState(false);
  const [days, setDays] = useState<Expiry>(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [links, setLinks] = useState<Share[] | null>(null);

  const refresh = useCallback(() => myShares(uid).then(setLinks, () => setLinks([])), [uid]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = (id: string) => navigator.clipboard.writeText(`${WEB}${sharePath(id)}`).then(() => setCopied(id), () => setError('No pude copiar el enlace: seleccionalo y copialo a mano.'));

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = await share(uid, { analisis, nombre, columna, filas: rows, dias: days });
      setMade(id);
      await copy(id);
      refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await unshare(id);
      if (made === id) setMade(null);
      setLinks((all) => all?.filter((l) => l.id !== id) ?? null);
    } catch (e) {
      setError(message(e));
    }
  };

  const row = 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6';
  const icon = `rounded-full p-2.5 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-white'}`;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pal-ink/40 p-3" data-no-print onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Compartir el análisis"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className={`max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-mio p-6 sm:p-8 ${slab(isDark)}`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Compartir el análisis</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className={`mt-3 text-[15px] leading-relaxed ${muted(isDark)}`}>
          Se sube el resultado de «{columna}» a tu cuenta de MIO y queda un enlace para abrirlo en el navegador, solo para mirar. La planilla no se sube. Lo abre cualquiera que tenga el enlace, sin cuenta.
        </p>

        {made ? (
          <div className={`mt-6 rounded-mio-sm p-5 ${lilac(isDark)}`} aria-live="polite">
            <p className="flex items-center gap-2 text-[15px] font-bold">
              <Check className="h-5 w-5 text-pal-violet" aria-hidden /> {copied === made ? 'Enlace creado y copiado.' : 'Enlace creado.'}
            </p>
            <p className="mt-2 select-all break-all font-mono text-[13px]">{WEB}{sharePath(made)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(made)} className={soft(isDark)}><Copy className="h-4 w-4" aria-hidden /> Copiar</button>
              <button type="button" onClick={() => desktop.openWeb(sharePath(made))} className={soft(isDark)}><ExternalLink className="h-4 w-4" aria-hidden /> Abrirlo</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-5">
              <div className={row}>
                <div>
                  <p className="text-[15px] font-bold">Qué se sube</p>
                  <p className={`text-[13px] ${muted(isDark)}`}>
                    {rows ? 'También hasta 300 filas de la planilla: los registros fuera de lo normal y otros para comparar.' : 'Totales, gráficos y nombres de categorías (clientes, productos). Ninguna fila entera.'}
                  </p>
                </div>
                <div className="shrink-0">
                  <Segmented label="Qué se sube" group="compartir-filas" value={rows ? 1 : 0} isDark={isDark} onChange={(v) => setRows(v === 1)} options={[{ id: 0, label: 'Sin filas' }, { id: 1, label: 'Con filas' }]} />
                </div>
              </div>
              <div className={row}>
                <p className="text-[15px] font-bold">El enlace vence</p>
                <div className="shrink-0">
                  <Segmented label="Cuándo vence el enlace" group="compartir-vence" value={days ?? 0} isDark={isDark} onChange={(v) => setDays(v === 0 ? null : (v as Expiry))} options={[{ id: 7, label: 'En 7 días' }, { id: 30, label: 'En 30 días' }, { id: 0, label: 'No vence' }]} />
                </div>
              </div>
            </div>
            <button type="button" onClick={create} disabled={busy} className={`${PRIMARY} mt-7 w-full justify-center`}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Link2 className="h-5 w-5" aria-hidden />} Crear el enlace
            </button>
          </>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-bold text-[#c2334d]">{error}</p>}

        {links && links.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-extrabold tracking-[-0.02em]">Tus enlaces</h3>
            <ul className="mt-3 space-y-1.5">
              {links.map((l) => {
                const expired = !!l.vence && l.vence.getTime() < Date.now();
                return (
                  <li key={l.id} className={`flex items-center gap-2 rounded-mio-sm py-2 pl-4 pr-2 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{l.nombre} · {l.columna}</p>
                      <p className={`text-[12px] ${muted(isDark)}`}>
                        {day(l.creado)} · {expired ? 'venció' : l.vence ? `vence el ${day(l.vence)}` : 'no vence'} · {l.filas ? 'con filas' : 'sin filas'}
                      </p>
                    </div>
                    {!expired && (
                      <button type="button" onClick={() => copy(l.id)} aria-label={`Copiar el enlace de ${l.nombre}`} title="Copiar el enlace" className={icon}>
                        {copied === l.id ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      </button>
                    )}
                    <button type="button" onClick={() => remove(l.id)} aria-label={`Dejar de compartir ${l.nombre}`} title="Dejar de compartir" className={icon}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className={`mt-3 text-[13px] ${muted(isDark)}`}>Dejar de compartir borra el análisis de la web: el enlace deja de abrir.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};
