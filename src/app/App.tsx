import React, { useRef, useState, useEffect } from 'react';
import { SmoothScrollProvider } from './providers/SmoothScrollProvider';
import { NavbarDOM } from '@/components/dom/NavbarDOM';
import { HeroDOM } from '@/components/dom/HeroDOM';
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

// Application Pages
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { LoginPage } from '@/pages/LoginPage';

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

  // Subpage Route Matching
  if (currentPath === '/dashboard') {
    return <DashboardPage />;
  }

  if (currentPath === '/admin') {
    return <AdminPage />;
  }

  if (currentPath === '/projects') {
    return <ProjectsPage />;
  }

  if (currentPath === '/login') {
    return <LoginPage />;
  }

  // Default Route: Editorial Landing Page
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
          <HeroDOM />
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
      </div>
    </SmoothScrollProvider>
  );
};

export default App;
