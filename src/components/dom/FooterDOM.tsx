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
    <footer className="w-full bg-[#5b24c6] text-white select-none relative overflow-hidden">
      
      {/* ==================================================================== */}
      {/* TOP DITHER / PIXEL TEETH BORDER (Exact Tribute to Image 4 Top Edge)   */}
      {/* ==================================================================== */}
      <div
        className="w-full h-3 bg-repeat-x opacity-90"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='12' viewBox='0 0 16 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='8' height='6' fill='%2306040e'/%3E%3Crect x='8' y='6' width='8' height='6' fill='%2306040e'/%3E%3C/svg%3E")`,
          backgroundSize: '16px 12px',
        }}
        aria-hidden="true"
      />

      {/* Main Full-Bleed Content Container */}
      <div className="w-full px-6 sm:px-12 lg:px-20 pt-16 sm:pt-24 pb-12">
        
        {/* Top Grid: Logo + 5 Directory Columns + Location Stamp */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-16 border-b border-white/20">
          
          {/* Brand & Partner Badges Column (4 cols on Desktop) */}
          <div className="md:col-span-3 space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-sans font-black text-4xl sm:text-5xl tracking-tight text-white">
                MIO
              </span>
              {/* 9-Block Pixel Matrix Icon (Exact Legency Tribute from Image 4) */}
              <div className="grid grid-cols-3 gap-0.5 w-6 h-6">
                {[1, 1, 1, 1, 0, 1, 1, 1, 1].map((val, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-[1px] ${
                      val ? 'bg-white' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Partner Certification Badges (Image 4 Style) */}
            <div className="space-y-2.5 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white text-zinc-950 font-sans text-xs font-bold shadow-md">
                <Cpu className="w-4 h-4 text-[#5b24c6]" />
                <span>AutoML Enterprise</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#5b24c6] text-white uppercase font-mono">
                  v2.6
                </span>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-black/40 border border-white/20 text-white font-mono text-xs">
                  <ShieldCheck className="w-4 h-4 text-[#bdf559]" />
                  <span>Isolation Forest Verified</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-white/75 font-normal leading-relaxed max-w-xs pt-1">
              Plataforma de inteligencia de datos autónoma. De planillas crudas a pronósticos y decisiones ejecutivas en segundos.
            </p>
          </div>

          {/* 5 Directory Navigation Columns (Image 4 Exact Layout) */}
          <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 text-sm">
            
            {/* Col 1: Plataforma */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm tracking-tight">Plataforma</h4>
              <ul className="space-y-2 text-xs text-white/80 font-normal">
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer">Ingesta .XLSX / .CSV</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer">Higiene de Datos</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer">Torneo AutoML</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer">Simulador What-If</button></li>
                <li><button onClick={() => handleNavClick('#hero')} className="hover:text-white transition-colors cursor-pointer">Consola MIO-DEV 01</button></li>
              </ul>
            </div>

            {/* Col 2: Algoritmos */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm tracking-tight">Algoritmos</h4>
              <ul className="space-y-2 text-xs text-white/80 font-normal">
                <li><span className="hover:text-white transition-colors">Isolation Forest (&gt;3σ)</span></li>
                <li><span className="hover:text-white transition-colors">LightGBM Regressor</span></li>
                <li><span className="hover:text-white transition-colors">Facebook Prophet</span></li>
                <li><span className="hover:text-white transition-colors">XGBoost v2.0</span></li>
                <li><span className="hover:text-white transition-colors">Valores SHAP Causales</span></li>
              </ul>
            </div>

            {/* Col 3: Soluciones */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm tracking-tight">Soluciones</h4>
              <ul className="space-y-2 text-xs text-white/80 font-normal">
                <li><button onClick={() => handleNavClick('#capacidades')} className="hover:text-white transition-colors cursor-pointer">Previsión de Demanda</button></li>
                <li><button onClick={() => handleNavClick('#capacidades')} className="hover:text-white transition-colors cursor-pointer">Detección de Fugas</button></li>
                <li><button onClick={() => handleNavClick('#capacidades')} className="hover:text-white transition-colors cursor-pointer">Segmentación Clientes</button></li>
                <li><button onClick={() => handleNavClick('#casos-estudio')} className="hover:text-white transition-colors cursor-pointer">Optimización de Stock</button></li>
                <li><button onClick={() => handleNavClick('#capacidades')} className="hover:text-white transition-colors cursor-pointer">Copiloto Directivo</button></li>
              </ul>
            </div>

            {/* Col 4: Industrias */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm tracking-tight">Industrias</h4>
              <ul className="space-y-2 text-xs text-white/80 font-normal">
                <li><span className="hover:text-white transition-colors">Retail &amp; E-commerce</span></li>
                <li><span className="hover:text-white transition-colors">Fintech &amp; Crédito</span></li>
                <li><span className="hover:text-white transition-colors">Logística &amp; Cadena</span></li>
                <li><span className="hover:text-white transition-colors">Salud &amp; Farmacia</span></li>
                <li><span className="hover:text-white transition-colors">B2B SaaS</span></li>
              </ul>
            </div>

            {/* Col 5: Compañía & Ubicación (Image 4 Style) */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm tracking-tight">Compañía</h4>
              <ul className="space-y-2 text-xs text-white/80 font-normal">
                <li><button onClick={() => handleNavClick('#quienes-somos')} className="hover:text-white transition-colors cursor-pointer">Equipo Fundador</button></li>
                <li><button onClick={() => handleNavClick('#hero')} className="hover:text-white transition-colors cursor-pointer">Manifiesto MIO</button></li>
                <li><button onClick={() => handleNavClick('#casos-estudio')} className="hover:text-white transition-colors cursor-pointer">Casos de Estudio</button></li>
                <li><a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn Oficial</a></li>
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub Open Engine</a></li>
              </ul>

              {/* Geographic Stamp (Image 4 Tribute & Rosario Argentina) */}
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse" />
                  <span className="font-mono text-[10px] tracking-widest text-[#bdf559] uppercase font-bold">
                    HQ &amp; DATA ENGINE
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-white leading-tight">
                  Rosario,<br />
                  Argentina
                </div>
                <div className="text-[11px] font-mono text-white/60 pt-1">
                  32°57′S 60°39′O
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Ley de Defensa del Consumidor (Argentina Res. 424/2020 & Res. 271/2020) */}
        <div className="pt-6 pb-2 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-white/90">
            <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="font-mono uppercase font-bold text-[11px] text-white/95 tracking-wide">
              Defensa del Consumidor (Ley 24.240):
            </span>
            <span className="text-white/70 text-xs hidden sm:inline">
              Tenés derecho a revocar la compra dentro de los 10 días o dar de baja el servicio en cualquier momento.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                playMioDevSound('select');
                window.history.pushState({}, '', '/arrepentimiento');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-white font-mono text-xs font-medium transition-all cursor-pointer"
            >
              <span>Baja de Suscripción</span>
            </button>
          </div>
        </div>

        {/* Bottom Legal & Security Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-white/80">
          <div>
            © {new Date().getFullYear()} MIO Inc. Creado con 💚 en Rosario, Argentina.
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
              className="hover:text-[#bdf559] text-white font-medium cursor-pointer transition-colors focus:outline-none flex items-center gap-1.5"
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
