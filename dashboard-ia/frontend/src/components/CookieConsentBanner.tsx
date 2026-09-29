'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, SlidersHorizontal } from 'lucide-react';

export interface ConsentSettings {
  essential: true;
  preferences: boolean;
  analytics: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'mio_consent_settings';

export function getStoredConsent(): ConsentSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  return consent ? consent.analytics === true : false;
}

export default function CookieConsentBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    setMounted(true);
    const existing = getStoredConsent();
    if (!existing) {
      const timer = setTimeout(() => setShowBanner(true), 800);
      return () => clearTimeout(timer);
    } else {
      setPreferences(existing.preferences ?? true);
      setAnalytics(existing.analytics ?? false);
    }
  }, []);

  useEffect(() => {
    const handleOpenModal = () => {
      const existing = getStoredConsent();
      if (existing) {
        setPreferences(existing.preferences);
        setAnalytics(existing.analytics);
      }
      setShowModal(true);
    };

    window.addEventListener('mio:open-cookie-preferences', handleOpenModal);
    return () => {
      window.removeEventListener('mio:open-cookie-preferences', handleOpenModal);
    };
  }, []);

  const saveSettings = (newSettings: Omit<ConsentSettings, 'essential' | 'timestamp'>) => {
    const consent: ConsentSettings = {
      essential: true,
      preferences: newSettings.preferences,
      analytics: newSettings.analytics,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      window.dispatchEvent(new CustomEvent('mio:consent-updated', { detail: consent }));
    } catch (err) {
      console.warn('Could not save cookie consent:', err);
    }
    setShowBanner(false);
    setShowModal(false);
  };

  const handleAcceptAll = () => {
    saveSettings({ preferences: true, analytics: true });
  };

  const handleRejectNonEssential = () => {
    saveSettings({ preferences: false, analytics: false });
  };

  const handleSaveCustom = () => {
    saveSettings({ preferences, analytics });
  };

  if (!mounted) return null;

  return (
    <>
      {/* 1. Floating Banner on Bottom Left */}
      {showBanner && !showModal && (
        <aside
          aria-label="Aviso de privacidad y cookies"
          className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 max-w-lg w-[calc(100vw-2rem)] z-50 bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-3xl shadow-2xl p-5 sm:p-6 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-[#bdf559]/20 border border-[#bdf559]/40 rounded-2xl shrink-0 text-zinc-950">
              <Cookie className="w-5 h-5 text-emerald-800" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-950 font-sans tracking-tight">
                Control de Privacidad y Cookies
              </h3>
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                Utilizamos almacenamiento local y cookies esenciales para mantener tu sesión segura y operar tus análisis en memoria.{' '}
                <Link
                  href="/cookies"
                  className="font-bold underline text-[#7647eb] hover:text-black focus-visible:ring-2 focus-visible:ring-mio-violet"
                >
                  Conocé más
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono font-bold text-xs rounded-full shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
            >
              Aceptar todas
            </button>
            <button
              onClick={handleRejectNonEssential}
              className="py-2 px-3 bg-zinc-100 hover:bg-zinc-200 text-gray-800 font-semibold text-xs rounded-full transition-all cursor-pointer"
            >
              Solo esenciales
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="py-2 px-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs border border-zinc-200 rounded-full transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="Personalizar preferencias de cookies"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Configurar</span>
            </button>
          </div>
        </aside>
      )}

      {/* 2. Modal for Detailed Configuration */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#bdf559]/20 flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-emerald-800" />
                </div>
                <h2 id="cookie-modal-title" className="text-lg font-bold text-gray-950 font-sans">
                  Preferencias de Almacenamiento
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer text-gray-500"
                aria-label="Cerrar modal de preferencias"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              En MIO protegemos tu privacidad. Podés seleccionar qué tipos de cookies y almacenamiento de datos permitís en tu navegador.
            </p>

            <div className="space-y-3">
              {/* Essential */}
              <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/70 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-950 font-sans">1. Cookies Estrictamente Necesarias</span>
                    <span className="bg-zinc-900 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">Activas</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Requeridas para autenticación de usuario (Firebase Auth), seguridad de sesión y caché local de datasets para operar en el navegador.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  aria-label="Cookies estrictamente necesarias siempre activas"
                  className="w-4 h-4 accent-[#7647eb] mt-1 cursor-not-allowed opacity-80"
                />
              </div>

              {/* Preferences */}
              <div className="border border-zinc-200 rounded-2xl p-4 bg-white flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-950 font-sans">2. Preferencias y Experiencia</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Permite recordar tu configuración de interfaz, filtros por defecto, controles de accesibilidad y sonidos hápticos del motor MIO.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.target.checked)}
                  aria-label="Permitir cookies de preferencias"
                  className="w-4 h-4 accent-[#7647eb] cursor-pointer mt-1"
                />
              </div>

              {/* Analytics */}
              <div className="border border-zinc-200 rounded-2xl p-4 bg-white flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-950 font-sans">3. Telemetría y Diagnóstico Anónimo</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Registra eventos de fallos técnicos y rendimiento de cálculo para ayudarnos a solucionar bugs. Nunca enviamos datos de tus tablas ni información personal.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  aria-label="Permitir telemetría y diagnóstico anónimo"
                  className="w-4 h-4 accent-[#7647eb] cursor-pointer mt-1"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              <button
                onClick={handleRejectNonEssential}
                className="py-2 px-4 rounded-full border border-zinc-200 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-xs transition-all cursor-pointer"
              >
                Rechazar no esenciales
              </button>
              <button
                onClick={handleSaveCustom}
                className="py-2 px-5 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
