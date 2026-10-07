import { ResultadoMejorado } from '@/components/dashboard/ResultadoMejorado';
import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { SectionIndex, type IndexItem } from '@/components/dashboard/SectionIndex';
import { buildModel, inValueOrder, suggestedQuestions, summaryText, pct as fmtPct } from '@/components/dashboard/insights';
import {
  Sparkles,
  ArrowLeft,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  Send,
  Loader2,
  ShieldCheck,
  Download,
  Presentation,
  Sun,
  Moon,
  Bookmark,
  Check,
  UploadCloud,
  Play,
  ChevronDown,
  Copy,
} from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { apiClient } from '@/lib/apiClient';
import { playMioDevSound } from '@/lib/sound';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  ExploratoryCharts,
  ForecastSection,
  SegmentationSection,
  AnomaliesSection,
  FeatureImportanceSection,
} from '@/features/dashboard/components';
import DatasetJoinPanel from '@/components/DatasetJoinPanel';
import LoadingAnalysis from '@/components/LoadingAnalysis';
import ColumnRoleSelector, { ColumnRole, ProfileData, getHighestWeightColumn, inferIntelligentRoles } from '@/components/ColumnRoleSelector';
import { DataConsentModal } from '@/components/ui/DataConsentModal';
import { hydrateProjectAnalysis } from '@/utils/projectAnalysisHydrator';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { profileFileClientSide } from '@/utils/clientDataProfiler';
import { askGemini } from '@/lib/geminiChat';
import { prepareForUpload } from '@/utils/prepareUpload';



interface AnalysisResult {
  upload_id?: string;
  filename?: string;
  profile?: {
    n_rows?: number;
    n_cols?: number;
    nRows?: number;
    nCols?: number;
    quality_score?: number;
    qualityScore?: number;
    quality_label?: string;
    numeric_columns?: string[];
    categorical_columns?: string[];
    suggested_targets?: string[];
  };
  kpis?: Record<string, any>;
  charts?: any[];
  forecast?: {
    metrics?: Record<string, any>;
    chart_data?: any;
    chartData?: any;
  };
  anomalies?: {
    metrics?: {
      n_anomalias?: number;
      nAnomalias?: number;
      pct_anomalias?: number;
      pctAnomalias?: number;
      anomalias_detalle?: any[];
      table_columns?: string[];
      [key: string]: any;
    };
    chart_data?: any;
    chartData?: any;
  };
  feature_importance?: {
    metrics?: Record<string, any>;
  };
  narrative?: {
    text?: string;
    source?: string;
  };
}

const Presentar = lazy(() => import('@/components/dashboard/Presentar'));

/** What went wrong with an analysis, in words that help decide what to do next. */
function friendlyError(err: any): string {
  const raw = String(err?.message || err || '');
  if (/failed to fetch|networkerror|load failed|no se pudo conectar|timeout|timed out|502|503|504/i.test(raw)) {
    return 'No pudimos comunicarnos con el servidor de MIO. Suele pasar cuando recién se está despertando: esperá un minuto y probá de nuevo.';
  }
  if (/413|too large|demasiado grande|payload/i.test(raw)) {
    return 'El archivo es demasiado pesado para analizarlo de una vez. Probá con menos filas o con un solo período.';
  }
  if (/vac[ií]o|empty|no columns|sin columnas|no data/i.test(raw)) {
    return 'La planilla parece estar vacía o no tiene encabezados. Fijate que la primera fila tenga los nombres de las columnas.';
  }
  if (/encoding|codec|decode|utf|parse|tokeniz|delimiter|separador/i.test(raw)) {
    return 'No pudimos leer el archivo. Guardalo de nuevo como CSV (UTF-8) o como Excel y volvé a subirlo.';
  }
  return raw && raw.length < 160 && !/fastapi|traceback|exception|undefined/i.test(raw)
    ? raw
    : 'El análisis no se pudo completar. Probá de nuevo; si vuelve a pasar, revisá que el archivo abra bien en Excel.';
}

/**
 * The example sheet: half a year of daily sales of an invented shop, always the same (seeded).
 * It is long enough for everything MIO does to show up: a weekly rhythm, a slow rise, groups
 * that differ, one extraordinary day and one that looks like a loading error. Dates are written
 * day/month/year, the way sheets are kept here.
 */
function buildSampleCsv(): string {
  let seed = 20250106;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const cats: [string, number][] = [['Electrónica', 1.18], ['Hogar', 0.88], ['Indumentaria', 1.0]];
  const byWeekday = [0.74, 0.9, 0.94, 1.0, 1.06, 1.3, 1.24]; // Sunday … Saturday
  const rows = ['fecha,ventas,clientes,categoria,gasto_marketing,descuento_pct'];
  const start = new Date(2025, 0, 6);
  for (let i = 0; i < 182; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const [cat, catWeight] = cats[Math.floor(rnd() * cats.length)];
    const marketing = Math.round(1800 + rnd() * 1400 + (d.getDay() === 5 ? 600 : 0));
    const discount = [0, 0, 5, 5, 10, 15][Math.floor(rnd() * 6)];
    let sales = 42000 * byWeekday[d.getDay()] * (1 + i * 0.0016) * catWeight * (1 + (marketing - 2500) / 9000) * (1 + discount / 120) * (0.94 + rnd() * 0.12);
    if (i === 67) sales *= 1.7;
    if (i === 131) sales *= 0.55;
    const clients = Math.round(sales / (330 + rnd() * 60));
    const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    rows.push([date, Math.round(sales), clients, cat, marketing, discount].join(','));
  }
  return rows.join('\n');
}

export const DashboardPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const setTheme = useMioStore((s) => s.setTheme);
  const consumePendingAnalysis = useMioStore((s) => s.consumePendingAnalysis);
  const isDark = theme === 'dark';

  const [files, setFiles] = useState<File[]>([]);
  const file = files[0] || null;
  const [targetCol, setTargetCol] = useState('');
  const [columnRoles, setColumnRoles] = useState<Record<string, ColumnRole>>({});
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [isProfiling, setIsProfiling] = useState(false);
  const [isProjectSaved, setIsProjectSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  // Two ways to read the same result: "Trabajo" (every chart and metric in sight) and "Presentación"
  // (the story, explained). The stored values keep their first names so nobody loses their choice.
  const [dashMode, setDashMode] = useState<'clasico' | 'mejorado'>(() => {
    try { return localStorage.getItem('mio_dash_mode') === 'clasico' ? 'clasico' : 'mejorado'; } catch { return 'mejorado'; }
  });
  const chooseMode = (m: 'clasico' | 'mejorado') => {
    setDashMode(m);
    try { localStorage.setItem('mio_dash_mode', m); } catch {}
  };
  const modeSwitch = (
    <div role="radiogroup" aria-label="Cómo ver el análisis" className={`inline-flex rounded-full border p-1 font-mono text-xs font-bold ${isDark ? 'border-white/15 bg-white/[0.04]' : 'border-zinc-300 bg-white'}`}>
      {([['clasico', 'Trabajo', 'Todos los gráficos y métricas a la vista'], ['mejorado', 'Presentación', 'Lo importante, explicado y listo para mostrar']] as const).map(([m, label, hint]) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={dashMode === m}
          title={hint}
          onClick={() => chooseMode(m)}
          className={`min-h-[36px] rounded-full px-4 transition-colors duration-200 cursor-pointer ${dashMode === m ? 'bg-[#7647eb] text-white' : isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-700 hover:text-zinc-950'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const model = useMemo(() => (result ? buildModel(result) : null), [result]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: MouseEvent) => { if (!exportRef.current?.contains(e.target as Node)) setExportOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExportOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [exportOpen]);

  /** What MIO found, as plain text on the clipboard: ready for a chat or a mail. */
  const copySummary = async () => {
    if (!model || !result) return;
    const text = summaryText(model, result.filename || file?.name || 'tu planilla');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers and non-secure origins: fall back to a hidden field.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* nothing else to try */ }
      document.body.removeChild(ta);
    }
    playMioDevSound('select');
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  /** The charts on screen, as images, so the PDF and the PPTX carry them. */
  const collectChartImages = async () => {
    try {
      const c = await import('../../dashboard-ia/frontend/src/components/charts/capture');
      return await c.captureAll(resultsRef.current || document, 12);
    } catch {
      return [];
    }
  };
  /** The written summary plus what MIO found, in plain text for the report. */
  const reportNarrative = (fallback: string) => {
    const base = narrativeText || fallback;
    const found = (model?.findings || []).map((f) => `- ${f.tag}: ${f.big ? `${f.big} ` : ''}${f.text}`.replace(/\u2212/g, '-'));
    return found.length ? `${base}\n\nLo que encontro MIO:\n${found.join('\n')}` : base;
  };

  // Chat copilot state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: '¡Hola! Soy MIO. Preguntame lo que quieras sobre tu planilla: qué pasó, qué se salió de lo normal o por qué.',
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [downloadingCleanData, setDownloadingCleanData] = useState(false);

  // Data consent state — blocks file processing until explicit opt-in
  const [showDataConsent, setShowDataConsent] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const pendingFile = pendingFiles[0] || null;
  const [dataConsentGranted, setDataConsentGranted] = useState(() => {
    try {
      return localStorage.getItem('mio_data_consent_granted') === 'true';
    } catch { return false; }
  });

  // Listen to reset events and URL params
  useEffect(() => {
    const handleReset = () => {
      handleResetAnalysis();
    };
    window.addEventListener('mio:reset-dashboard', handleReset);

    const checkUrlAndCached = () => {
      // Prioridad 1: Si hay un análisis pendiente en Zustand (cargado desde Proyectos u otra pantalla)
      const pending = consumePendingAnalysis();
      if (pending) {
        setResult(pending);
        try { localStorage.setItem('mio_active_analysis', JSON.stringify(pending)); } catch {}
        return;
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === '1' || params.get('upload') === '1') {
        handleResetAnalysis();
        if (params.get('sample') === '1') window.setTimeout(() => handleLoadSample(), 80);
        return;
      }
      const restore = () => {
        try {
          const cached = localStorage.getItem('mio_active_analysis');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed) {
              const hydrated = hydrateProjectAnalysis(parsed);
              setResult(hydrated);
            }
          }
        } catch {}
      };
      restore();
      setTimeout(restore, 20);
    };

    // Al montar, chequear estado inicial
    checkUrlAndCached();
    window.addEventListener('popstate', checkUrlAndCached);

    return () => {
      window.removeEventListener('mio:reset-dashboard', handleReset);
      window.removeEventListener('popstate', checkUrlAndCached);
    };
  }, []);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files || []);
    if (droppedFiles.length > 0) {
      validateAndSetFiles(droppedFiles);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      validateAndSetFiles(selectedFiles);
    }
  };

  const handleProfileFile = async (f: File) => {
    setIsProfiling(true);
    setErrorMessage(null);
    try {
      // 1. Inferencia ultrarrápida del lado cliente para asegurar que campos numéricos (como price_usd_per_kg o precio) nunca caigan a categóricos
      const clientProfile = await profileFileClientSide(f);
      if (clientProfile && clientProfile.columns && clientProfile.columns.length > 0) {
        const autoRoles = inferIntelligentRoles(clientProfile);
        setColumnRoles(autoRoles);
        const bestTarget = getHighestWeightColumn(clientProfile);
        if (bestTarget) {
          setTargetCol(bestTarget);
        }
        setProfileData(clientProfile);
        setShowProfileSelector(true);
        playMioDevSound('buttonA');
      } else {
        // 2. Fallback a FastAPI solo si el cliente no pudo parsear columnas (ej: archivos .xlsx binarios)
        try {
          const data = await apiClient.profileFile(f);
          if (data && data.columns && data.columns.length > 0) {
            const backendRoles = inferIntelligentRoles(data);
            setColumnRoles(backendRoles);
            const bestTarget = getHighestWeightColumn(data);
            if (bestTarget) setTargetCol(bestTarget);
            setProfileData(data);
            setShowProfileSelector(true);
            playMioDevSound('buttonA');
          }
        } catch (e) {
          console.warn('Backend profile fallback error:', e);
        }
      }
    } catch (err: any) {
      console.warn('Fast profiling error, continuing with direct analysis:', err);
      setShowProfileSelector(false);
      setErrorMessage(null);
    } finally {
      setIsProfiling(false);
    }
  };

  const validateAndSetFiles = (rawFiles: File[]) => {
    const validExts = ['.csv', '.xlsx', '.xls', '.json'];
    const validFiles = rawFiles.filter((f) => {
      const name = f.name.toLowerCase();
      return validExts.some((ext) => name.endsWith(ext));
    });

    if (validFiles.length === 0) {
      setErrorMessage('Formato no soportado. Por favor subí archivos .csv, .xlsx, .xls o .json');
      return;
    }

    if (validFiles.length > 5) {
      setErrorMessage('Podés subir hasta un máximo de 5 archivos simultáneos para el análisis relacional.');
      return;
    }

    setErrorMessage(null);
    setResult(null);
    setShowProfileSelector(false);
    setColumnRoles({});
    try { localStorage.removeItem('mio_active_analysis'); } catch {}

    // Ordenar por peso descendente (fact table primero) para que el archivo con más datos defina las variables
    const sortedBySize = [...validFiles].sort((a, b) => b.size - a.size);

    // If consent not yet granted, show modal and defer file processing
    if (!dataConsentGranted) {
      setPendingFiles(sortedBySize);
      setShowDataConsent(true);
      return;
    }

    // Consent already granted — proceed
    setFiles(sortedBySize);
    playMioDevSound('buttonA');
    handleProfileFile(sortedBySize[0]);
  };

  // Called when user accepts consent in the DataConsentModal
  const handleConsentAccepted = () => {
    setDataConsentGranted(true);
    setShowDataConsent(false);
    // Process the deferred files
    if (pendingFiles.length > 0) {
      const sortedPending = [...pendingFiles].sort((a, b) => b.size - a.size);
      setFiles(sortedPending);
      playMioDevSound('buttonA');
      handleProfileFile(sortedPending[0]);
      setPendingFiles([]);
    }
  };

  const handleConsentDeclined = () => {
    setShowDataConsent(false);
    setPendingFiles([]);
  };

  const handleLoadSample = () => {
    const sampleCsv = buildSampleCsv();
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const sampleFile = new File([blob], 'ventas_retail_ejemplo.csv', { type: 'text/csv' });
    setFiles([sampleFile]);
    setTargetCol('ventas');
    setErrorMessage(null);
    playMioDevSound('buttonA');
    handleProfileFile(sampleFile);
  };

  const handleConfirmRoles = (confirmedTarget: string, confirmedRoles: Record<string, ColumnRole>) => {
    setTargetCol(confirmedTarget);
    setColumnRoles(confirmedRoles);
    setShowProfileSelector(false);
    executeAnalysis(files, confirmedTarget, confirmedRoles);
  };

  const handleCancelRoles = () => {
    setShowProfileSelector(false);
  };

  const saveProjectLocallyAndRemote = async (
    res: AnalysisResult,
    currentFile: File | null,
    confirmedTarget?: string
  ) => {
    const projId = res.upload_id || `proj-${Date.now()}`;
    res.upload_id = projId;
    const filename = currentFile?.name || res.filename || 'Dataset Analizado';
    res.filename = filename;

    const newProj = {
      id: projId,
      upload_id: projId,
      title: filename,
      filename,
      records: `${res.profile?.n_rows || res.profile?.nRows || 100} filas`,
      bestModel: 'AutoML LightGBM',
      updatedAt: 'Recién',
      status: 'Completado',
      targetCol: confirmedTarget || targetCol || res.profile?.suggested_targets?.[0] || '',
      data: res, // Guardamos el análisis completo para restaurarlo desde Mis Proyectos
    };

    try {
      localStorage.setItem('mio_active_analysis', JSON.stringify(res));
      localStorage.setItem(`mio_result_${projId}`, JSON.stringify(res));
      if (filename && filename !== 'Dataset Analizado') {
        localStorage.setItem(`mio_result_${filename}`, JSON.stringify(res));
      }

      const rawProjects = localStorage.getItem('mio_projects');
      const projectsList = rawProjects ? JSON.parse(rawProjects) : [];
      // Deduplicar estrictamente por id, upload_id y filename para evitar copias
      const filtered = projectsList.filter(
        (p: any) => p.id !== projId && p.upload_id !== projId && p.title !== filename && p.filename !== filename
      );
      localStorage.setItem('mio_projects', JSON.stringify([newProj, ...filtered.slice(0, 15)]));
      setIsProjectSaved(true);
    } catch (e) {
      console.warn('Error en almacenamiento local:', e);
    }

    try {
      const user = auth.currentUser;
      if (user) {
        // Sanear datos para Firestore evitando campos undefined que rechazan el guardado
        let safeData: any = null;
        try {
          safeData = JSON.parse(JSON.stringify(res));
        } catch {}

        // Usar un ID determinístico basado en filename para que jamás se creen duplicados
        const docId = (filename && filename !== 'Dataset Analizado')
          ? filename.replace(/[^a-zA-Z0-9_-]/g, '_')
          : projId;

        await setDoc(
          doc(db, 'users', user.uid, 'analyses', docId),
          {
            filename,
            upload_id: projId,
            targetCol: confirmedTarget || targetCol || '',
            ...(safeData ? { data: safeData } : {}),
            created_at: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (firestoreErr) {
      console.warn('Error guardando en Firestore:', firestoreErr);
    }
  };

  const executeAnalysis = async (
    targetFiles: File[] | null,
    chosenTarget?: string,
    roles?: Record<string, ColumnRole>
  ) => {
    const activeFiles = (targetFiles && targetFiles.length > 0) ? targetFiles : files;
    if (activeFiles.length === 0) return;
    const primaryFile = activeFiles[0];

    setLoading(true);
    setErrorMessage(null);
    setUploadProgress(15);
    setCurrentStep(
      activeFiles.length > 1
        ? `Iniciando auto-join relacional de ${activeFiles.length} archivos...`
        : 'Iniciando subida y pipeline en FastAPI...'
    );
    setIsProjectSaved(false);
    playMioDevSound('buttonB');

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 40) return prev + 10;
        if (prev < 70) return prev + 5;
        if (prev < 90) return prev + 2;
        return prev;
      });
    }, 400);

    const stepTimer = setTimeout(() => {
      setCurrentStep('Normalizando tipos de datos e imputando nulos...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setCurrentStep('Ejecutando Isolation Forest para anomalías y calibrando modelos...');
    }, 2800);

    try {
      const stringRoles: Record<string, string> = {};
      const activeRoles = roles && Object.keys(roles).length > 0
        ? roles
        : (profileData ? inferIntelligentRoles(profileData) : {});

      Object.entries(activeRoles).forEach(([k, v]) => {
        stringRoles[k] = v;
      });

      const fallbackTarget = profileData ? getHighestWeightColumn(profileData) : undefined;
      const finalTarget = chosenTarget || targetCol || fallbackTarget;

      // Year-first dates are rewritten day/month/year on the way out, so the engine reads them right
      // (see utils/prepareUpload). The files the user picked are not touched.
      const prepared = await Promise.all(activeFiles.map(prepareForUpload));
      const outgoing = prepared.map((p) => p.file);
      const rewrittenDates = Array.from(new Set(prepared.flatMap((p) => p.rewritten)));

      let res;
      if (outgoing.length > 1) {
        res = await apiClient.analyzeMultiFiles(outgoing, finalTarget || undefined, stringRoles);
      } else {
        res = await apiClient.analyzeFile(outgoing[0], finalTarget || undefined, stringRoles);
      }
      if (rewrittenDates.length) {
        // Said out loud with the rest of what MIO did to the sheet.
        const report: any = (res as any).cleaningReport || ((res as any).cleaningReport = {});
        report.actions = [
          `Las fechas de ${rewrittenDates.map((c) => `"${c}"`).join(', ')} estaban escritas año-mes-día: MIO las pasó a día/mes/año para leerlas bien.`,
          ...(Array.isArray(report.actions) ? report.actions : []),
        ];
      }

      clearInterval(progressTimer);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      setUploadProgress(100);
      setCurrentStep('¡Análisis completado!');
      if (!res.upload_id) {
        res.upload_id = `upload-${Date.now()}`;
      }
      if (!res.filename) {
        res.filename = primaryFile.name;
      }
      setResult(res);
      playMioDevSound('select');
      window.history.replaceState({}, '', '/dashboard');

      await saveProjectLocallyAndRemote(res, primaryFile, finalTarget || undefined);
    } catch (err: any) {
      clearInterval(progressTimer);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      console.error('Analysis error:', err);
      setErrorMessage(
        friendlyError(err)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (files.length === 0) return;
    if (profileData && !showProfileSelector) {
      setShowProfileSelector(true);
      return;
    }
    executeAnalysis(files, targetCol || undefined, columnRoles);
  };

  const handleResetAnalysis = () => {
    playMioDevSound('tick');
    setResult(null);
    setFiles([]);
    setTargetCol('');
    setColumnRoles({});
    setProfileData(null);
    setShowProfileSelector(false);
    try {
      localStorage.removeItem('mio_active_analysis');
    } catch {}
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsSendingChat(true);

    try {
      const res = await askGemini(userText, result, result?.charts || []);
      const assistantText = res.response || 'No tengo una respuesta para eso con los datos de esta planilla.';
      setChatMessages((prev) => [...prev, { role: 'assistant', text: assistantText }]);
    } catch (e: any) {
      console.warn('Error en chat Gemini:', e);
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Ahora no pude responder. Probá de nuevo en un momento; mientras tanto, los números del panel siguen siendo válidos.',
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!result) return;
    setDownloadingPdf(true);
    playMioDevSound('select');
    try {
      const payload = {
        filename: result.filename || file?.name || 'analisis',
        target_col: targetCol || result.profile?.suggested_targets?.[0] || 'Auto',
        kpis: result.kpis || { n_rows: nRows, n_cols: nCols, quality_score: quality },
        narrative_text: reportNarrative('Informe del analisis generado por MIO.'),
        profile: result.profile || { n_rows: nRows, n_cols: nCols, quality_score: quality },
        anomaly_metrics: result.anomalies?.metrics || {},
        forecast_metrics: result.forecast?.metrics || {},
        segmentation_metrics: {},
        chart_images: await collectChartImages(),
      };
      const blob = await apiClient.exportPDF(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${result.filename || 'reporte'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('PDF export error:', err);
      setErrorMessage(err.message || 'No se pudo generar el PDF. Probá de nuevo en un momento.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadPptx = async () => {
    if (!result) return;
    setDownloadingPptx(true);
    playMioDevSound('select');
    try {
      const payload = {
        filename: result.filename || file?.name || 'analisis',
        target_col: targetCol || result.profile?.suggested_targets?.[0] || 'Auto',
        kpis: result.kpis || { n_rows: nRows, n_cols: nCols, quality_score: quality },
        narrative_text: reportNarrative('Presentacion del analisis generada por MIO.'),
        profile: result.profile || { n_rows: nRows, n_cols: nCols, quality_score: quality },
        anomaly_metrics: result.anomalies?.metrics || {},
        forecast_metrics: result.forecast?.metrics || {},
        segmentation_metrics: {},
        chart_images: await collectChartImages(),
      };
      const blob = await apiClient.exportPPTX(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `presentacion_${result.filename || 'reporte'}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('PPTX export error:', err);
      setErrorMessage(err.message || 'No se pudo generar la presentación. Probá de nuevo en un momento.');
    } finally {
      setDownloadingPptx(false);
    }
  };

  const handleDownloadCleanData = async (format: 'csv' | 'xlsx' = 'csv') => {
    if (!result) return;
    setDownloadingCleanData(true);
    playMioDevSound('select');
    try {
      const blob = await apiClient.exportCleanedDataset({
        file: file || undefined,
        uploadId: result.upload_id || undefined,
        format,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos_limpios_${result.filename || 'dataset'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Clean data export error:', err);
      setErrorMessage(err.message || 'No se pudieron exportar los datos limpios. Probá de nuevo en un momento.');
    } finally {
      setDownloadingCleanData(false);
    }
  };

  const nRows = result?.profile?.n_rows ?? result?.profile?.nRows ?? 0;
  const nCols = result?.profile?.n_cols ?? result?.profile?.nCols ?? 0;
  const quality: number | null = result?.profile?.quality_score ?? result?.profile?.qualityScore ?? null;

  // A saved analysis can carry the "still writing" placeholder instead of a summary: that is not a summary.
  const rawNarrative = String(result?.narrative?.text || '').trim();
  const narrativeText = rawNarrative.length > 40 && !/^generando/i.test(rawNarrative) ? rawNarrative : '';

  // "Trabajo": the framing numbers and the sections that exist for this result.
  const r: any = result;
  const oddCount = model?.oddCount ?? 0;
  const workKpis: { label: string; value: string; sub?: string; title?: string; tone: string; accent?: string }[] = [
    { label: 'Filas', value: nRows.toLocaleString('es-AR'), sub: 'registros analizados', tone: 'bg-white text-zinc-950 dark:bg-[#0e0d16] dark:text-white' },
    { label: 'Columnas', value: String(nCols), sub: model?.target ? `objetivo: ${model.target}` : undefined, tone: 'bg-white text-zinc-950 dark:bg-[#0e0d16] dark:text-white' },
    ...(quality != null ? [{ label: 'Calidad de datos', value: `${quality}`, sub: 'sobre 100', title: 'Qué tan completa y consistente llegó la planilla', tone: 'bg-[#e4dcff] text-zinc-950 dark:bg-[#2a1766] dark:text-white' }] : []),
    { label: 'Valores raros', value: oddCount.toLocaleString('es-AR'), sub: model?.oddShare != null ? `${fmtPct(model.oddShare)} % de la planilla` : 'registros para revisar', tone: 'bg-[#0b0914] text-white dark:bg-black', accent: oddCount > 0 ? 'text-[#bdf559]' : '' },
    ...(model?.mape != null
      ? [{ label: 'Error de predicción', value: `${fmtPct(model.mape)} %`, sub: model.hitRate != null ? `MAPE · acierta cerca de ${model.hitRate} de cada 10` : 'MAPE', title: 'En promedio, cuánto se desvía la estimación del valor real', tone: 'bg-[#7647eb] text-white' }]
      : []),
  ];
  const workCharts = useMemo(() => (Array.isArray(r?.charts) ? r.charts.filter(Boolean).map(inValueOrder) : []), [r]);
  const workIndex: IndexItem[] = !r ? [] : [
    { id: 't-resumen', label: 'Resumen' },
    ...((r.charts?.length ?? 0) > 0 ? [{ id: 't-graficos', label: 'Gráficos' }] : []),
    ...(model?.fChart ? [{ id: 't-prediccion', label: 'Predicción' }] : []),
    ...(r.segmentation?.scatterData || r.segmentation?.scatter_data || r.segmentation?.radarData || r.segmentation?.radar_data ? [{ id: 't-grupos', label: 'Grupos' }] : []),
    ...(r.anomalies?.chartData || r.anomalies?.chart_data ? [{ id: 't-raros', label: 'Valores raros' }] : []),
    ...(r.featureImportance?.chartImportance || r.feature_importance?.chart_importance || r.featureImportance?.chartShap || r.feature_importance?.chart_shap ? [{ id: 't-peso', label: 'Qué pesa más' }] : []),
    { id: 't-chat', label: 'Preguntar' },
  ];

  return (
    <div className={`mio-sheet-bg min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#07070a] text-zinc-100' : 'bg-[#f3f3f5] text-zinc-950'}`}>
      {/* Top Navigation Bar */}
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
            <span className="text-sm tracking-tight text-zinc-950 dark:text-white">MIO</span>
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
            onClick={() => navigateTo('/admin')}
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-[#bdf559]/20 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30 hover:bg-[#bdf559]/30 transition-all duration-200 active:scale-[0.97] cursor-pointer hidden sm:block"
          >
            Admin
          </button>
          {result && (
            <button
              type="button"
              onClick={() => {
                handleResetAnalysis();
                navigateTo('/dashboard?new=1');
              }}
              className="text-xs font-mono font-bold px-3.5 py-1.5 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Subir y analizar un nuevo dataset"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#bdf559]" />
              <span>Nuevo análisis</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigateTo('/projects')}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
              isDark
                ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                : 'border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
            }`}
          >
            Mis Proyectos
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className={`mx-auto px-4 sm:px-6 lg:px-10 py-8 ${result ? (dashMode === 'mejorado' ? 'max-w-[1760px]' : 'max-w-7xl') : 'max-w-6xl'}`}>
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-mio bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline cursor-pointer ml-4"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <LoadingAnalysis
            fileSize={file?.size ?? 25000000}
            isUploading={uploadProgress < 100 && uploadProgress > 0}
            uploadProgress={uploadProgress}
          />
        ) : isProfiling ? (
          <div className="max-w-md mx-auto py-20 text-center space-y-4 select-none">
            <div className="w-14 h-14 rounded-full border-4 border-[#7647eb] border-t-transparent animate-spin mx-auto" />
            <h3 className="text-xl font-bold font-sans text-zinc-950 dark:text-white">Perfilando Dataset</h3>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              Analizando tipos de variables, nulos y detectando la columna objetivo más influyente...
            </p>
          </div>
        ) : showProfileSelector && profileData ? (
          <ColumnRoleSelector
            key={profileData.upload_id || profileData.filename || 'column-role-selector'}
            profileData={profileData}
            onConfirm={handleConfirmRoles}
            onCancel={handleCancelRoles}
          />
        ) : !result ? (
          /* UPLOAD VIEW */
          <div className="max-w-2xl mx-auto py-6 select-none space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-tight bg-[#7647eb]/10 text-[#7647eb] dark:text-[#a78bfa] border border-[#7647eb]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
                <span>NUEVO ANÁLISIS</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold font-sans tracking-[-0.045em] leading-[1.0]">
                Subí tu planilla
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Excel o CSV, tal como la tenés. No hace falta limpiarla antes.
              </p>
              <div className="pt-3 flex flex-col items-center gap-1.5">
                {modeSwitch}
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Podés cambiarlo después, sin volver a analizar</span>
              </div>
            </div>

            {/* Drag & Drop Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-10 rounded-mio-sm border border-dashed transition-all text-center cursor-pointer ${
                isDragging
                  ? 'border-[#7647eb] bg-[#7647eb]/10 scale-[1.01]'
                  : isDark
                  ? 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                  : 'border-zinc-300 bg-white hover:border-zinc-400 shadow-sm'
              }`}
              onClick={() => document.getElementById('dashboard-file-input')?.click()}
            >
              <input
                id="dashboard-file-input"
                type="file"
                multiple
                accept=".csv, .xlsx, .xls, .json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-mio bg-[#7647eb]/10 dark:bg-[#7647eb]/20 border border-[#7647eb]/30 flex items-center justify-center mx-auto mb-4 text-[#7647eb] dark:text-[#a78bfa]">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              {files.length > 1 ? (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#7647eb]/15 text-[#7647eb] dark:text-[#bdf559] border border-[#7647eb]/30">
                    <span>MULTI-DATASET // AUTO-JOIN INTELIGENTE ({files.length} ARCHIVOS)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-h-36 overflow-y-auto p-2">
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-mio-sm bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 text-xs font-mono"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#7647eb] dark:text-[#bdf559]" />
                        <span className="font-bold truncate max-w-[140px]" title={f.name}>{f.name}</span>
                        <span className="text-[10px] text-zinc-500">({(f.size / 1024).toFixed(0)} KB)</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = files.filter((_, i) => i !== idx);
                            const sortedUpdated = [...updated].sort((a, b) => b.size - a.size);
                            setFiles(sortedUpdated);
                            if (sortedUpdated.length > 0) handleProfileFile(sortedUpdated[0]);
                            else handleResetAnalysis();
                          }}
                          className="hover:text-red-500 text-zinc-400 p-0.5 ml-1 cursor-pointer"
                          title="Quitar archivo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    Hacé clic para agregar más archivos (máximo 5 para auto-join relacional)
                  </p>
                </div>
              ) : file ? (
                <div className="space-y-1">
                  <div className="font-bold text-base text-zinc-950 dark:text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#bdf559]" />
                    <span>{file.name}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-medium">
                    {(file.size / 1024).toFixed(1)} KB • Listo para análisis (podés arrastrar más para multi-join)
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold text-base text-zinc-950 dark:text-white">
                    Arrastrá tu planilla acá o hacé clic para elegirla
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                    CSV, XLSX, XLS o JSON · Hasta 5 archivos a la vez
                  </p>
                </div>
              )}
            </div>

            {/* Target Column & Actions */}
            <div className="space-y-4">
              {file && !profileData && !isProfiling && (
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                  ¿Qué dato querés entender? (opcional)
                </label>
                <input
                  type="text"
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  placeholder="Ej: ventas, turnos, gastos"
                  className={`w-full px-4 py-2.5 rounded-mio-sm border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
                  }`}
                />
              </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#7647eb] dark:text-[#a78bfa] bg-[#7647eb]/10 hover:bg-[#7647eb]/20 px-4 py-2.5 rounded-full border border-[#7647eb]/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-[#bdf559]" />
                  <span>Probar con datos de ejemplo</span>
                </button>

                <button
                  type="button"
                  disabled={!file}
                  onClick={handleStartAnalysis}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-[#bdf559]" />
                  <span>Analizar mi planilla</span>
                </button>
              </div>
            </div>

            {/* What happens next, so nobody uploads blind */}
            <div className="rounded-mio bg-white p-5 sm:p-6 dark:bg-[#0e0d16]">
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">Qué va a pasar</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3">
                {([
                  ['Subís la planilla', 'Excel o CSV, tal como está. No hace falta ordenarla.'],
                  ['Elegís qué querés entender', 'MIO te muestra cómo leyó cada columna y vos elegís el dato que te importa.'],
                  ['Leés el diagnóstico', 'Qué se salió de lo normal, qué lo mueve y qué puede venir, en palabras simples.'],
                ] as const).map(([title, text], i) => (
                  <li key={title} className="rounded-mio-sm bg-[#f3f3f5] p-4 dark:bg-white/[0.05]">
                    <span className="font-mono text-xs font-bold text-[#7647eb] dark:text-[#a78bfa]">{String(i + 1).padStart(2, '0')}</span>
                    <p className="mt-1.5 text-sm font-bold leading-tight text-zinc-950 dark:text-white">{title}</p>
                    <p className="mt-1 text-[13px] leading-snug text-zinc-600 dark:text-zinc-400">{text}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-400">
                No hace falta registrarte. Si no iniciaste sesión, tu planilla no se guarda.
              </p>
            </div>
          </div>
        ) : (
          /* RESULTS VIEW */
          <div ref={resultsRef} className={dashMode === 'mejorado' ? 'space-y-2.5 sm:space-y-3' : 'space-y-5'}>
            {/* One header for both views: what was analysed, how to see it, what to do with it */}
            <div className="relative z-[35] rounded-mio bg-white p-5 sm:p-7 dark:bg-[#0e0d16]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#7647eb] dark:text-[#a78bfa]">Análisis listo</p>
                  <h2 className="mt-1.5 text-2xl sm:text-4xl font-extrabold tracking-[-0.035em] leading-[1.05] [overflow-wrap:anywhere] text-zinc-950 dark:text-white">
                    {result.filename || file?.name || 'Tu planilla'}
                  </h2>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {[nRows ? `${nRows.toLocaleString('es-AR')} filas` : null, nCols ? `${nCols} columnas` : null, quality != null ? `calidad de datos ${quality}/100` : null, model?.target ? `lo que se analiza: ${model.target}` : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1.5 lg:items-end">
                  {modeSwitch}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {dashMode === 'mejorado' ? 'Lo importante, explicado y listo para mostrar' : 'Todos los gráficos y métricas a la vista'}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { playMioDevSound('select'); setPresenting(true); }}
                  className="min-h-[44px] rounded-full bg-[#7647eb] px-5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#602cd1] active:scale-[0.97] cursor-pointer flex items-center gap-2"
                  title="Mostrar el análisis a pantalla completa, una idea por pantalla"
                >
                  <Play className="w-4 h-4 fill-[#bdf559] text-[#bdf559]" />
                  <span>Presentar</span>
                </button>

                <div className="relative" ref={exportRef}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={exportOpen}
                    onClick={() => setExportOpen((o) => !o)}
                    className="min-h-[44px] rounded-full bg-[#f3f3f5] px-5 text-sm font-bold text-zinc-900 transition-all duration-200 hover:bg-[#e4dcff] active:scale-[0.97] cursor-pointer flex items-center gap-2 dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.16]"
                  >
                    {downloadingPdf || downloadingPptx || downloadingCleanData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span>{downloadingPdf || downloadingPptx || downloadingCleanData ? 'Preparando…' : 'Exportar'}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {exportOpen && (
                    <div role="menu" className="mio-pop absolute left-0 top-full z-30 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] origin-top-left rounded-mio bg-[#0b0914] p-1.5 text-white">
                      {([
                        ['Informe en PDF', 'Con los gráficos y lo que encontró MIO', () => handleDownloadPdf(), downloadingPdf],
                        ['Presentación en PowerPoint', 'Para editar y proyectar', () => handleDownloadPptx(), downloadingPptx],
                        ['Datos limpios en CSV', 'Tu planilla ya ordenada y sin huecos', () => handleDownloadCleanData('csv'), downloadingCleanData],
                        ['Datos limpios en Excel', 'Lo mismo, en formato .xlsx', () => handleDownloadCleanData('xlsx'), downloadingCleanData],
                      ] as const).map(([title, sub, run, busy]) => (
                        <button
                          key={title}
                          type="button"
                          role="menuitem"
                          disabled={busy}
                          onClick={() => { setExportOpen(false); run(); }}
                          className="block w-full rounded-mio-sm px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-white/10 cursor-pointer disabled:opacity-40"
                        >
                          <span className="block text-sm font-bold">{title}</span>
                          <span className="block text-xs text-white/60">{sub}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={copySummary}
                  className={`min-h-[44px] rounded-full px-5 text-sm font-bold flex items-center gap-2 transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                    copied
                      ? 'bg-[#e4dcff] text-zinc-950 dark:bg-[#2a1766] dark:text-white'
                      : 'bg-[#f3f3f5] text-zinc-900 hover:bg-[#e4dcff] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.16]'
                  }`}
                  title="Copiar lo que encontró MIO, para pegarlo en WhatsApp o en un mail"
                >
                  {copied ? <Check className="w-4 h-4 text-[#7647eb] dark:text-[#bdf559]" /> : <Copy className="w-4 h-4" />}
                  <span aria-live="polite">{copied ? 'Resumen copiado' : 'Copiar resumen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (result) {
                      saveProjectLocallyAndRemote(result, file, targetCol);
                      playMioDevSound('select');
                      setIsProjectSaved(true);
                    }
                  }}
                  className={`min-h-[44px] rounded-full px-5 text-sm font-bold flex items-center gap-2 transition-all duration-200 active:scale-[0.97] cursor-pointer ${
                    isProjectSaved
                      ? 'bg-[#e4dcff] text-zinc-950 dark:bg-[#2a1766] dark:text-white'
                      : 'bg-[#f3f3f5] text-zinc-900 hover:bg-[#e4dcff] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.16]'
                  }`}
                  title="Guardar este análisis en Mis proyectos"
                >
                  {isProjectSaved ? <Check className="w-4 h-4 text-[#7647eb] dark:text-[#bdf559]" /> : <Bookmark className="w-4 h-4" />}
                  <span>{isProjectSaved ? 'Guardado en Mis proyectos' : 'Guardar'}</span>
                </button>
              </div>
            </div>

            {dashMode === 'mejorado' ? (
              <ResultadoMejorado result={result} isDark={isDark} />
            ) : (
              <>
            <SectionIndex isDark={isDark} items={workIndex} />

            {/* The numbers that frame everything else */}
            <div id="t-resumen" className={`scroll-mt-36 grid grid-cols-2 gap-2.5 sm:gap-3 ${workKpis.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
              {workKpis.map((k, i) => (
                <div key={k.label} title={k.title} className={`rounded-mio p-5 ${k.tone} ${workKpis.length % 2 === 1 && i === workKpis.length - 1 ? 'col-span-2 lg:col-span-1' : ''}`}>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider opacity-70">{k.label}</p>
                  <p className={`mt-2 text-3xl sm:text-4xl font-extrabold leading-none tracking-[-0.04em] tabular-nums [overflow-wrap:anywhere] ${k.accent || ''}`}>{k.value}</p>
                  {k.sub && <p className="mt-2 text-xs opacity-75">{k.sub}</p>}
                </div>
              ))}
            </div>

            {/* Written summary: the AI's when there is one, otherwise what the data itself shows */}
            <div className="rounded-mio bg-white p-6 sm:p-8 dark:bg-[#0e0d16] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white">Resumen de MIO</h3>
                {narrativeText && (
                  <span className="rounded-full bg-[#e4dcff] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:bg-[#2a1766] dark:text-white">Redactado con IA</span>
                )}
              </div>
              {narrativeText ? (
                <>
                  <p className="max-w-4xl text-sm sm:text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">{narrativeText}</p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Es orientativo: lo redacta una IA a partir de tus métricas. No es asesoramiento financiero ni legal.
                  </p>
                </>
              ) : model && model.findings.length > 0 ? (
                <ul className="max-w-4xl space-y-1.5 text-sm sm:text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {model.findings.map((f) => (
                    <li key={f.tag}><strong className="font-bold">{f.tag}:</strong> {f.big ? `${f.big} ` : ''}{f.text}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                  MIO procesó la planilla{nRows ? ` (${nRows.toLocaleString('es-AR')} filas, ${nCols} columnas)` : ''}. Los gráficos de abajo muestran lo que hay en los datos.
                </p>
              )}
            </div>

            {/* Panel de unión relacional si proviene de auto-join */}
            {Boolean((result as any).joinSummary || (result as any).join_summary) && (
              <DatasetJoinPanel joinSummary={(result as any).joinSummary || (result as any).join_summary} />
            )}

            {/* Grid Integral de Gráficas y Modelos AutoML */}
            <div className="w-full flex flex-col gap-5">
              {/* Gráficas Exploratorias (Distribuciones, Histogramas, Matrices de Correlación, Boxplots) */}
              {((result as any).charts?.length ?? 0) > 0 && (
                <div id="t-graficos" className="w-full scroll-mt-36">
                  <ExploratoryCharts
                    charts={workCharts}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Sección de Proyecciones Temporales AutoML (Fan Charts, Conos de Confianza, RMSE, MAE, R²) */}
              {model?.fChart && (
                <div id="t-prediccion" className="w-full scroll-mt-36">
                  <ForecastSection
                    chartData={model.fChart as any}
                    metrics={model.fLocal ? undefined : (result as any).forecast?.metrics}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Segmentación K-Means de Clientes / Operaciones (Distribución Donut y Radar de Perfil) */}
              {((result as any).segmentation?.scatterData || (result as any).segmentation?.scatter_data || (result as any).segmentation?.radarData || (result as any).segmentation?.radar_data) && (
                <div id="t-grupos" className="w-full scroll-mt-36">
                  <SegmentationSection
                    scatterData={(result as any).segmentation?.scatterData || (result as any).segmentation?.scatter_data}
                    radarData={(result as any).segmentation?.radarData || (result as any).segmentation?.radar_data}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Detección de Anomalías (Isolation Forest) con Gráfico de Dispersión y Tabla Interactiva */}
              {((result as any).anomalies?.chartData || (result as any).anomalies?.chart_data) && (
                <div id="t-raros" className="w-full scroll-mt-36">
                  <AnomaliesSection
                    chartData={(result as any).anomalies?.chartData || (result as any).anomalies?.chart_data}
                    metrics={(result as any).anomalies?.metrics}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Importancia y Atribución de Variables (Valores SHAP y Gini) */}
              {((result as any).featureImportance?.chartImportance || (result as any).feature_importance?.chart_importance || (result as any).featureImportance?.chartShap || (result as any).feature_importance?.chart_shap) && (
                <div id="t-peso" className="w-full scroll-mt-36">
                  <FeatureImportanceSection
                    chartImportance={(result as any).featureImportance?.chartImportance || (result as any).feature_importance?.chart_importance}
                    chartShap={(result as any).featureImportance?.chartShap || (result as any).feature_importance?.chart_shap}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}
            </div>

              </>
            )}

            {/* Interactive Data Copilot Chat */}
            <div id="t-chat" className={`scroll-mt-36 ${dashMode === 'mejorado' ? 'p-6 sm:p-9 rounded-mio bg-[#0b0914] text-white space-y-5' : 'p-6 sm:p-8 rounded-mio bg-white dark:bg-[#0e0d16] space-y-4'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex items-center justify-center">
                    <MioPet2D mood={isSendingChat ? 'trabajando' : 'reposo'} size={38} showShadow={false} animated={true} />
                  </div>
                  <div>
                    <h3 className={`font-sans flex items-center gap-2 ${dashMode === 'mejorado' ? 'text-2xl sm:text-4xl font-extrabold tracking-[-0.035em] text-white' : 'text-base sm:text-lg font-bold text-zinc-950 dark:text-white'}`}>
                      <span>{dashMode === 'mejorado' ? 'Preguntale a MIO' : 'MIO Copilot'}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold tracking-normal ${dashMode === 'mejorado' ? 'bg-white/10 text-[#bdf559]' : 'bg-[#7647eb]/10 text-[#7647eb] dark:text-[#bdf559] border border-[#7647eb]/20'}`}>
                        {isSendingChat ? 'Analizando...' : 'En línea'}
                      </span>
                    </h3>
                    <p className={`text-xs font-mono ${dashMode === 'mejorado' ? 'text-zinc-400' : 'text-zinc-500'}`}>Sobre tu planilla, en castellano</p>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${dashMode === 'mejorado' ? 'bg-white/10 text-zinc-200' : 'bg-[#bdf559]/10 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSendingChat ? 'bg-amber-400 animate-ping' : 'bg-[#bdf559] animate-pulse'}`} />
                  <span>Respuestas generadas con IA</span>
                </div>
              </div>

              <div className={`max-h-80 overflow-y-auto space-y-4 p-4 rounded-mio-sm ${dashMode === 'mejorado' ? 'bg-white/[0.06]' : 'bg-zinc-100/70 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06]'}`}>
                {chatMessages.map((msg, i) => {
                  const isAssistant = msg.role === 'assistant';
                  return (
                    <div
                      key={i}
                      className={`flex gap-3 items-start ${isAssistant ? 'justify-start' : 'justify-end'}`}
                    >
                      {isAssistant && (
                        <div className="shrink-0 flex items-center justify-center pt-0.5">
                          <MioPet2D mood="reposo" size={32} showShadow={false} animated={true} />
                        </div>
                      )}
                      <div
                        className={`max-w-md px-4 py-2.5 rounded-mio text-xs sm:text-sm leading-relaxed ${
                          !isAssistant
                            ? 'bg-[#7647eb] text-white rounded-br-none'
                            : isDark || dashMode === 'mejorado'
                            ? 'bg-white/[0.08] text-zinc-100 rounded-tl-none'
                            : 'bg-white text-zinc-900 border border-zinc-300 shadow-sm font-medium rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}

                {/* Live thinking bubble when MIO is processing an answer */}
                {isSendingChat && (
                  <div className="flex gap-3 items-start justify-start animate-fade-in">
                    <div className="shrink-0 flex items-center justify-center pt-0.5">
                      <MioPet2D mood="trabajando" size={32} showShadow={false} animated={true} />
                    </div>
                    <div className="px-4 py-2.5 rounded-mio rounded-tl-none text-xs sm:text-sm bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-white/10 shadow-xs flex items-center gap-2">
                      <span className="font-mono text-xs">MIO está pensando…</span>
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7647eb] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7647eb] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7647eb] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {model && (
                <div className="flex flex-wrap gap-2">
                  {(model ? suggestedQuestions(model) : []).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setChatInput(q)}
                      className={`min-h-[40px] rounded-full px-4 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] cursor-pointer ${dashMode === 'mejorado' || isDark ? 'bg-white/[0.08] text-white hover:bg-[#7647eb]' : 'bg-[#f3f3f5] text-zinc-900 hover:bg-[#e4dcff]'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hacé una pregunta sobre tu planilla (ej: ¿cuál fue el día con mayores ventas?)..."
                  className={`flex-1 px-4 py-2.5 rounded-mio-sm border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${
                    isDark || dashMode === 'mejorado'
                      ? 'bg-white/[0.06] border-white/10 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className={`px-5 py-2.5 rounded-mio-sm font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${dashMode === 'mejorado' ? 'bg-[#bdf559] hover:bg-[#cbff6e] text-black' : 'bg-[#7647eb] hover:bg-[#602cd1] text-white'}`}
                >
                  {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar</span>
                </button>
              </form>

              <div className={`text-[11px] ${dashMode === 'mejorado' ? 'text-zinc-400' : 'pt-2 border-t border-zinc-100 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400'}`}>
                Las respuestas las genera una IA y pueden tener errores. Verificá siempre con los números del panel.
              </div>
            </div>
          </div>
        )}
      </main>

      {presenting && result && (
        <Suspense fallback={null}>
          <Presentar result={result} isDark={isDark} onClose={() => setPresenting(false)} />
        </Suspense>
      )}

      {/* Modal de consentimiento de datos previo a la ingesta (Opt-In obligatorio) */}
      <DataConsentModal
        isOpen={showDataConsent}
        onClose={handleConsentDeclined}
        onAccept={handleConsentAccepted}
      />
    </div>
  );
};

export default DashboardPage;
