import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowRight, FileSpreadsheet, Sun, Moon } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { playMioDevSound } from '@/lib/sound';

export const ProjectsPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const setTheme = useMioStore((s) => s.setTheme);
  const isDark = theme === 'dark';

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mio_projects');
      if (raw) {
        setProjects(JSON.parse(raw));
      } else {
        setProjects([
          {
            id: 'proj-demo-1',
            title: 'Ventas Trimestrales Retail 2026',
            records: '14,200 filas',
            bestModel: 'LightGBM Regressor (R²: 0.984)',
            updatedAt: 'Hace 2 horas',
            status: 'Completado',
          },
          {
            id: 'proj-demo-2',
            title: 'Pronóstico de Demanda SKU Cadena Frío',
            records: '8,450 filas',
            bestModel: 'Facebook Prophet + ARIMA (MAPE: 3.2%)',
            updatedAt: 'Ayer',
            status: 'Completado',
          },
        ]);
      }
    } catch {}
  }, []);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDelete = (id: string) => {
    playMioDevSound('tick');
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    try {
      localStorage.setItem('mio_projects', JSON.stringify(updated));
    } catch {}
  };

  const handleOpenProject = (_p: any) => {
    playMioDevSound('buttonA');
    navigateTo('/dashboard');
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Landing</span>
          </button>

          <div className="flex items-baseline gap-1.5 font-mono font-bold">
            <span className="text-sm tracking-tight">MIS PROYECTOS MIO</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer"
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => navigateTo('/dashboard')}
            className="text-xs font-mono font-bold px-4 py-2 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Análisis</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 select-none">
        <div>
          <h1 className="text-3xl font-black font-sans tracking-tight text-zinc-950 dark:text-white">Proyectos y Diagnósticos Guardados</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Accedé a tus modelos predictivos, tablas de anomalías y reportes ejecutivos generados
          </p>
        </div>

        <div className="grid gap-3.5">
          {projects.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:scale-[1.005]"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#7647eb]/10 dark:bg-[#7647eb]/20 border border-[#7647eb]/30 flex items-center justify-center shrink-0 text-[#7647eb] dark:text-[#a78bfa]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-zinc-950 dark:text-white">
                      {p.title || 'Planilla'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#bdf559]/20 text-emerald-800 dark:text-[#bdf559] font-bold">
                      {p.status || 'Completado'}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
                    {p.records || '10,000 filas'} • {p.bestModel || 'AutoML LightGBM'} • Actualizado {p.updatedAt || 'Recién'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title="Eliminar proyecto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenProject(p)}
                  className="px-4 py-2 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Abrir Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#bdf559]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ProjectsPage;
