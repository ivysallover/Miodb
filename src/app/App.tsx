import React, { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { SmoothScrollProvider } from './providers/SmoothScrollProvider';
import { NavbarDOM } from '@/components/dom/NavbarDOM';
import { HeroDOM } from '@/components/dom/HeroDOM';
import { ParaQuienDOM } from '@/components/dom/ParaQuienDOM';
import { FaqDOM } from '@/components/dom/FaqDOM';
import { EjemploDOM } from '@/components/dom/EjemploDOM';
import { ProblemaDOM } from '@/components/dom/ProblemaDOM';
import { FullBleedCaseStudyDOM } from '@/components/dom/FullBleedCaseStudyDOM';
import { ComoFuncionaDOM } from '@/components/dom/ComoFuncionaDOM';
import { QuienesSomosDOM } from '@/components/dom/QuienesSomosDOM';
import { CtaBannerDOM } from '@/components/dom/CtaBannerDOM';
import { FooterDOM } from '@/components/dom/FooterDOM';
import { SectionRail } from '@/components/ui/SectionRail';
import { BootSequence } from '@/components/ui/BootSequence';
import { PixelDivider } from '@/components/ui/PixelDivider';
import { AnalogGrainOverlay } from '@/components/ui/AnalogGrainOverlay';
import { LusionCanvas } from '@/components/canvas/LusionCanvas';
import { useMioStore } from '@/utils/useMioStore';

// Application Pages — loaded on demand so the landing never pays for the dashboard
// (charts, PDF export, markdown, lab tooling). Each page is its own chunk.
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const TestDitherPage = lazy(() => import('@/pages/TestDitherPage').then((m) => ({ default: m.TestDitherPage })));
const TestPetPage = lazy(() => import('@/pages/TestPetPage').then((m) => ({ default: m.TestPetPage })));

// Legal & Compliance Pages (on demand)
const TerminosPage = lazy(() => import('@/pages/TerminosPage').then((m) => ({ default: m.TerminosPage })));
const PrivacidadPage = lazy(() => import('@/pages/PrivacidadPage').then((m) => ({ default: m.PrivacidadPage })));
const CookiesPage = lazy(() => import('@/pages/CookiesPage').then((m) => ({ default: m.CookiesPage })));
const AvisoLegalPage = lazy(() => import('@/pages/AvisoLegalPage').then((m) => ({ default: m.AvisoLegalPage })));
const DpaPage = lazy(() => import('@/pages/DpaPage').then((m) => ({ default: m.DpaPage })));
const ArrepentimientoPage = lazy(() =>
  import('@/pages/ArrepentimientoPage').then((m) => ({ default: m.ArrepentimientoPage }))
);

// Compliance Components
import { CookieBannerFloating } from '@/components/ui/CookieBannerFloating';
import { LegalConsentModal, type LegalTab } from '@/components/ui/LegalConsentModal';

// Interactive Companion Component (Option B) — fixed-position overlay (no layout impact),
// so it can load after first paint; it brings bloom/reflector/HDR loaders with it.
const MioFloatingCompanion = lazy(() =>
  import('@/components/pet/MioFloatingCompanion').then((m) => ({ default: m.MioFloatingCompanion }))
);

/** Route fallback: square corners, hard border, mono telemetry text (BRANDING.md). */
const RouteFallback: React.FC<{ isDark: boolean }> = ({ isDark }) => (
  <div className="min-h-[60vh] flex items-center justify-center p-6" role="status" aria-live="polite">
    <div
      className={`px-4 py-3 border font-mono text-xs uppercase tracking-[0.14em] rounded-none ${
        isDark ? 'bg-[#0e0c19] border-white/10 text-zinc-300' : 'bg-white border-black text-zinc-800'
      }`}
      style={{ boxShadow: isDark ? 'none' : '3px 3px 0 #111111' }}
    >
      <span className="inline-block w-1.5 h-1.5 mr-2 align-middle bg-[#bdf559] animate-pulse" />
      Cargando módulo…
    </div>
  </div>
);

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
  const legalRoutes: Record<string, React.ElementType> = {
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
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'
        }`}
      >
        <AnalogGrainOverlay />
        <div className="relative z-10">
          <Suspense fallback={<RouteFallback isDark={isDark} />}>
            <LegalPage />
          </Suspense>
        </div>
        <InternalFooter />
        <CookieBannerFloating />
        <LegalConsentModal isOpen={legalModalOpen} initialTab={legalTab} onClose={() => setLegalModalOpen(false)} />
      </div>
    );
  }

  if (currentPath === '/test-dither') {
    return (
      <div className={`relative min-h-screen ${isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'}`}>
        <Suspense fallback={<RouteFallback isDark={isDark} />}>
          <TestDitherPage />
        </Suspense>
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
          <Suspense fallback={<RouteFallback isDark={isDark} />}>
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
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'
        }`}
      >
        {/* Ambient 3D particle canvas — behind everything, non-interactive */}
        <LusionCanvas className={`${isDark ? 'opacity-[0.32]' : 'opacity-[0.46]'} pointer-events-none`} />
        {/* Film grain tactile overlay */}
        <AnalogGrainOverlay />
        {/* Page content */}
        <div className="relative z-10 flex-1">
          <Suspense fallback={<RouteFallback isDark={isDark} />}>
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

  // Default Route: Editorial Landing Page
  return (
    <SmoothScrollProvider>
      <div
        className={`relative min-h-screen selection:bg-[#bdf559] selection:text-black overflow-x-clip transition-colors duration-500 ${
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'
        }`}
      >
        {/* MIO OS boot screen: once per session, covers font + pet loading */}
        <BootSequence />

        {/* Three.js 3D Specular Lusion Particles (calibrated for both dark & light modes) */}
        <LusionCanvas />

        {/* Subtle, tactile film grain for high-end organic texture */}
        <AnalogGrainOverlay />

        {/* Global Navigation Bar with real route navigation */}
        <NavbarDOM />

        {/* Minimalist Editorial Main Flow (Legency Media Inspired) */}
        <main ref={mainRef} className="relative z-10">
          <HeroDOM />
          {/* Act 2: the problem, with the old capabilities folded in as Hoy / Con MIO */}
          <ProblemaDOM />
          <EjemploDOM />
          {/* Act 3: the method (three stacked phases) */}
          <ComoFuncionaDOM />
          {/* Act 4: the proof (full-bleed case study), entered and left through pixel dissolves */}
          <PixelDivider from="page" to="#06040e" accent="#7647eb" />
          <FullBleedCaseStudyDOM />
          <PixelDivider from="#06040e" to="page" accent="#bdf559" />
          <ParaQuienDOM />
          <FaqDOM />
          <QuienesSomosDOM />
          <CtaBannerDOM />
        </main>

        {/* Section progress rail (xl+) */}
        <SectionRail />

        {/* Monumental Full-Bleed Footer */}
        <FooterDOM />

        {/* Proactive cookie consent banner (first visit) */}
        <CookieBannerFloating />

        {/* MIO 3D Floating Companion (Option B) */}
        <Suspense fallback={null}>
          <MioFloatingCompanion />
        </Suspense>
      </div>
    </SmoothScrollProvider>
  );
};

export default App;
