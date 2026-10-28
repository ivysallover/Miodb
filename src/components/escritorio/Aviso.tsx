import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FolderSearch, TriangleAlert, X } from 'lucide-react';
import { desktop, fileName } from './desktop';
import type { Notice } from './useSaving';
import { FOCUS, muted, soft, surface } from './ui';

/** El aviso de abajo: qué se guardó (con "Mostrar en la carpeta"), que se copió el resumen o qué salió mal. Se va solo. */
export const Aviso: React.FC<{ notice: Notice; isDark: boolean; onClose: () => void }> = ({ notice, isDark, onClose }) => {
  const saved = notice.kind === 'guardado';
  const ok = notice.kind !== 'error';
  const Icon = ok ? CheckCircle2 : TriangleAlert;
  return (
    <motion.div
      role={ok ? 'status' : 'alert'}
      data-no-print
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
      className={`fixed bottom-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-mio py-3 pl-4 pr-2 shadow-[0_12px_32px_-12px_rgba(11,9,20,0.35)] ${surface(isDark)}`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${ok ? 'text-[#7647eb]' : 'text-[#c0264a]'}`} aria-hidden />
      <p className="min-w-0 text-sm">
        {notice.kind === 'guardado' && (
          <>
            Guardado: <strong className="font-bold [overflow-wrap:anywhere]">{fileName(notice.path)}</strong>
          </>
        )}
        {notice.kind === 'copiado' && 'Copié el resumen: pegalo en un mail.'}
        {notice.kind === 'error' && <span className={muted(isDark)}>{notice.message}</span>}
      </p>
      {saved && (
        <button type="button" onClick={() => desktop.reveal(notice.path)} className={`${soft(isDark)} min-h-[36px] shrink-0 px-3`}>
          <FolderSearch className="h-4 w-4" aria-hidden /> Mostrar
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Cerrar el aviso" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
};
