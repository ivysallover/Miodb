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

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-mio-sm bg-white/[0.05] border border-white/10 text-zinc-200 font-mono text-xs">
              <ShieldCheck className="w-4 h-4 text-[#bdf559]" />
              <span>Tus datos no se guardan</span>
            </div>

            <p className="text-xs text-zinc-400 font-normal leading-relaxed max-w-xs pt-1">
              De planillas crudas a decisiones claras, en castellano.
            </p>
          </div>

          {/* 5 Directory Navigation Columns */}
          <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            
            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Producto</h4>
              <ul className="space-y-2.5 text-sm text-zinc-300 font-normal">
                <li><button onClick={() => handleNavClick('#ejemplo')} className="hover:text-white transition-colors cursor-pointer text-left min-h-[32px]">Ver un ejemplo</button></li>
                <li><button onClick={() => handleNavClick('#como-funciona')} className="hover:text-white transition-colors cursor-pointer text-left min-h-[32px]">Cómo funciona</button></li>
                <li><button onClick={() => handleNavClick('#casos-estudio')} className="hover:text-white transition-colors cursor-pointer text-left min-h-[32px]">La prueba</button></li>
                <li><button onClick={() => handleNavClick('#dudas')} className="hover:text-white transition-colors cursor-pointer text-left min-h-[32px]">Dudas</button></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Nosotros</h4>
              <ul className="space-y-2.5 text-sm text-zinc-300 font-normal">
                <li><button onClick={() => handleNavClick('#quienes-somos')} className="hover:text-white transition-colors cursor-pointer text-left min-h-[32px]">El equipo</button></li>
              </ul>
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">Hecho en</h4>
              <div className="text-2xl font-bold tracking-tight text-white leading-tight">Rosario,<br />Argentina</div>
            </div>

          </div>

        </div>

        {/* Ley de Defensa del Consumidor (Argentina Ley 24.240 & Disp. 954/2025) */}
        <div className="pt-8 pb-4">
          <div className="p-4 sm:p-5 rounded-mio bg-white/[0.02] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                className="px-3.5 py-1.5 rounded-mio-sm bg-red-500/90 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
                className="px-3 py-1.5 rounded-mio-sm bg-white/10 hover:bg-white/20 border border-white/20 text-zinc-200 hover:text-white font-mono text-xs font-medium transition-all cursor-pointer"
              >
                <span>Baja de Suscripción</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Security Bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-zinc-400">
          <div className="font-mono text-[11px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
            <span>© {new Date().getFullYear()} MIO</span>
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
      {/* Closing field: the wordmark at full size, with the one action inside it */}
      <div className="relative overflow-hidden bg-[#3d1f8a]">
        <div aria-hidden="true" className="pointer-events-none select-none text-center font-climate leading-[0.8] text-[#bdf559] text-[34vw] sm:text-[30vw] pt-[6vw] -mb-[5vw]">
          MIO
        </div>
        <div className="absolute inset-x-0 bottom-[9vw] sm:bottom-[7vw] flex justify-center px-6">
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem('mio_active_analysis'); } catch {}
              window.history.pushState({}, '', '/dashboard?new=1');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="group inline-flex min-h-[52px] items-center gap-3 rounded-full bg-[#0b0914] px-7 text-base font-semibold text-white transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer"
          >
            Probar con mi planilla
            <span aria-hidden className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default FooterDOM;
