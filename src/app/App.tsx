import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { SmoothScrollProvider } from './providers/SmoothScrollProvider';
import { NavbarDOM } from '@/components/dom/NavbarDOM';
import { HeroDOM } from '@/components/dom/HeroDOM';
import { HeroStageDOM } from '@/components/dom/HeroStageDOM';
import { PoderCorporativoDOM } from '@/components/dom/PoderCorporativoDOM';
import { FullBleedCaseStudyDOM } from '@/components/dom/FullBleedCaseStudyDOM';
import { ComoFuncionaDOM } from '@/components/dom/ComoFuncionaDOM';
import { DitherFigureTransitionDOM } from '@/components/dom/DitherFigureTransitionDOM';
import { QuienesSomosDOM } from '@/components/dom/QuienesSomosDOM';
import { CtaBannerDOM } from '@/components/dom/CtaBannerDOM';
import { FooterDOM } from '@/components/dom/FooterDOM';
import { AnalogGrainOverlay } from '@/components/ui/AnalogGrainOverlay';
import { LusionCanvas } from '@/components/canvas/LusionCanvas';
import { useMioStore } from '@/utils/useMioStore';

// Code-Splitting: Lazy-loaded Application Pages (Zero initial bundle drag for landing)
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const AdminPage = lazy(() => import('@/pages/AdminPage'));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const TestPetPage = lazy(() => import('@/pages/TestPetPage'));

// Code-Splitting: Lazy-loaded Legal & Compliance Pages
const TerminosPage = lazy(() => import('@/pages/TerminosPage'));
const PrivacidadPage = lazy(() => import('@/pages/PrivacidadPage'));
const CookiesPage = lazy(() => import('@/pages/CookiesPage'));
const AvisoLegalPage = lazy(() => import('@/pages/AvisoLegalPage'));
const DpaPage = lazy(() => import('@/pages/DpaPage'));
const ArrepentimientoPage = lazy(() => import('@/pages/ArrepentimientoPage'));

// Sleek Brand-Compliant Hardware Module Loader
const RouteSuspenseFallback: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  return (
    <div
      className={`min-h-[50vh] flex items-center justify-center font-mono text-xs tracking-widest uppercase transition-colors select-none ${
        isDark ? 'text-[#bdf559]' : 'text-[#7647eb]'
      }`}
    >
      <div className={`flex items-center gap-2.5 px-4 py-2 border rounded-none ${
        isDark ? 'border-[#bdf559]/30 bg-[#0e0c19]' : 'border-[#7647eb]/30 bg-white'
      }`}>
        <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
        <span>MIO // CARGANDO MÓDULO...</span>
      </div>
    </div>
  );
};

// Compliance Components
import { CookieBannerFloating } from '@/components/ui/CookieBannerFloating';
import { LegalConsentModal, type LegalTab } from '@/components/ui/LegalConsentModal';

// Interactive Companion Component (Option B)
import { MioFloatingCompanion } from '@/components/pet/MioFloatingCompanion';

export const App: React.FC = () => {
  const mainRef = useRef<HTMLElement>(null);
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Client-side route state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      return p === '' ? '/' : p;
    }
    return '/';
  });

  // Synchronize document.documentElement class list with Zustand theme
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Listen to browser navigation (back/forward & pushState events)
  useEffect(() => {
    const handleNavigation = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // Global Legal Modal state (accessible from any page via CustomEvent)
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('cookies');

  useEffect(() => {
    const handleOpenLegal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.tab) setLegalTab(detail.tab);
      setLegalModalOpen(true);
    };
    window.addEventListener('mio:open-legal-modal', handleOpenLegal);
    return () => window.removeEventListener('mio:open-legal-modal', handleOpenLegal);
  }, []);

  // Helper to navigate
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Mini-footer for internal pages — always visible legal links
  const InternalFooter = () => (
    <div className={`relative z-20 py-4 px-6 border-t text-[11px] flex flex-wrap items-center justify-center gap-4 ${
      isDark ? 'border-white/[0.06] text-zinc-500' : 'border-zinc-200 text-zinc-400'
    }`}>
      <button onClick={() => navigateTo('/privacidad')} className="hover:underline cursor-pointer">Privacidad</button>
      <span>·</span>
      <button onClick={() => navigateTo('/terminos')} className="hover:underline cursor-pointer">Términos</button>
      <span>·</span>
      <button onClick={() => navigateTo('/cookies')} className="hover:underline cursor-pointer">Cookies</button>
      <span>·</span>
      <button onClick={() => navigateTo('/aviso-legal')} className="hover:underline cursor-pointer">Aviso Legal</button>
      <span>·</span>
      <button onClick={() => navigateTo('/arrepentimiento')} className="hover:underline cursor-pointer text-red-500 font-semibold">Botón de Arrepentimiento</button>
      <span>·</span>
      <button onClick={() => { setLegalTab('cookies'); setLegalModalOpen(true); }} className="hover:underline cursor-pointer">Preferencias de Cookies</button>
      <span className="hidden sm:inline">·</span>
      <span className="hidden sm:inline opacity-60">Rosario, Argentina — Tadeo Muñoz Garcés & Milena Abraham</span>
    </div>
  );

  // Legal pages routes
  const legalRoutes: Record<string, React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any>> = {
    '/terminos': TerminosPage,
    '/privacidad': PrivacidadPage,
    '/cookies': CookiesPage,
    '/aviso-legal': AvisoLegalPage,
    '/dpa': DpaPage,
    '/arrepentimiento': ArrepentimientoPage,
  };

  if (legalRoutes[currentPath]) {
    const LegalPage = legalRoutes[currentPath];
    return (
      <div
        className={`relative min-h-screen overflow-x-clip transition-colors duration-500 ${
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'
        }`}
      >
        <AnalogGrainOverlay />
        <div className="relative z-10">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <LegalPage />
          </Suspense>
        </div>
        <InternalFooter />
        <CookieBannerFloating />
        <LegalConsentModal isOpen={legalModalOpen} initialTab={legalTab} onClose={() => setLegalModalOpen(false)} />
      </div>
    );
  }

  // Test-Pet / MIO-PET Laboratory Endpoint
  if (currentPath === '/test-pet' || currentPath === '/mio-pet') {
    return (
      <div
        className={`relative min-h-screen flex flex-col overflow-x-clip transition-colors duration-500 ${
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#f6f6f2] text-zinc-950'
        }`}
      >
        <AnalogGrainOverlay />
        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <TestPetPage />
          </Suspense>
        </div>
        <InternalFooter />
        <CookieBannerFloating />
        <LegalConsentModal isOpen={legalModalOpen} initialTab={legalTab} onClose={() => setLegalModalOpen(false)} />
      </div>
    );
  }

  // Ambient background shell for internal pages
  const internalRoutes = ['/dashboard', '/admin', '/projects', '/login'];
  if (internalRoutes.includes(currentPath)) {
    const Page =
      currentPath === '/dashboard' ? DashboardPage
      : currentPath === '/admin' ? AdminPage
      : currentPath === '/projects' ? ProjectsPage
      : LoginPage;

    return (
      <div
        className={`relative min-h-screen flex flex-col overflow-x-clip transition-colors duration-500 ${
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'
        }`}
      >
        {/* Ambient 3D particle canvas — behind everything, non-interactive */}
        <LusionCanvas className={`${isDark ? 'opacity-[0.32]' : 'opacity-[0.46]'} pointer-events-none`} />
        {/* Film grain tactile overlay */}
        <AnalogGrainOverlay />
        {/* Page content */}
        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <Page />
          </Suspense>
        </div>
        {/* Legal footer — always visible on internal pages */}
        <InternalFooter />
        {/* Proactive cookie consent banner */}
        <CookieBannerFloating />
        {/* Global legal modal */}
        <LegalConsentModal isOpen={legalModalOpen} initialTab={legalTab} onClose={() => setLegalModalOpen(false)} />
      </div>
    );
  }

  // Default Route: Editorial Landing Page (or New Landing with 3D Pet Stage)
  const isNewLanding = ['/hero-stage', '/nuevo-landing', '/landing-v2', '/stage'].includes(currentPath);

  return (
    <SmoothScrollProvider>
      <div
        className={`relative min-h-screen selection:bg-[#bdf559] selection:text-black overflow-x-clip transition-colors duration-500 ${
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'
        }`}
      >
        {/* Three.js 3D Specular Lusion Particles (calibrated for both dark & light modes) */}
        <LusionCanvas />

        {/* Subtle, tactile film grain for high-end organic texture */}
        <AnalogGrainOverlay />

        {/* Global Navigation Bar with real route navigation */}
        <NavbarDOM />

        {/* Minimalist Editorial Main Flow (Legency Media Inspired) */}
        <main ref={mainRef} className="relative z-10">
          {isNewLanding ? <HeroStageDOM /> : <HeroDOM />}
          <PoderCorporativoDOM />
          {/* Full-Bleed Edge-to-Edge Ribbon & Dither Case Study */}
          <FullBleedCaseStudyDOM />
          <ComoFuncionaDOM />
          {/* Edge-to-Edge 3D Dither Geometric Topology Section */}
          <DitherFigureTransitionDOM />
          <QuienesSomosDOM />
          <CtaBannerDOM />
        </main>

        {/* Monumental Full-Bleed Footer */}
        <FooterDOM />

        {/* Proactive cookie consent banner (first visit) */}
        <CookieBannerFloating />

        {/* MIO 3D Floating Companion (Option B) */}
        <MioFloatingCompanion />
      </div>
    </SmoothScrollProvider>
  );
};

export default App;
