'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import ProjectCard from '@/components/ProjectCard';
import { Layers, Plus, Loader2 } from 'lucide-react';
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
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <MioBackgroundShader theme="light" opacity={0.42} />
      </div>

      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 relative z-10">
        <ScrollReveal direction="up">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-mio-lime border-2 border-[#111] shadow-[3px_3px_0px_#111] flex items-center justify-center">
                  <Layers className="w-5 h-5 text-gray-900" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mis Proyectos</h1>
              </div>
              <p className="text-sm text-gray-500 ml-[52px]">Historial de análisis guardados automáticamente</p>
            </div>

            <button
              onClick={() => {
                try {
                  localStorage.removeItem('mio_active_analysis');
                } catch (e) {}
                router.push('/dashboard?new=true');
              }}
              className="inline-flex items-center gap-2 px-5 py-3 bg-mio-violet text-white border-2 border-[#111] shadow-[4px_4px_0px_#111] hover:shadow-[2px_2px_0px_#111] hover:translate-y-[2px] font-bold text-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Análisis
            </button>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-mio-violet" />
            <p className="text-sm font-medium">Cargando proyectos...</p>
          </div>
        ) : projects.length === 0 ? (
          <ScrollReveal direction="up" delay={0.1}>
            <div className="flex flex-col items-center justify-center py-24 gap-4 border-2 border-dashed border-gray-300 bg-white">
              <div className="w-16 h-16 bg-mio-lime/30 border-2 border-[#111] flex items-center justify-center">
                <Layers className="w-8 h-8 text-gray-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-700 text-lg">No tenés proyectos aún</p>
                <p className="text-sm text-gray-400 mt-1">Cada análisis que ejecutes se guarda automáticamente aquí</p>
              </div>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('mio_active_analysis');
                  } catch (e) {}
                  router.push('/dashboard?new=true');
                }}
                className="mt-2 px-6 py-3 bg-mio-lime border-2 border-[#111] shadow-[3px_3px_0px_#111] font-bold text-sm hover:shadow-[1px_1px_0px_#111] hover:translate-y-0.5 transition-all"
              >
                Crear Nuevo Análisis
              </button>
            </div>
          </ScrollReveal>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
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
