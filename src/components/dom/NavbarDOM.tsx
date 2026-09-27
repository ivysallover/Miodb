import React, { useState, useRef } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { Sun, Moon, Menu, X, ArrowRight, Activity, Layers, LogIn } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { motion, AnimatePresence } from 'framer-motion';
import { playMioDevSound } from '@/lib/sound';
import { DataConsentModal } from '@/components/ui/DataConsentModal';
import { AuthAndWorkspaceModal, WorkspaceModalView } from '@/components/ui/AuthAndWorkspaceModal';
import { apiClient } from '@/lib/apiClient';

export const NavbarDOM: React.FC = () => {
  const { scrollTo } = useSmoothScroll();
  const theme = useMioStore((s) => s.theme);
  const setTheme = useMioStore((s) => s.setTheme);
  const isDark = theme === 'dark';
  
  // State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceModalView>('admin');
  
  // File input ref for upload after consent
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    setMobileMenuOpen(false);
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleNavClick = (targetId: string) => {
    playMioDevSound('select');
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/' + targetId);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else {
      scrollTo(targetId);
    }
  };

  const handleOpenWorkspace = (view: WorkspaceModalView) => {
    playMioDevSound('select');
    setMobileMenuOpen(false);
    setWorkspaceView(view);
    setWorkspaceModalOpen(true);
  };

  const handleInitiateIngest = () => {
    navigateTo('/dashboard');
  };

  React.useEffect(() => {
    const handleGlobalConsent = () => {
      setConsentModalOpen(true);
    };
    window.addEventListener('mio:open-consent-modal', handleGlobalConsent);
    return () => window.removeEventListener('mio:open-consent-modal', handleGlobalConsent);
  }, []);

  const handleConsentAccepted = () => {
    setConsentModalOpen(false);
    // Trigger OS native file picker for spreadsheets
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    playMioDevSound('buttonA');
    // Scroll to pipeline section so the user sees the telemetry
    scrollTo('#como-funciona');

    try {
      // Send file to FastAPI /api/analyze endpoint
      const res = await apiClient.analyzeFile(file);
      if (res) {
        try {
          localStorage.setItem('mio_active_analysis', JSON.stringify(res));
        } catch {}
      }
    } catch (err: any) {
      console.warn('Analysis error:', err);
    } finally {
      // Clear file input so the user can re-upload same file if desired
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      {/* Hidden File Input for Data Ingestion */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv, .xlsx, .xls, .json"
        onChange={handleFileSelected}
        className="hidden"
        aria-hidden="true"
      />

      <header
        className={`sticky top-0 z-50 w-full backdrop-blur-xl border-b select-none transition-colors duration-300 ${
          isDark
            ? 'bg-[#07070a]/90 border-white/[0.08] text-white'
            : 'bg-[#fbfbfd]/90 border-black/[0.08] text-zinc-950'
        }`}
      >
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between gap-4">
          
          {/* Brand / Logo (Left) */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigateTo('/')}
              className="flex items-center gap-3 group cursor-pointer focus:outline-none shrink-0"
            >
              <div
                className={`w-8 h-8 flex items-center justify-center font-mono font-bold text-sm rounded-lg transition-transform group-hover:scale-105 ${
                  isDark
                    ? 'bg-gradient-to-br from-[#7647eb] to-[#5b24c6] text-white shadow-[0_0_15px_rgba(118,71,235,0.4)]'
                    : 'bg-zinc-950 text-white'
                }`}
              >
                M
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-mono font-bold text-xl tracking-tight ${
                    isDark ? 'text-white' : 'text-zinc-950'
                  }`}
                >
                  MIO
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
              </div>
            </button>

            {/* Editorial Navigation Links (Desktop Center) */}
            <nav
              className={`hidden xl:flex items-center gap-7 text-sm font-medium transition-colors ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              <button
                onClick={() => handleNavClick('#capacidades')}
                className={`transition-colors cursor-pointer ${
                  isDark ? 'hover:text-white' : 'hover:text-zinc-950'
                }`}
              >
                Capacidades
              </button>
              <button
                onClick={() => handleNavClick('#como-funciona')}
                className={`transition-colors cursor-pointer ${
                  isDark ? 'hover:text-white' : 'hover:text-zinc-950'
                }`}
              >
                Cómo Funciona
              </button>
              <button
                onClick={() => handleNavClick('#quienes-somos')}
                className={`transition-colors cursor-pointer ${
                  isDark ? 'hover:text-white' : 'hover:text-zinc-950'
                }`}
              >
                Equipo
              </button>
            </nav>
          </div>

          {/* Core Action Suite: Admin + Mis Proyectos + Ingresar + Theme Switch + CTA */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            
            {/* Admin Badge Button */}
            <button
              type="button"
              onClick={() => navigateTo('/admin')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border cursor-pointer ${
                isDark
                  ? 'bg-[#bdf559]/10 text-[#bdf559] border-[#bdf559]/30 hover:bg-[#bdf559]/20'
                  : 'bg-[#bdf559]/20 text-zinc-950 border-[#bdf559] hover:bg-[#bdf559]/30 shadow-sm'
              }`}
              title="Panel Administrativo y Telemetría FastAPI"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>

            {/* Mis Proyectos Button */}
            <button
              type="button"
              onClick={() => navigateTo('/projects')}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                isDark
                  ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
              }`}
              title="Ver análisis y proyectos guardados"
            >
              <Layers className="w-3.5 h-3.5 text-[#7647eb] dark:text-[#a78bfa]" />
              <span>Mis Proyectos</span>
            </button>

            {/* Ingresar Button */}
            <button
              type="button"
              onClick={() => handleOpenWorkspace('login')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                isDark
                  ? 'border-white/10 text-white hover:bg-white/[0.08]'
                  : 'border-zinc-300 text-zinc-900 hover:bg-zinc-100 shadow-sm'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar</span>
            </button>

            {/* Segmented Light / Dark Switch Button */}
            <div
              className={`hidden lg:flex items-center p-1 rounded-full border transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/10'
                  : 'bg-black/[0.04] border-black/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-white text-zinc-950 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                aria-label="Activar modo claro"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden xl:inline">Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
                aria-label="Activar modo oscuro"
              >
                <Moon className="w-3.5 h-3.5 text-[#bdf559]" />
                <span className="hidden xl:inline">Oscuro</span>
              </button>
            </div>

            {/* Primary Desktop CTA: Iniciar Ingesta directly scrolling to Studio */}
            <div className="hidden sm:block">
              <BubbleArrowButton
                size="sm"
                variant="primary"
                onClick={handleInitiateIngest}
              >
                Iniciar Ingesta
              </BubbleArrowButton>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => {
                playMioDevSound('tick');
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`xl:hidden p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'border-white/10 bg-white/[0.04] text-white'
                  : 'border-black/10 bg-black/[0.04] text-zinc-950'
              }`}
              aria-label="Abrir menú móvil"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-20 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`fixed inset-x-0 top-20 z-50 p-6 border-b shadow-2xl backdrop-blur-2xl xl:hidden max-h-[85vh] overflow-y-auto ${
                isDark
                  ? 'bg-[#0b0914]/98 border-white/[0.1] text-white'
                  : 'bg-white/98 border-zinc-200 text-zinc-950'
              }`}
            >
              <div className="space-y-4">
                {/* Core App Actions Row */}
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('admin')}
                    className="p-2.5 rounded-xl border border-[#bdf559]/30 bg-[#bdf559]/10 text-xs font-mono font-bold flex flex-col items-center gap-1.5 cursor-pointer text-[#bdf559]"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('projects')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                      isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#7647eb]" />
                    <span>Proyectos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('login')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                      isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar</span>
                  </button>
                </div>

                {/* Section Anchors */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('#capacidades')}
                    className={`w-full text-left p-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                    }`}
                  >
                    <span>Capacidades del Motor</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('#como-funciona')}
                    className={`w-full text-left p-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                    }`}
                  >
                    <span>Cómo Funciona (Pipeline)</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('#quienes-somos')}
                    className={`w-full text-left p-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                    }`}
                  >
                    <span>Equipo Fundador</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>

                {/* Theme Selector for Mobile */}
                <div className="pt-2 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-xs text-zinc-500 font-mono">TEMA VISUAL</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        !isDark ? 'bg-zinc-950 text-white' : 'text-zinc-400 border border-white/10'
                      }`}
                    >
                      Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        isDark ? 'bg-white text-zinc-950' : 'text-zinc-600 border border-black/10'
                      }`}
                    >
                      Oscuro
                    </button>
                  </div>
                </div>

                {/* Mobile CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playMioDevSound('select');
                      setMobileMenuOpen(false);
                      scrollTo('#estudio-analisis');
                    }}
                    className="w-full py-3.5 px-4 min-h-[48px] rounded-xl bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                  >
                    <span>CARGAR PLANILLA / INICIAR INGESTA</span>
                    <ArrowRight className="w-4 h-4 text-[#bdf559]" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pop-up Modal de Consentimiento de Ingesta */}
      <DataConsentModal
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        onAccept={handleConsentAccepted}
      />

      {/* Modal / Consola de Workspace (Admin, Mis Proyectos, Login) */}
      <AuthAndWorkspaceModal
        isOpen={workspaceModalOpen}
        view={workspaceView}
        onClose={() => setWorkspaceModalOpen(false)}
        onOpenView={(v) => setWorkspaceView(v)}
      />
    </>
  );
};

export default NavbarDOM;
