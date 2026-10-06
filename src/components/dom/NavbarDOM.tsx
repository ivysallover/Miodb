import React, { useState, useRef, useEffect } from 'react';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { Sun, Moon, Menu, X, ArrowRight, Activity, Layers, LogIn, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { motion, AnimatePresence } from 'framer-motion';
import { playMioDevSound } from '@/lib/sound';
import { DataConsentModal } from '@/components/ui/DataConsentModal';
import { AuthAndWorkspaceModal, WorkspaceModalView } from '@/components/ui/AuthAndWorkspaceModal';
import { apiClient } from '@/lib/apiClient';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebaseAuth';
import { useFounderAuth } from '@/utils/useFounderAuth';

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

  // Founder Authorization state (Tadeo & Milena)
  const { isAuthorized } = useFounderAuth();

  // Auth state
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // File input ref for upload after consent
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        if (user.email) localStorage.setItem('mio_user_email', user.email);
        if (user.displayName) localStorage.setItem('mio_user_name', user.displayName);
      }
    });
    return () => unsub();
  }, []);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const handleSignOut = async () => {
    playMioDevSound('select');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    try {
      await signOut(auth);
    } catch {}
    try {
      localStorage.removeItem('mio_user_email');
      localStorage.removeItem('mio_user_name');
    } catch {}
    setCurrentUser(null);
  };

  const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('mio_user_email') : null;
  const storedName = typeof window !== 'undefined' ? localStorage.getItem('mio_user_name') : null;
  const effectiveEmail = currentUser?.email || storedEmail || '';
  const effectiveName = currentUser?.displayName || storedName || (effectiveEmail ? effectiveEmail.split('@')[0] : '');
  const isLoggedIn = Boolean(currentUser || (effectiveEmail && effectiveEmail.length > 0));
  const userInitial = effectiveName ? effectiveName.charAt(0).toUpperCase() : (effectiveEmail ? effectiveEmail.charAt(0).toUpperCase() : 'U');

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
    try { localStorage.removeItem('mio_active_analysis'); } catch {}
    navigateTo('/dashboard?new=1');
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

      <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none select-none">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 pt-3.5 sm:pt-4 flex items-center justify-between gap-4">
          
          {/* Brand & Editorial Links (Left Floating Island) */}
          <div
            className={`pointer-events-auto flex items-center gap-6 px-3.5 sm:px-4 py-2 rounded-mio border transition-colors duration-300 ${
              isDark
                ? 'bg-[#0e0d16] border-white/[0.08] text-white'
                : 'bg-white border-zinc-200/80 text-zinc-950'
            }`}
          >
            <button
              onClick={() => navigateTo('/')}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none shrink-0"
            >
              {/* 9-Block Pixel Matrix Monogram (Legency Style) */}
              <div className="grid grid-cols-3 gap-0.5 w-5 h-5 shrink-0 group-hover:scale-105 transition-transform">
                {[1, 1, 1, 1, 0, 1, 1, 1, 1].map((val, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-[1px] ${
                      val ? 'bg-[#bdf559]' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`font-mono font-bold text-lg tracking-tight ${
                    isDark ? 'text-white' : 'text-zinc-950'
                  }`}
                >
                  MIO
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
              </div>
            </button>

            {/* Editorial Navigation Links (Desktop Center) */}
            <nav
              className={`hidden xl:flex items-center gap-6 text-xs uppercase tracking-wider font-semibold transition-colors ${
                isDark ? 'text-zinc-400' : 'text-zinc-600'
              }`}
            >
              <button
                onClick={() => handleNavClick('#problema')}
                className={`transition-colors cursor-pointer ${
                  isDark ? 'hover:text-white' : 'hover:text-zinc-950'
                }`}
              >
                El problema
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

          {/* Core Action Suite: Admin + Mis Proyectos + Ingresar + Theme Switch + CTA (Right Floating Island) */}
          <div
            className={`pointer-events-auto flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-mio border transition-colors duration-300 ${
              isDark
                ? 'bg-[#0e0d16] border-white/[0.08] text-white'
                : 'bg-white border-zinc-200/80 text-zinc-950'
            }`}
          >
            
            {/* Admin Badge Button (Exclusive for founders/admins) */}
            {isAuthorized && (
              <button
                type="button"
                onClick={() => navigateTo('/admin')}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-mio-sm text-xs font-mono font-bold transition-all border cursor-pointer ${
                  isDark
                    ? 'bg-[#bdf559]/10 text-[#bdf559] border-[#bdf559]/30 hover:bg-[#bdf559]/20'
                    : 'bg-[#bdf559]/20 text-zinc-950 border-[#bdf559] hover:bg-[#bdf559]/30'
                }`}
                title="Panel Administrativo y Telemetría FastAPI"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}

            {/* Test-Pet Sandbox Button (Exclusive for founders) */}
            {isAuthorized && (
              <button
                type="button"
                onClick={() => navigateTo('/test-pet')}
                className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-mio-sm text-xs font-mono font-bold transition-all border cursor-pointer ${
                  isDark
                    ? 'bg-[#7647eb]/20 text-[#a78bfa] border-[#7647eb]/40 hover:bg-[#7647eb]/30'
                    : 'bg-[#7647eb]/10 text-[#602cd1] border-[#7647eb]/30 hover:bg-[#7647eb]/20'
                }`}
                title="Laboratorio MIO-PET (2D & 3D)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
                <span>TEST-PET</span>
              </button>
            )}

            {/* Mis Proyectos Button */}
            <button
              type="button"
              onClick={() => navigateTo('/projects')}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-mio-sm text-xs font-semibold transition-all border cursor-pointer ${
                isDark
                  ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
              title="Ver análisis y proyectos guardados"
            >
              <Layers className="w-3.5 h-3.5 text-[#7647eb] dark:text-[#a78bfa]" />
              <span>Mis Proyectos</span>
            </button>

            {/* User Account / Ingresar Button */}
            {isLoggedIn ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    playMioDevSound('tick');
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-mio-sm text-xs font-semibold transition-all border cursor-pointer select-none ${
                    isDark
                      ? 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                      : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100'
                  }`}
                  title={`Usuario: ${effectiveName}`}
                >
                  <div className="w-5 h-5 rounded-md bg-[#7647eb] text-white flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                    {userInitial}
                  </div>
                  <span className="max-w-[110px] truncate font-medium">{effectiveName}</span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute right-0 mt-2 w-56 rounded-mio-sm p-2 shadow-xl border backdrop-blur-2xl z-50 ${
                        isDark
                          ? 'bg-[#0e0d16]/95 border-white/10 text-white shadow-black/80'
                          : 'bg-white/95 border-zinc-200 text-zinc-900 shadow-zinc-950/10'
                      }`}
                    >
                      <div className="px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08] mb-1">
                        <div className="text-xs font-bold truncate text-zinc-950 dark:text-white">{effectiveName}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                          {effectiveEmail}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigateTo('/dashboard');
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-mio-sm text-xs font-medium transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <Activity className="w-3.5 h-3.5 text-[#7647eb]" />
                        <span>Workspace AutoML</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigateTo('/projects');
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-mio-sm text-xs font-medium transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-[#bdf559]" />
                        <span>Mis Proyectos</span>
                      </button>

                      <div className="my-1 border-t border-black/[0.06] dark:border-white/[0.08]" />

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-mio-sm text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenWorkspace('login')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-mio-sm text-xs font-semibold transition-all border cursor-pointer ${
                  isDark
                    ? 'border-white/10 text-white hover:bg-white/[0.08]'
                    : 'border-zinc-300 text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}

            {/* Segmented Light / Dark Switch Button */}
            <div
              className={`hidden lg:flex items-center p-0.5 rounded-mio-sm border transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/10'
                  : 'bg-black/[0.04] border-black/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-mio-sm text-xs font-medium transition-all cursor-pointer ${
                  !isDark
                    ? 'bg-white text-zinc-950 font-semibold shadow-xs'
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-mio-sm text-xs font-medium transition-all cursor-pointer ${
                  isDark
                    ? 'bg-zinc-800 text-white font-semibold shadow-xs'
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
                Probar gratis
              </BubbleArrowButton>
            </div>

            {/* Mobile Hamburger Toggle Button with fluid kinetic lines */}
            <button
              type="button"
              onClick={() => {
                playMioDevSound('tick');
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className={`xl:hidden w-9 h-9 rounded-mio-sm border flex items-center justify-center transition-all duration-200 active:scale-[0.95] cursor-pointer ${
                isDark
                  ? 'border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]'
                  : 'border-black/10 bg-black/[0.04] text-zinc-950 hover:bg-black/[0.08]'
              }`}
              aria-label="Alternar menú de navegación"
            >
              <div className="w-5 h-4 relative flex items-center justify-center">
                <span
                  className={`absolute h-0.5 w-4.5 bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    mobileMenuOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-4.5 bg-current rounded-full transition-all duration-200 ${
                    mobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                  }`}
                />
                <span
                  className={`absolute h-0.5 w-4.5 bg-current rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    mobileMenuOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                  }`}
                />
              </div>
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
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 top-20 z-40 bg-black/60 backdrop-blur-md xl:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className={`fixed inset-x-4 top-20 z-50 p-6 rounded-mio border shadow-2xl backdrop-blur-2xl xl:hidden max-h-[85vh] overflow-y-auto ${
                isDark
                  ? 'bg-[#0e0d16]/98 border-white/[0.1] text-white shadow-black/80'
                  : 'bg-white/98 border-zinc-200 text-zinc-950 shadow-zinc-900/10'
              }`}
            >
              <div className="space-y-4">
                {/* Core App Actions Row */}
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('admin')}
                    className="p-2.5 rounded-mio-sm border border-[#bdf559]/30 bg-[#bdf559]/10 text-xs font-mono font-bold flex flex-col items-center gap-1.5 cursor-pointer text-[#bdf559]"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWorkspace('projects')}
                    className={`p-2.5 rounded-mio-sm border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                      isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-200 bg-zinc-50'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#7647eb]" />
                    <span>Proyectos</span>
                  </button>

                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigateTo('/projects');
                      }}
                      className={`p-2.5 rounded-mio-sm border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                        isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-200 bg-zinc-50'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md bg-[#7647eb] text-white flex items-center justify-center text-[10px] font-bold">
                        {userInitial}
                      </div>
                      <span className="truncate max-w-[65px]">{effectiveName}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenWorkspace('login')}
                      className={`p-2.5 rounded-mio-sm border text-xs font-semibold flex flex-col items-center gap-1.5 cursor-pointer ${
                        isDark ? 'border-white/10 bg-white/[0.04]' : 'border-zinc-200 bg-zinc-50'
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Ingresar</span>
                    </button>
                  )}
                </div>

                {/* Mobile User Profile Banner */}
                {isLoggedIn && (
                  <div className="p-3 rounded-mio-sm border border-black/[0.06] dark:border-white/[0.08] bg-zinc-100/70 dark:bg-white/[0.03] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-mio-sm bg-[#7647eb] text-white flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate text-zinc-950 dark:text-white">{effectiveName}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                          {effectiveEmail}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="px-2.5 py-1 rounded-mio-sm text-xs font-semibold text-red-500 hover:bg-red-500/10 border border-red-500/20 cursor-pointer shrink-0"
                    >
                      Salir
                    </button>
                  </div>
                )}

                {/* Section Anchors */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => handleNavClick('#problema')}
                    className={`w-full text-left p-3 rounded-mio-sm text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                    }`}
                  >
                    <span>El problema</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('#como-funciona')}
                    className={`w-full text-left p-3 rounded-mio-sm text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                    }`}
                  >
                    <span>Cómo Funciona (Pipeline)</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick('#quienes-somos')}
                    className={`w-full text-left p-3 rounded-mio-sm text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-zinc-100'
                    }`}
                  >
                    <span>Equipo Fundador</span>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  {isAuthorized && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        navigateTo('/test-pet');
                      }}
                      className={`w-full text-left p-3 rounded-mio-sm text-sm font-mono font-bold flex items-center justify-between transition-colors cursor-pointer border ${
                        isDark
                          ? 'border-[#7647eb]/40 bg-[#7647eb]/15 text-[#a78bfa]'
                          : 'border-[#7647eb]/30 bg-[#7647eb]/10 text-[#602cd1]'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse" />
                        <span>Laboratorio MIO-PET</span>
                      </span>
                      <span className="text-xs opacity-70">2D + 3D →</span>
                    </button>
                  )}
                </div>

                {/* Theme Selector for Mobile */}
                <div className="pt-2 flex items-center justify-between border-t border-black/[0.06] dark:border-white/[0.08]">
                  <span className="text-xs text-zinc-500 font-mono">TEMA VISUAL</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`px-3 py-1 rounded-mio-sm text-xs font-semibold ${
                        !isDark ? 'bg-zinc-950 text-white' : 'text-zinc-400 border border-white/10'
                      }`}
                    >
                      Claro
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`px-3 py-1 rounded-mio-sm text-xs font-semibold ${
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
                    className="w-full py-3.5 px-4 min-h-[48px] rounded-mio-sm bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer"
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
