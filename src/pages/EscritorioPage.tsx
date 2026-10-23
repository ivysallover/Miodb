import React, { useEffect } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import type { User } from 'firebase/auth';
import { useAccount } from '@/utils/useAccount';
import { TermsAcceptance } from '@/components/ui/TermsAcceptance';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { ResultadoMejorado } from '@/components/dashboard/ResultadoMejorado';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { Ajustes } from '@/components/escritorio/Ajustes';
import { Analizando } from '@/components/escritorio/Analizando';
import { Cuenta } from '@/components/escritorio/Cuenta';
import { Guia } from '@/components/escritorio/Guia';
import { Inicio } from '@/components/escritorio/Inicio';
import { Ingreso } from '@/components/escritorio/Ingreso';
import { Menu } from '@/components/escritorio/Menu';
import { Proyectos } from '@/components/escritorio/Proyectos';
import { Recorrido } from '@/components/escritorio/Recorrido';
import { ResultHeader } from '@/components/escritorio/ResultHeader';
import { desktop, inDesktop } from '@/components/escritorio/desktop';
import { PRIMARY, muted, surface } from '@/components/escritorio/ui';
import { useDesktop } from '@/components/escritorio/useDesktop';
import { useTheme } from '@/components/escritorio/useTheme';

/**
 * La pantalla de la app de escritorio (Tauri). Primero la cuenta: ingresar (`Ingreso`) y aceptar los
 * términos vigentes (`TermsAcceptance`), con la misma cuenta y los mismos términos que la web. Con eso,
 * la app (`Adentro`).
 */
export const EscritorioPage: React.FC = () => {
  const theme = useTheme();
  const { account, accept, accepting, error, leave } = useAccount('escritorio');
  const { isDark } = theme;

  if (!inDesktop()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className={`rounded-mio p-6 sm:p-8 ${surface(isDark)}`}>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em]">Esta pantalla es de la app de escritorio.</h1>
          <p className={`mt-3 text-base ${muted(isDark)}`}>Abrila desde MIO para escritorio: ahí la planilla se analiza en tu compu, sin subirla.</p>
        </div>
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      {account.kind === 'cargando' && (
        <main className="flex min-h-screen w-full items-center justify-center" aria-busy="true">
          <MioPet2D mood="reposo" size={140} showShadow={false} animated />
        </main>
      )}
      {account.kind === 'afuera' && <Ingreso isDark={isDark} />}
      {account.kind === 'terminos' && (
        <main className="flex h-screen w-full items-center justify-center p-3">
          <TermsAcceptance isDark={isDark} email={account.user.email} accepting={accepting} error={error} onAccept={accept} onLeave={leave} onNavigate={desktop.openWeb} />
        </main>
      )}
      {account.kind === 'adentro' && <Adentro user={account.user} theme={theme} onLeave={leave} />}
    </MotionConfig>
  );
};

/**
 * La app, con la cuenta adentro: el menú de la izquierda y, a la derecha, la pantalla elegida (inicio,
 * mis proyectos, guía, cuenta, ajustes) o la planilla abierta, con la misma vista de resultados de la
 * web (`ResultadoMejorado`). Todo pasa en esta compu; lo que hace cada parte está en
 * `src/components/escritorio/`.
 */
const Adentro: React.FC<{ user: User; theme: ReturnType<typeof useTheme>; onLeave: () => void }> = ({ user, theme, onLeave }) => {
  const { isDark, themeMode, setThemeMode } = theme;
  const d = useDesktop();
  const { scrollTo } = useSmoothScroll();
  // Cada pantalla empieza arriba.
  useEffect(() => scrollTo('#escritorio', { offset: -12, duration: 0.3 }), [d.section]);

  const { phase, section } = d;
  const projects = { isDark, projects: d.projects, onChoose: d.choose, onOpen: d.open, onRemove: d.remove };

  /** La planilla abierta: mientras se analiza, si no se pudo abrir o su resultado. */
  const analysis = () => {
    if (phase.kind === 'abriendo') return <Analizando name={phase.name} progress={d.progress} isDark={isDark} />;
    if (phase.kind === 'error') {
      return (
        <section role="alert" className={`flex flex-col items-start gap-6 rounded-mio p-7 sm:flex-row sm:items-center sm:p-10 ${isDark ? 'bg-[#3a1220] text-[#ffd5dc]' : 'bg-[#ffe3e6] text-[#7a1022]'}`}>
          <MioPet2D mood="anomalia" size={120} showShadow={false} animated />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-[-0.035em]">No pude abrir esta planilla.</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed">{phase.message}</p>
            <button type="button" onClick={d.choose} className={`${PRIMARY} mt-6`}>
              <FolderOpen className="h-5 w-5" aria-hidden /> Elegir otra planilla
            </button>
          </div>
        </section>
      );
    }
    if (phase.kind === 'listo') {
      return (
        <>
          <ResultHeader result={phase.result} opened={phase.opened} busy={d.reanalyzing} progress={d.progress} isDark={isDark} onChoose={d.choose} onAnalyze={d.reanalyze} onSheet={(hoja) => d.open(phase.path, hoja)} />
          <ResultadoMejorado result={phase.result} isDark={isDark} />
        </>
      );
    }
    return null;
  };

  const content = () => {
    switch (section) {
      case 'proyectos':
        return <Proyectos {...projects} />;
      case 'guia':
        return <Guia isDark={isDark} onTour={d.startTour} />;
      case 'cuenta':
        return <Cuenta isDark={isDark} user={user} onLeave={onLeave} />;
      case 'ajustes':
        return <Ajustes isDark={isDark} themeMode={themeMode} projects={d.projects.length} onThemeMode={setThemeMode} onTour={d.startTour} />;
      default:
        // Sin planilla abierta, el lugar del análisis es el inicio.
        return (section === 'analisis' && analysis()) || (
          <Inicio {...projects} onAll={() => d.setSection('proyectos')} onGuide={() => d.setSection('guia')} onTour={d.startTour} />
        );
    }
  };

  return (
    <div id="escritorio" className="flex w-full gap-3 p-3">
      <Menu section={section} phase={phase} busy={d.busy} isDark={isDark} onSection={d.setSection} onChoose={d.choose} onToggleTheme={(from) => setThemeMode(isDark ? 'claro' : 'oscuro', from)} />
      <main className="min-w-0 flex-1">
        {/* Cada pantalla entra apenas desde abajo; el menú queda quieto. */}
        <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }} className="space-y-2.5 sm:space-y-3">
          {content()}
        </motion.div>
      </main>

      {d.dragging && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-mio bg-[#7647eb]/95 text-white">
          <div className="flex items-center gap-6">
            <MioPet2D mood="celebrando" size={120} showShadow={false} animated />
            <p className="text-4xl font-extrabold tracking-[-0.04em]">Soltala y la analizo.</p>
          </div>
        </div>
      )}
      {d.touring && <Recorrido isDark={isDark} onEnd={d.endTour} />}
    </div>
  );
};

export default EscritorioPage;
