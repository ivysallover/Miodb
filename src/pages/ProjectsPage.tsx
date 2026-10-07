import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowRight, FileSpreadsheet, Sun, Moon } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { playMioDevSound } from '@/lib/sound';
import { auth, db } from '@/lib/firebase';
import { apiClient } from '@/lib/apiClient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { hydrateProjectAnalysis } from '@/utils/projectAnalysisHydrator';
import { buildModel, type Finding } from '@/components/dashboard/insights';

/** The main thing MIO found in a saved analysis, when its data is stored with it. */
const headline = (data: any): Finding | null => {
  if (!data || typeof data !== 'object') return null;
  try {
    return buildModel(data.result || data).findings[0] || null;
  } catch {
    return null;
  }
};

export const ProjectsPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const setTheme = useMioStore((s) => s.setTheme);
  const setPendingAnalysis = useMioStore((s) => s.setPendingAnalysis);
  const isDark = theme === 'dark';

  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    // 1. Cargar proyectos de localStorage primero y sanitizar duplicados heredados
    try {
      const raw = localStorage.getItem('mio_projects');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const sanitizedLocal: any[] = [];
          for (const item of parsed) {
            const key = item.filename || item.title || item.upload_id || item.id;
            if (key && !seen.has(key)) {
              seen.add(key);
              sanitizedLocal.push(item);
            }
          }
          setProjects(sanitizedLocal);
          localStorage.setItem('mio_projects', JSON.stringify(sanitizedLocal));
        }
      } else {
        setProjects([
          {
            id: 'proj-demo-1',
            upload_id: 'proj-demo-1',
            title: 'Ventas Trimestrales Retail 2026',
            records: '14,200 filas',
            bestModel: 'LightGBM Regressor (R²: 0.984)',
            updatedAt: 'Hace 2 horas',
            status: 'Completado',
          },
          {
            id: 'proj-demo-2',
            upload_id: 'proj-demo-2',
            title: 'Pronóstico de Demanda SKU Cadena Frío',
            records: '8,450 filas',
            bestModel: 'Facebook Prophet + ARIMA (MAPE: 3.2%)',
            updatedAt: 'Ayer',
            status: 'Completado',
            targetCol: 'demanda_unidades',
          },
        ]);
      }
    } catch {}

    // 2. Si el usuario está autenticado en Firebase, sincronizar con Firestore
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(collection(db, 'users', user.uid, 'analyses'), orderBy('created_at', 'desc'));
          const snap = await getDocs(q);

          let localProjects: any[] = [];
          try {
            const rawProjects = localStorage.getItem('mio_projects');
            if (rawProjects) localProjects = JSON.parse(rawProjects);
          } catch {}

          // Consolidar y deduplicar proyectos para que jamás se repitan en pantalla
          const seenKeys = new Set<string>();
          const cloudProjects: any[] = [];

          for (const d of snap.docs) {
            const docData = d.data();
            const targetUploadId = docData.upload_id || d.id;
            const fname = docData.filename;
            
            // Llave de deduplicación: si tiene filename específico usarlo para colapsar duplicados
            const dedupeKey = (fname && fname !== 'Dataset Guardado' && fname !== 'Dataset Analizado')
              ? fname
              : (targetUploadId || d.id);

            if (seenKeys.has(dedupeKey)) continue;
            seenKeys.add(dedupeKey);

            // Asociar los datos analíticos completos: primero de Firestore, luego de memoria local
            let analysisData = docData.data || docData.analysis || null;
            if (!analysisData) {
              const match = localProjects.find((lp: any) => 
                lp.id === targetUploadId || 
                lp.upload_id === targetUploadId ||
                (fname && (lp.title === fname || lp.filename === fname))
              );
              if (match && match.data) {
                analysisData = match.data;
              } else {
                try {
                  const cachedRaw = localStorage.getItem(`mio_result_${targetUploadId}`) ||
                    (fname ? localStorage.getItem(`mio_result_${fname}`) : null);
                  if (cachedRaw) analysisData = JSON.parse(cachedRaw);
                } catch {}
              }
            }

            // Si aún no hay analysisData, verificar si coincide con el análisis activo en el cliente
            if (!analysisData) {
              try {
                const activeRaw = localStorage.getItem('mio_active_analysis');
                if (activeRaw) {
                  const active = JSON.parse(activeRaw);
                  if (active && (
                    active.upload_id === targetUploadId ||
                    active.id === targetUploadId ||
                    (fname && (active.filename === fname || active.title === fname))
                  )) {
                    analysisData = active;
                  }
                }
              } catch {}
            }

            cloudProjects.push({
              id: d.id,
              upload_id: targetUploadId,
              title: fname || 'Dataset Guardado',
              filename: fname,
              // Only real values: no made-up row counts or model names when the record lacks them.
              records: (() => {
                const n = docData.kpis?.total_records || docData.profile?.n_rows || docData.records;
                return n ? `${Number(n).toLocaleString('es-AR')} filas` : '';
              })(),
              bestModel: docData.best_model || docData.kpis?.best_model || '',
              updatedAt: docData.created_at?.toDate ? docData.created_at.toDate().toLocaleDateString() : 'Nube',
              status: 'Completado',
              data: analysisData,
              ...docData,
            });
          }

          if (cloudProjects.length > 0) {
            setProjects((prev) => {
              const cloudIds = new Set(cloudProjects.map((c) => c.id));
              const cloudUploadIds = new Set(cloudProjects.map((c) => c.upload_id));
              const cloudTitles = new Set(cloudProjects.map((c) => c.title));
              const localRest = prev.filter((p) => 
                !cloudIds.has(p.id) && 
                !cloudUploadIds.has(p.id) && 
                !cloudUploadIds.has(p.upload_id) &&
                !cloudTitles.has(p.title) &&
                !(p.filename && cloudTitles.has(p.filename))
              );
              return [...cloudProjects, ...localRest];
            });
          }
        } catch (e) {
          console.warn('Error leyendo análisis de Firestore:', e);
        }
      }
    });

    return () => unsub();
  }, []);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDelete = async (id: string) => {
    playMioDevSound('tick');
    const target = projects.find((p) => p.id === id);
    const fname = target?.filename || target?.title;
    const uid = target?.data?.upload_id || target?.upload_id || target?.id;
    if (uid) {
      apiClient.deleteUpload(uid).catch((err) => console.warn('Could not delete upload from backend:', err));
    }

    const updated = projects.filter((p) => p.id !== id && (fname ? (p.title !== fname && p.filename !== fname) : true));
    setProjects(updated);
    try {
      localStorage.setItem('mio_projects', JSON.stringify(updated));
      localStorage.removeItem(`mio_result_${id}`);
      if (uid) localStorage.removeItem(`mio_result_${uid}`);
      if (fname) localStorage.removeItem(`mio_result_${fname}`);
    } catch {}

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'analyses', id));
        if (fname && fname !== 'Dataset Guardado' && fname !== 'Dataset Analizado') {
          const docId = fname.replace(/[^a-zA-Z0-9_-]/g, '_');
          await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'analyses', docId)).catch(() => {});
        }
      } catch (e) {
        console.warn('Error al borrar de Firestore:', e);
      }
    }
  };

  const handleOpenProject = (p: any) => {
    playMioDevSound('buttonA');
    const fullAnalysis = hydrateProjectAnalysis(p);
    if (!fullAnalysis) return;

    // 1. Persist in localStorage as backup
    try {
      localStorage.setItem('mio_active_analysis', JSON.stringify(fullAnalysis));
      const uid = fullAnalysis.upload_id || fullAnalysis.uploadId;
      if (uid) {
        localStorage.setItem(`mio_result_${uid}`, JSON.stringify(fullAnalysis));
      }
      if (p.id) {
        localStorage.setItem(`mio_result_${p.id}`, JSON.stringify(fullAnalysis));
      }
    } catch (err) {
      console.warn('Error guardando en active analysis:', err);
    }

    // 2. Primary bridge: write to Zustand store — no timing issues whatsoever
    // DashboardPage will consume this immediately on mount
    setPendingAnalysis(fullAnalysis);

    // 3. Navigate
    window.history.pushState({}, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className={`mio-sheet-bg min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#07070a] text-zinc-100' : 'bg-[#f3f3f5] text-zinc-950'}`}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#f3f3f5] dark:bg-[#07070a] border-b border-black/[0.06] dark:border-white/[0.08] h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
              isDark
                ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al inicio</span>
          </button>

          <div className="flex items-baseline gap-1.5 font-mono font-bold">
            <span className="text-sm tracking-tight text-zinc-950 dark:text-white">MIS ANÁLISIS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-[0.95] cursor-pointer ${
              isDark
                ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
            }`}
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              try { localStorage.removeItem('mio_active_analysis'); } catch {}
              navigateTo('/dashboard?new=1');
            }}
            className="text-xs font-mono font-bold px-4 py-2 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-[#bdf559]" />
            <span>Nuevo Análisis</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">Mis proyectos</p>
          <h1 className="mt-1 text-4xl sm:text-6xl font-extrabold font-sans tracking-[-0.045em] leading-[1.0] text-zinc-950 dark:text-white">Tus análisis guardados</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            Retomá cualquier análisis donde lo dejaste.
          </p>
        </div>

        {projects.length > 0 ? (
          <div className="grid gap-2.5 sm:gap-3">
            {projects.map((p) => {
              const finding = headline(p.data);
              return (
                <div
                  key={p.id}
                  className="rounded-mio bg-white dark:bg-[#0e0d16] p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5"
                >
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white [overflow-wrap:anywhere]">
                      {p.title || 'Planilla'}
                    </h3>
                    {/* What MIO found in it, so the list reads as a list of results, not of files */}
                    {finding && (
                      <p className="mt-1.5 max-w-2xl text-sm leading-snug text-zinc-700 dark:text-zinc-300">
                        <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">{finding.tag}:</span> {finding.big ? `${finding.big} ` : ''}{finding.text}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {[p.records, `Actualizado ${p.updatedAt || 'recién'}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-500/10 transition-colors duration-150 cursor-pointer"
                      title="Eliminar este análisis"
                      aria-label={`Eliminar ${p.title || 'este análisis'}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenProject(p)}
                      className="min-h-[44px] px-5 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white text-sm font-bold transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] flex items-center gap-2 cursor-pointer"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-4 h-4 text-[#bdf559]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-mio bg-white dark:bg-[#0e0d16] p-8 sm:p-12">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">Todavía vacío</p>
              <h3 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-[-0.035em] leading-[1.05] text-zinc-950 dark:text-white">
                Acá van a quedar tus análisis.
              </h3>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Subí un Excel o CSV tal como lo tenés. MIO te muestra qué se salió de lo normal, qué lo mueve y qué puede venir, y lo guarda acá para que lo retomes.
              </p>
              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem('mio_active_analysis'); } catch {}
                  navigateTo('/dashboard?new=1');
                }}
                className="mt-6 min-h-[48px] px-6 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white text-sm font-bold transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#bdf559]" />
                <span>Subir mi primera planilla</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProjectsPage;
