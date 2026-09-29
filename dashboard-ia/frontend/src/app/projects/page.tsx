'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import { Layers, Plus, Loader2, Sparkles } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/ScrollReveal';
import { useProjectsState } from '@/features/projects/useProjectsState';

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

export default function ProjectsPage() {
  const { projects, loading, handleDelete, router } = useProjectsState();

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col relative overflow-hidden selection:bg-mio-lime selection:text-black">
      {/* Fondo interactivo de Shaders MIO */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <MioBackgroundShader theme="light" opacity={0.45} />
      </div>

      <Navbar />

      <main id="main-content" tabIndex={-1} className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 relative z-10 focus:outline-none">
        <ScrollReveal direction="up">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-[#7647eb]/10 border border-[#7647eb]/20 flex items-center justify-center text-[#7647eb]">
                  <Layers className="w-5 h-5" aria-hidden="true" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-950 tracking-tight font-sans">Mis Proyectos</h1>
              </div>
              <p className="text-xs text-gray-500 ml-[52px] font-medium">
                Historial de diagnósticos y modelos sincronizados automáticamente
              </p>
            </div>

            <button
              onClick={() => {
                try {
                  localStorage.removeItem('mio_active_analysis');
                } catch (e) {}
                router.push('/dashboard?new=true');
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7647eb] hover:bg-[#602cd1] text-white rounded-full font-mono font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#bdf559]" />
              <span>Nuevo Análisis</span>
            </button>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#7647eb]" />
            <p className="text-sm font-mono font-medium">Cargando proyectos desde Firestore...</p>
          </div>
        ) : projects.length === 0 ? (
          <ScrollReveal direction="up" delay={0.1}>
            <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-dashed border-zinc-300 bg-white/95 backdrop-blur-xl shadow-sm text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#7647eb]/10 flex items-center justify-center mb-3 text-[#7647eb]">
                <Layers className="w-7 h-7" />
              </div>
              <p className="font-bold text-gray-900 text-lg">No tenés proyectos aún</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Cada planilla que cargues y diagnostiques se guardará automáticamente en este panel.
              </p>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('mio_active_analysis');
                  } catch (e) {}
                  router.push('/dashboard?new=true');
                }}
                className="mt-5 px-6 py-2.5 bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono font-bold text-xs rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-[#bdf559]" />
                <span>Crear Primer Análisis</span>
              </button>
            </div>
          </ScrollReveal>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
                {projects.length} análisis guardados
              </span>
            </div>
            <StaggerContainer staggerDelay={0.08}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map((p, i) => (
                  <StaggerItem key={p.id} direction="up">
                    <ProjectCard project={p} index={i} onDelete={handleDelete} />
                  </StaggerItem>
                ))}
              </div>
            </StaggerContainer>
          </>
        )}
      </main>
    </div>
  );
}
