import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sun, Moon, ShieldCheck, ChevronRight, FileText } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { playMioDevSound } from '@/lib/sound';

export interface LegalSectionItem {
  id: string;
  title: string;
}

interface LegalPageShellProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  category?: string;
  sections?: LegalSectionItem[];
  children: React.ReactNode;
}

export const LegalPageShell: React.FC<LegalPageShellProps> = ({
  title,
  subtitle,
  lastUpdated = 'Septiembre 2026',
  category = 'NORMATIVA & CUMPLIMIENTO',
  sections = [],
  children,
}) => {
  const { theme, setTheme } = useMioStore();
  const isDark = theme === 'dark';
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100;
        setReadingProgress(Math.min(100, Math.max(0, currentProgress)));
      }

      // Detect active section based on scroll position
      if (sections.length > 0) {
        for (let i = sections.length - 1; i >= 0; i--) {
          const el = document.getElementById(sections[i].id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 160) {
              setActiveSection(sections[i].id);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id: string) => {
    playMioDevSound('tick');
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#07070a] text-zinc-100' : 'bg-[#fbfbfd] text-zinc-950'}`}>
      {/* Precision 2px Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-black/5 dark:bg-white/5 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#7647eb] to-[#bdf559] transition-all duration-150 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* Floating Sticky Navigation Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
                isDark
                  ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span>MIO</span>
              <span>/</span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate max-w-[200px]">{title}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-[#bdf559]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
              <span>Texto Vigente 2026</span>
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={() => {
                playMioDevSound('tick');
                setTheme(isDark ? 'light' : 'dark');
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-[0.95] cursor-pointer ${
                isDark
                  ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                  : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
              }`}
              aria-label="Cambiar tema"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        {/* Document Header & Metadata Hero */}
        <div className="max-w-3xl mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-zinc-600 dark:text-zinc-400">
            <ShieldCheck className="w-3 h-3 text-[#7647eb] dark:text-[#bdf559]" />
            <span>{category}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-sans tracking-[-0.03em] leading-tight text-zinc-950 dark:text-white">
            {title}
          </h1>

          {subtitle && (
            <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-normal leading-relaxed">
              {subtitle}
            </p>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-mono text-zinc-500 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div>Actualización: <span className="text-zinc-800 dark:text-zinc-300 font-semibold">{lastUpdated}</span></div>
            <div>•</div>
            <div>Jurisdicción: <span className="text-zinc-800 dark:text-zinc-300 font-semibold">Rosario, Santa Fe, Argentina</span></div>
            <div>•</div>
            <div>Validez: <span className="text-emerald-700 dark:text-[#bdf559] font-semibold">Activa</span></div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Main Legal Text Column */}
          <div className="lg:col-span-8 space-y-8 legal-document-body">
            {children}
          </div>

          {/* Table of Contents Sticky Sidebar on Desktop */}
          {sections.length > 0 && (
            <aside className="hidden lg:block lg:col-span-4 sticky top-24 space-y-6 select-none">
              <div className="p-5 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-[#7647eb] dark:text-[#bdf559]" />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
                    Índice del Documento
                  </span>
                </div>

                <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  {sections.map((sec, idx) => {
                    const isActive = activeSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => scrollToSection(sec.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-150 flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-black/[0.06] dark:bg-white/[0.08] font-semibold text-zinc-950 dark:text-[#bdf559]'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <span className="truncate pr-2">
                          <span className="font-mono text-[10px] opacity-60 mr-1.5">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          {sec.title}
                        </span>
                        {isActive && <ChevronRight className="w-3 h-3 text-[#bdf559] shrink-0" />}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Quick Legal Hub Navigation Pill */}
              <div className="p-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] text-xs space-y-2.5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  Otros Documentos
                </div>
                <div className="flex flex-col gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                  <button onClick={() => navigateTo('/terminos')} className="text-left hover:text-[#7647eb] dark:hover:text-[#bdf559] transition-colors cursor-pointer">
                    • Términos y Condiciones
                  </button>
                  <button onClick={() => navigateTo('/privacidad')} className="text-left hover:text-[#7647eb] dark:hover:text-[#bdf559] transition-colors cursor-pointer">
                    • Política de Privacidad
                  </button>
                  <button onClick={() => navigateTo('/cookies')} className="text-left hover:text-[#7647eb] dark:hover:text-[#bdf559] transition-colors cursor-pointer">
                    • Política de Cookies
                  </button>
                  <button onClick={() => navigateTo('/dpa')} className="text-left hover:text-[#7647eb] dark:hover:text-[#bdf559] transition-colors cursor-pointer">
                    • Acuerdo DPA (B2B)
                  </button>
                  <button onClick={() => navigateTo('/aviso-legal')} className="text-left hover:text-[#7647eb] dark:hover:text-[#bdf559] transition-colors cursor-pointer">
                    • Aviso Legal
                  </button>
                  <button onClick={() => navigateTo('/arrepentimiento')} className="text-left text-red-500 font-semibold hover:underline transition-colors cursor-pointer">
                    • Botón de Arrepentimiento / Baja
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Global Footer Stamp */}
        <div className="mt-16 sm:mt-24 pt-8 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>MIO Technologies</span>
            <span>•</span>
            <span>Tadeo Muñoz Garcés &amp; Milena Abraham</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#bdf559]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
              Rosario, Santa Fe, Argentina
            </span>
          </div>

          <div>
            Documento de carácter vinculante bajo legislación argentina.
          </div>
        </div>
      </main>
    </div>
  );
};
export default LegalPageShell;
