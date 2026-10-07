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
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-[9999] sm:max-w-sm"
        >
          <div
            className={`rounded-mio p-4 sm:p-5 ${
              isDark
                ? 'bg-[#17142a] text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]'
                : 'bg-white text-zinc-950 shadow-[0_18px_40px_-12px_rgba(11,9,20,0.25)]'
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
            <div className="flex items-center gap-3 mb-2 sm:mb-3">
              <div className="hidden sm:flex w-9 h-9 rounded-mio-sm bg-[#e4dcff] text-[#7647eb] items-center justify-center shrink-0 dark:bg-[#2a1766] dark:text-[#bdf559]">
                <Cookie className="w-4.5 h-4.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight">
                  Cookies: vos elegís
                </h4>
                <p className={`hidden sm:block text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  Ley 25.326 & RGPD
                </p>
              </div>
            </div>

            {/* Body text */}
            <p className={`text-xs leading-relaxed mb-3 sm:mb-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              Usamos las cookies necesarias para que el sitio funcione.
              <span className="hidden sm:inline"> Las opcionales (preferencias y medición de uso) las podés aceptar, rechazar o configurar.</span>
              <span className="sm:hidden"> Las opcionales las decidís vos.</span>
            </p>

            {/* Guarantees */}
            <div className={`hidden sm:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider mb-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <Shield className="w-3 h-3" />
              <span>Sin píxeles publicitarios · Sin rastreo de terceros</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-row gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 min-h-[44px] px-3 rounded-full text-xs font-bold bg-[#7647eb] text-white hover:bg-[#602cd1] active:scale-[0.97] transition-all cursor-pointer"
              >
                Aceptar todas
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className={`flex-1 min-h-[44px] px-3 rounded-full text-xs font-bold active:scale-[0.97] transition-all cursor-pointer ${
                  isDark
                    ? 'bg-white/[0.1] text-white hover:bg-white/[0.18]'
                    : 'bg-[#0b0914] text-white hover:bg-[#1d1933]'
                }`}
              >
                Solo esenciales
              </button>
              <button
                type="button"
                onClick={handleConfigure}
                aria-label="Configurar cookies"
                className={`min-h-[44px] px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isDark
                    ? 'bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.12]'
                    : 'bg-[#f3f3f5] text-zinc-700 hover:bg-[#e4dcff] hover:text-zinc-950'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Configurar</span>
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
