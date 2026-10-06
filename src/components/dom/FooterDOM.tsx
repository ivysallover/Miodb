import React, { useState, useEffect } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { playMioDevSound } from '@/lib/sound';
import { ShieldCheck, Cpu } from 'lucide-react';
import { LegalConsentModal, LegalTab } from '@/components/ui/LegalConsentModal';

export const FooterDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('cookies');

  const handleNavClick = (anchor: string) => {
    playMioDevSound('select');
    scrollTo(anchor);
  };

  const handleOpenLegal = (tab: LegalTab) => {
    playMioDevSound('select');
    setLegalTab(tab);
    setLegalModalOpen(true);
  };

  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      const tab = e.detail?.tab || 'cookies';
      setLegalTab(tab);
      setLegalModalOpen(true);
    };
    const handleCookiePreferences = () => {
      setLegalTab('cookies');
      setLegalModalOpen(true);
    };

    window.addEventListener('mio:open-legal-modal', handleCustomOpen);
    window.addEventListener('mio:open-cookie-preferences', handleCookiePreferences);
    return () => {
      window.removeEventListener('mio:open-legal-modal', handleCustomOpen);
      window.removeEventListener('mio:open-cookie-preferences', handleCookiePreferences);
    };
  }, []);

  return (
    <footer className="w-full bg-[#07070a] text-white select-none relative overflow-hidden border-t border-white/10">
      
      {/* Top Precision Hairline with quiet violet glow */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-[#7647eb]/40 to-transparent" aria-hidden="true" />

      {/* Main Full-Bleed Content Container */}
      <div className="w-full px-6 sm:px-12 lg:px-20 pt-16 sm:pt-24 pb-20">
        
        {/* Top Grid: Logo + 5 Directory Columns + Location Stamp */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-16 border-b border-white/10">
          
          {/* Brand & Partner Badges Column (4 cols on Desktop) */}
          <div className="md:col-span-3 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-sans font-black text-4xl sm:text-5xl tracking-tight text-white">
                MIO
              </span>
              {/* 9-Block Pixel Matrix Icon */}
              <div className="grid grid-cols-3 gap-0.5 w-6 h-6">
                {[1, 1, 1, 1, 0, 1, 1, 1, 1].map((val, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-[1px] ${
                      val ? 'bg-[#bdf559]' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Certification Badges */}
            <div className="space-y-2.5 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-zinc-200 font-mono text-xs shadow-sm">
                <Cpu className="w-4 h-4 text-[#a78bfa]" />
                <span>AutoML In-Memory</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#7647eb]/40 border border-[#7647eb]/60 text-white uppercase font-mono">
                  v2.0
                </span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-zinc-300 font-mono text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#bdf559]" />
                  <span>Isolation Forest Multivariado</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-zinc-400 font-normal leading-relaxed max-w-xs pt-1">
              De planillas crudas a pronósticos claros y decisiones de negocio en segundos.
            </p>
          </div>

          {/* 5 Directory Navigation Columns */}
          <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 text-sm">
            
            {/* Col 1: Plataforma */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Plataforma</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer text-left">Ingesta .XLSX / .CSV</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer text-left">Higiene de Datos</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer text-left">Torneo AutoML</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer text-left">Simulador What-If</button></li>
                <li><button onClick={() => handleNavClick('#hero')} className="hover:text-white transition-colors cursor-pointer text-left">Consola MIO-DEV 01</button></li>
              </ul>
            </div>

            {/* Col 2: Algoritmos */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Algoritmos</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
                <li><span className="hover:text-white transition-colors">Isolation Forest</span></li>
                <li><span className="hover:text-white transition-colors">LightGBM Regressor</span></li>
                <li><span className="hover:text-white transition-colors">Facebook Prophet</span></li>
                <li><span className="hover:text-white transition-colors">XGBoost</span></li>
                <li><span className="hover:text-white transition-colors">Atribución SHAP</span></li>
              </ul>
            </div>

            {/* Col 3: Soluciones */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Soluciones</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
                <li><button onClick={() => handleNavClick('#problema')} className="hover:text-white transition-colors cursor-pointer text-left">Previsión de Demanda</button></li>
                <li><button onClick={() => handleNavClick('#problema')} className="hover:text-white transition-colors cursor-pointer text-left">Detección de Fugas</button></li>
                <li><button onClick={() => handleNavClick('#problema')} className="hover:text-white transition-colors cursor-pointer text-left">Segmentación Clientes</button></li>
                <li><button onClick={() => handleNavClick('#casos-estudio')} className="hover:text-white transition-colors cursor-pointer text-left">Optimización de Stock</button></li>
                <li><button onClick={() => handleNavClick('#problema')} className="hover:text-white transition-colors cursor-pointer text-left">Copiloto Directivo</button></li>
              </ul>
            </div>

            {/* Col 4: Industrias */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Industrias</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
                <li><span className="hover:text-white transition-colors">Retail &amp; E-commerce</span></li>
                <li><span className="hover:text-white transition-colors">Fintech &amp; Crédito</span></li>
                <li><span className="hover:text-white transition-colors">Logística &amp; Cadena</span></li>
                <li><span className="hover:text-white transition-colors">Salud &amp; Farmacia</span></li>
                <li><span className="hover:text-white transition-colors">B2B SaaS</span></li>
              </ul>
            </div>

            {/* Col 5: Compañía & Ubicación */}
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Compañía</h4>
              <ul className="space-y-2.5 text-xs text-zinc-400 font-normal">
                <li><button onClick={() => handleNavClick('#quienes-somos')} className="hover:text-white transition-colors cursor-pointer text-left">Equipo Fundador</button></li>
                <li><button onClick={() => handleNavClick('#hero')} className="hover:text-white transition-colors cursor-pointer text-left">Manifiesto MIO</button></li>
                <li><button onClick={() => handleNavClick('#casos-estudio')} className="hover:text-white transition-colors cursor-pointer text-left">Casos de Estudio</button></li>
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn Oficial</a></li>
                <li><a href="https://github.com/milena-abraham/dashboard-ia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub Open Engine</a></li>
              </ul>

              {/* Geographic Stamp (Rosario Argentina) */}
              <div className="pt-4 border-t border-white/10 mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse" />
                  <span className="font-mono text-[10px] tracking-widest text-[#bdf559] uppercase font-bold">
                    HQ &amp; DATA ENGINE
                  </span>
                </div>
                <div className="text-lg font-bold font-sans tracking-tight text-white leading-tight">
                  Rosario,<br />
                  Argentina
                </div>
                <div className="text-[11px] font-mono text-zinc-400 pt-1">
                  32°57′S 60°39′O
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Ley de Defensa del Consumidor (Argentina Ley 24.240 & Disp. 954/2025) */}
        <div className="pt-8 pb-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-zinc-300">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shrink-0" />
              <div>
                <span className="font-mono uppercase font-bold text-[11px] text-zinc-100 tracking-wide mr-2">
                  Defensa del Consumidor (Ley 24.240 &amp; Disp. 954/2025):
                </span>
                <span className="text-zinc-400 text-xs">
                  Tenés derecho a revocar la contratación dentro de los 10 días o dar de baja el servicio cuando quieras.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  playMioDevSound('select');
                  window.history.pushState({}, '', '/arrepentimiento');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Botón de Arrepentimiento</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playMioDevSound('select');
                  window.history.pushState({}, '', '/arrepentimiento?tipo=baja');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 hover:text-white font-mono text-xs font-medium transition-all cursor-pointer"
              >
                <span>Baja de Suscripción</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Security Bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-zinc-400">
          <div className="font-mono text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
            <span>© {new Date().getFullYear()} MIO Technologies</span>
            <span className="text-zinc-600">•</span>
            <span>Fundado por Tadeo Muñoz Garcés &amp; Milena Abraham</span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
              Rosario, Santa Fe, Argentina
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => {
                playMioDevSound('select');
                window.history.pushState({}, '', '/privacidad');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-white cursor-pointer transition-colors focus:outline-none"
            >
              Política de Privacidad
            </button>
            <button
              type="button"
              onClick={() => {
                playMioDevSound('select');
                window.history.pushState({}, '', '/terminos');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-white cursor-pointer transition-colors focus:outline-none"
            >
              Términos y Condiciones
            </button>
            <button
              type="button"
              onClick={() => {
                playMioDevSound('select');
                window.history.pushState({}, '', '/dpa');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-white cursor-pointer transition-colors focus:outline-none"
            >
              DPA (B2B)
            </button>
            <button
              type="button"
              onClick={() => {
                playMioDevSound('select');
                window.history.pushState({}, '', '/aviso-legal');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="hover:text-white cursor-pointer transition-colors focus:outline-none"
            >
              Aviso Legal &amp; Auditoría
            </button>
            <button
              type="button"
              onClick={() => handleOpenLegal('cookies')}
              className="hover:text-[#bdf559] text-zinc-300 font-medium cursor-pointer transition-colors focus:outline-none flex items-center gap-1.5"
            >
              <span>Elección de Cookies</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
            </button>
          </div>
        </div>

      </div>

      {/* Global Interactive Legal & Cookies Modal */}
      <LegalConsentModal
        isOpen={legalModalOpen}
        initialTab={legalTab}
        onClose={() => setLegalModalOpen(false)}
      />
    </footer>
  );
};

export default FooterDOM;
