import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, X } from 'lucide-react';
import { desktop } from './desktop';
import { FOCUS, PRIMARY, muted, soft, surface } from './ui';

/** Lo nuevo, de las líneas que escribe `desktop/novedades.md`: las que empiezan con "- " son puntos. */
const lines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => ({ item: l.startsWith('- '), text: l.replace(/^- /, '') }));

/**
 * Si hay una versión nueva de la app publicada, una tarjeta abajo a la izquierda con qué trae y el botón
 * para instalarla (se baja, se comprueba su firma y la app se vuelve a abrir). Se mira una vez al
 * entrar; sin conexión no dice nada. "Después" la guarda hasta la próxima vez que se abra la app.
 */
export const Actualizacion: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [update, setUpdate] = useState<{ version: string; novedades: string | null } | null>(null);
  const [state, setState] = useState<'esperando' | 'instalando' | { error: string }>('esperando');
  useEffect(() => {
    desktop.checkUpdate().then(setUpdate, () => undefined);
  }, []);
  if (!update) return null;

  const install = () => {
    setState('instalando');
    desktop.update().catch((e) => setState({ error: String(e?.message || e) }));
  };
  const news = lines(update.novedades ?? '');
  return (
    <motion.section
      role="status"
      aria-label="Versión nueva"
      data-no-print
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed bottom-4 left-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-mio p-5 shadow-[0_16px_40px_-16px_rgba(11,9,20,0.4)] ${surface(isDark)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-bold ${muted(isDark)}`}>Versión nueva</p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-[-0.02em]">MIO {update.version}</h2>
        </div>
        <button type="button" onClick={() => setUpdate(null)} aria-label="Después" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {news.length > 0 && (
        <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-sm leading-relaxed">
          <p className="font-bold">Qué hay de nuevo</p>
          <ul className="space-y-1">
            {news.map((l, i) => (
              <li key={i} className={l.item ? 'flex gap-2' : muted(isDark)}>
                {l.item && <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#7647eb]" />}
                <span>{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {typeof state === 'object' && <p className="mt-3 text-sm text-[#c0264a]">{state.error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={install} disabled={state === 'instalando'} className={`${PRIMARY} min-h-[44px] px-5 text-sm`}>
          {state === 'instalando' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {state === 'instalando' ? 'Instalando…' : 'Actualizar'}
        </button>
        <button type="button" onClick={() => setUpdate(null)} disabled={state === 'instalando'} className={soft(isDark)}>Después</button>
      </div>
      <p className={`mt-3 text-xs ${muted(isDark)}`}>Tus proyectos y ajustes quedan como están. La app se vuelve a abrir sola.</p>
    </motion.section>
  );
};
