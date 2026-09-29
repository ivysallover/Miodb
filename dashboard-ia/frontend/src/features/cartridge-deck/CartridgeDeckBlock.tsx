'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowUp,
  Activity,
  Cpu,
  ShieldCheck,
  Play,
  Database,
  Terminal,
  Sliders,
  Power,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface FeatureWeight {
  name: string;
  weight: number;
  pct: string;
}

interface Cartridge {
  id: string;
  bayIndex: number;
  romCode: string;
  title: string;
  subtitle: string;
  industry: string;
  rows: string;
  columns: string;
  featuresCount: number;
  target: string;
  targetType: string;
  accentColor: string;
  primaryBg: string;
  gradientBg: string;
  sampleMetric: string;
  modelRecommended: string;
  dataQuality: string;
  nullCount: string;
  latency: string;
  memory: string;
  barcode: string;
  topFeatures: FeatureWeight[];
  sampleInference: {
    inputLabel: string;
    outputLabel: string;
    prediction: string;
    confidence: string;
  };
}

const CARTRIDGES: Cartridge[] = [
  {
    id: 'cart-ecommerce',
    bayIndex: 1,
    romCode: 'ROM-01 // E-COMM',
    title: 'E-COMMERCE REVENUE Q4',
    subtitle: 'Predicción de ingresos y LTV 30 días',
    industry: 'Retail & Digital Commerce',
    rows: '524,800 filas',
    columns: '28 variables (Sales, Churn, LTV)',
    featuresCount: 28,
    target: 'revenue_30d',
    targetType: 'Regresión Continua',
    accentColor: '#0284c7',
    primaryBg: '#0284c7',
    gradientBg: 'linear-gradient(155deg, #38bdf8 0%, #0284c7 45%, #0369a1 100%)',
    sampleMetric: 'R² 0.994 // MAE ±1.2%',
    modelRecommended: 'LightGBM Regressor v4.2',
    dataQuality: '99.8% Limpio (Validado)',
    nullCount: '0 NaNs detectados',
    latency: '6.4ms P99',
    memory: '42.8 MB RAM',
    barcode: '||| || |||| | ||| ||||',
    topFeatures: [
      { name: 'historical_spend_60d', weight: 38, pct: '38%' },
      { name: 'session_recency_days', weight: 26, pct: '26%' },
      { name: 'checkout_abandon_rate', weight: 19, pct: '19%' },
      { name: 'mobile_traffic_ratio', weight: 17, pct: '17%' },
    ],
    sampleInference: {
      inputLabel: 'Cliente #9842 (3 órdenes previas / 4d inactivo)',
      outputLabel: 'Ingreso Estimado Próximos 30d',
      prediction: '$1,480.20 USD',
      confidence: '98.2% Confianza',
    },
  },
  {
    id: 'cart-fintech',
    bayIndex: 2,
    romCode: 'ROM-02 // FINTECH',
    title: 'FINTECH FRAUD SHIELD',
    subtitle: 'Detección en tiempo real de transferencias anómalas',
    industry: 'Banking & Real-Time Payments',
    rows: '1,420,000 txs',
    columns: '42 variables (IP, Velocity, Amount)',
    featuresCount: 42,
    target: 'is_fraud',
    targetType: 'Clasificación Binaria (1:140)',
    accentColor: '#8455f5',
    primaryBg: '#7c3aed',
    gradientBg: 'linear-gradient(155deg, #a78bfa 0%, #7c3aed 45%, #5b21b6 100%)',
    sampleMetric: 'AUC-ROC 0.998 // Recall 99.1%',
    modelRecommended: 'CatBoost Classifier v1.2',
    dataQuality: '100% Calidad (Zero-Leakage)',
    nullCount: '0 NaNs detectados',
    latency: '3.2ms P99',
    memory: '78.4 MB RAM',
    barcode: '|||| | || ||||| | || |',
    topFeatures: [
      { name: 'ip_distance_anomaly_km', weight: 44, pct: '44%' },
      { name: 'tx_velocity_5min', weight: 29, pct: '29%' },
      { name: 'card_country_mismatch', weight: 15, pct: '15%' },
      { name: 'hour_deviation_score', weight: 12, pct: '12%' },
    ],
    sampleInference: {
      inputLabel: 'Tx #481902 ($850.00 USD - IP Dublin, Tarjeta AR)',
      outputLabel: 'Evaluación Anti-Fraude',
      prediction: 'BLOQUEADA // ALTO RIESGO',
      confidence: '99.6% Confianza',
    },
  },
  {
    id: 'cart-health',
    bayIndex: 3,
    romCode: 'ROM-03 // SENSORS',
    title: 'PATIENT ICU TELEMETRY',
    subtitle: 'Monitoreo biométrico de riesgo en tiempo real',
    industry: 'Healthcare & IoT Devices',
    rows: '189,400 eventos',
    columns: '16 sensores (ECG, Presión, SpO2)',
    featuresCount: 16,
    target: 'decompensation_risk',
    targetType: 'Time-Series Multi-Paso',
    accentColor: '#f59e0b',
    primaryBg: '#f59e0b',
    gradientBg: 'linear-gradient(155deg, #fbbf24 0%, #f59e0b 45%, #d97706 100%)',
    sampleMetric: 'F1-Score 0.984 // Latencia 11ms',
    modelRecommended: 'Temporal Fusion Transformer',
    dataQuality: '99.4% Calidad (Desruido FFT)',
    nullCount: '12 gaps interpolados',
    latency: '11.8ms P99',
    memory: '24.1 MB RAM',
    barcode: '| |||| | ||| || | ||||',
    topFeatures: [
      { name: 'hr_variability_rmssd', weight: 36, pct: '36%' },
      { name: 'sp02_oxygen_saturation', weight: 31, pct: '31%' },
      { name: 'systolic_pressure_trend', weight: 21, pct: '21%' },
      { name: 'resp_rate_delta_1h', weight: 12, pct: '12%' },
    ],
    sampleInference: {
      inputLabel: 'Cama UCI-04 (Ventana temporal 30m continua)',
      outputLabel: 'Riesgo Descompensación 4h',
      prediction: 'ESTABLE // RIESGO BAJO (3.2%)',
      confidence: '97.8% Confianza',
    },
  },
  {
    id: 'cart-supply',
    bayIndex: 4,
    romCode: 'ROM-04 // LOGÍSTICA',
    title: 'FLEET FUEL & ROUTE OPT',
    subtitle: 'Optimización predictiva de consumo en flotas',
    industry: 'Logistics & Autonomous Fleets',
    rows: '730,500 km',
    columns: '22 telemetrías (GPS, RPM, Carga)',
    featuresCount: 22,
    target: 'fuel_burn_liters',
    targetType: 'Optimizador No-Lineal',
    accentColor: '#ec4899',
    primaryBg: '#ec4899',
    gradientBg: 'linear-gradient(155deg, #f472b6 0%, #ec4899 45%, #db2777 100%)',
    sampleMetric: 'MAE 0.32 L/100km // -14% Costo',
    modelRecommended: 'XGBoost Regressor v2.0',
    dataQuality: '100% Calidad (CAN-bus)',
    nullCount: '0 NaNs detectados',
    latency: '4.8ms P99',
    memory: '36.2 MB RAM',
    barcode: '||| | |||| ||| | || ||',
    topFeatures: [
      { name: 'engine_load_pct_avg', weight: 40, pct: '40%' },
      { name: 'elevation_gradient_m', weight: 28, pct: '28%' },
      { name: 'payload_weight_kg', weight: 20, pct: '20%' },
      { name: 'idle_time_pct', weight: 12, pct: '12%' },
    ],
    sampleInference: {
      inputLabel: 'Ruta Córdoba -> BsAs (Scania R450 / 24 Toneladas)',
      outputLabel: 'Consumo Proyectado',
      prediction: '142.4 Litros (Ahorro 18.2 L)',
      confidence: '98.9% Confianza',
    },
  },
];

type ChassisTheme = 'mio-lime' | 'retro-beige' | 'obsidian-dark';

import { playCartridgeSound as playTactileSound } from '@/lib/sound';

export default function CartridgeDeckBlock() {
  const [activeCartridgeId, setActiveCartridgeId] = useState<string | null>('cart-ecommerce');
  const [isInserting, setIsInserting] = useState<boolean>(false);
  const [readPhase, setReadPhase] = useState<'IDLE' | 'READING' | 'MOUNTED'>('MOUNTED');
  const [chassisTheme, setChassisTheme] = useState<ChassisTheme>('mio-lime');
  const [activeScreenTab, setActiveScreenTab] = useState<'TELEMETRY' | 'FEATURES' | 'INFERENCE'>('TELEMETRY');
  const [isTestingInference, setIsTestingInference] = useState<boolean>(false);
  const [inferenceLogStep, setInferenceLogStep] = useState<number>(0);
  const [ejectPressed, setEjectPressed] = useState<boolean>(false);
  const [rotaryAngle, setRotaryAngle] = useState<number>(45);
  const activeCart = CARTRIDGES.find((c) => c.id === activeCartridgeId) || null;

  // Medición dinámica y animación suave de altura para OLED y chasis
  const screenContentRef = useRef<HTMLDivElement>(null);
  const [screenContentHeight, setScreenContentHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    const el = screenContentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect) {
        const measured = Math.ceil(entry.contentRect.height);
        if (measured > 0) {
          setScreenContentHeight(measured);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Animación física de inserción por arriba con spring suave
  const handleInsert = (cart: Cartridge) => {
    if (isInserting || cart.id === activeCartridgeId) return;

    playTactileSound('click');
    setIsInserting(true);
    setReadPhase('READING');
    setIsTestingInference(false);
    setInferenceLogStep(0);

    setTimeout(() => {
      setActiveCartridgeId(cart.id);
      playTactileSound('mount'); // Clic mecánico de encaje
    }, 280);

    setTimeout(() => {
      setReadPhase('MOUNTED');
      setIsInserting(false);
    }, 800);
  };

  const handleEject = () => {
    if (isInserting || !activeCartridgeId) return;

    playTactileSound('eject');
    setEjectPressed(true);
    setIsInserting(true);
    setReadPhase('IDLE');
    setIsTestingInference(false);

    setTimeout(() => setEjectPressed(false), 240);

    setTimeout(() => {
      setActiveCartridgeId(null);
      setIsInserting(false);
    }, 380);
  };

  const handleRotateKnob = () => {
    playTactileSound('dial');
    setRotaryAngle((prev) => (prev + 45) % 360);
  };

  const runSimulatedInference = () => {
    if (!activeCart || isTestingInference) return;
    playTactileSound('inference');
    setIsTestingInference(true);
    setInferenceLogStep(1);

    setTimeout(() => {
      playTactileSound('click');
      setInferenceLogStep(2);
    }, 280);

    setTimeout(() => {
      playTactileSound('click');
      setInferenceLogStep(3);
    }, 550);

    setTimeout(() => {
      playTactileSound('dial');
      setInferenceLogStep(4);
      setIsTestingInference(false);
    }, 850);
  };

  // Configuración de acabados de policarbonato 3D según el tema de chasis
  const chassisConfig = {
    'mio-lime': {
      gradient: 'linear-gradient(155deg, #d8ff78 0%, #bdf559 40%, #9ddc2e 85%, #88c422 100%)',
      shadow: `
        /* 1. Biseles internos de iluminación de policarbonato (iluminación cenital) */
        inset 0 2.5px 3px rgba(255, 255, 255, 0.95),
        inset 0 -4px 6px rgba(0, 0, 0, 0.45),
        inset 3px 0 3px rgba(255, 255, 255, 0.5),
        inset -3px 0 3px rgba(0, 0, 0, 0.3),
        /* 2. Sombra de contacto oclusiva directa sobre la mesa */
        0 4px 6px -1px rgba(16, 10, 32, 0.5),
        /* 3. Sombra media direccional proyectada */
        10px 22px 42px -4px rgba(18, 10, 36, 0.35),
        /* 4. Penumbra ambiental difusa */
        22px 50px 85px -8px rgba(14, 8, 28, 0.28)
      `,
      textColor: 'text-gray-950',
      headerBorder: 'border-[#111]/30',
      screwBg: 'bg-[#181324] text-gray-400',
      badge: 'bg-black text-mio-lime',
      label: 'EDICIÓN VERDE MIO',
      slotLipBg: 'bg-[#0a0715]',
    },
    'retro-beige': {
      gradient: 'linear-gradient(160deg, #ffffff 0%, #f8f5ee 40%, #eae3d2 85%, #ddd4bf 100%)',
      shadow: `
        inset 0 2.5px 3px rgba(255, 255, 255, 0.95),
        inset 0 -4px 6px rgba(0, 0, 0, 0.25),
        inset 3px 0 3px rgba(255, 255, 255, 0.6),
        inset -3px 0 3px rgba(0, 0, 0, 0.2),
        0 4px 6px -1px rgba(16, 10, 32, 0.4),
        10px 22px 40px -4px rgba(18, 10, 36, 0.26),
        22px 50px 85px -8px rgba(14, 8, 28, 0.2)
      `,
      textColor: 'text-gray-900',
      headerBorder: 'border-black/20',
      screwBg: 'bg-gray-300 text-gray-700',
      badge: 'bg-mio-lime text-black',
      label: 'EDICIÓN RETRO BEIGE',
      slotLipBg: 'bg-[#18151f]',
    },
    'obsidian-dark': {
      gradient: 'linear-gradient(155deg, #281f3f 0%, #171126 40%, #0e0a19 85%, #080610 100%)',
      shadow: `
        inset 0 2px 2px rgba(255, 255, 255, 0.2),
        inset 0 -4px 6px rgba(0, 0, 0, 0.7),
        inset 3px 0 3px rgba(255, 255, 255, 0.1),
        inset -3px 0 3px rgba(0, 0, 0, 0.5),
        0 4px 6px -1px rgba(0, 0, 0, 0.6),
        10px 22px 44px -4px rgba(0, 0, 0, 0.65),
        22px 52px 90px -8px rgba(0, 0, 0, 0.6)
      `,
      textColor: 'text-white',
      headerBorder: 'border-white/15',
      screwBg: 'bg-gray-800 text-gray-400',
      badge: 'bg-mio-lime text-black',
      label: 'EDICIÓN OBSIDIAN DARK',
      slotLipBg: 'bg-[#06040c]',
    },
  }[chassisTheme];

  return (
    <div className="w-full max-w-4xl flex flex-col items-center gap-12 font-mono select-none">
      {/* ================================================================ */}
      {/* CONSOLA DE HARDWARE CON RANURA PROFUNDA (TOP-LOAD CARTRIDGE)      */}
      {/* ================================================================ */}
      <div className="relative w-full max-w-[775px] pt-44 sm:pt-48">
        {/* RANURA SUPERIOR: Cartucho asomándose en 3D con cuerpo completo sin recortes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 sm:w-84 flex justify-center z-10 pointer-events-none">
          <AnimatePresence mode="wait">
            {activeCart && (
              <motion.div
                key={activeCart.id}
                initial={{ y: -70, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{
                  y: -70,
                  opacity: 0,
                  transition: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 180,
                  damping: 24,
                  mass: 0.85,
                }}
                style={{
                  background: activeCart.gradientBg,
                  boxShadow: `
                    /* Biseles 3D del molde plástico */
                    inset 0 2.5px 3px rgba(255, 255, 255, 0.65),
                    inset 0 -3.5px 5px rgba(0, 0, 0, 0.5),
                    inset 2.5px 0 3px rgba(255, 255, 255, 0.3),
                    inset -2.5px 0 3px rgba(0, 0, 0, 0.35),
                    0 8px 0 #111, 8px 18px 30px rgba(0,0,0,0.32)
                  `,
                }}
                className="relative w-68 sm:w-80 h-84 sm:h-88 rounded-2xl border-4 border-[#111] p-3.5 flex flex-col justify-between"
              >
                {/* Micro-textura de plástico satinado acelerada por GPU */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)',
                    backgroundSize: '6px 6px',
                  }}
                />

                {/* Ranuras de agarre estriadas superiores */}
                <div className="flex justify-center gap-1.5 pt-1 relative z-10">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-6 h-1.5 rounded-full bg-black/35 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0px_rgba(255,255,255,0.2)]"
                    />
                  ))}
                </div>

                {/* Hendidura cóncava de extracción ergonómica (Thumb Grip Scoop) con separación limpia */}
                <div
                  className="mx-auto w-16 h-2 rounded-full border border-black/30 opacity-70 relative z-10 mt-3 mb-1"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 80%)',
                    boxShadow: 'inset 0 1.5px 2px rgba(0,0,0,0.6)',
                  }}
                />

                {/* Etiqueta adhesiva de papel laminado completa en hueco embutido */}
                <div className="bg-black/20 p-1 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] my-1.5 relative z-10">
                  <div className="bg-white border-2 border-[#111] p-2.5 sm:p-3 rounded-lg shadow-sm relative overflow-hidden">
                    {/* Reflejo diagonal de papel laminado satinado */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-30"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 55%)',
                      }}
                    />

                    <div className="flex items-center justify-between relative z-10 gap-1.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-gray-600 flex items-center gap-1.5 whitespace-nowrap shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        {activeCart.romCode}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-400 shadow-sm whitespace-nowrap">
                          ★ MIO SEAL
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-900 border border-emerald-400 shadow-sm whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          INSERTADO
                        </span>
                      </div>
                    </div>

                    {/* TÍTULO PRINCIPAL GRANDE Y 100% VISIBLE */}
                    <div className="text-xs sm:text-sm font-black text-gray-950 uppercase tracking-tight leading-tight truncate relative z-10 mt-2.5">
                      {activeCart.title}
                    </div>

                    {/* SUBTEXTO CON INDUSTRIA Y TARGET */}
                    <div className="text-[8.5px] font-bold text-gray-500 flex items-center justify-between border-t border-gray-200 pt-1 mt-1 relative z-10">
                      <span className="truncate pr-1">{activeCart.industry}</span>
                      <span className="text-gray-900 font-mono font-black shrink-0">{activeCart.rows}</span>
                    </div>

                    {/* Código de barras y variables */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-1 mt-1 text-[8px] text-gray-400 relative z-10">
                      <span className="font-mono tracking-widest">{activeCart.barcode}</span>
                      <span className="font-black text-gray-900">{activeCart.featuresCount} VARS</span>
                    </div>
                  </div>
                </div>

                {/* TEXTO DE MARCA GRABADO EN EL CUERPO DEL CARTUCHO */}
                <div className="text-center py-1 relative z-10">
                  <span className="text-[7.5px] font-black tracking-widest text-black/40 uppercase">
                    MIO DATA ROM // HIGH-SPEED INTERFACE
                  </span>
                </div>

                {/* CONECTOR FÍSICO INFERIOR CON PINES DE ORO EXPUESTOS (COMPLETO) */}
                <div className="relative z-10">
                  <div className="h-6 rounded-b-lg bg-[#0c180e] border border-black/80 shadow-[inset_0_3px_5px_rgba(0,0,0,0.9)] flex items-end justify-center px-3 gap-1 pb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pin) => (
                      <div
                        key={pin}
                        className="w-1.5 h-3 rounded-t-sm bg-gradient-to-t from-amber-600 via-amber-400 to-amber-200 shadow-sm"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ============================================================== */}
        {/* CHASIS 2.5D DE LA CONSOLA LECTORA (POLICARBONATO ESCULPIDO)    */}
        {/* ============================================================== */}
        <div
          className="relative rounded-[40px] p-6 sm:p-8 border-4 border-[#111] z-20 overflow-hidden transition-colors duration-300"
          style={{
            background: chassisConfig.gradient,
            boxShadow: chassisConfig.shadow,
            transform: 'rotate(0deg)',
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

          {/* Línea perimetral de partición de molde plástico (Mold Parting Line) */}
          <div className="absolute inset-3 sm:inset-3.5 rounded-[34px] border border-black/15 pointer-events-none" />

          {/* ============================================================ */}
          {/* RANURA FÍSICA ESCULPIDA CON PROFUNDIDAD Y PINES DE CONTACTO  */}
          {/* ============================================================ */}
          <div className="max-w-xs sm:max-w-md mx-auto -mt-6 sm:-mt-8 mb-5">
            <AnimatePresence mode="wait">
              {activeCart ? (
                /* ESTADO ACOPLADO: Bisel frontal firme que abraza la base del cartucho (SIN pines flotantes encima) */
                <motion.div
                  key="MOUNTED_LIP"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className={`h-7 rounded-b-2xl border-2 border-[#111] ${chassisConfig.slotLipBg} shadow-[inset_0_4px_6px_rgba(0,0,0,0.9),0_2px_0px_rgba(255,255,255,0.2)] flex items-center justify-between px-4 relative overflow-hidden`}
                >
                  {/* Traba mecánica lateral izquierda */}
                  <div className="w-3 h-3.5 bg-[#221a36] border border-black/80 shadow-inner rounded-sm flex items-center justify-center">
                    <div className="w-1 h-2 bg-black/80 rounded-full" />
                  </div>

                  {/* Estado de conexión de hardware limpio en el bisel */}
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-mio-lime animate-pulse shadow-[0_0_8px_#bdf559]" />
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-gray-300">
                      CARTUCHO ACOPLADO // BUS 64-BIT ACTIVO
                    </span>
                  </div>

                  {/* Traba mecánica lateral derecha */}
                  <div className="w-3 h-3.5 bg-[#221a36] border border-black/80 shadow-inner rounded-sm flex items-center justify-center">
                    <div className="w-1 h-2 bg-black/80 rounded-full" />
                  </div>
                </motion.div>
              ) : (
                /* ESTADO VACÍO: Hueco profundo realista con contactos dorados visibles en el fondo */
                <motion.div
                  key="EMPTY_LIP"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                  className={`h-7 rounded-b-2xl border-2 border-[#111] ${chassisConfig.slotLipBg} shadow-[inset_0_6px_10px_rgba(0,0,0,0.98),0_2px_0px_rgba(255,255,255,0.2)] flex items-center justify-between px-4 relative overflow-hidden`}
                >
                  {/* Rieles de guía laterales interiores del slot */}
                  <div className="w-2.5 h-3.5 bg-[#251d38] border border-black/60 shadow-inner rounded-sm" />

                  {/* Contactos metálicos internos dorados visibles en el fondo */}
                  <div className="flex gap-1.5 opacity-70">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-2 rounded-t-sm bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 shadow-sm"
                      />
                    ))}
                  </div>

                  <div className="w-2.5 h-3.5 bg-[#251d38] border border-black/60 shadow-inner rounded-sm" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================================ */}
          {/* HEADER DEL HARDWARE: CONTROLES, PALANCA EJECT & TORNILLOS    */}
          {/* ============================================================ */}
          <div className={`flex items-center justify-between border-b-2 ${chassisConfig.headerBorder} pb-3.5 mb-5 relative z-10`}>
            {/* Tornillo maquinado en cruz + Switch de Energía */}
            <div className="flex items-center gap-3">
              {/* Tornillo embutido en pozo (Counterbore Screw Well) */}
              <div className="w-5 h-5 rounded-full bg-black/25 border border-black/40 shadow-[inset_0_2px_3px_rgba(0,0,0,0.8)] flex items-center justify-center">
                <div className={`w-3.5 h-3.5 rounded-full ${chassisConfig.screwBg} border border-black/50 flex items-center justify-center shadow-sm`}>
                  <div className="w-2 h-0.5 bg-black/80 rotate-45" />
                </div>
              </div>

              <div>
                <span className={`text-xs font-black ${chassisConfig.textColor} uppercase tracking-wider block`}>
                  MIO-DRIVE 01 // DATA CONSOLE
                </span>
                <span className="text-[9px] font-bold text-black/60 uppercase">
                  {chassisConfig.label}
                </span>
              </div>
            </div>

            {/* Selector rotativo de precisión + Palanca de eyección mecánica */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Perilla analógica rotativa de precisión CNC */}
              <div className="hidden sm:flex items-center gap-2" title="Girar dial de resolución AutoML">
                <div
                  onClick={handleRotateKnob}
                  className="w-7 h-7 rounded-full bg-gradient-to-b from-[#3a3250] to-[#1c162b] border border-black/60 shadow-[0_3px_0_#0d0818,inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-mio-lime shadow-[0_0_6px_#bdf559]"
                    style={{ transform: `rotate(${rotaryAngle}deg) translate(2.5px)` }}
                  />
                </div>
                <span className="text-[9px] font-black uppercase text-black/70">DIAL OPT</span>
              </div>

              {/* Indicador LED de cabezal de lectura */}
              <div className="flex items-center gap-2 px-2.5 py-1 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] rounded-lg">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    readPhase === 'READING'
                      ? 'bg-amber-400 animate-ping'
                      : readPhase === 'MOUNTED'
                      ? 'bg-mio-lime shadow-[0_0_8px_#bdf559]'
                      : 'bg-gray-300'
                  }`}
                />
                <span className="text-[10px] font-black uppercase text-gray-900">
                  {readPhase === 'READING' ? 'MONTANDO...' : readPhase === 'MOUNTED' ? 'ONLINE' : 'VACÍO'}
                </span>
              </div>

              {/* PALANCA MECÁNICA 3D DE EYECCIÓN (EJECT LEVER) */}
              <motion.button
                type="button"
                onClick={handleEject}
                disabled={!activeCartridgeId || isInserting}
                animate={ejectPressed ? { y: 3, scale: 0.96 } : { y: 0, scale: 1 }}
                className={`px-3.5 py-1 text-xs font-black border-2 border-[#111] rounded-lg transition-all flex items-center gap-1.5 shadow-[0_4px_0_#111] active:translate-y-1 active:shadow-none ${
                  activeCartridgeId && !isInserting
                    ? 'bg-white hover:bg-red-50 text-red-600 cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-[0_2px_0_#999]'
                }`}
                title="Expulsar Cartucho Físico"
              >
                <span className="text-sm">⏏</span>
                <span className="tracking-wide">EJECT</span>
              </motion.button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* PANTALLA OLED OBSIDIANA CON CRISTAL TEMPLADO Y TELEMETRÍA      */}
          {/* ============================================================== */}
          <div className="relative bg-[#07050e] rounded-3xl p-4 sm:p-5 border-2 border-black/80 shadow-[inset_0_5px_14px_rgba(0,0,0,0.95)] mb-5 overflow-hidden">
            {/* Franja de acento Neón MIO Lima superior */}
            <div
              className={`h-1.5 w-full bg-gradient-to-r from-transparent via-mio-lime to-transparent opacity-90 mb-3 rounded-full shadow-[0_0_10px_#bdf559] ${
                isInserting || isTestingInference ? 'animate-pulse scale-y-125' : ''
              }`}
            />

            {/* Reflejo especular diagonal de cristal templado */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 48%)',
              }}
            />

            {/* Scanlines CRT Retro */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: 'linear-gradient(rgba(18, 16, 31, 0) 50%, rgba(0, 0, 0, 0.85) 50%)',
                backgroundSize: '100% 3px',
              }}
            />

            {/* Header de la Pantalla OLED */}
            <div className="flex flex-wrap items-center justify-between border-b border-gray-800 pb-2 mb-3 relative z-10 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-mio-lime shadow-[0_0_6px_#bdf559]" />
                <span className="text-xs font-mono font-black text-mio-lime">
                  MIO AUTOML ENGINE v3.4 [PRO]
                </span>
              </div>

              {/* Pestañas táctiles de telemetría con fade y scale suave */}
              <AnimatePresence>
                {activeCart && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.16 }}
                    className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        playTactileSound('tab');
                        setActiveScreenTab('TELEMETRY');
                      }}
                      className={`px-2.5 py-0.5 text-[9px] font-black rounded transition-all ${
                        activeScreenTab === 'TELEMETRY'
                          ? 'bg-mio-lime text-black shadow-[0_0_6px_#bdf559]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      1. DIAGNÓSTICO
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTactileSound('tab');
                        setActiveScreenTab('FEATURES');
                      }}
                      className={`px-2.5 py-0.5 text-[9px] font-black rounded transition-all ${
                        activeScreenTab === 'FEATURES'
                          ? 'bg-mio-lime text-black shadow-[0_0_6px_#bdf559]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      2. FEATURES
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTactileSound('tab');
                        setActiveScreenTab('INFERENCE');
                      }}
                      className={`px-2.5 py-0.5 text-[9px] font-black rounded transition-all ${
                        activeScreenTab === 'INFERENCE'
                          ? 'bg-mio-lime text-black shadow-[0_0_6px_#bdf559]'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      3. TEST LIVE ⚡
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CUERPO PRINCIPAL OLED CON REDIMENSIONADO SUAVE Y TRANSICIONES */}
            <motion.div
              animate={{ height: screenContentHeight }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 26,
                mass: 0.85,
              }}
              className="relative z-10 overflow-hidden"
            >
              <div ref={screenContentRef}>
                <AnimatePresence mode="wait" initial={false}>
                  {activeCart ? (
                    <motion.div
                      key={`${activeCart.id}-${activeScreenTab}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="relative z-10"
                    >
                      {/* -------------------------------------------------------- */}
                      {/* VISTA 1: DIAGNÓSTICO Y TELEMETRÍA GENERAL                */}
                      {/* -------------------------------------------------------- */}
                      {activeScreenTab === 'TELEMETRY' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {/* Tarjeta 1: Target y Paradigma */}
                            <div className="bg-black/60 border border-gray-800/80 rounded-xl p-3 shadow-inner">
                              <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
                                <span className="flex items-center gap-1">
                                  <Activity className="w-3 h-3 text-mio-lime" />
                                  TARGET & PARADIGMA
                                </span>
                                <span className="text-gray-500 font-bold">{activeCart.targetType}</span>
                              </div>
                              <div className="text-sm font-black text-white truncate">{activeCart.target}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{activeCart.subtitle}</div>
                            </div>

                            {/* Tarjeta 2: Modelo Sugerido */}
                            <div className="bg-black/60 border border-gray-800/80 rounded-xl p-3 shadow-inner">
                              <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
                                <span className="flex items-center gap-1">
                                  <Cpu className="w-3 h-3 text-cyan-400" />
                                  MODELO SUGERIDO
                                </span>
                                <span className="text-cyan-400 font-bold">AUTO-TUNED</span>
                              </div>
                              <div className="text-sm font-black text-cyan-300 truncate">{activeCart.modelRecommended}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{activeCart.sampleMetric}</div>
                            </div>

                            {/* Tarjeta 3: Higiene de Datos */}
                            <div className="bg-black/60 border border-gray-800/80 rounded-xl p-3 shadow-inner">
                              <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                  HIGIENE DE DATOS
                                </span>
                                <span className="text-emerald-400 font-bold">AUDITADO</span>
                              </div>
                              <div className="text-sm font-black text-emerald-300">{activeCart.dataQuality}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{activeCart.nullCount}</div>
                            </div>

                            {/* Tarjeta 4: Volumen y Memoria */}
                            <div className="bg-black/60 border border-gray-800/80 rounded-xl p-3 shadow-inner">
                              <div className="flex items-center justify-between text-[9px] text-gray-400 mb-1">
                                <span className="flex items-center gap-1">
                                  <Database className="w-3 h-3 text-mio-lime" />
                                  VOLUMEN & LATENCIA
                                </span>
                                <span className="text-mio-lime font-bold">P99 BENCH</span>
                              </div>
                              <div className="text-sm font-black text-white">{activeCart.rows}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                {activeCart.memory} // Latencia: {activeCart.latency}
                              </div>
                            </div>
                          </div>

                          {/* Barra de Distribución Split */}
                          <div className="bg-black/50 border border-gray-800 rounded-xl p-2.5 flex items-center justify-between text-[10px]">
                            <span className="text-gray-400">SPLIT DATASET:</span>
                            <div className="flex items-center gap-1 flex-1 mx-3">
                              <div className="h-2 bg-mio-lime rounded-l shadow-[0_0_6px_#bdf559]" style={{ width: '70%' }} title="Train 70%" />
                              <div className="h-2 bg-purple-500" style={{ width: '15%' }} title="Val 15%" />
                              <div className="h-2 bg-cyan-400 rounded-r" style={{ width: '15%' }} title="Test 15%" />
                            </div>
                            <span className="text-gray-300 font-bold">70% / 15% / 15%</span>
                          </div>
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* VISTA 2: FEATURE IMPORTANCE                              */}
                      {/* -------------------------------------------------------- */}
                      {activeScreenTab === 'FEATURES' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 pb-1 border-b border-gray-800">
                            <span>FEATURES RELEVANTES ({activeCart.featuresCount} TOTAL)</span>
                            <span>PESO SHAP EN DECISIÓN</span>
                          </div>

                          <div className="space-y-2">
                            {activeCart.topFeatures.map((feat) => (
                              <div key={feat.name} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="text-gray-300 font-mono truncate max-w-[220px]">{feat.name}</span>
                                <div className="flex items-center gap-2 flex-1 max-w-sm">
                                  <div className="h-2.5 bg-gray-900 border border-gray-800 rounded-full w-full overflow-hidden p-0.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: feat.pct }}
                                      transition={{ duration: 0.6, ease: 'easeOut' }}
                                      className="h-full bg-mio-lime rounded-full shadow-[0_0_6px_#bdf559]"
                                    />
                                  </div>
                                  <span className="text-mio-lime font-bold text-[10px] w-8 text-right">{feat.pct}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="pt-2 text-[10px] text-gray-500 flex items-center justify-between border-t border-gray-800">
                            <span>Normalización: RobustScaler (Scikit-Learn)</span>
                            <span className="text-mio-lime font-bold">Auto-Encoding Activo</span>
                          </div>
                        </div>
                      )}

                      {/* -------------------------------------------------------- */}
                      {/* VISTA 3: SIMULACIÓN DE INFERENCIA EN VIVO                */}
                      {/* -------------------------------------------------------- */}
                      {activeScreenTab === 'INFERENCE' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[10px] text-gray-400">TEST BENCH DE INFERENCIA EN VIVO</div>
                              <div className="text-xs font-bold text-white">{activeCart.sampleInference.inputLabel}</div>
                            </div>

                            <button
                              type="button"
                              onClick={runSimulatedInference}
                              disabled={isTestingInference}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5 border border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 ${
                                isTestingInference
                                  ? 'bg-amber-400 text-black cursor-wait animate-pulse'
                                  : 'bg-mio-lime hover:bg-[#cbf770] text-black cursor-pointer shadow-[0_3px_0_#000]'
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{isTestingInference ? 'CALCULANDO...' : 'PROBAR INFERENCIA'}</span>
                            </button>
                          </div>

                          {/* Terminal de ejecución */}
                          <div className="bg-black border border-gray-800 rounded-xl p-2.5 font-mono text-[10px] space-y-1 shadow-inner">
                            <div className="text-gray-500 flex items-center gap-1.5">
                              <Terminal className="w-3 h-3 text-mio-lime" />
                              <span>MIO RUNTIME // BATCH INFERENCE IN PROGRESS</span>
                            </div>

                            {inferenceLogStep >= 1 && (
                              <div className="text-gray-300">
                                <span className="text-cyan-400">[0.01s]</span> Vectorizando features numéricas... OK
                              </div>
                            )}
                            {inferenceLogStep >= 2 && (
                              <div className="text-gray-300">
                                <span className="text-cyan-400">[0.03s]</span> Inferencia ONNX con {activeCart.modelRecommended}... OK
                              </div>
                            )}
                            {inferenceLogStep >= 3 && (
                              <div className="text-emerald-400 font-bold">
                                <span className="text-cyan-400">[0.05s]</span> PREDICCIÓN CONFIRMADA: {activeCart.sampleInference.prediction}
                              </div>
                            )}

                            {inferenceLogStep === 0 && (
                              <div className="text-gray-600 italic">
                                Presioná el botón &quot;PROBAR INFERENCIA&quot; para enviar un tensor de prueba al modelo cargado.
                              </div>
                            )}
                          </div>

                          {/* Resultado Final */}
                          {inferenceLogStep >= 3 && (
                            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-sm">
                              <span className="text-emerald-300 font-bold">{activeCart.sampleInference.outputLabel}:</span>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-black">{activeCart.sampleInference.prediction}</span>
                                <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-black text-[9px]">
                                  {activeCart.sampleInference.confidence}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="EMPTY_STATE"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="py-10 text-center text-xs text-gray-500 font-mono flex flex-col items-center gap-2"
                    >
                      <Database className="w-7 h-7 text-gray-600 animate-pulse" />
                      <span>[ NINGÚN CARTUCHO INSERTADO — SELECCIONÁ UNO DE LA BANDEJA ABAJO ]</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* ============================================================ */}
          {/* BASE DEL CHASIS: REJILLAS CNC Y TORNILLOS INFERIORES         */}
          {/* ============================================================ */}
          <div className="flex items-center justify-between pt-1 relative z-10">
            {/* Tornillo embutido inferior izquierdo */}
            <div className="w-4 h-4 rounded-full bg-black/25 border border-black/40 shadow-inner flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${chassisConfig.screwBg} border border-black/50 flex items-center justify-center`}>
                <div className="w-1.5 h-0.5 bg-black/80 rotate-12" />
              </div>
            </div>

            {/* Rejilla CNC de ventilación acústica */}
            <div className="flex gap-1.5 items-center">
              {[8, 14, 18, 14, 8].map((h, idx) => (
                <div
                  key={idx}
                  className="w-1 rounded-full bg-[#120e20] shadow-inner"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>

            <span className="text-[8px] font-black uppercase text-black/50 tracking-widest hidden sm:inline">
              HARDWARE VERIFIED // MIO LABS ARGENTINA
            </span>

            {/* Tornillo embutido inferior derecho */}
            <div className="w-4 h-4 rounded-full bg-black/25 border border-black/40 shadow-inner flex items-center justify-center">
              <div className={`w-3 h-3 rounded-full ${chassisConfig.screwBg} border border-black/50 flex items-center justify-center`}>
                <div className="w-1.5 h-0.5 bg-black/80 -rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* RACK DE CARTUCHOS EN 3D (ORGANIZADOR DE BANDEJA CON PINES ORO)   */}
      {/* ================================================================ */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-mio-violet" />
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
              BANDEJA DE CARTUCHOS 3D // CLIQUEÁ UNO PARA INSERTARLO POR ARRIBA
            </span>
          </div>
          <span className="text-[11px] font-bold text-gray-500">4 DATASETS ROM</span>
        </div>

        {/* BANDEJA CON LOS 4 CARTUCHOS 3D TANGIBLES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {CARTRIDGES.map((cart) => {
            const isLoaded = cart.id === activeCartridgeId;

            return (
              <motion.div
                key={cart.id}
                whileHover={!isLoaded ? { y: -7, scale: 1.015 } : {}}
                whileTap={!isLoaded ? { y: 2, scale: 0.985 } : {}}
                transition={{
                  type: 'spring',
                  stiffness: 220,
                  damping: 22,
                  mass: 0.8,
                }}
                onClick={() => handleInsert(cart)}
                className={`relative cursor-pointer transition-opacity duration-300 ${
                  isLoaded ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                {/* CARTUCHO FÍSICO 3D CON VOLUMEN, ESTRIAS Y PINES DE ORO */}
                <div
                  className={`rounded-2xl border-4 border-[#111] p-3.5 flex flex-col justify-between h-72 transition-all duration-200 relative overflow-hidden ${
                    isLoaded
                      ? 'shadow-[2px_2px_0px_#111]'
                      : 'shadow-[0_8px_0_#140e22,6px_14px_24px_rgba(0,0,0,0.35)]'
                  }`}
                  style={{
                    background: cart.gradientBg,
                    boxShadow: `
                      /* Biseles 3D del molde plástico */
                      inset 0 2.5px 3px rgba(255, 255, 255, 0.65),
                      inset 0 -3.5px 5px rgba(0, 0, 0, 0.5),
                      inset 2.5px 0 3px rgba(255, 255, 255, 0.3),
                      inset -2.5px 0 3px rgba(0, 0, 0, 0.35),
                      /* Altura física 3D en la mesa */
                      ${isLoaded ? '0 2px 0px #111' : '0 8px 0px #111, 8px 18px 30px rgba(0,0,0,0.32)'}
                    `,
                  }}
                >
                  {/* Micro-textura de plástico satinado acelerada por GPU */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)',
                      backgroundSize: '6px 6px',
                    }}
                  />

                  {/* Ranuras de agarre estriadas superiores */}
                  <div className="flex justify-center gap-1.5 pt-0.5 relative z-10">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-6 h-1.5 rounded-full bg-black/35 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8),0_1px_0px_rgba(255,255,255,0.2)]"
                      />
                    ))}
                  </div>

                  {/* Etiqueta adhesiva de papel laminado en hueco embutido */}
                  <div className="bg-black/20 p-1 rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] my-2 relative z-10">
                    <div className="bg-white border-2 border-[#111] p-3 rounded-lg shadow-sm relative overflow-hidden">
                      {/* Reflejo diagonal de papel fotográfico satinado */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-25"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, transparent 60%)',
                        }}
                      />

                      {/* Header de la etiqueta con Sello Holográfico */}
                      <div className="flex items-center justify-between mb-1 relative z-10">
                        <span className="text-[8px] font-black text-gray-500">{cart.romCode}</span>
                        {/* Sello de calidad MIO oficial dorado */}
                        <span className="px-1.5 py-0.2 text-[7px] font-black uppercase rounded bg-amber-200 text-amber-900 border border-amber-400">
                          ★ MIO SEAL
                        </span>
                      </div>

                      {/* Título en tipografía negrita */}
                      <div className="text-xs font-black text-gray-950 leading-tight truncate relative z-10">
                        {cart.title}
                      </div>
                      <div className="text-[8px] text-gray-600 mt-1 line-clamp-1 relative z-10">{cart.industry}</div>

                      {/* Código de barras decorativo */}
                      <div className="flex items-center justify-between border-t border-gray-200 pt-1 mt-1.5 text-[8px] text-gray-400 relative z-10">
                        <span className="font-mono tracking-widest">{cart.barcode}</span>
                        <span className="font-black text-gray-900">{cart.featuresCount} VARS</span>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* CONECTOR FÍSICO INFERIOR CON PINES DE ORO EXPUESTOS      */}
                  {/* ======================================================== */}
                  <div className="relative z-10">
                    <div className="h-6 rounded-b-lg bg-[#0c180e] border border-black/80 shadow-[inset_0_3px_5px_rgba(0,0,0,0.9)] flex items-end justify-center px-3 gap-1 pb-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((pin) => (
                        <div
                          key={pin}
                          className="w-1.5 h-3 rounded-t-sm bg-gradient-to-t from-amber-600 via-amber-400 to-amber-200 shadow-sm"
                        />
                      ))}
                    </div>

                    {/* Botón de acción rápido al pie del cartucho */}
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="font-black text-white text-[9px] drop-shadow-sm truncate pr-1">
                        {cart.rows}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#111] text-white font-black uppercase text-[8px] shadow-sm flex items-center gap-1 shrink-0 border border-white/20">
                        <span>INSERTAR</span>
                        <ArrowUp className="w-2.5 h-2.5 text-mio-lime" />
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
