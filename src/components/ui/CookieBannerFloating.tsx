import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, Settings, X } from 'lucide-react';
import { playMioDevSound } from '@/lib/sound';
import { useMioStore } from '@/utils/useMioStore';

const STORAGE_KEY = 'mio_consent_settings';

/**
 * Proactive floating cookie banner that appears automatically on first visit
 * when no consent settings are found in localStorage.
 * Compliant with GDPR/ePrivacy: no non-essential cookies until explicit consent.
 */
export const CookieBannerFloating: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner after a short delay if no consent has been given
    const timer = setTimeout(() => {
      try {
        const existing = localStorage.getItem(STORAGE_KEY);
        if (!existing) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }, 1200);

    // Listen for consent updates to dismiss
    const handleConsentUpdate = () => setVisible(false);
    window.addEventListener('mio:consent-updated', handleConsentUpdate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mio:consent-updated', handleConsentUpdate);
    };
  }, []);

  const saveConsent = (preferences: boolean, analytics: boolean) => {
    playMioDevSound('select');
    const consent = {
      essential: true,
      preferences,
      analytics,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      window.dispatchEvent(new CustomEvent('mio:consent-updated', { detail: consent }));
    } catch (e) {
      console.warn('Could not save cookie consent:', e);
    }
    setVisible(false);
  };

  const handleAcceptAll = () => saveConsent(true, true);
  const handleRejectNonEssential = () => saveConsent(false, false);
  const handleConfigure = () => {
    playMioDevSound('tick');
    setVisible(false);
    // Open the full legal modal on the cookies tab
    window.dispatchEvent(
      new CustomEvent('mio:open-legal-modal', { detail: { tab: 'cookies' } })
    );
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] sm:max-w-md"
        >
          <div
            className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${
              isDark
                ? 'bg-[#0e0c19]/95 border-white/10 text-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.85)]'
                : 'bg-white/95 border-black/10 text-zinc-950 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.2)]'
            }`}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setVisible(false)}
              className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors cursor-pointer ${
                isDark
                  ? 'text-zinc-500 hover:text-white hover:bg-white/10'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-black/5'
              }`}
              aria-label="Cerrar banner de cookies"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-[#bdf559]/15 text-[#bdf559] flex items-center justify-center shrink-0 border border-[#bdf559]/25">
                <Cookie className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">
                  Tu Privacidad Importa
                </h4>
                <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Ley 25.326 & RGPD
                </p>
              </div>
            </div>

            {/* Body text */}
            <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Utilizamos cookies estrictamente necesarias para la autenticación y el funcionamiento de la plataforma.
              Puedes aceptar cookies opcionales de preferencias y telemetría, rechazarlas o configurar tu elección.
            </p>

            {/* Guarantees */}
            <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <Shield className="w-3 h-3" />
              <span>Sin píxeles publicitarios · Sin rastreo de terceros</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#bdf559] text-black hover:bg-[#c8ff6a] active:scale-[0.97] transition-all cursor-pointer shadow-neo-sm"
              >
                Aceptar todas
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isDark
                    ? 'border-white/15 text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                    : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                Solo esenciales
              </button>
              <button
                type="button"
                onClick={handleConfigure}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}
              >
                <Settings className="w-3 h-3" />
                <span>Configurar</span>
              </button>
            </div>

            {/* Legal links */}
            <div className={`mt-3 pt-3 border-t flex items-center justify-center gap-4 text-[10px] ${
              isDark ? 'border-white/[0.06] text-zinc-500' : 'border-zinc-200 text-zinc-400'
            }`}>
              <button
                type="button"
                onClick={() => {
                  const navigateTo = (path: string) => {
                    window.history.pushState({}, '', path);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  };
                  navigateTo('/privacidad');
                }}
                className="hover:underline cursor-pointer"
              >
                Política de Privacidad
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => {
                  const navigateTo = (path: string) => {
                    window.history.pushState({}, '', path);
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  };
                  navigateTo('/cookies');
                }}
                className="hover:underline cursor-pointer"
              >
                Política de Cookies
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBannerFloating;
