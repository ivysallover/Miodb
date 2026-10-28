import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Loader2, X } from 'lucide-react';
import { desktop } from './desktop';
import { FOCUS, PRIMARY, muted, surface } from './ui';

/**
 * Si hay una versión nueva de la app publicada, un aviso abajo a la izquierda para instalarla (se baja,
 * se comprueba su firma y la app se vuelve a abrir). Se mira una vez al entrar; sin conexión no dice nada.
 */
export const Actualizacion: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [version, setVersion] = useState<string | null>(null);
  const [state, setState] = useState<'esperando' | 'instalando' | { error: string }>('esperando');
  useEffect(() => {
    desktop.checkUpdate().then(setVersion, () => undefined);
  }, []);
  if (!version) return null;

  const install = () => {
    setState('instalando');
    desktop.update().catch((e) => setState({ error: String(e?.message || e) }));
  };
  return (
    <motion.div
      role="status"
      data-no-print
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed bottom-4 left-4 z-50 flex max-w-md items-center gap-3 rounded-mio py-3 pl-4 pr-2 shadow-[0_12px_32px_-12px_rgba(11,9,20,0.35)] ${surface(isDark)}`}
    >
      <p className="min-w-0 text-sm">
        {typeof state === 'object' ? (
          <span className={muted(isDark)}>{state.error}</span>
        ) : (
          <>
            Hay una versión nueva de MIO: <strong className="font-bold">{version}</strong>.
          </>
        )}
      </p>
      <button type="button" onClick={install} disabled={state === 'instalando'} className={`${PRIMARY} min-h-[40px] shrink-0 px-4 text-sm`}>
        {state === 'instalando' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
        {state === 'instalando' ? 'Instalando…' : 'Actualizar'}
      </button>
      <button type="button" onClick={() => setVersion(null)} aria-label="Después" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
};
