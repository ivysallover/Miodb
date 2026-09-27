import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cookie, Shield, FileText, Scale, Check } from 'lucide-react';
import { playMioDevSound } from '@/lib/sound';
import { useMioStore } from '@/utils/useMioStore';

export type LegalTab = 'cookies' | 'terminos' | 'privacidad' | 'legal';

interface LegalConsentModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

const STORAGE_KEY = 'mio_consent_settings';

export const LegalConsentModal: React.FC<LegalConsentModalProps> = ({
  isOpen,
  initialTab = 'cookies',
  onClose,
}) => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  // Cookie settings state (exact MIO schema)
  const [preferencesCookies, setPreferencesCookies] = useState(true);
  const [analyticsCookies, setAnalyticsCookies] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setPreferencesCookies(parsed.preferences ?? true);
          setAnalyticsCookies(parsed.analytics ?? false);
        }
      } catch (e) {
        console.warn('Error reading cookie preferences', e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveCookieSettings = (prefs: boolean, analytics: boolean) => {
    playMioDevSound('select');
    const consent = {
      essential: true,
      preferences: prefs,
      analytics: analytics,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
      window.dispatchEvent(new CustomEvent('mio:consent-updated', { detail: consent }));
    } catch (e) {
      console.warn('Could not save cookie consent:', e);
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleTabChange = (tab: LegalTab) => {
    playMioDevSound('tick');
    setActiveTab(tab);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
          aria-hidden="true"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl z-10 flex flex-col max-h-[88vh] overflow-hidden ${
            isDark
              ? 'bg-[#0c0a17] border-white/10 text-white'
              : 'bg-white border-zinc-200 text-zinc-950'
          }`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#7647eb]/15 text-[#7647eb] dark:text-[#a78bfa] flex items-center justify-center font-mono font-bold text-xs">
                §
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">Centro de Legales & Privacidad MIO</h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  Rosario, Santa Fe, República Argentina • Cumplimiento Normativo Vigente
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                playMioDevSound('tick');
                onClose();
              }}
              className={`p-2 rounded-full border transition-colors cursor-pointer ${
                isDark ? 'border-white/10 hover:bg-white/[0.08]' : 'border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="px-6 pt-4 border-b border-black/[0.06] dark:border-white/[0.08] flex gap-2 sm:gap-4 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => handleTabChange('cookies')}
              className={`pb-3 px-2 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'cookies'
                  ? 'border-[#7647eb] text-[#7647eb] dark:text-[#a78bfa]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Cookie className="w-3.5 h-3.5" />
              <span>Gestión de Cookies</span>
            </button>

            <button
              onClick={() => handleTabChange('privacidad')}
              className={`pb-3 px-2 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'privacidad'
                  ? 'border-[#7647eb] text-[#7647eb] dark:text-[#a78bfa]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacidad &amp; Datos</span>
            </button>

            <button
              onClick={() => handleTabChange('terminos')}
              className={`pb-3 px-2 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'terminos'
                  ? 'border-[#7647eb] text-[#7647eb] dark:text-[#a78bfa]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Términos del Servicio</span>
            </button>

            <button
              onClick={() => handleTabChange('legal')}
              className={`pb-3 px-2 border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'legal'
                  ? 'border-[#7647eb] text-[#7647eb] dark:text-[#a78bfa]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Aviso Legal &amp; Rosario</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm leading-relaxed flex-1">
            {/* TAB: COOKIES */}
            {activeTab === 'cookies' && (
              <div className="space-y-5">
                <div>
                  <h4 className="font-bold text-base mb-1">Preferencias y Consentimiento de Cookies</h4>
                  <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                    MIO no utiliza cookies de rastreo publicitario invasivo ni comercializa tus identificadores. Podés configurar qué categorías habilitar a continuación:
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Esenciales */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">Cookies Técnicas Esenciales</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                          Siempre Activas
                        </span>
                      </div>
                      <p className={`text-xs mt-1 max-w-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Imprescindibles para mantener la sesión segura, prevenir ataques CSRF y sostener la conexión del motor WebGL / Web Audio.
                      </p>
                    </div>
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Preferencias de UI */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div>
                      <span className="font-bold text-sm">Preferencias de Experiencia (Sonido &amp; Tema)</span>
                      <p className={`text-xs mt-1 max-w-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Almacenan tu elección de modo oscuro/claro, preferencias auditivas y accesibilidad para no tener que reconfigurarlas en cada visita.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferencesCookies}
                      onChange={(e) => setPreferencesCookies(e.target.checked)}
                      className="w-5 h-5 rounded text-[#7647eb] focus:ring-[#7647eb] cursor-pointer"
                    />
                  </div>

                  {/* Analítica */}
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div>
                      <span className="font-bold text-sm">Telemetría de Rendimiento del Motor</span>
                      <p className={`text-xs mt-1 max-w-lg ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        Métricas anónimas de tiempo de cómputo y consumo de memoria RAM del navegador para optimizar los shaders y el pipeline predictivo.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={analyticsCookies}
                      onChange={(e) => setAnalyticsCookies(e.target.checked)}
                      className="w-5 h-5 rounded text-[#7647eb] focus:ring-[#7647eb] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Cookie Actions */}
                <div className="pt-4 flex flex-wrap items-center justify-end gap-3 border-t border-black/[0.06] dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => saveCookieSettings(false, false)}
                    className={`px-4 py-2 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                      isDark ? 'border-white/10 hover:bg-white/[0.06]' : 'border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    Solo Esenciales
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCookieSettings(true, true)}
                    className="px-4 py-2 rounded-full bg-[#bdf559] hover:bg-[#a6e63a] text-zinc-950 font-mono text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-sm"
                  >
                    Aceptar Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCookieSettings(preferencesCookies, analyticsCookies)}
                    className="px-5 py-2.5 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-transform active:scale-95 cursor-pointer shadow-md"
                  >
                    {saveSuccess ? '✓ Guardado' : 'Guardar Preferencias'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB: PRIVACIDAD */}
            {activeTab === 'privacidad' && (
              <div className="space-y-4">
                <h4 className="font-bold text-base">Política de Privacidad y Protección de Datos</h4>
                <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                  En cumplimiento con la <strong>Ley de Protección de Datos Personales N° 25.326 de la República Argentina</strong> y los estándares de minimización de datos del RGPD europeo:
                </p>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs uppercase font-mono text-[#7647eb] dark:text-[#a78bfa]">1. Tratamiento Efímero en Memoria</h5>
                    <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Los datasets importados (.xlsx, .csv) son procesados por el backend analítico únicamente en memoria volátil para ejecutar el aislamiento Isolation Forest y el torneo AutoML.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs uppercase font-mono text-[#7647eb] dark:text-[#a78bfa]">2. No Uso en Reentrenamiento Público</h5>
                    <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      MIO garantiza que ningún registro comercial, financiero o confidencial provisto por el usuario se utiliza para alimentar o reentrenar modelos fundacionales públicos de terceros.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs uppercase font-mono text-[#7647eb] dark:text-[#a78bfa]">3. Derechos de Acceso y Supresión (ARCO)</h5>
                    <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      El usuario tiene el derecho inalienable de solicitar la purga instantánea de cualquier archivo o registro de análisis de la plataforma en cualquier momento desde su panel de proyectos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TERMINOS */}
            {activeTab === 'terminos' && (
              <div className="space-y-4">
                <h4 className="font-bold text-base">Términos y Condiciones del Motor MIO</h4>
                <p className={isDark ? 'text-zinc-400' : 'text-zinc-600'}>
                  Al interactuar con la plataforma y utilizar el motor AutoML MIO-OS, aceptas los siguientes términos operativos:
                </p>
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs uppercase font-mono text-[#7647eb] dark:text-[#a78bfa]">1. Naturaleza de los Pronósticos</h5>
                    <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Las predicciones, valores SHAP y bandas de incertidumbre provistas son herramientas de asistencia probabilística y modelado estadístico cuantitativo. No constituyen asesoramiento financiero o legal vinculante.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs uppercase font-mono text-[#7647eb] dark:text-[#a78bfa]">2. Propiedad de los Modelos y Reportes</h5>
                    <p className={`text-xs ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Los reportes ejecutivos exportados y los pesos de modelos entrenados sobre tus datasets son de tu exclusiva titularidad y propiedad.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: LEGAL & ROSARIO */}
            {activeTab === 'legal' && (
              <div className="space-y-4">
                <h4 className="font-bold text-base">Aviso Legal, Titularidad &amp; Jurisdicción</h4>
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="font-mono text-xs font-bold text-[#7647eb] dark:text-[#a78bfa]">
                    MIO TECHNOLOGIES // OPERACIONES REGISTRADAS
                  </div>
                  <div className="text-sm font-bold">
                    Rosario, Provincia de Santa Fe, República Argentina
                  </div>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    Centro de innovación y analítica de datos aplicada a la industria productiva, agroexportadora y tecnológica nacional.
                  </p>
                  <div className="text-[11px] font-mono text-zinc-500 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                    Coordenadas: 32°57′00″S 60°39′00″O • Servidores federados con encriptación TLS 1.3
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LegalConsentModal;
