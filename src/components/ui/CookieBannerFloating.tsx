import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
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

  const go = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const btn = 'min-h-[44px] rounded-full px-4 text-xs font-bold transition-all active:scale-[0.97] cursor-pointer whitespace-nowrap';

  // A low strip, not a card: the hero (headline, demo, button) stays fully visible behind it.
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Preferencias de cookies"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-3 z-[9999] sm:inset-x-6 sm:bottom-5 lg:left-auto lg:right-6 lg:max-w-[46rem]"
        >
          <div
            className={`flex flex-col gap-3 rounded-mio p-3.5 sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
              isDark
                ? 'bg-[#17142a] text-white shadow-[0_18px_40px_-12px_rgba(0,0,0,0.8)]'
                : 'bg-white text-zinc-950 shadow-[0_18px_40px_-12px_rgba(11,9,20,0.25)]'
            }`}
          >
            <p className={`min-w-0 flex-1 text-xs leading-snug ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
              <strong className={`font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>Cookies: vos elegís.</strong>{' '}
              Usamos las necesarias para que el sitio ande; las de medición, solo si aceptás. Sin publicidad ni rastreo de terceros.{' '}
              <button type="button" onClick={() => go('/cookies')} className="underline underline-offset-2 hover:no-underline cursor-pointer">Más info</button>
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={handleAcceptAll} className={`${btn} flex-1 bg-[#7647eb] text-white hover:bg-[#602cd1] sm:flex-none`}>
                Aceptar
              </button>
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className={`${btn} flex-1 sm:flex-none ${isDark ? 'bg-white/[0.1] text-white hover:bg-white/[0.18]' : 'bg-[#0b0914] text-white hover:bg-[#1d1933]'}`}
              >
                Solo esenciales
              </button>
              <button
                type="button"
                onClick={handleConfigure}
                aria-label="Configurar cookies"
                className={`${btn} flex items-center justify-center gap-1.5 ${isDark ? 'bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/[0.12]' : 'bg-[#f3f3f5] text-zinc-700 hover:bg-[#e4dcff] hover:text-zinc-950'}`}
              >
                <Settings className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Configurar</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBannerFloating;
