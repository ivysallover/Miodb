'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ============================================================================
 * MIO-DEV HARDWARE CONSOLE (High-Fidelity 2.5D Studio Edition - PRO SCALE)
 * Hardware interactivo:
 * - Botones A / B: Cambiar modo de gráfico (Forecasting, Clustering, Anomalías).
 * - D-PAD (◀ ▶ ▲ ▼): Navegación granular entre elementos/métricas del gráfico activo.
 * - START: Ejecución de computación AutoML en tiempo real con barrido láser.
 * - SELECT: Alternar horizonte temporal (Proyección 2026 vs Histórico 2025).
 * ============================================================================
 */

// 1. DATASETS DE ALTA PRECISIÓN (PREDICTIVO 2026 VS HISTÓRICO 2025)
const FORECAST_DATA = {
  '2026': [
    { id: 'ene', month: 'ENE', val: 28, amount: '$28,400', growth: '+10.4%', note: 'Inicio Q1 (Baseline)' },
    { id: 'feb', month: 'FEB', val: 35, amount: '$35,200', growth: '+12.1%', note: 'Tracción Orgánica' },
    { id: 'mar', month: 'MAR', val: 42, amount: '$42,800', growth: '+15.3%', note: 'Cierre Q1 Positivo' },
    { id: 'abr', month: 'ABR', val: 48, amount: '$48,100', growth: '+18.0%', note: 'Lanzamiento Campaña Q2' },
    { id: 'may', month: 'MAY', val: 56, amount: '$56,400', growth: '+22.4%', note: 'Expansión de Cartera' },
    { id: 'jun', month: 'JUN', val: 65, amount: '$65,900', growth: '+26.1%', note: 'Cierre Semestral H1' },
    { id: 'jul', month: 'JUL', val: 72, amount: '$72,300', growth: '+28.4%', note: 'Pico Mid-Year' },
    { id: 'ago', month: 'AGO', val: 78, amount: '$78,600', growth: '+30.2%', note: 'Demanda B2B Sostenida' },
    { id: 'sep', month: 'SEP', val: 84, amount: '$84,200', growth: '+32.6%', note: 'Cierre Q3 Acelerado' },
    { id: 'oct', month: 'OCT', val: 89, amount: '$89,500', growth: '+33.9%', note: 'Pre-temporada Q4' },
    { id: 'nov', month: 'NOV', val: 95, amount: '$95,100', growth: '+34.8%', note: 'Black Week / AutoML Peak' },
    { id: 'dic', month: 'DIC', val: 100, amount: '$104,800', growth: '+38.2%', note: 'Cierre Récord Anual' },
  ],
  '2025': [
    { id: 'ene', month: 'ENE', val: 18, amount: '$18,100', growth: '+4.2%', note: 'Datos Reales Auditados' },
    { id: 'feb', month: 'FEB', val: 22, amount: '$22,400', growth: '+5.8%', note: 'Tracción Inicial' },
    { id: 'mar', month: 'MAR', val: 26, amount: '$26,900', growth: '+7.1%', note: 'Cierre Q1 2025' },
    { id: 'abr', month: 'ABR', val: 31, amount: '$31,300', growth: '+8.4%', note: 'Campañas Tradicionales' },
    { id: 'may', month: 'MAY', val: 36, amount: '$36,000', growth: '+9.9%', note: 'Ventas Mayoristas' },
    { id: 'jun', month: 'JUN', val: 42, amount: '$42,500', growth: '+11.2%', note: 'Cierre Semestre H1' },
    { id: 'jul', month: 'JUL', val: 47, amount: '$47,800', growth: '+12.5%', note: 'Invierno 2025' },
    { id: 'ago', month: 'AGO', val: 51, amount: '$51,200', growth: '+13.0%', note: 'Línea de Base' },
    { id: 'sep', month: 'SEP', val: 56, amount: '$56,400', growth: '+14.2%', note: 'Cierre Q3 2025' },
    { id: 'oct', month: 'OCT', val: 62, amount: '$62,100', growth: '+15.6%', note: 'Q4 Histórico' },
    { id: 'nov', month: 'NOV', val: 68, amount: '$68,500', growth: '+16.8%', note: 'Black Friday 2025' },
    { id: 'dic', month: 'DIC', val: 74, amount: '$74,200', growth: '+18.4%', note: 'Cierre Anual 2025' },
  ],
};

const CLUSTER_SEGMENTS = [
  {
    id: 'vip',
    label: 'VIP HIGH-VALUE',
    share: '62%',
    heightPercent: 88,
    count: '3,420 usuarios',
    ticket: '$840 USD',
    churn: '0.8%',
    ltv: '$9,200',
    color: '#bdf559',
    note: 'Máxima retención y recurrencia',
  },
  {
    id: 'med',
    label: 'MID-TIER EXPANSION',
    share: '26%',
    heightPercent: 54,
    count: '8,910 usuarios',
    ticket: '$220 USD',
    churn: '3.4%',
    ltv: '$2,450',
    color: '#9366ff',
    note: 'Oportunidad de cross-selling',
  },
  {
    id: 'base',
    label: 'BASE LONG-TAIL',
    share: '12%',
    heightPercent: 32,
    count: '21,500 usuarios',
    ticket: '$45 USD',
    churn: '11.2%',
    ltv: '$480',
    color: '#64748b',
    note: 'Nuevos registros y onboarding',
  },
];

const ANOMALY_POINTS = [
  {
    id: 'anom-1',
    x: 22,
    y: 26,
    isAnomaly: true,
    code: 'ANOM-01',
    title: 'SPIKE DE LATENCIA API',
    metric: '+420ms',
    badge: 'DESVÍO CRÍTICO 4.8σ',
    detail: 'Pico anómalo en nodo de auth externo',
  },
  {
    id: 'anom-2',
    x: 78,
    y: 28,
    isAnomaly: true,
    code: 'ANOM-02',
    title: 'DROP EN CONVERSIÓN',
    metric: '-34.2%',
    badge: 'ALERTA 3.1σ',
    detail: 'Caída inusual en pasarela secundaria',
  },
  {
    id: 'anom-3',
    x: 88,
    y: 72,
    isAnomaly: true,
    code: 'ANOM-03',
    title: 'OUTLIER TICKET CHECKOUT',
    metric: '$14,900',
    badge: 'INVESTIGACIÓN',
    detail: 'Orden 11x superior al ticket promedio',
  },
  {
    id: 'pt-4',
    x: 36,
    y: 54,
    isAnomaly: false,
    code: 'PT-04',
    title: 'TRÁFICO ORGÁNICO WEB',
    metric: '4,210 req/s',
    badge: 'NOMINAL',
    detail: 'Flujo estándar dentro del percentil 95',
  },
  {
    id: 'pt-5',
    x: 52,
    y: 46,
    isAnomaly: false,
    code: 'PT-05',
    title: 'PROCESAMIENTO STRIPE',
    metric: '99.8% OK',
    badge: 'NOMINAL',
    detail: 'Tasa de aprobación de cobros normal',
  },
  {
    id: 'pt-6',
    x: 64,
    y: 68,
    isAnomaly: false,
    code: 'PT-06',
    title: 'BATCH INGESTA ERP',
    metric: '18ms sync',
    badge: 'NOMINAL',
    detail: 'Sincronización de catálogos completa',
  },
  {
    id: 'pt-7',
    x: 44,
    y: 76,
    isAnomaly: false,
    code: 'PT-07',
    title: 'CACHE HIT RATIO',
    metric: '94.2%',
    badge: 'NOMINAL',
    detail: 'Memoria Redis respondiendo a 1.2ms',
  },
  {
    id: 'pt-8',
    x: 70,
    y: 42,
    isAnomaly: false,
    code: 'PT-08',
    title: 'BACKUP INCREMENTAL',
    metric: '0 err',
    badge: 'NOMINAL',
    detail: 'Respaldo cloud completado exitosamente',
  },
];

const SCREEN_MODES = [
  {
    id: 'forecasting',
    title: 'AUTO-ML FORECAST',
    tag: 'ARIMA + PROPHET',
    type: 'wave',
  },
  {
    id: 'clustering',
    title: 'K-MEANS CLUSTERING',
    tag: '3 SEGMENTOS',
    type: 'bars',
  },
  {
    id: 'anomalies',
    title: 'ANOMALY DETECTOR',
    tag: 'ISOLATION FOREST',
    type: 'scatter',
  },
];

import { playMioDevSound as playTactileSound } from '@/lib/sound';

export default function MioDevCanvas() {
  // Estado del modo principal (A / B)
  const [activeModeIdx, setActiveModeIdx] = useState(0);

  // Estado del elemento seleccionado por gráfico (D-PAD)
  const [forecastIdx, setForecastIdx] = useState(10); // Noviembre por defecto
  const [clusterIdx, setClusterIdx] = useState(0); // VIP por defecto
  const [anomalyIdx, setAnomalyIdx] = useState(0); // Anomalía 1 por defecto

  // Estado del botón presionado para feedback táctil
  const [btnPressed, setBtnPressed] = useState<string | null>(null);

  // START: Ejecución de inferencia / computación AutoML
  const [isComputing, setIsComputing] = useState(false);
  const [computeText, setComputeText] = useState('');

  // SELECT: Horizonte de tiempo (2026 Proyección vs 2025 Histórico)
  const [timeHorizon, setTimeHorizon] = useState<'2026' | '2025'>('2026');
  const [selectToast, setSelectToast] = useState<string | null>(null);

  // Switch de Hardware Power
  const [isPoweredOn, setIsPoweredOn] = useState(true);

  const currentMode = SCREEN_MODES[activeModeIdx];

  // ==========================================================================
  // MANEJADOR DE TOGGLE DE ENERGÍA DE HARDWARE
  // ==========================================================================
  const handleTogglePower = () => {
    playTactileSound('toggle');
    setIsPoweredOn((prev) => !prev);
  };

  // ==========================================================================
  // MANEJADORES DE BOTONES A Y B (CAMBIO DE MODO GENERAL)
  // ==========================================================================
  const handleNextMode = () => {
    playTactileSound('buttonA');
    setActiveModeIdx((prev) => (prev + 1) % SCREEN_MODES.length);
    setBtnPressed('a');
    setTimeout(() => setBtnPressed(null), 180);
  };

  const handlePrevMode = () => {
    playTactileSound('buttonB');
    setActiveModeIdx((prev) => (prev - 1 + SCREEN_MODES.length) % SCREEN_MODES.length);
    setBtnPressed('b');
    setTimeout(() => setBtnPressed(null), 180);
  };

  // ==========================================================================
  // MANEJADOR DEL D-PAD (FLECHAS: NAVEGACIÓN DENTRO DEL GRÁFICO ACTIVO)
  // ==========================================================================
  const handleDpad = (dir: 'left' | 'right' | 'up' | 'down') => {
    playTactileSound('dpad');
    setBtnPressed(dir);
    setTimeout(() => setBtnPressed(null), 180);

    const forecastListLength = FORECAST_DATA[timeHorizon].length;

    if (activeModeIdx === 0) {
      // MODO FORECAST: Navegar entre los 12 meses
      if (dir === 'right' || dir === 'up') {
        setForecastIdx((prev) => (prev + 1) % forecastListLength);
      } else {
        setForecastIdx((prev) => (prev - 1 + forecastListLength) % forecastListLength);
      }
    } else if (activeModeIdx === 1) {
      // MODO CLUSTERING: Navegar entre los 3 segmentos (VIP, MED, BASE)
      if (dir === 'right' || dir === 'down') {
        setClusterIdx((prev) => (prev + 1) % CLUSTER_SEGMENTS.length);
      } else {
        setClusterIdx((prev) => (prev - 1 + CLUSTER_SEGMENTS.length) % CLUSTER_SEGMENTS.length);
      }
    } else if (activeModeIdx === 2) {
      // MODO ANOMALÍAS: Navegar entre los 8 puntos del scatter
      if (dir === 'right' || dir === 'down') {
        setAnomalyIdx((prev) => (prev + 1) % ANOMALY_POINTS.length);
      } else {
        setAnomalyIdx((prev) => (prev - 1 + ANOMALY_POINTS.length) % ANOMALY_POINTS.length);
      }
    }
  };

  // ==========================================================================
  // MANEJADOR DE START (EJECUTAR AUTO-ML / REENTRENAR INFERENCIA)
  // ==========================================================================
  const handleStart = () => {
    if (isComputing) return;
    playTactileSound('start');
    setBtnPressed('start');
    setIsComputing(true);
    setComputeText('AUTOML OPTIMIZING...');

    setTimeout(() => {
      setComputeText('TUNING HYPERPARAMETERS...');
    }, 450);

    setTimeout(() => {
      setComputeText('ENSEMBLE R² 0.994 // SYNCED');
    }, 900);

    setTimeout(() => {
      setIsComputing(false);
      setBtnPressed(null);
    }, 1400);
  };

  // ==========================================================================
  // MANEJADOR DE SELECT (ALTERNAR HORIZONTE: 2026 PROYECCIÓN / 2025 HISTÓRICO)
  // ==========================================================================
  const handleSelect = () => {
    playTactileSound('select');
    setBtnPressed('select');
    const nextHorizon = timeHorizon === '2026' ? '2025' : '2026';
    setTimeHorizon(nextHorizon);
    setSelectToast(
      nextHorizon === '2026'
        ? '⟲ VISTA: PROYECCIÓN 2026 (IA AUTOML)'
        : '⟲ VISTA: HISTÓRICO 2025 (DATOS REALES)'
    );
    setTimeout(() => setSelectToast(null), 1500);
    setTimeout(() => setBtnPressed(null), 180);
  };

  // Métricas activas dinámicas según selección y horizonte temporal
  const currentForecastList = FORECAST_DATA[timeHorizon];
  const selectedForecast = currentForecastList[forecastIdx];
  const selectedCluster = CLUSTER_SEGMENTS[clusterIdx];
  const selectedAnomaly = ANOMALY_POINTS[anomalyIdx];

  return (
    <div className="relative select-none flex items-center justify-center p-2 sm:p-6 lg:p-8">
      {/* ================================================================== */}
      {/* CHASIS DE POLICARBONATO VIOLETA MIO (Sombra 100% Acoplada Directa) */}
      {/* ================================================================== */}
      <div
        className="relative w-[340px] sm:w-[420px] md:w-[460px] lg:w-[490px] xl:w-[520px] rounded-[44px] sm:rounded-[48px] p-6 sm:p-7 lg:p-8 overflow-hidden transition-transform duration-300"
        style={{
          background: 'linear-gradient(155deg, #8152f2 0%, #7647eb 35%, #6335dc 75%, #5227c7 100%)',
          boxShadow: `
            /* Biseles internos de iluminación del plástico */
            inset 0 2px 2px rgba(255, 255, 255, 0.38),
            inset 0 -3px 5px rgba(0, 0, 0, 0.45),
            inset 2px 0 3px rgba(255, 255, 255, 0.18),
            inset -2px 0 3px rgba(0, 0, 0, 0.28),
            /* Sombra de contacto oclusiva directa (AO): pegada al chasis */
            0 4px 6px -1px rgba(16, 10, 32, 0.45),
            /* Sombra media proyectada hacia abajo y derecha */
            8px 18px 32px -4px rgba(18, 10, 36, 0.30),
            /* Penumbra difusa suave que se funde en la mesa de fondo */
            18px 40px 70px -8px rgba(14, 8, 28, 0.24)
          `,
          transform: 'rotate(-1deg)',
        }}
      >
        {/* Micro-textura de plástico satinado acelerada por GPU */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
            backgroundSize: '6px 6px',
          }}
        />

        {/* Línea sutil de partición de molde perimetral (Parting Line de hardware real) */}
        <div className="absolute inset-2.5 sm:inset-3 rounded-[38px] sm:rounded-[42px] border border-black/15 pointer-events-none" />

        {/* ================================================================ */}
        {/* HARDWARE TOP BAR: Switch de Encendido & Tornillos de Chasis      */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between mb-4 sm:mb-5 relative z-10">
          {/* Switch de Encendido mecánico (Hardware toggle) */}
          <div className="flex items-center gap-2.5">
            <div
              onClick={handleTogglePower}
              className="w-14 sm:w-16 h-6 sm:h-7 rounded-full bg-[#1b152b] p-0.5 border border-black/40 flex items-center shadow-inner cursor-pointer"
              title={`Hardware Switch: ${isPoweredOn ? 'ON' : 'OFF'}`}
            >
              <div
                className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-[#352d4e] border border-white/20 shadow-md transform flex items-center justify-center transition-transform ${
                  isPoweredOn ? 'translate-x-8 sm:translate-x-9' : 'translate-x-0.5'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isComputing
                      ? 'bg-mio-lime shadow-[0_0_8px_#bdf559] animate-ping'
                      : isPoweredOn
                      ? 'bg-mio-lime shadow-[0_0_8px_#bdf559]'
                      : 'bg-gray-600'
                  }`}
                />
              </div>
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-violet-200/80 uppercase">
              {isComputing ? 'AUTOML RUN' : isPoweredOn ? 'PWR // ON' : 'PWR // OFF'}
            </span>
          </div>

          {/* Ranura y tornillo de latón/grafito maquinado */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#2a223e] border border-black/50 shadow-inner flex items-center justify-center">
              <div className="w-2 h-0.5 bg-black/40 rotate-45" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-widest text-white/50 uppercase">
              MIO-DEV 01
            </span>
          </div>
        </div>

        {/* ================================================================ */}
        {/* PANTALLA OLED OBSIDIANA CON BISEL SATINADO                       */}
        {/* ================================================================ */}
        <div
          className="relative bg-[#0b0914] rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 border-2 border-black/60 shadow-[inset_0_3px_6px_rgba(0,0,0,0.85)] mb-6 sm:mb-8 overflow-hidden"
        >
          {/* Franja de acento MIO Lima superior con pulso en cómputo */}
          <div
            className={`h-1.5 w-full bg-gradient-to-r from-transparent via-mio-lime to-transparent opacity-85 mb-3 rounded-full shadow-[0_0_10px_#bdf559] ${
              isComputing ? 'animate-pulse scale-y-125' : ''
            }`}
          />

          {/* Header de la Pantalla OLED */}
          <div className="flex items-center justify-between border-b border-gray-800/80 pb-2.5 mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mio-lime opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mio-lime shadow-[0_0_8px_#bdf559]" />
              </span>
              <span className="text-xs sm:text-sm font-mono font-black tracking-wider text-mio-lime">
                MIO OS v2.6
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono bg-mio-violet/40 px-2 py-0.5 rounded text-violet-200 border border-mio-violet/60 font-bold">
                {timeHorizon} {timeHorizon === '2026' ? 'PREDICTIVO' : 'HISTÓRICO'}
              </span>
              <span className="text-[10px] sm:text-xs font-mono bg-white/10 px-2.5 py-0.5 rounded text-gray-200 font-bold tracking-wider">
                {currentMode.tag}
              </span>
            </div>
          </div>

          {/* Cristal templado reflectivo (Reflejo diagonal) */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 48%)',
            }}
          />

          {/* Scanlines CRT sutiles */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage: 'linear-gradient(rgba(18, 16, 31, 0) 50%, rgba(0, 0, 0, 0.8) 50%)',
              backgroundSize: '100% 3px',
            }}
          />

          {/* Animación de barrido láser al presionar START */}
          {isComputing && (
            <motion.div
              initial={{ top: '-10%' }}
              animate={{ top: '110%' }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              className="absolute left-0 right-0 h-16 pointer-events-none z-30"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(189,245,89,0.35) 50%, #bdf559 90%, transparent 100%)',
                boxShadow: '0 0 15px #bdf559',
              }}
            />
          )}

          {/* Toast / Notificación al presionar SELECT */}
          <AnimatePresence>
            {selectToast && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="absolute top-14 left-4 right-4 z-40 bg-[#160e2c]/95 border-2 border-mio-lime px-3 py-2 rounded-xl shadow-[0_0_20px_rgba(189,245,89,0.4)] flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <div className="w-2 h-2 rounded-full bg-mio-lime animate-ping" />
                <span className="text-[10px] sm:text-xs font-mono font-black text-mio-lime tracking-wide text-center">
                  {selectToast}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlay de estado al computar con START */}
          <AnimatePresence>
            {isComputing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0b0914]/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-4 text-center"
              >
                <div className="w-10 h-10 rounded-full border-2 border-mio-lime border-t-transparent animate-spin mb-3 shadow-[0_0_12px_#bdf559]" />
                <div className="text-xs sm:text-sm font-mono font-black text-mio-lime tracking-widest animate-pulse">
                  {computeText}
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">
                  CALCULANDO PARÁMETROS AUTOML // 60 FPS
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ============================================================== */}
          {/* PANTALLA OLED: Visualización interactiva según Modo            */}
          {/* ============================================================== */}
          <div className="min-h-[195px] sm:min-h-[225px] lg:min-h-[255px] flex flex-col justify-between py-1 relative z-10">
            <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-bold uppercase tracking-wide text-gray-400">
              <span>{currentMode.title}</span>
              <span className="text-[10px] text-gray-500 font-normal">
                D-PAD para explorar
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentMode.id}-${timeHorizon}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="py-2"
              >
                {/* -------------------------------------------------------- */}
                {/* MODO 1: AUTO-ML FORECAST (12 BARRAS NAVEGABLES)           */}
                {/* -------------------------------------------------------- */}
                {currentMode.type === 'wave' && (
                  <div className="h-32 sm:h-38 lg:h-44 w-full flex items-end justify-between gap-1 sm:gap-1.5 px-0.5 pt-2">
                    {currentForecastList.map((item, idx) => {
                      const isSelected = idx === forecastIdx;
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            playTactileSound('dpad');
                            setForecastIdx(idx);
                          }}
                          className="relative flex-1 flex flex-col items-center cursor-pointer group"
                        >
                          {/* Cursor flotante suave sobre la barra activa */}
                          <div className="h-3.5 flex items-center justify-center mb-0.5 relative w-full">
                            {isSelected && (
                              <motion.div
                                layoutId="forecast-cursor"
                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                className={`text-[10px] font-black leading-none ${
                                  timeHorizon === '2026'
                                    ? 'text-mio-lime drop-shadow-[0_0_6px_#bdf559]'
                                    : 'text-violet-300 drop-shadow-[0_0_6px_#a78bfa]'
                                }`}
                              >
                                ▼
                              </motion.div>
                            )}
                          </div>

                          {/* Halo suave de selección */}
                          {isSelected && (
                            <motion.div
                              layoutId="forecast-column-glow"
                              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                              className={`absolute -inset-x-0.5 top-3.5 bottom-4 rounded border pointer-events-none ${
                                timeHorizon === '2026'
                                  ? 'bg-mio-lime/10 border-mio-lime/30'
                                  : 'bg-violet-400/10 border-violet-400/30'
                              }`}
                            />
                          )}

                          {/* Barra interactiva con transición suave */}
                          <div
                            style={{
                              height: isSelected ? `${item.val * 1.3}px` : `${item.val * 1.15}px`,
                              transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease, opacity 0.3s ease, box-shadow 0.3s ease',
                            }}
                            className={`w-full rounded-t relative z-10 ${
                              isSelected
                                ? timeHorizon === '2026'
                                  ? 'bg-mio-lime shadow-[0_0_14px_#bdf559] border-t-2 border-white'
                                  : 'bg-violet-400 shadow-[0_0_14px_rgba(167,139,250,0.8)] border-t-2 border-white'
                                : timeHorizon === '2026'
                                ? 'bg-gradient-to-t from-mio-violet/70 to-mio-lime/60 opacity-45 group-hover:opacity-85'
                                : 'bg-gradient-to-t from-[#432094] to-violet-500/50 opacity-40 group-hover:opacity-80'
                            }`}
                          />

                          {/* Label del mes */}
                          <span
                            className={`text-[8px] sm:text-[9px] font-mono mt-1 transition-colors duration-200 relative z-10 ${
                              isSelected
                                ? timeHorizon === '2026'
                                  ? 'text-mio-lime font-black'
                                  : 'text-violet-300 font-black'
                                : 'text-gray-500 font-medium group-hover:text-gray-300'
                            }`}
                          >
                            {item.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* -------------------------------------------------------- */}
                {/* MODO 2: K-MEANS CLUSTERING (3 SEGMENTOS CLAVE)            */}
                {/* -------------------------------------------------------- */}
                {currentMode.type === 'bars' && (
                  <div className="h-32 sm:h-38 lg:h-44 w-full flex items-end justify-around gap-4 sm:gap-6 px-3 pt-2">
                    {CLUSTER_SEGMENTS.map((cluster, idx) => {
                      const isSelected = idx === clusterIdx;
                      return (
                        <div
                          key={cluster.id}
                          onClick={() => {
                            playTactileSound('dpad');
                            setClusterIdx(idx);
                          }}
                          className="relative flex-1 flex flex-col items-center cursor-pointer group p-1.5 rounded-xl"
                        >
                          {/* Marco de selección fluido */}
                          {isSelected && (
                            <motion.div
                              layoutId="cluster-focus-frame"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              className="absolute inset-0 rounded-xl bg-white/[0.04] border border-mio-lime/50 shadow-[0_0_16px_rgba(189,245,89,0.18)] pointer-events-none"
                            />
                          )}

                          {/* Porcentaje / Tag superior */}
                          <span
                            className={`text-xs sm:text-sm font-mono font-bold mb-1.5 transition-all duration-200 relative z-10 ${
                              isSelected ? 'text-mio-lime font-black scale-110' : 'text-gray-400 group-hover:text-gray-200'
                            }`}
                          >
                            {cluster.share}
                          </span>

                          {/* Barra de clúster */}
                          <div
                            style={{
                              height: isSelected ? `${cluster.heightPercent * 1.15}px` : `${cluster.heightPercent * 1.05}px`,
                              backgroundColor: cluster.color,
                              transition: 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, box-shadow 0.25s ease',
                            }}
                            className={`w-full rounded-t relative z-10 ${
                              isSelected
                                ? 'shadow-[0_0_18px_rgba(189,245,89,0.55)] ring-2 ring-white/60'
                                : 'opacity-55 group-hover:opacity-85'
                            }`}
                          />

                          {/* Label y flechita */}
                          <div className="flex flex-col items-center mt-2 relative z-10">
                            <span
                              className={`text-[10px] sm:text-xs font-mono font-black tracking-wider transition-colors duration-200 ${
                                isSelected ? 'text-mio-lime' : 'text-gray-400'
                              }`}
                            >
                              {cluster.id.toUpperCase()}
                            </span>
                            <div className="h-1.5 flex items-center justify-center mt-0.5">
                              {isSelected && (
                                <motion.span
                                  layoutId="cluster-dot"
                                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                  className="w-1.5 h-1.5 rounded-full bg-mio-lime shadow-[0_0_6px_#bdf559]"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* -------------------------------------------------------- */}
                {/* MODO 3: ANOMALY DETECTOR (SCATTER CON MIRA FLUIDA)        */}
                {/* -------------------------------------------------------- */}
                {currentMode.type === 'scatter' && (
                  <div className="h-32 sm:h-38 lg:h-44 w-full relative border border-dashed border-gray-800/80 rounded-lg p-2 overflow-hidden">
                    {/* Retícula de fondo del radar */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293718_1px,transparent_1px),linear-gradient(to_bottom,#1f293718_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                    {/* MIRA TÁCTICA FLUIDA: Vuela suavemente entre los puntos al pulsar D-Pad */}
                    <motion.div
                      className="absolute pointer-events-none z-20"
                      animate={{
                        left: `${selectedAnomaly.x}%`,
                        top: `${selectedAnomaly.y}%`,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 350,
                        damping: 28,
                      }}
                      style={{ transform: 'translate(-50%, -50%)' }}
                    >
                      <div className="relative w-8 h-8 flex items-center justify-center">
                        {/* Anillo de radar pulsante */}
                        <div className="absolute inset-0 rounded-full border border-mio-lime/70 shadow-[0_0_10px_#bdf559] animate-pulse" />
                        {/* Anillo exterior punteado rotatorio */}
                        <div
                          className="absolute -inset-1 rounded-full border border-dashed border-white/50 animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                        {/* Centro de mira */}
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#fff]" />
                      </div>
                    </motion.div>

                    {/* Puntos estáticos / radar markers */}
                    {ANOMALY_POINTS.map((pt, idx) => {
                      const isSelected = idx === anomalyIdx;
                      return (
                        <div
                          key={pt.id}
                          onClick={() => {
                            playTactileSound('dpad');
                            setAnomalyIdx(idx);
                          }}
                          className="absolute cursor-pointer -translate-x-1/2 -translate-y-1/2 group"
                          style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                        >
                          <div
                            className={`rounded-full transition-all duration-200 ${
                              pt.isAnomaly
                                ? 'w-3.5 h-3.5 bg-red-500 shadow-[0_0_10px_#ef4444]'
                                : 'w-2.5 h-2.5 bg-mio-lime shadow-[0_0_8px_#bdf559]'
                            } ${isSelected ? 'scale-125 ring-2 ring-white/80 opacity-100' : 'opacity-65 group-hover:opacity-100 group-hover:scale-110'}`}
                          />

                          {pt.isAnomaly && (
                            <span className="absolute -top-3.5 -right-3 text-[8px] font-mono text-red-400 font-black">
                              !
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ============================================================ */}
            {/* FOOTER DE PANTALLA: Métrica con transición fluida           */}
            {/* ============================================================ */}
            <div className="border-t border-gray-800/80 pt-2.5 min-h-[50px] flex items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeModeIdx}-${forecastIdx}-${clusterIdx}-${anomalyIdx}-${timeHorizon}`}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center justify-between w-full"
                >
                  {activeModeIdx === 0 && (
                    <>
                      <div className="overflow-hidden pr-2">
                        <div className="text-[10px] sm:text-xs font-mono text-gray-400 truncate">
                          {selectedForecast.month} {timeHorizon} // {selectedForecast.note}
                        </div>
                        <div
                          className={`text-lg sm:text-xl lg:text-2xl font-black font-mono tracking-tight leading-none mt-0.5 ${
                            timeHorizon === '2026' ? 'text-mio-lime' : 'text-violet-300'
                          }`}
                        >
                          {selectedForecast.amount}{' '}
                          <span className="text-xs sm:text-sm font-bold text-gray-300">USD</span>
                        </div>
                      </div>
                      <div
                        className={`text-[9px] sm:text-[10px] font-mono font-bold px-2.5 py-1 border rounded shrink-0 ${
                          timeHorizon === '2026'
                            ? 'bg-mio-violet/30 text-mio-lime border-mio-violet/50'
                            : 'bg-violet-900/40 text-violet-200 border-violet-700/60'
                        }`}
                      >
                        {selectedForecast.growth} MoM
                      </div>
                    </>
                  )}

                  {activeModeIdx === 1 && (
                    <>
                      <div className="overflow-hidden pr-2">
                        <div className="text-[10px] sm:text-xs font-mono text-gray-400 truncate">
                          {selectedCluster.label} ({selectedCluster.count})
                        </div>
                        <div className="text-lg sm:text-xl lg:text-2xl font-black font-mono text-mio-lime tracking-tight leading-none mt-0.5">
                          {selectedCluster.ticket}{' '}
                          <span className="text-xs sm:text-sm font-bold text-gray-300">TICKET PROM</span>
                        </div>
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono font-bold px-2.5 py-1 bg-mio-violet/30 text-mio-lime border border-mio-violet/50 rounded shrink-0">
                        CHURN: {selectedCluster.churn}
                      </div>
                    </>
                  )}

                  {activeModeIdx === 2 && (
                    <>
                      <div className="overflow-hidden pr-2">
                        <div className="text-[10px] sm:text-xs font-mono text-gray-400 truncate">
                          {selectedAnomaly.code} // {selectedAnomaly.detail}
                        </div>
                        <div
                          className={`text-base sm:text-lg lg:text-xl font-black font-mono tracking-tight leading-none mt-0.5 ${
                            selectedAnomaly.isAnomaly ? 'text-red-400' : 'text-mio-lime'
                          }`}
                        >
                          {selectedAnomaly.title}
                        </div>
                      </div>
                      <div
                        className={`text-[9px] sm:text-[10px] font-mono font-bold px-2.5 py-1 border rounded shrink-0 ${
                          selectedAnomaly.isAnomaly
                            ? 'bg-red-950/40 text-red-400 border-red-800/60'
                            : 'bg-mio-violet/30 text-mio-lime border-mio-violet/50'
                        }`}
                      >
                        {selectedAnomaly.badge}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Overlay de Standby cuando el switch de hardware está en OFF */}
            {!isPoweredOn && (
              <div className="absolute inset-0 z-40 bg-[#06040b]/96 flex flex-col items-center justify-center font-mono backdrop-blur-sm transition-all duration-300">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-600 mb-2 shadow-inner" />
                <span className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  [ MIO OS EN STANDBY ]
                </span>
                <span className="text-[9px] text-gray-600 mt-1">
                  Deslizá el interruptor PWR a ON para reanudar
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* CONTROLES FÍSICOS MECÁNICOS: D-PAD MONOLÍTICO & BOTONES A / B    */}
        {/* ================================================================ */}
        <div className="grid grid-cols-2 gap-6 items-center pt-2 pb-2 relative z-10">
          {/* D-PAD EN CRUZ MONOLÍTICO CON BASCULANTE 3D (ROCKER GIMBAL) */}
          <div className="flex justify-center">
            <div className="relative w-28 h-28 sm:w-34 sm:h-34 lg:w-36 lg:h-36 flex items-center justify-center">
              {/* Pozo / cavidad cóncava circular del D-pad */}
              <div
                className="absolute inset-0 rounded-full border border-black/50"
                style={{
                  background: 'radial-gradient(circle, #100b1c 45%, #181228 100%)',
                  boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.95), inset 0 -2px 3px rgba(255,255,255,0.08), 0 2px 4px rgba(0,0,0,0.4)',
                }}
              />

              {/* CRUZ MONOLÍTICA UNIFICADA CON MOVIMIENTO BASCULANTE 3D */}
              <div
                className="relative w-24 sm:w-28 lg:w-30 h-24 sm:h-28 lg:h-30 flex items-center justify-center transition-transform duration-150 ease-out"
                style={{
                  transform:
                    btnPressed === 'up'
                      ? 'perspective(400px) rotateX(8deg) translateY(-2px)'
                      : btnPressed === 'down'
                      ? 'perspective(400px) rotateX(-8deg) translateY(2px)'
                      : btnPressed === 'left'
                      ? 'perspective(400px) rotateY(-8deg) translateX(-2px)'
                      : btnPressed === 'right'
                      ? 'perspective(400px) rotateY(8deg) translateX(2px)'
                      : 'perspective(400px) rotateX(0deg) rotateY(0deg) translateY(0px)',
                }}
              >
                {/* Brazo horizontal unificado continuo */}
                <div
                  className="absolute w-full h-8 sm:h-9 lg:h-10 rounded-xl"
                  style={{
                    background: 'linear-gradient(155deg, #32284b 0%, #241c38 50%, #1a1329 100%)',
                    boxShadow: '0 4px 0 #0d0818, 0 6px 14px rgba(0,0,0,0.6), inset 0 1.5px 1px rgba(255,255,255,0.22), inset 0 -1.5px 1px rgba(0,0,0,0.5)',
                  }}
                />

                {/* Brazo vertical unificado continuo */}
                <div
                  className="absolute h-full w-8 sm:w-9 lg:w-10 rounded-xl"
                  style={{
                    background: 'linear-gradient(155deg, #32284b 0%, #241c38 50%, #1a1329 100%)',
                    boxShadow: '0 4px 0 #0d0818, 0 6px 14px rgba(0,0,0,0.6), inset 0 1.5px 1px rgba(255,255,255,0.22), inset 0 -1.5px 1px rgba(0,0,0,0.5)',
                  }}
                />

                {/* Núcleo central de fusión: oculta cualquier costura interna */}
                <div className="absolute w-8 sm:w-9 lg:w-10 h-8 sm:h-9 lg:h-10 bg-[#241c38]" />

                {/* Hendidura cóncava esférica central (Thumb Rest / Pivot) */}
                <div
                  className="absolute w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border border-black/40 pointer-events-none z-20"
                  style={{
                    background: 'radial-gradient(circle, #130d20 0%, #241c36 100%)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.85), 0 1px 1px rgba(255,255,255,0.12)',
                  }}
                />

                {/* Iconos de flechas nítidas integradas en el molde */}
                {/* Flecha ARRIBA */}
                <div
                  className={`absolute top-1.5 sm:top-2 text-xs sm:text-sm font-black pointer-events-none z-20 transition-colors duration-150 ${
                    btnPressed === 'up' ? 'text-mio-lime drop-shadow-[0_0_8px_#bdf559]' : 'text-gray-400'
                  }`}
                >
                  ▲
                </div>
                {/* Flecha ABAJO */}
                <div
                  className={`absolute bottom-1.5 sm:bottom-2 text-xs sm:text-sm font-black pointer-events-none z-20 transition-colors duration-150 ${
                    btnPressed === 'down' ? 'text-mio-lime drop-shadow-[0_0_8px_#bdf559]' : 'text-gray-400'
                  }`}
                >
                  ▼
                </div>
                {/* Flecha IZQUIERDA */}
                <div
                  className={`absolute left-1.5 sm:left-2 text-xs sm:text-sm font-black pointer-events-none z-20 transition-colors duration-150 ${
                    btnPressed === 'left' ? 'text-mio-lime drop-shadow-[0_0_8px_#bdf559]' : 'text-gray-400'
                  }`}
                >
                  ◀
                </div>
                {/* Flecha DERECHA */}
                <div
                  className={`absolute right-1.5 sm:right-2 text-xs sm:text-sm font-black pointer-events-none z-20 transition-colors duration-150 ${
                    btnPressed === 'right' ? 'text-mio-lime drop-shadow-[0_0_8px_#bdf559]' : 'text-gray-400'
                  }`}
                >
                  ▶
                </div>

                {/* 4 HITBOXES TÁCTILES INVISIBLES DE PRECISIÓN */}
                {/* Click Arriba */}
                <button
                  type="button"
                  aria-label="D-Pad Arriba"
                  onClick={() => handleDpad('up')}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-9 sm:h-11 z-30 cursor-pointer focus:outline-none"
                />
                {/* Click Abajo */}
                <button
                  type="button"
                  aria-label="D-Pad Abajo"
                  onClick={() => handleDpad('down')}
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-9 sm:h-11 z-30 cursor-pointer focus:outline-none"
                />
                {/* Click Izquierda */}
                <button
                  type="button"
                  aria-label="D-Pad Izquierda"
                  onClick={() => handleDpad('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-9 sm:w-11 h-10 sm:h-12 z-30 cursor-pointer focus:outline-none"
                />
                {/* Click Derecha */}
                <button
                  type="button"
                  aria-label="D-Pad Derecha"
                  onClick={() => handleDpad('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-9 sm:w-11 h-10 sm:h-12 z-30 cursor-pointer focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN (A & B) PARA CAMBIAR DE GRÁFICO */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32 sm:w-38 sm:h-38 lg:w-40 lg:h-40 flex items-center justify-center">
              {/* Botón B (Dark Graphite / Modo Gráfico Anterior) */}
              <motion.button
                type="button"
                whileTap={{ y: 3, scale: 0.95 }}
                onClick={handlePrevMode}
                className={`absolute left-0 bottom-2 w-14 h-14 sm:w-16 sm:h-16 lg:w-[70px] lg:h-[70px] rounded-full flex flex-col items-center justify-center font-mono font-black transition-all ${
                  btnPressed === 'b' ? 'translate-y-1 shadow-none' : 'shadow-[0_5px_0_#140e22]'
                }`}
                style={{
                  background: 'linear-gradient(145deg, #382e54 0%, #241c38 100%)',
                  border: '2px solid #140e22',
                }}
                title="Gráfico Anterior"
              >
                <span className="text-gray-200 text-sm sm:text-base font-black">B</span>
                <span className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase -mt-0.5">MODO -</span>
              </motion.button>

              {/* Botón A (MIO Lima Neón / Siguiente Modo Gráfico) */}
              <motion.button
                type="button"
                whileTap={{ y: 3, scale: 0.95 }}
                onClick={handleNextMode}
                className={`absolute right-0 top-2 w-14 h-14 sm:w-16 sm:h-16 lg:w-[70px] lg:h-[70px] rounded-full flex flex-col items-center justify-center font-mono font-black transition-all ${
                  btnPressed === 'a' ? 'translate-y-1 shadow-none' : 'shadow-[0_5px_0_#181224]'
                }`}
                style={{
                  background: 'linear-gradient(145deg, #d3ff75 0%, #bdf559 100%)',
                  border: '2px solid #181224',
                }}
                title="Siguiente Gráfico"
              >
                <span className="text-gray-950 text-sm sm:text-base font-black">A</span>
                <span className="text-[8px] sm:text-[9px] text-gray-900 font-bold uppercase -mt-0.5">MODO +</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* BOTONES DE GOMA SELECT / START & REJILLA CNC                      */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between pt-5 border-t border-black/15 mt-3 relative z-10">
          {/* Botones de goma SELECT / START */}
          <div className="flex items-center gap-3">
            {/* SELECT: Alterna horizonte temporal */}
            <motion.button
              type="button"
              whileTap={{ y: 1.5 }}
              onClick={handleSelect}
              className={`px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full border border-black/40 text-[8px] sm:text-[9px] font-mono font-bold tracking-wider shadow-sm transition-all ${
                btnPressed === 'select'
                  ? 'bg-mio-violet text-white'
                  : 'bg-[#201832] text-gray-400 hover:text-white'
              }`}
              title="Alternar Horizonte de Tiempo"
            >
              SELECT
            </motion.button>

            {/* START: Ejecuta AutoML Inference / Retrain */}
            <motion.button
              type="button"
              whileTap={{ y: 1.5 }}
              onClick={handleStart}
              className={`px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full border border-black/40 text-[8px] sm:text-[9px] font-mono font-black tracking-wider shadow-sm transition-all ${
                btnPressed === 'start' || isComputing
                  ? 'bg-mio-lime text-black shadow-[0_0_10px_#bdf559]'
                  : 'bg-[#201832] text-mio-lime/90 hover:text-mio-lime'
              }`}
              title="Ejecutar AutoML / Reentrenar Modelo"
            >
              START
            </motion.button>
          </div>

          {/* Rejilla de altavoz maquinada en el chasis */}
          <div className="flex gap-1.5 items-center" title="Acoustic CNC Chamber">
            {[14, 20, 26, 20, 14].map((height, idx) => (
              <div
                key={idx}
                className={`w-1.5 rounded-full shadow-inner transition-colors duration-200 ${
                  isComputing ? 'bg-mio-lime/70 animate-pulse' : 'bg-[#181126]'
                }`}
                style={{ height: `${height}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

