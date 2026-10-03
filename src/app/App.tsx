import React, { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { SmoothScrollProvider } from './providers/SmoothScrollProvider';
import { NavbarDOM } from '@/components/dom/NavbarDOM';
import { HeroDOM } from '@/components/dom/HeroDOM';
import { HeroStageDOM } from '@/components/dom/HeroStageDOM';
import { PoderCorporativoDOM } from '@/components/dom/PoderCorporativoDOM';
import { FullBleedCaseStudyDOM } from '@/components/dom/FullBleedCaseStudyDOM';
import { ComoFuncionaDOM } from '@/components/dom/ComoFuncionaDOM';
import { DashboardShowcasePinDOM } from '@/components/dom/DashboardShowcasePinDOM';
import { DitherFigureTransitionDOM } from '@/components/dom/DitherFigureTransitionDOM';
import { QuienesSomosDOM } from '@/components/dom/QuienesSomosDOM';
import { CtaBannerDOM } from '@/components/dom/CtaBannerDOM';
import { FooterDOM } from '@/components/dom/FooterDOM';
import { AnalogGrainOverlay } from '@/components/ui/AnalogGrainOverlay';
import { LusionCanvas } from '@/components/canvas/LusionCanvas';
import { useMioStore } from '@/utils/useMioStore';
import { useLandingPetNarrative } from '@/hooks/useLandingPetNarrative';

// Code-Splitting: Lazy-loaded Application Pages
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

// Interactive Companion Component
import { MioFloatingCompanion } from '@/components/pet/MioFloatingCompanion';
import { MioBrandBootloader } from '@/components/ui/MioBrandBootloader';

// Tactile Hardware Cursor & Dither Route Transition Curtain
import { MioTargetLockCursor } from '@/components/ui/MioTargetLockCursor';
import { DitherRouteCurtain } from '@/components/ui/DitherRouteCurtain';

/**
 * LandingPageContent:
 * Encapsulates the scrollytelling narrative flow and its dedicated GSAP triggers.
 * Isolates useLandingPetNarrative so that route changes never alter hook call order.
 */
interface LandingPageContentProps {
  isNewLanding: boolean;
}

const LandingPageContent: React.FC<LandingPageContentProps> = ({ isNewLanding }) => {
  const mainRef = useRef<HTMLElement>(null);
  useLandingPetNarrative(true);

  return (
    <main ref={mainRef} className="relative z-10">
      {isNewLanding ? <HeroStageDOM /> : <HeroDOM />}
      <PoderCorporativoDOM />
      {/* Full-Bleed Edge-to-Edge Ribbon & Dither Case Study */}
      <FullBleedCaseStudyDOM />
      {/* Step-by-Step Architecture */}
      <ComoFuncionaDOM />
      {/* GSAP Pinned Dashboard Showcase: Live AutoML engine telemetry */}
      <DashboardShowcasePinDOM />
      {/* Edge-to-Edge 3D Dither Geometric Topology Section */}
      <DitherFigureTransitionDOM />
      <QuienesSomosDOM />
      <CtaBannerDOM />
    </main>
  );
};

export const App: React.FC = () => {
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

  // Global Legal Modal state
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab>('cookies');

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

  // Listen to browser navigation
  useEffect(() => {
    const handleNavigation = () => {
      setCurrentPath(window.location.pathname || '/');
      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // Listen to legal modal trigger events
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

  // Mini-footer for internal pages
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

  // Route dictionaries
  const legalRoutes: Record<string, React.LazyExoticComponent<React.ComponentType<any>> | React.ComponentType<any>> = {
    '/terminos': TerminosPage,
    '/privacidad': PrivacidadPage,
    '/cookies': CookiesPage,
    '/aviso-legal': AvisoLegalPage,
    '/dpa': DpaPage,
    '/arrepentimiento': ArrepentimientoPage,
  };

  const internalRoutes = ['/dashboard', '/admin', '/projects', '/login'];
  const isLegalRoute = Boolean(legalRoutes[currentPath]);
  const isInternalRoute = internalRoutes.includes(currentPath);
  const isTestPetRoute = currentPath === '/test-pet' || currentPath === '/mio-pet';
  const isNewLanding = ['/hero-stage', '/nuevo-landing', '/landing-v2', '/stage'].includes(currentPath);
  const isLandingRoute = !isLegalRoute && !isInternalRoute && !isTestPetRoute;

  // Single unified render function without violating React Rules of Hooks
  const renderPageContent = () => {
    if (isLegalRoute) {
      const LegalPage = legalRoutes[currentPath];
      return (
        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <LegalPage />
          </Suspense>
        </div>
      );
    }

    if (isTestPetRoute) {
      return (
        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <TestPetPage />
          </Suspense>
        </div>
      );
    }

    if (isInternalRoute) {
      const Page =
        currentPath === '/dashboard' ? DashboardPage
        : currentPath === '/admin' ? AdminPage
        : currentPath === '/projects' ? ProjectsPage
        : LoginPage;

      return (
        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteSuspenseFallback />}>
            <Page />
          </Suspense>
        </div>
      );
    }

    // Default: Landing Page
    return <LandingPageContent isNewLanding={isNewLanding} />;
  };

  const appShell = (
    <div
      className={`relative min-h-screen flex flex-col selection:bg-[#bdf559] selection:text-black overflow-x-clip transition-colors duration-500 ${
        isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'
      }`}
    >
      {/* Three.js 3D Specular Lusion Particles (calibrated for both modes) */}
      <LusionCanvas className={!isLandingRoute ? `${isDark ? 'opacity-[0.32]' : 'opacity-[0.46]'} pointer-events-none` : undefined} />

      {/* Subtle, tactile film grain for organic texture */}
      <AnalogGrainOverlay />

      {/* Landing-specific brand elements */}
      {isLandingRoute && (
        <>
          <MioBrandBootloader />
          <NavbarDOM />
        </>
      )}

      {/* Page Content Viewport */}
      {renderPageContent()}

      {/* Footers */}
      {isLandingRoute ? <FooterDOM /> : <InternalFooter />}

      {/* Proactive cookie consent banner */}
      <CookieBannerFloating />

      {/* Global legal consent modal */}
      <LegalConsentModal isOpen={legalModalOpen} initialTab={legalTab} onClose={() => setLegalModalOpen(false)} />

      {/* MIO 3D Floating Companion (Landing only) */}
      {isLandingRoute && <MioFloatingCompanion />}

      {/* Swiss Metrology Target-Lock Cursor */}
      <MioTargetLockCursor />

      {/* Hardware Dither Dissolve Route Transition Curtain */}
      <DitherRouteCurtain />
    </div>
  );

  // Smooth scroll wrapper for landing page
  if (isLandingRoute) {
    return <SmoothScrollProvider>{appShell}</SmoothScrollProvider>;
  }

  return appShell;
};

export default App;
