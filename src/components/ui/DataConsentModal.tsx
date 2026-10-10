import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Cpu, FileCheck, X, ArrowRight } from 'lucide-react';
import { playMioDevSound } from '@/lib/sound';
import { useMioStore } from '@/utils/useMioStore';

interface DataConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const DataConsentModal: React.FC<DataConsentModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [agreed, setAgreed] = useState(false);
  const [rememberPreference, setRememberPreference] = useState(true);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!agreed) return;
    playMioDevSound('buttonA');
    if (rememberPreference) {
      try {
        localStorage.setItem('mio_data_consent_granted', 'true');
        localStorage.setItem('mio_data_consent_date', new Date().toISOString());
      } catch (e) {
        console.warn('Could not store consent preference', e);
      }
    }
    onAccept();
  };

  const handleCancel = () => {
    playMioDevSound('tick');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleCancel}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          aria-hidden="true"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-xl rounded-mio border p-6 sm:p-8 shadow-2xl z-10 select-none overflow-hidden ${
            isDark
              ? 'bg-[#0e0c19]/95 border-white/10 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)]'
              : 'bg-white/95 border-black/10 text-zinc-950 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
        >
          {/* Subtle top indicator bar */}
          <div className="w-12 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-6 opacity-60" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleCancel}
            className={`absolute top-6 right-6 p-2 rounded-full border transition-colors cursor-pointer ${
              isDark
                ? 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                : 'border-black/10 text-zinc-600 hover:text-zinc-950 hover:bg-black/[0.04]'
            }`}
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-mio bg-[#7647eb]/15 text-[#7647eb] dark:text-[#a78bfa] flex items-center justify-center shrink-0 border border-[#7647eb]/20 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase mb-1.5 bg-[#bdf559]/15 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
                <span>Protocolo de Confidencialidad & Cumplimiento</span>
              </div>
              <h3 id="consent-title" className="text-xl sm:text-2xl font-bold tracking-tight">
                Consentimiento de Ingesta y Seguridad de Datos
              </h3>
            </div>
          </div>

          {/* Body guarantees */}
          <div className="space-y-3.5 mb-6 text-xs sm:text-sm">
            <p className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>
              Antes de transferir tu archivo al motor MIO, confirmamos las garantías técnicas bajo las que opera el análisis:
            </p>

            <div className="space-y-2.5 pt-1">
              <div
                className={`p-3.5 rounded-mio border flex items-start gap-3 ${
                  isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <Cpu className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Aislamiento en Memoria Volátil (RAM)</h4>
                  <p className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    El pipeline AutoML y la detección de anomalías se ejecutan en memoria efímera sin persistencia secundaria permanente no autorizada.
                  </p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-mio border flex items-start gap-3 ${
                  isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <Lock className="w-4 h-4 text-[#bdf559] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Cero Reentrenamiento de Modelos Públicos</h4>
                  <p className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Tus métricas, ventas o datos sensibles jamás se comparten con terceros ni se utilizan para alimentar LLMs o modelos fundacionales compartidos.
                  </p>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-mio border flex items-start gap-3 ${
                  isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <FileCheck className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Cumplimiento Normativo (Ley 25.326 &amp; RGPD)</h4>
                  <p className={`text-[11px] leading-relaxed mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Adhesión a principios de minimización de datos, anonimización algorítmica y derecho a la eliminación inmediata de sesiones.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Checkbox */}
          <div className="space-y-3 pt-2 pb-6 border-t border-b border-black/[0.06] dark:border-white/[0.08]">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  playMioDevSound('tick');
                  setAgreed(e.target.checked);
                }}
                className="mt-1 w-4 h-4 rounded border-zinc-400 text-[#7647eb] focus:ring-[#7647eb] cursor-pointer"
              />
              <span className={`text-xs leading-snug font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Declaro contar con autorización para procesar este conjunto de datos y acepto los{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('mio:open-legal-modal', { detail: { tab: 'terminos' } }));
                  }}
                  className="underline text-[#7647eb] dark:text-[#a78bfa] font-bold hover:opacity-80"
                >
                  Términos de Servicio
                </button>{' '}
                y la{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('mio:open-legal-modal', { detail: { tab: 'privacidad' } }));
                  }}
                  className="underline text-[#7647eb] dark:text-[#a78bfa] font-bold hover:opacity-80"
                >
                  Política de Privacidad
                </button>
                .
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer pl-7">
              <input
                type="checkbox"
                checked={rememberPreference}
                onChange={(e) => {
                  playMioDevSound('tick');
                  setRememberPreference(e.target.checked);
                }}
                className="w-3.5 h-3.5 rounded border-zinc-400 text-[#7647eb] focus:ring-[#7647eb] cursor-pointer"
              />
              <span className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                Recordar mi consentimiento en este navegador durante 30 días
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/10 text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
              }`}
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={!agreed}
              onClick={handleConfirm}
              className={`w-full sm:w-auto px-6 py-3 rounded-full text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                agreed
                  ? 'bg-[#7647eb] hover:bg-[#6335d8] text-white shadow-[0_4px_20px_rgba(118,71,235,0.4)] active:scale-95'
                  : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
              }`}
            >
              <span>ACEPTAR Y SELECCIONAR PLANILLA</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#bdf559]" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DataConsentModal;
