import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, FileText, ScrollText, Sparkles, X } from 'lucide-react';
import { CampoLogo } from './CampoLogo';
import { Segmented } from './Segmented';
import type { PrintKind } from './useImpresion';
import type { Brand, Palette } from './usePreferences';
import { FOCUS, PRIMARY, field, muted, slab } from './ui';

/**
 * Antes de hacer el PDF: el logo y el nombre de la empresa que van arriba, los colores, y si va el informe
 * entero o el resumen de una página. Lo elegido se guarda en esta compu (es lo mismo que en Ajustes).
 */
export const ExportarPdf: React.FC<{
  brand: Brand;
  onBrand: (b: Brand) => void;
  palette: Palette;
  onPalette: (p: Palette) => void;
  kind: PrintKind;
  onKind: (k: PrintKind) => void;
  isDark: boolean;
  onExport: () => void;
  onClose: () => void;
}> = ({ brand, onBrand, palette, onPalette, kind, onKind, isDark, onExport, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const row = 'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pal-ink/40 p-3" data-no-print onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Exportar en PDF"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className={`w-full max-w-xl rounded-mio p-6 sm:p-8 ${slab(isDark)}`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Exportar en PDF</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <div className={row}>
            <p className="text-[15px] font-bold">Qué va</p>
            <Segmented label="Qué va en el PDF" group="pdf-tipo" value={kind} isDark={isDark} onChange={onKind} options={[{ id: 'informe', label: 'Informe entero', icon: FileText }, { id: 'resumen', label: 'Una página', icon: ScrollText }]} />
          </div>
          <div className={row}>
            <p className="text-[15px] font-bold">Colores</p>
            <Segmented label="Colores del PDF" group="pdf-paleta" value={palette} isDark={isDark} onChange={onPalette} options={[{ id: 'marca', label: 'MIO', icon: Sparkles }, { id: 'sobria', label: 'Sobria', icon: Briefcase }]} />
          </div>
          <label className={row}>
            <span className="text-[15px] font-bold">Empresa</span>
            <input value={brand.empresa} onChange={(e) => onBrand({ ...brand, empresa: e.target.value })} placeholder="Tu empresa" className={`${field(isDark)} w-full sm:w-72`} />
          </label>
          <div className={row}>
            <div>
              <p className="text-[15px] font-bold">Logo o imagen</p>
              <p className={`text-[13px] ${muted(isDark)}`}>Va arriba, en la primera hoja.</p>
            </div>
            <CampoLogo logo={brand.logo} onChange={(logo) => onBrand({ ...brand, logo })} isDark={isDark} />
          </div>
        </div>

        <button type="button" onClick={onExport} className={`${PRIMARY} mt-7 w-full justify-center`}>
          <FileText className="h-5 w-5" aria-hidden /> Hacer el PDF
        </button>
        <p className={`mt-3 text-center text-[13px] ${muted(isDark)}`}>Se abre el diálogo de impresión: elegí "Guardar como PDF".</p>
      </motion.div>
    </div>
  );
};
