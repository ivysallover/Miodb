import React, { useEffect } from 'react';
import { FolderOpen } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { useSmoothScroll } from '@/app/providers/SmoothScrollProvider';
import { ResultadoMejorado } from '@/components/dashboard/ResultadoMejorado';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { Ajustes } from '@/components/escritorio/Ajustes';
import { Analizando } from '@/components/escritorio/Analizando';
import { Guia } from '@/components/escritorio/Guia';
import { Inicio } from '@/components/escritorio/Inicio';
import { Menu } from '@/components/escritorio/Menu';
import { Proyectos } from '@/components/escritorio/Proyectos';
import { Recorrido } from '@/components/escritorio/Recorrido';
import { ResultHeader } from '@/components/escritorio/ResultHeader';
import { inDesktop } from '@/components/escritorio/desktop';
import { PRIMARY, muted, surface } from '@/components/escritorio/ui';
import { useDesktop } from '@/components/escritorio/useDesktop';

/**
 * La pantalla de la app de escritorio (Tauri): el menú de la izquierda y, a la derecha, la pantalla
 * elegida (inicio, mis proyectos, guía, ajustes) o la planilla abierta, con la misma vista de
 * resultados de la web (`ResultadoMejorado`). Todo pasa en esta compu; lo que hace cada parte está en
 * `src/components/escritorio/`.
 */
export const EscritorioPage: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const d = useDesktop();
  const { scrollTo } = useSmoothScroll();
  // Cada pantalla empieza arriba.
  useEffect(() => scrollTo('#escritorio', { offset: -12, duration: 0.3 }), [d.section]);

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
      case 'ajustes':
        return <Ajustes isDark={isDark} themeMode={d.themeMode} projects={d.projects.length} onThemeMode={d.setThemeMode} onTour={d.startTour} />;
      default:
        // Sin planilla abierta, el lugar del análisis es el inicio.
        return (section === 'analisis' && analysis()) || (
          <Inicio {...projects} onAll={() => d.setSection('proyectos')} onGuide={() => d.setSection('guia')} onTour={d.startTour} />
        );
    }
  };

  return (
    <div id="escritorio" className="flex w-full gap-3 p-3">
      <Menu section={section} phase={phase} busy={d.busy} isDark={isDark} onSection={d.setSection} onChoose={d.choose} onToggleTheme={() => d.setThemeMode(isDark ? 'claro' : 'oscuro')} />
      <main className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">{content()}</main>

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
