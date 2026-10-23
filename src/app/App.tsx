import React, { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { SmoothScrollProvider } from './providers/SmoothScrollProvider';
import { NavbarDOM } from '@/components/dom/NavbarDOM';
import { HeroDOM } from '@/components/dom/HeroDOM';
import { TusDatosDOM } from '@/components/dom/TusDatosDOM';
import { ParaQuienDOM } from '@/components/dom/ParaQuienDOM';
import { FaqDOM } from '@/components/dom/FaqDOM';
import { SheetFrame } from '@/components/ui/SheetFrame';
import { StickyCta } from '@/components/ui/StickyCta';
import { ManifiestoDOM } from '@/components/dom/ManifiestoDOM';
import { MetodoDOM } from '@/components/dom/MetodoDOM';
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
import { MioTravellerLayer } from '@/components/dom/MioTravellerLayer';
import { PaisajeDOM } from '@/components/dom/PaisajeDOM';
import { DecisionDOM } from '@/components/dom/DecisionDOM';
import { AnalogGrainOverlay } from '@/components/ui/AnalogGrainOverlay';
const LusionCanvas = lazy(() => import('@/components/canvas/LusionCanvas').then((m) => ({ default: m.LusionCanvas })));
import { useMioStore } from '@/utils/useMioStore';
import { warmUpBackend } from '@/lib/apiClient';

// Application Pages — loaded on demand so the landing never pays for the dashboard
// (charts, PDF export, markdown, lab tooling). Each page is its own chunk.
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
// La pantalla de la app de escritorio (Tauri): fuera de la app explica que es de escritorio.
const EscritorioPage = lazy(() => import('@/pages/EscritorioPage').then((m) => ({ default: m.EscritorioPage })));
const TermsGate = lazy(() => import('@/components/ui/TermsGate').then((m) => ({ default: m.TermsGate })));
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
// Ambient particle field: tablets and desktops only. Phones skip WebGL (and the three.js download) entirely.
const AmbientCanvas: React.FC<{ className?: string }> = ({ className }) => {
  const [wide] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  if (!wide) return null;
  return (
    <Suspense fallback={null}>
      <LusionCanvas className={className} />
    </Suspense>
  );
};

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

/** Legal links that stay visible on every internal page. */
const InternalFooter: React.FC<{
  isDark: boolean;
  onNavigate: (path: string) => void;
  onOpenCookies: () => void;
}> = ({ isDark, onNavigate, onOpenCookies }) => (
  <div
    className={`relative z-20 py-4 px-6 border-t text-[11px] flex flex-wrap items-center justify-center gap-4 ${
      isDark ? 'border-white/[0.06] text-zinc-400' : 'border-zinc-200 text-zinc-600'
    }`}
  >
    <button onClick={() => onNavigate('/privacidad')} className="hover:underline cursor-pointer">Privacidad</button>
    <span>·</span>
    <button onClick={() => onNavigate('/terminos')} className="hover:underline cursor-pointer">Términos</button>
    <span>·</span>
    <button onClick={() => onNavigate('/cookies')} className="hover:underline cursor-pointer">Cookies</button>
    <span>·</span>
    <button onClick={() => onNavigate('/aviso-legal')} className="hover:underline cursor-pointer">Aviso Legal</button>
    <span>·</span>
    <button onClick={() => onNavigate('/arrepentimiento')} className="hover:underline cursor-pointer text-red-700 dark:text-red-400 font-semibold">Botón de Arrepentimiento</button>
    <span>·</span>
    <button onClick={onOpenCookies} className="hover:underline cursor-pointer">Preferencias de Cookies</button>
    <span className="hidden sm:inline">·</span>
    <span className="hidden sm:inline">Rosario, Argentina — Tadeo Muñoz Garcés & Milena Abraham</span>
  </div>
);

/**
 * The sheet shell every non-landing route shares: grid background, theme surface, optional ambient
 * particles / film grain, content above them. `flex` stretches the content so footers sit at the bottom.
 */
const PageShell: React.FC<{
  isDark: boolean;
  flex?: boolean;
  ambient?: boolean;
  grain?: boolean;
  sheet?: boolean;
  /** Rendered after the content (footer, banners, modals), outside its stacking layer. */
  after?: React.ReactNode;
  children: React.ReactNode;
}> = ({ isDark, flex = false, ambient = false, grain = false, sheet = true, after, children }) => (
  <div
    className={`${sheet ? 'mio-sheet-bg ' : ''}relative min-h-screen ${flex ? 'flex flex-col ' : ''}overflow-x-clip transition-colors duration-500 ${
      isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'
    }`}
  >
    {ambient && <AmbientCanvas className={`${isDark ? 'opacity-[0.32]' : 'opacity-[0.46]'} pointer-events-none`} />}
    {grain && <AnalogGrainOverlay />}
    <div className={`relative z-10 ${flex ? 'flex-1' : ''}`}>{children}</div>
    {after}
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

  // The free server sleeps after a while and takes over a minute to wake up. Waking it as soon as
  // someone opens the site means it is ready by the time they upload a sheet.
  useEffect(() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
    warmUpBackend();
  }, []);

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

  // Chrome shared by the internal routes: legal links, cookie banner, legal modal.
  const chrome = (
    <>
      <InternalFooter
        isDark={isDark}
        onNavigate={navigateTo}
        onOpenCookies={() => {
          setLegalTab('cookies');
          setLegalModalOpen(true);
        }}
      />
      <CookieBannerFloating />
      <LegalConsentModal isOpen={legalModalOpen} initialTab={legalTab} onClose={() => setLegalModalOpen(false)} />
    </>
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
      <PageShell isDark={isDark} grain after={chrome}>
        <Suspense fallback={<RouteFallback isDark={isDark} />}>
          <LegalPage />
        </Suspense>
      </PageShell>
    );
  }

  // Internal test page: only while developing.
  if (import.meta.env.DEV && currentPath === '/test-dither') {
    return (
      <PageShell isDark={isDark} sheet={false}>
        <Suspense fallback={<RouteFallback isDark={isDark} />}>
          <TestDitherPage />
        </Suspense>
      </PageShell>
    );
  }

  // Test-Pet / MIO-PET Laboratory Endpoint
  if (currentPath === '/test-pet' || currentPath === '/mio-pet') {
    return (
      <PageShell isDark={isDark} flex grain after={chrome}>
        <Suspense fallback={<RouteFallback isDark={isDark} />}>
          <TestPetPage />
        </Suspense>
      </PageShell>
    );
  }

  // Ambient background shell for internal pages
  // La ventana de escritorio no lleva el pie legal ni el aviso de cookies de la web: es un programa local.
  if (currentPath === '/escritorio') {
    return (
      <PageShell isDark={isDark} flex ambient grain>
        <Suspense fallback={<RouteFallback isDark={isDark} />}>
          <EscritorioPage />
        </Suspense>
      </PageShell>
    );
  }

  const internalRoutes = ['/dashboard', '/admin', '/projects', '/login'];
  if (internalRoutes.includes(currentPath)) {
    const Page =
      currentPath === '/dashboard' ? DashboardPage
      : currentPath === '/admin' ? AdminPage
      : currentPath === '/projects' ? ProjectsPage
      : LoginPage;

    return (
      <PageShell isDark={isDark} flex ambient grain after={chrome}>
        <Suspense fallback={<RouteFallback isDark={isDark} />}>
          <Page />
        </Suspense>
        {/* Con la cuenta adentro, los términos vigentes tienen que estar aceptados. */}
        {currentPath !== '/login' && (
          <Suspense fallback={null}>
            <TermsGate />
          </Suspense>
        )}
      </PageShell>
    );
  }

  // Anything else that is not the home page does not exist: say so instead of showing the landing.
  const landingPaths = ['/', '', '/index.html', '/hero-stage', '/nuevo-landing', '/landing-v2', '/stage'];
  if (!landingPaths.includes(currentPath)) {
    return (
      <div className={`mio-sheet-bg relative min-h-screen flex flex-col ${isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'}`}>
        <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-xl rounded-mio bg-[#0b0914] p-8 sm:p-12 text-white">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#bdf559]">Error 404</p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.02]">Esta página no existe.</h1>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              Puede que el enlace esté mal escrito o que la página se haya movido. Tu planilla y tus análisis no se ven afectados.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="min-h-[48px] rounded-full bg-[#7647eb] px-6 text-sm font-bold text-white transition-all duration-200 hover:bg-[#602cd1] active:scale-[0.97] cursor-pointer"
              >
                Volver al inicio
              </button>
              <button
                type="button"
                onClick={() => navigateTo('/dashboard?new=1')}
                className="min-h-[48px] rounded-full bg-white/[0.1] px-6 text-sm font-bold text-white transition-all duration-200 hover:bg-white/[0.18] active:scale-[0.97] cursor-pointer"
              >
                Probar con mi planilla
              </button>
            </div>
          </div>
        </main>
        {chrome}
      </div>
    );
  }

  // Default Route: Editorial Landing Page
  return (
    <SmoothScrollProvider>
      <div
        className={`mio-sheet-bg relative min-h-screen selection:bg-[#bdf559] selection:text-black overflow-x-clip transition-colors duration-500 ${
          isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'
        }`}
      >
        {/* MIO OS boot screen: once per session, covers font + pet loading */}
        <BootSequence />

        {/* The full-screen particle canvas and the grain overlay were removed from the landing:
            two always-on full-viewport layers under a scrolling page were the main source of jank. */}

        {/* One live MIO for the whole page (desktop): it follows the scroll from pose to pose */}
        <MioTravellerLayer />

        {/* Global Navigation Bar with real route navigation */}
        <NavbarDOM />

        {/* Minimalist Editorial Main Flow (Legency Media Inspired) */}
        <main ref={mainRef} className="relative z-10">
          <HeroDOM />
          {/* Act 2: the problem, with the old capabilities folded in as Hoy / Con MIO */}
          <PixelDivider from="page" to="#3d1f8a" accent="#bdf559" />
          <ManifiestoDOM />
          <PixelDivider from="#3d1f8a" to="page" accent="#7647eb" />
          <ProblemaDOM />
          <EjemploDOM />
          {/* Acts 3 and 4, the method and its proof. Desktop: one flight over five years of real
              daily sales (it opens and ends as the page's own sheet, so there is no cut either way),
              then the decision step. Phones, tablets and reduced motion: the same as stacked blocks. */}
          <PaisajeDOM
            after={<DecisionDOM />}
            fallback={
              <>
                <MetodoDOM />
                <FullBleedCaseStudyDOM />
                <PixelDivider from="#07070a" to="page" accent="#bdf559" />
              </>
            }
          />
          <TusDatosDOM />
          <ParaQuienDOM />
          <FaqDOM />
          <QuienesSomosDOM />
          <CtaBannerDOM />
        </main>

        {/* Section progress rail (xl+) */}
        <SheetFrame />
        <StickyCta />

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
