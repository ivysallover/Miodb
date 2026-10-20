import React from 'react';
import { FolderOpen } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { ResultadoMejorado } from '@/components/dashboard/ResultadoMejorado';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { Analizando } from '@/components/escritorio/Analizando';
import { Inicio, PRIMARY } from '@/components/escritorio/Inicio';
import { ResultHeader } from '@/components/escritorio/ResultHeader';
import { inDesktop } from '@/components/escritorio/desktop';
import { useDesktop } from '@/components/escritorio/useDesktop';

/**
 * La pantalla de la app de escritorio (Tauri): inicio con los proyectos guardados, la espera mientras
 * analiza y el resultado, con la misma vista de resultados de la web (`ResultadoMejorado`). Todo pasa
 * en esta compu; lo que hace cada parte está en `src/components/escritorio/`.
 */
export const EscritorioPage: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const d = useDesktop();
  if (!inDesktop()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className={`rounded-mio p-6 sm:p-8 ${isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950'}`}>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em]">Esta pantalla es de la app de escritorio.</h1>
          <p className={`mt-3 text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Abrila desde MIO para escritorio: ahí la planilla se analiza en tu compu, sin subirla.</p>
        </div>
      </main>
    );
  }

  const { phase } = d;
  return (
    <main className="mx-auto w-full max-w-7xl space-y-2.5 px-4 py-6 sm:space-y-3 sm:px-6 sm:py-8">
      {d.dragging && (
        <div className="pointer-events-none fixed inset-3 z-50 flex items-center justify-center rounded-mio bg-[#7647eb]/95 text-white">
          <div className="flex items-center gap-6">
            <MioPet2D mood="celebrando" size={120} showShadow={false} animated />
            <p className="text-4xl font-extrabold tracking-[-0.04em]">Soltala y la analizo.</p>
          </div>
        </div>
      )}

      {phase.kind === 'inicio' && <Inicio isDark={isDark} projects={d.projects} onChoose={d.choose} onOpen={d.open} onRemove={d.remove} />}

      {phase.kind === 'abriendo' && <Analizando name={phase.name} progress={d.progress} isDark={isDark} />}

      {phase.kind === 'error' && (
        <section role="alert" className={`flex flex-col items-start gap-6 rounded-mio p-7 sm:flex-row sm:items-center sm:p-10 ${isDark ? 'bg-[#3a1220] text-[#ffd5dc]' : 'bg-[#ffe3e6] text-[#7a1022]'}`}>
          <MioPet2D mood="anomalia" size={120} showShadow={false} animated />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-[-0.035em]">No pude abrir esta planilla.</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed">{phase.message}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button type="button" onClick={d.choose} className={PRIMARY}>
                <FolderOpen className="h-5 w-5" aria-hidden /> Elegir otra planilla
              </button>
              <button type="button" onClick={d.home} className="text-sm font-bold underline underline-offset-4 cursor-pointer">Volver a los proyectos</button>
            </div>
          </div>
        </section>
      )}

      {phase.kind === 'listo' && (
        <>
          <ResultHeader result={phase.result} opened={phase.opened} busy={d.reanalyzing} progress={d.progress} isDark={isDark} onHome={d.home} onChoose={d.choose} onAnalyze={d.reanalyze} onSheet={(hoja) => d.open(phase.path, hoja)} />
          <ResultadoMejorado result={phase.result} isDark={isDark} />
        </>
      )}
    </main>
  );
};

export default EscritorioPage;
