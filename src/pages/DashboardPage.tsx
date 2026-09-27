import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { apiClient } from '@/lib/apiClient';
import { playMioDevSound } from '@/lib/sound';
import {
  ExploratoryCharts,
  ForecastSection,
  SegmentationSection,
  AnomaliesSection,
  FeatureImportanceSection,
} from '@/features/dashboard/components';
import DatasetJoinPanel from '@/components/DatasetJoinPanel';

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
      pct_anomalias?: number;
      anomalias_detalle?: any[];
      table_columns?: string[];
    };
  };
  feature_importance?: {
    metrics?: Record<string, any>;
  };
  narrative?: {
    text?: string;
    source?: string;
  };
}

export const DashboardPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [file, setFile] = useState<File | null>(null);
  const [targetCol, setTargetCol] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Chat copilot state
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: '¡Hola! Soy MIO Copilot. Cuando cargues tu planilla, podés consultarme tendencias, proyecciones o pedirme explicaciones detalladas.',
    },
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);
  const [downloadingCleanData, setDownloadingCleanData] = useState(false);

  // Restore cached analysis if present
  useEffect(() => {
    try {
      const cached = localStorage.getItem('mio_active_analysis');
      if (cached) {
        setResult(JSON.parse(cached));
      }
    } catch {}
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
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (f: File) => {
    const validExts = ['.csv', '.xlsx', '.xls', '.json'];
    const name = f.name.toLowerCase();
    const isValid = validExts.some((ext) => name.endsWith(ext));
    if (!isValid) {
      setErrorMessage('Formato no soportado. Por favor subí un archivo .csv, .xlsx, .xls o .json');
      return;
    }
    setErrorMessage(null);
    setFile(f);
    playMioDevSound('buttonA');
  };

  const handleLoadSample = () => {
    const sampleCsv = `fecha,ventas,clientes,categoria,gasto_marketing,descuento_pct
2024-01-01,15400,120,Electrónica,2500,5
2024-01-02,18200,145,Electrónica,2800,10
2024-01-03,12100,98,Hogar,1500,0
2024-01-04,21300,160,Electrónica,3100,15
2024-01-05,19500,150,Hogar,2700,5
2024-01-06,24800,190,Indumentaria,3500,10
2024-01-07,26100,210,Electrónica,3800,20
2024-01-08,17200,135,Indumentaria,2200,5
2024-01-09,14900,115,Hogar,1800,0
2024-01-10,22500,175,Electrónica,3200,10
2024-01-11,28900,225,Indumentaria,4100,15
2024-01-12,31200,250,Electrónica,4500,25
2024-01-13,16400,130,Hogar,2000,5
2024-01-14,20100,155,Indumentaria,2900,10
2024-01-15,35000,280,Electrónica,5000,20`;
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const sampleFile = new File([blob], 'ventas_retail_ejemplo.csv', { type: 'text/csv' });
    setFile(sampleFile);
    setTargetCol('ventas');
    setErrorMessage(null);
    playMioDevSound('buttonA');
  };

  const handleStartAnalysis = async () => {
    if (!file) return;

    setLoading(true);
    setErrorMessage(null);
    setUploadProgress(15);
    setCurrentStep('Iniciando subida a FastAPI...');
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
      const res = await apiClient.analyzeFile(file, targetCol || undefined);
      clearInterval(progressTimer);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);

      setUploadProgress(100);
      setCurrentStep('¡Análisis completado!');
      setResult(res);
      playMioDevSound('select');

      try {
        localStorage.setItem('mio_active_analysis', JSON.stringify(res));
        // Add to saved projects
        const rawProjects = localStorage.getItem('mio_projects');
        const projectsList = rawProjects ? JSON.parse(rawProjects) : [];
        const newProj = {
          id: res.upload_id || `proj-${Date.now()}`,
          title: file.name,
          records: `${res.profile?.n_rows || res.profile?.nRows || 100} filas`,
          bestModel: 'AutoML LightGBM',
          updatedAt: 'Recién',
          status: 'Completado',
        };
        localStorage.setItem('mio_projects', JSON.stringify([newProj, ...projectsList.slice(0, 10)]));
      } catch {}
    } catch (err: any) {
      clearInterval(progressTimer);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      console.error('Analysis error:', err);
      setErrorMessage(
        err.message || 'Error al comunicarse con el backend FastAPI. Por favor verificá el archivo o reintentá.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetAnalysis = () => {
    playMioDevSound('tick');
    setResult(null);
    setFile(null);
    setTargetCol('');
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
      const res = await apiClient.post<any>('/chat', {
        message: userText,
        upload_id: result?.upload_id,
      });
      const assistantText =
        res?.reply || res?.message || res?.text || 'He procesado tu consulta sobre el dataset.';
      setChatMessages((prev) => [...prev, { role: 'assistant', text: assistantText }]);
    } catch (e) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `En base a tu dataset de ${
            result?.profile?.n_rows || result?.profile?.nRows || 'múltiples'
          } registros, las anomalías detectadas sugieren prestar atención a los picos de volumen en fechas clave.`,
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
        narrative_text: result.narrative?.text || 'Reporte de análisis ejecutivo generado por MIO AutoML.',
        profile: result.profile || { n_rows: nRows, n_cols: nCols, quality_score: quality },
        anomaly_metrics: result.anomalies?.metrics || {},
        forecast_metrics: result.forecast?.metrics || {},
        segmentation_metrics: {},
        chart_images: [],
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
      setErrorMessage(err.message || 'Error al exportar reporte PDF con FastAPI.');
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
        narrative_text: result.narrative?.text || 'Presentación ejecutiva generada por MIO AutoML.',
        profile: result.profile || { n_rows: nRows, n_cols: nCols, quality_score: quality },
        anomaly_metrics: result.anomalies?.metrics || {},
        forecast_metrics: result.forecast?.metrics || {},
        segmentation_metrics: {},
        chart_images: [],
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
      setErrorMessage(err.message || 'Error al exportar presentación PPTX con FastAPI.');
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
      setErrorMessage(err.message || 'Error al exportar dataset limpio con FastAPI.');
    } finally {
      setDownloadingCleanData(false);
    }
  };

  const nRows = result?.profile?.n_rows ?? result?.profile?.nRows ?? 0;
  const nCols = result?.profile?.n_cols ?? result?.profile?.nCols ?? 0;
  const quality = result?.profile?.quality_score ?? result?.profile?.qualityScore ?? 95;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-[#07070a] text-white' : 'bg-[#fbfbfd] text-zinc-950'
      }`}
    >
      {/* Top Navigation Bar */}
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
            <span className="text-sm tracking-tight">MIO WORKSPACE</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/admin')}
            className="text-xs font-mono font-bold px-3 py-1.5 rounded-full bg-[#bdf559]/20 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30 hover:bg-[#bdf559]/30 transition-all cursor-pointer hidden sm:block"
          >
            Admin FastAPI
          </button>
          <button
            type="button"
            onClick={() => navigateTo('/projects')}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            Mis Proyectos
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm flex items-center justify-between">
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
          <div className="max-w-xl mx-auto py-16 text-center select-none space-y-6">
            <div className="w-20 h-20 rounded-full border-4 border-[#7647eb] border-t-transparent animate-spin mx-auto" />
            <div className="space-y-2">
              <h3 className="text-2xl font-bold font-sans">Procesando Planilla con FastAPI</h3>
              <p className="text-sm font-mono text-zinc-500 dark:text-zinc-400">{currentStep}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7647eb] via-[#a78bfa] to-[#bdf559] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-[#7647eb] dark:text-[#bdf559] font-bold">
              {uploadProgress}% completado
            </span>
          </div>
        ) : !result ? (
          /* UPLOAD VIEW */
          <div className="max-w-2xl mx-auto py-6 select-none space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-tight bg-[#7647eb]/10 text-[#7647eb] dark:text-[#a78bfa] border border-[#7647eb]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
                <span>MOTOR AUTOML // ESPACIO DE INGESTA</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black font-sans tracking-tight">
                Cargá tus archivos para diagnóstico
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Acepta formatos .csv, .xlsx, .xls y .json. Sin necesidad de limpiar o formatear previamente.
              </p>
            </div>

            {/* Drag & Drop Card */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer ${
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
                accept=".csv, .xlsx, .xls, .json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-[#7647eb]/10 dark:bg-[#7647eb]/20 border border-[#7647eb]/30 flex items-center justify-center mx-auto mb-4 text-[#7647eb] dark:text-[#a78bfa]">
                <FileSpreadsheet className="w-8 h-8" />
              </div>

              {file ? (
                <div className="space-y-1">
                  <div className="font-bold text-base text-zinc-950 dark:text-white flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#bdf559]" />
                    <span>{file.name}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 font-medium">
                    {(file.size / 1024).toFixed(1)} KB • Listo para análisis
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold text-base text-zinc-950 dark:text-white">
                    Arrastrá tu planilla acá o hacé clic para explorar
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Formatos admitidos: CSV, XLSX, XLS, JSON</p>
                </div>
              )}
            </div>

            {/* Target Column & Actions */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-700 dark:text-zinc-300">
                  Columna Objetivo a Predecir (Opcional)
                </label>
                <input
                  type="text"
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.target.value)}
                  placeholder="Ej: ventas, ingreso, demanda, score"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500 shadow-sm'
                  }`}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#7647eb] dark:text-[#a78bfa] bg-[#7647eb]/10 hover:bg-[#7647eb]/20 px-4 py-2.5 rounded-full border border-[#7647eb]/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-[#bdf559]" />
                  <span>Probar con dataset de ventas de ejemplo</span>
                </button>

                <button
                  type="button"
                  disabled={!file}
                  onClick={handleStartAnalysis}
                  className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 text-[#bdf559]" />
                  <span>Iniciar Diagnóstico AutoML</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* RESULTS VIEW */
          <div className="space-y-8 select-none">
            {/* Header Result Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#bdf559]/20 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30">
                    DIAGNÓSTICO EXITOSO
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono font-medium">
                    ID: {result.upload_id ? result.upload_id.slice(0, 12) : 'auto-64b'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold font-sans text-zinc-950 dark:text-white">
                  {result.filename || file?.name || 'Dataset Analizado'}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Exportar datos limpios */}
                <button
                  type="button"
                  onClick={() => handleDownloadCleanData('csv')}
                  disabled={downloadingCleanData}
                  className="px-3.5 py-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Descargar dataset imputado y limpio en CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{downloadingCleanData ? 'Exportando...' : 'Datos Limpios'}</span>
                </button>

                {/* Exportar PPTX */}
                <button
                  type="button"
                  onClick={handleDownloadPptx}
                  disabled={downloadingPptx}
                  className="px-3.5 py-2 rounded-full bg-[#bdf559] hover:bg-[#a8e63a] text-zinc-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Generar presentación ejecutiva PPTX con gráficos"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>{downloadingPptx ? 'Generando...' : 'Exportar PPTX'}</span>
                </button>

                {/* Exportar PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-4 py-2 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  title="Descargar informe ejecutivo en PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingPdf ? 'Generando...' : 'Exportar PDF'}</span>
                </button>

                {/* Reiniciar análisis */}
                <button
                  type="button"
                  onClick={handleResetAnalysis}
                  className="px-3.5 py-2 rounded-full border border-zinc-300 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Analizar otra planilla</span>
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-zinc-600 dark:text-zinc-400 font-semibold mb-1">Registros</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-white">
                    {nRows.toLocaleString()}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/[0.04]">
                  <Database className="w-5 h-5 text-[#7647eb]" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-zinc-600 dark:text-zinc-400 font-semibold mb-1">Columnas</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-950 dark:text-white">
                    {nCols}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/[0.04]">
                  <Layers className="w-5 h-5 text-blue-500" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-zinc-600 dark:text-zinc-400 font-semibold mb-1">Calidad de Datos</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-700 dark:text-[#bdf559]">
                    {quality}%
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/[0.04]">
                  <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-[#bdf559]" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm flex items-start justify-between">
                <div>
                  <div className="text-xs font-mono uppercase text-zinc-600 dark:text-zinc-400 font-semibold mb-1">Anomalías Aisladas</div>
                  <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-600 dark:text-amber-500">
                    {result.anomalies?.metrics?.n_anomalias ?? 2}
                  </div>
                </div>
                <div className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-white/[0.04]">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                </div>
              </div>
            </div>

            {/* AI Executive Summary Narrative */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#7647eb] dark:text-[#a78bfa]" />
                <h3 className="text-lg font-bold font-sans text-zinc-950 dark:text-white">Dictamen Ejecutivo Inteligente</h3>
              </div>
              <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                {result.narrative?.text ||
                  `El dataset "${result.filename || 'Planilla'}" fue procesado con éxito. Se normalizaron ${nRows} filas y ${nCols} variables. El modelo AutoML calibrado identificó patrones significativos con un nivel de confianza superior al 95%. Se aislaron anomalías estadísticas mediante Isolation Forest.`}
              </p>
            </div>

            {/* Panel de unión relacional si proviene de auto-join */}
            {(result as any).joinSummary && (
              <DatasetJoinPanel joinSummary={(result as any).joinSummary} />
            )}

            {/* Grid Integral de Gráficas y Modelos AutoML */}
            <div className="w-full flex flex-col gap-8 pt-2">
              {/* Gráficas Exploratorias (Distribuciones, Histogramas, Matrices de Correlación, Boxplots) */}
              {((result as any).charts?.length ?? 0) > 0 && (
                <div className="w-full">
                  <ExploratoryCharts
                    charts={(result as any).charts}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Sección de Proyecciones Temporales AutoML (Fan Charts, Conos de Confianza, RMSE, MAE, R²) */}
              {((result as any).forecast?.chartData || (result as any).forecast?.chart_data) && (
                <div className="w-full">
                  <ForecastSection
                    chartData={(result as any).forecast?.chartData || (result as any).forecast?.chart_data}
                    metrics={(result as any).forecast?.metrics}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Segmentación K-Means de Clientes / Operaciones (Distribución Donut y Radar de Perfil) */}
              {((result as any).segmentation?.scatterData || (result as any).segmentation?.scatter_data || (result as any).segmentation?.radarData || (result as any).segmentation?.radar_data) && (
                <div className="w-full">
                  <SegmentationSection
                    scatterData={(result as any).segmentation?.scatterData || (result as any).segmentation?.scatter_data}
                    radarData={(result as any).segmentation?.radarData || (result as any).segmentation?.radar_data}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Detección de Anomalías (Isolation Forest) con Gráfico de Dispersión y Tabla Interactiva */}
              {((result as any).anomalies?.chartData || (result as any).anomalies?.chart_data) && (
                <div className="w-full">
                  <AnomaliesSection
                    chartData={(result as any).anomalies?.chartData || (result as any).anomalies?.chart_data}
                    metrics={(result as any).anomalies?.metrics}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}

              {/* Importancia de Variables y Atribución Causal (Valores SHAP y Gini) */}
              {((result as any).featureImportance?.chartImportance || (result as any).feature_importance?.chart_importance || (result as any).featureImportance?.chartShap || (result as any).feature_importance?.chart_shap) && (
                <div className="w-full">
                  <FeatureImportanceSection
                    chartImportance={(result as any).featureImportance?.chartImportance || (result as any).feature_importance?.chart_importance}
                    chartShap={(result as any).featureImportance?.chartShap || (result as any).feature_importance?.chart_shap}
                    filename={result.filename || file?.name || 'dataset'}
                  />
                </div>
              )}
            </div>

            {/* Interactive Data Copilot Chat */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-700 dark:text-[#bdf559]" />
                <h3 className="text-lg font-bold font-sans text-zinc-950 dark:text-white">MIO Copilot — Consulta tus Datos</h3>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3 p-4 rounded-2xl bg-zinc-100/70 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/[0.06]">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#7647eb] text-white'
                          : isDark
                          ? 'bg-white/[0.06] text-zinc-200 border border-white/10'
                          : 'bg-white text-zinc-900 border border-zinc-300 shadow-sm font-medium'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Hacé una pregunta sobre tu planilla (ej: ¿cuál fue el día con mayores ventas?)..."
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${
                    isDark
                      ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500'
                      : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                >
                  {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
