'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

import { auth, db } from '@/lib/firebase';
import { logSystemEvent } from '@/lib/logger';
import { analyzeFile, profileFile, analyzeMultiFile, generateNarrative, exportPDF, exportPPTX, exportCleanedDataset } from '@/lib/api';
import { AnalysisResponseSchema, ChartSchema } from '@/types/analysis';
import { Message as ChatMessage } from '@/components/DataChatbot';
import { normalizeChartPayload } from '@/components/DynamicChartRenderer';
import { useChartExport } from './useChartExport';
import type { ColumnRole } from '@/components/ColumnRoleSelector';


const ADMIN_EMAILS = ['tadeomunozgarces@gmail.com', 'milenapabraham@gmail.com'];

export function useDashboardState() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [filesQueue, setFilesQueue] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFileSize, setActiveFileSize] = useState<number | undefined>(undefined);

  const [targetCol, setTargetCol] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResponseSchema | null>(null);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [downloadingCleanData, setDownloadingCleanData] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [chatLogged, setChatLogged] = useState(false);

  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(true);
  const [generatingNarrative, setGeneratingNarrative] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hola! Soy el Asistente MIO. He analizado tu archivo. Que te gustaria saber sobre los resultados? Tambien podes pedirme que modifique un grafico.',
    },
  ]);

  const [chartOverrides, setChartOverrides] = useState<Record<number, any>>({});

  // --- New state for Etapa 2-3 features ---
  const [profileData, setProfileData] = useState<any | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [columnRoles, setColumnRoles] = useState<Record<string, ColumnRole>>({});
  const [profilingFile, setProfilingFile] = useState<File | null>(null);

  // Chart export registry
  const { registerChart, exportChartsAsPNG } = useChartExport();

  const searchParams = useSearchParams();


  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Restore saved project from localStorage or Firebase
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (!projectId || result) return;

    const loadProjectData = async () => {
      try {
        const stored = localStorage.getItem(`mio_result_${projectId}`);
        if (stored) {
          setResult(JSON.parse(stored));
          toast.success('Proyecto restaurado al instante');
          return;
        }

        if (authLoading) return;

        if (user) {
          setLoading(true);
          const docRef = doc(db, 'users', user.uid, 'analyses', projectId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().result_data) {
            const dataStr = docSnap.data().result_data;
            setResult(JSON.parse(dataStr));
            try {
              localStorage.setItem(`mio_result_${projectId}`, dataStr);
            } catch (e) {
              console.warn('LocalStorage error:', e);
            }
            toast.success('☁️ Proyecto descargado de la nube');
          } else {
            toast.error('El proyecto fue eliminado o no existe en la nube.');
          }
        } else {
          toast.error('Iniciá sesión para abrir proyectos.');
        }
      } catch (e) {
        console.error('Error loading project:', e);
        toast.error('Error al restaurar el proyecto desde la nube.');
      } finally {
        setLoading(false);
      }
    };

    loadProjectData();
  }, [searchParams, user, authLoading, result]);

  // 2b. Restore active analysis on page reload without re-uploading file
  useEffect(() => {
    const projectId = searchParams.get('project');
    const isNew = searchParams.get('new') === 'true' || searchParams.get('reset') === 'true';

    // Si se solicitó explícitamente un nuevo proyecto, limpiar estado previo y salir de inmediato
    if (isNew) {
      try {
        localStorage.removeItem('mio_active_analysis');
      } catch (e) {}
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, '', '/dashboard');
      }
      return;
    }

    if (projectId || result || loading) return;

    if (typeof window === 'undefined') return;

    // Solo restaurar si el usuario recargó explícitamente la página (F5 / Cmd+R / Reload).
    // Si navegó desde otra página (tipo 'navigate'), NO restaurar para permitir iniciar proyectos nuevos limpiamente.
    let isPageReload = false;
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        isPageReload = (navEntries[0] as PerformanceNavigationTiming).type === 'reload';
      } else if ((performance as any).navigation) {
        isPageReload = (performance as any).navigation.type === 1;
      }
    } catch (e) {
      isPageReload = false;
    }

    if (!isPageReload) {
      return;
    }

    const saved = localStorage.getItem('mio_active_analysis');
    if (saved) {
      try {
        const { filename, uploadId, targetCol: savedTarget, fileSize: savedSize } = JSON.parse(saved);
        if (savedSize) setActiveFileSize(savedSize);
        if (filename && uploadId) {
          setLoading(true);
          if (savedTarget) setTargetCol(savedTarget);
          analyzeFile(null, undefined, filename, savedTarget || undefined, uploadId)
            .then((freshData) => {
              setResult(freshData);
              toast.success(`Datos actualizados desde el backend (${filename})`, { id: 'restore-analysis' });
            })
            .catch((err) => {
              console.warn('No se pudo recargar el archivo activo:', err);
              localStorage.removeItem('mio_active_analysis');
            })
            .finally(() => {
              setLoading(false);
            });
        }
      } catch (err) {
        console.error('Error reading mio_active_analysis:', err);
      }
    }
  }, [searchParams, result, loading]);

  // 3. Narrative generation effect
  useEffect(() => {
    async function fetchNarrative() {
      if (result && result.narrative?.source === 'pending' && !generatingNarrative) {
        setGeneratingNarrative(true);
        try {
          const narRes = await generateNarrative({
            profile: result.profile,
            kpis: result.kpis,
            anomalies: result.anomalies?.metrics,
            forecast: result.forecast?.metrics,
            segmentation: result.segmentation?.metrics,
            feature_importance: result.featureImportance?.metrics,
            target_col: result.targetCol,
            filename: result.filename,
          });
          setResult((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              narrative: {
                text: narRes.text,
                source: narRes.source,
              },
            };
          });
        } catch (err) {
          console.error('Error fetching narrative:', err);
          setResult((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              narrative: { text: 'No se pudo generar la narrativa.', source: 'error' },
            };
          });
        } finally {
          setGeneratingNarrative(false);
        }
      }
    }
    fetchNarrative();
  }, [result, generatingNarrative]);

  // 4. Process files queue
  const processQueue = async (queue: File[]) => {
    if (queue.length === 0) return;

    // Si hay multiples archivos, ejecutar el flujo relacional multi-dataset con auto-join
    if (queue.length > 1) {
      setLoading(true);
      setChatLogged(false);
      setChartOverrides({});
      setUploadProgress(0);
      setIsUploading(false);

      try {
        const data = await analyzeMultiFile(queue, targetCol || undefined);
        setResult(data);
        setActiveFileSize(queue.reduce((acc, f) => acc + f.size, 0));
        toast.success(`Analisis relacional completado con exito (${queue.length} archivos unidos).`);

        const metricsPayload = {
          forecast: data.forecast?.metrics || {},
          anomalies: data.anomalies?.metrics || {},
          features: data.featureImportance?.metrics || {},
          segmentation: data.segmentation?.metrics || {},
        };
        logSystemEvent('analysis_success', {
          filename: data.filename,
          uid: user?.uid,
          metrics: metricsPayload,
        });
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Error en el analisis de multiples archivos.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Flujo para archivo individual
    for (let i = 0; i < queue.length; i++) {
      setCurrentFileIndex(i);
      const file = queue[i];
      setLoading(true);
      setChatLogged(false);
      setChartOverrides({});
      setUploadProgress(0);
      setIsUploading(false);

      try {
        const data = await analyzeFile(file, undefined, undefined, targetCol || undefined);
        setResult(data);
        setActiveFileSize(file.size);
        try {
          localStorage.setItem('mio_active_analysis', JSON.stringify({
            filename: data.filename,
            uploadId: data.uploadId,
            targetCol: data.targetCol || targetCol || '',
            fileSize: file.size,
          }));
        } catch (storageErr) {
          console.warn('LocalStorage error:', storageErr);
        }
        toast.success(`Analisis de ${file.name} completado con exito.`);

        const metricsPayload = {
          forecast: data.forecast?.metrics || {},
          anomalies: data.anomalies?.metrics || {},
          features: data.featureImportance?.metrics || {},
          segmentation: data.segmentation?.metrics || {},
        };
        logSystemEvent('analysis_success', {
          filename: file.name,
          uid: user?.uid,
          metrics: metricsPayload,
        });

        if (user) {
          try {
            const savePromise = addDoc(collection(db, 'users', user.uid, 'analyses'), {
              filename: data.filename || 'dataset',
              targetCol: data.targetCol || (data as any).target_column || '',
              created_at: serverTimestamp(),
              result_data: JSON.stringify(data),
            });
            const timeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 8000)
            );
            const docRef = ((await Promise.race([savePromise, timeout])) as any);
            if (docRef?.id) {
              try {
                localStorage.setItem(`mio_result_${docRef.id}`, JSON.stringify(data));
              } catch (storageErr) {
                console.warn('localStorage full');
              }
            }
            logSystemEvent('project_saved', { uid: user.uid, filename: data.filename, auto: true });
            toast.success('Guardado automaticamente en Mis Proyectos');
          } catch (e) {
            console.error('Auto-save error:', e);
          }
        }
      } catch (err: any) {
        console.error(err);
        logSystemEvent('analysis_error', {
          filename: file.name,
          error: err.message,
          uid: user?.uid,
        });
        toast.error(err.message || `Error al analizar ${file.name}`);

        const errMsg = String(err?.message || '').toLowerCase();
        const isNetworkOrServerError =
          errMsg.includes('servidor') ||
          errMsg.includes('conexión') ||
          errMsg.includes('conexion') ||
          errMsg.includes('failed to fetch') ||
          errMsg.includes('network') ||
          errMsg.includes('503') ||
          errMsg.includes('500');

        if (isNetworkOrServerError) {
          break;
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStartAnalysis = async () => {
    if (filesQueue.length === 0) {
      toast.error('Por favor seleccioná un archivo primero.');
      return;
    }
    await processQueue(filesQueue);
    setFilesQueue([]);
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    try {
      const chartImages = await exportChartsAsPNG(12);
      const blob = await exportPDF({
        filename: result.filename,
        targetCol: result.targetCol,
        kpis: result.kpis,
        narrative_text: result.narrative?.text || '',
        profile: result.profile,
        anomaly_metrics: result.anomalies?.metrics || {},
        forecast_metrics: result.forecast?.metrics || {},
        segmentation_metrics: result.segmentation?.metrics || {},
        chart_images: chartImages.map((c) => ({
          chart_id: c.chartId,
          title: c.title,
          base64: c.base64,
        })),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${result.filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado exitosamente con gráficos incrustados');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!result) return;
    setDownloadingPptx(true);
    try {
      const chartImages = await exportChartsAsPNG(12);
      const blob = await exportPPTX({
        filename: result.filename,
        targetCol: result.targetCol,
        kpis: result.kpis,
        narrative_text: result.narrative?.text || '',
        profile: result.profile,
        anomaly_metrics: result.anomalies?.metrics || {},
        forecast_metrics: result.forecast?.metrics || {},
        segmentation_metrics: result.segmentation?.metrics || {},
        chart_images: chartImages.map((c) => ({
          chart_id: c.chartId,
          title: c.title,
          base64: c.base64,
        })),
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presentacion_${result.filename}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PPTX descargado exitosamente con diapositivas de gráficos');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar el PPTX.');
    } finally {
      setDownloadingPptx(false);
    }
  };

  const handleDownloadCleanData = async (format: 'csv' | 'xlsx' = 'csv') => {
    if (!result) return;
    setDownloadingCleanData(true);
    try {
      const activeFile = filesQueue[0];
      const blob = await exportCleanedDataset({
        file: activeFile,
        uploadId: result.uploadId,
        format,
        locale: 'auto',
        outlierAction: 'flag',
      });
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      const baseName = result.filename.replace(/\.[^/.]+$/, '');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `limpio_${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        format === 'xlsx'
          ? 'Excel con datos limpios y bitácora de auditoría descargado'
          : 'CSV con datos limpios descargado exitosamente'
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Error al descargar el dataset limpio.');
    } finally {
      setDownloadingCleanData(false);
    }
  };

  const handleReset = () => {
    try {
      localStorage.removeItem('mio_active_analysis');
    } catch (e) {}
    setFilesQueue([]);
    setResult(null);
    setActiveFileSize(undefined);
    setTargetCol('');
    setChatLogged(false);
    setChartOverrides({});
    setChatMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          '¡Hola! Soy **Asistente MIO**. He analizado tu archivo. ¿Qué te gustaría saber sobre los resultados? También podés pedirme que *modifique un gráfico*.',
      },
    ]);
  };

  const handleRefresh = async () => {
    if (!result?.filename || !result.uploadId) return;
    if (!activeFileSize && result?.profile?.nRows) {
      setActiveFileSize(result.profile.nRows * 95);
    }
    setLoading(true);
    try {
      const freshData = await analyzeFile(
        null,
        undefined,
        result.filename,
        targetCol || result.targetCol || undefined,
        result.uploadId
      );
      setResult(freshData);
      toast.success('Gráficos y análisis recalculados con el backend');
    } catch (err: any) {
      if (err.message?.includes('file') || err.status === 400) {
        toast.error('El servidor en la nube aún no actualizó la caché del archivo. Hacé clic en "Cargar otro archivo" y seleccionalo nuevamente.', { duration: 6000 });
      } else {
        toast.error('Error al refrescar análisis: ' + (err.message || 'Desconocido'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!result || !user) {
      toast.error('Necesitás estar logueado para guardar proyectos.');
      return;
    }
    setSavingProject(true);
    try {
      const savePromise = addDoc(collection(db, 'users', user.uid, 'analyses'), {
        filename: result.filename || 'dataset',
        targetCol: result.targetCol || (result as any).target_column || '',
        kpis: result.kpis || {},
        qualityScore: result.profile?.qualityScore ?? 0,
        narrative_text: result.narrative?.text?.slice(0, 500) || '',
        created_at: serverTimestamp(),
      });
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Timeout: Firestore no respondió. Verificá los permisos en la consola de Firebase.'
              )
            ),
          8000
        )
      );
      const docRef = ((await Promise.race([savePromise, timeout])) as any);

      if (docRef?.id) {
        try {
          localStorage.setItem(`mio_result_${docRef.id}`, JSON.stringify(result));
        } catch (storageErr) {
          console.warn('localStorage full, skipping full result save:', storageErr);
        }
      }

      logSystemEvent('project_saved', { uid: user.uid, filename: result.filename });
      toast.success('Proyecto guardado en Mis Proyectos');
    } catch (e: any) {
      console.error('Firestore save error:', e);
      if (e.message?.includes('Timeout')) {
        toast.error('Tiempo de espera agotado. Verificá los permisos de Firestore.');
      } else if (e.code === 'permission-denied') {
        toast.error('Sin permiso de escritura en Firestore. Actualizá las Rules en Firebase Console.');
      } else {
        toast.error(`Error: ${e.message || 'No se pudo guardar el proyecto.'}`);
      }
    } finally {
      setSavingProject(false);
    }
  };

  const handleChartOverride = (index: number, chartData: any) => {
    if (!result || !result.charts || index < 0 || index >= result.charts.length) {
      toast.error('Asistente IA: No pude identificar ese gráfico.');
      return;
    }
    const normalized = normalizeChartPayload(chartData) || chartData;
    setChartOverrides((prev) => ({ ...prev, [index]: normalized }));
    toast.success(`Gráfico ${index + 1} actualizado por el Asistente IA`);
  };

  const handleLoadSample = (sampleFile: File, sampleTarget: string) => {
    setFilesQueue([sampleFile]);
    setTargetCol(sampleTarget);
  };

  // --- Profile + ColumnRoleSelector flow ---

  /**
   * Called when user drops files on the uploader.
   * If single file: run fast /profile first and show ColumnRoleSelector.
   * If multiple files: go directly to multi-file analyze flow.
   */
  const handleProfileAndSelect = async (files: File[]) => {
    if (files.length === 0) return;

    if (files.length > 1) {
      // Multi-file path: skip profiling, go straight to analysis
      setFilesQueue(files);
      setShowProfileSelector(false);
      return;
    }

    // Single file: fast profile
    const file = files[0];
    setProfilingFile(file);
    setLoading(true);
    try {
      const profData = await profileFile(file);
      setProfileData(profData);
      setShowProfileSelector(true);
    } catch (err: any) {
      toast.error('Error al perfilar el archivo. Continuando con analisis directo.');
      setFilesQueue([file]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Called when user confirms roles in ColumnRoleSelector.
   * Starts the full single-file analysis with column roles.
   */
  const handleConfirmRoles = async (
    confirmedTarget: string,
    confirmedRoles: Record<string, ColumnRole>
  ) => {
    if (!profilingFile) return;
    setShowProfileSelector(false);
    setColumnRoles(confirmedRoles);
    setTargetCol(confirmedTarget);
    setLoading(true);
    setChatLogged(false);
    setChartOverrides({});

    try {
      const data = await analyzeFile(
        profilingFile,
        undefined,
        undefined,
        confirmedTarget,
        undefined,
        confirmedRoles as Record<string, string>
      );
      setResult(data);
      setActiveFileSize(profilingFile.size);
      try {
        localStorage.setItem('mio_active_analysis', JSON.stringify({
          filename: data.filename,
          uploadId: data.uploadId,
          targetCol: data.targetCol || confirmedTarget,
          fileSize: profilingFile.size,
        }));
      } catch (storageErr) {
        console.warn('LocalStorage error:', storageErr);
      }
      toast.success(`Analisis de ${profilingFile.name} completado!`);
      setProfilingFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Error al analizar el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProfileSelector = () => {
    setShowProfileSelector(false);
    setProfileData(null);
    setProfilingFile(null);
  };

  const effectiveCharts: ChartSchema[] = (result?.charts || []).map((c, i) => chartOverrides[i] || c);
  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email));

  return {
    user,
    authLoading,
    isAdmin,
    filesQueue,
    setFilesQueue,
    currentFileIndex,
    uploadProgress,
    isUploading,
    activeFileSize,
    targetCol,
    setTargetCol,
    loading,
    result,
    downloadingPdf,
    downloadingPptx,
    downloadingCleanData,
    savingProject,
    isNarrativeExpanded,
    setIsNarrativeExpanded,
    chatMessages,
    setChatMessages,
    chartOverrides,
    effectiveCharts,
    // New profiling and multi-file state
    profileData,
    showProfileSelector,
    columnRoles,
    profilingFile,
    // Chart export
    registerChart,
    exportChartsAsPNG,
    // Handlers
    handleStartAnalysis,
    handleProfileAndSelect,
    handleConfirmRoles,
    handleCancelProfileSelector,
    handleDownloadPdf,
    handleDownloadPptx,
    handleDownloadCleanData,
    handleReset,
    handleRefresh,
    handleSaveProject,
    handleChartOverride,
    handleLoadSample,
  };
}
