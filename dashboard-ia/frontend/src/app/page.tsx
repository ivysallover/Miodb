'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  Sparkles,
  BarChart3,
  TrendingUp,
  BrainCircuit,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Github,
  Linkedin,
  Layers,
  Plus,
  Lock,
  CheckCircle2,
  MessageSquare,
  Cpu,
  Files,
  Sliders
} from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';

// Carga dinámica de la consola 3D MIO-Dev
const MioDevCanvas = dynamic(() => import('@/components/canvas/MioDevCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-[360px] lg:w-[480px] h-[620px] lg:h-[780px] flex flex-col items-center justify-center font-mono text-xs font-bold text-gray-400 bg-white border-4 border-[#111] shadow-[8px_8px_0px_#111]">
      <span className="text-mio-violet font-mono text-xs tracking-widest uppercase mb-1">MIO-OS v2.6 BOOTING</span>
      <span className="text-[10px] text-gray-400">CARGANDO MIO-DEV 3D...</span>
    </div>
  )
});

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

// Carga dinámica de la consola MIO-Drive de cartuchos
const CartridgeDeckBlock = dynamic(() => import('@/features/cartridge-deck/CartridgeDeckBlock'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-2xl h-96 flex flex-col items-center justify-center font-mono text-xs font-bold text-gray-400 bg-white border-4 border-[#111] shadow-[8px_8px_0px_#111]">
      <span className="text-mio-lime font-mono text-xs uppercase mb-1">MIO-DRIVE 01 INITIALIZING</span>
      <span className="text-[10px] text-gray-400">CARGANDO BANDEJA DE CARTUCHOS...</span>
    </div>
  ),
});

// Mockup del dashboard de plataforma (cuando se activa el tab 'Vista Plataforma')
function HeroMockup() {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.5], [15, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.9, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [0.6, 1]);

  return (
    <motion.div 
      ref={targetRef}
      style={{ rotateX, scale, opacity, transformPerspective: 1000 }}
      className="mt-12 max-w-5xl mx-auto w-full px-4 relative z-10"
    >
      <div className="bg-white border-4 border-[#111] shadow-[8px_8px_0px_#111] sm:shadow-[16px_16px_0px_#111] overflow-hidden">
        {/* Browser Top Bar */}
        <div className="h-10 sm:h-12 bg-gray-100 border-b-4 border-[#111] flex items-center px-4 gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56] border-2 border-[#111]"></div>
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border-2 border-[#111]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27c93f] border-2 border-[#111]"></div>
          <div className="ml-4 flex-1 max-w-sm sm:max-w-md bg-white border-2 border-[#111] h-6 sm:h-7 px-3 flex items-center text-[10px] sm:text-xs font-mono font-bold text-gray-500 truncate">
            https://mio.app/dashboard/analytics-workspace
          </div>
        </div>

        {/* Workspace Content */}
        <div className="p-4 sm:p-6 bg-[#fafafc] flex flex-col gap-6">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-4 border-[#111] pb-4">
              <div>
                 <span className="text-xs font-bold font-mono text-mio-violet bg-mio-violet/10 px-2 py-1 border border-mio-violet">MODELO ACTIVO: ARIMA + PROPHET</span>
                 <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-1">Reporte Predictivo de Operaciones</h3>
              </div>
              <div className="flex gap-2">
                 <div className="bg-mio-lime px-3 py-1 font-bold text-xs border-2 border-[#111] shadow-[2px_2px_0px_#111]">AutoML: OK</div>
                 <div className="bg-white px-3 py-1 font-bold text-xs border-2 border-[#111] shadow-[2px_2px_0px_#111]">R²: 0.984</div>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border-4 border-[#111] shadow-[4px_4px_0px_#111] p-4">
                 <span className="text-xs font-bold text-gray-500 font-mono">PROYECCIÓN Q4</span>
                 <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">+34.8%</div>
              </div>
              <div className="bg-mio-lime border-4 border-[#111] shadow-[4px_4px_0px_#111] p-4">
                 <span className="text-xs font-bold text-gray-900 font-mono">CONFIANZA</span>
                 <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">99.2%</div>
              </div>
              <div className="bg-mio-violet text-white border-4 border-[#111] shadow-[4px_4px_0px_#111] p-4">
                 <span className="text-xs font-bold text-mio-lime font-mono">ANOMALÍAS</span>
                 <div className="text-2xl sm:text-3xl font-black mt-1">0 Críticas</div>
              </div>
           </div>

           <div className="h-44 sm:h-56 bg-white border-4 border-[#111] shadow-[4px_4px_0px_#111] flex items-end p-4 gap-2 sm:gap-4 overflow-hidden">
              <div className="flex-1 h-1/4 bg-gray-200 border-2 border-[#111]"></div>
              <div className="flex-1 h-3/4 bg-gray-300 border-2 border-[#111]"></div>
              <div className="flex-1 h-1/2 bg-gray-400 border-2 border-[#111]"></div>
              <div className="flex-1 h-5/6 bg-mio-violet border-2 border-[#111]"></div>
              <div className="flex-1 h-full bg-mio-lime border-2 border-[#111]"></div>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

// BentoGrid con arquitectura técnica completa y contenido enriquecido
function BentoGrid() {
  const [bentoTab, setBentoTab] = useState<'forecast' | 'cluster' | 'anomalies'>('forecast');

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
      {/* Header de Sección */}
      <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-[#111] shadow-[3px_3px_0px_#111] mb-5 font-mono text-[11px] font-black uppercase tracking-widest text-mio-violet">
          <Cpu className="w-3.5 h-3.5 text-mio-violet" />
          <span>02 / ARQUITECTURA DE CÓMPUTO</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-950 tracking-tight leading-[1.05] mb-4">
          Poder corporativo.<br />
          <span className="text-mio-violet">Diseño tangible.</span>
        </h2>

        <p className="text-base sm:text-lg text-gray-600 font-medium leading-relaxed">
          Eliminamos la fricción entre la recolección de datos y la toma de decisiones. Cuatro motores autónomos ensamblados en una sola plataforma.
        </p>
      </div>

      {/* Grid de 4 Celdas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* CELDA 1 (2 Columnas): Visualizador Interactivo AutoML */}
        <div className="lg:col-span-2 bg-white border-4 border-[#111] shadow-[6px_6px_0px_#111] sm:shadow-[8px_8px_0px_#111] p-6 sm:p-8 flex flex-col justify-between hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[6px_6px_0px_#111] transition-all">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#111] pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-mio-violet text-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">Motor AutoML Continuo</h3>
                  <span className="font-mono text-[11px] font-bold text-gray-500">SELECCIÓN Y ENTRENAMIENTO DINÁMICO</span>
                </div>
              </div>

              {/* Selector de modo interactivo */}
              <div className="flex bg-[#faf8f5] border-2 border-[#111] p-1 gap-1">
                {(['forecast', 'cluster', 'anomalies'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBentoTab(m)}
                    className={`px-3 py-1 font-mono text-[10px] font-bold uppercase transition-all ${
                      bentoTab === m
                        ? 'bg-mio-lime text-black border border-[#111] shadow-[1px_1px_0px_#111]'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {m === 'forecast' ? 'Forecasting' : m === 'cluster' ? 'K-Means' : 'Anomalías'}
                  </button>
                ))}
              </div>
            </div>

            {/* Pantalla interactiva interna */}
            <div className="bg-[#0b0914] border-2 border-[#111] p-4 text-white font-mono rounded-none">
              <div className="flex items-center justify-between text-[11px] text-gray-400 border-b border-gray-800 pb-2 mb-3">
                <span className="text-mio-lime font-bold">ALGORITMO EN EJECUCIÓN:</span>
                <span className="text-white font-bold">
                  {bentoTab === 'forecast' ? 'PROPHET + AUTO-ARIMA (Q4)' : bentoTab === 'cluster' ? 'K-MEANS (k=3 OPTIMIZADO)' : 'ISOLATION FOREST'}
                </span>
              </div>

              {/* Visualización según pestaña */}
              {bentoTab === 'forecast' && (
                <div className="h-36 flex items-end justify-between gap-2 pt-2 px-1">
                  {[28, 42, 36, 58, 52, 70, 65, 88, 80, 94, 98, 100].map((val, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-gradient-to-t from-mio-violet to-mio-lime"
                        style={{ height: `${val * 1.2}px` }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {bentoTab === 'cluster' && (
                <div className="h-36 flex items-center justify-around gap-4 px-4">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-xs text-mio-lime font-bold">62%</span>
                    <div className="w-full h-24 bg-mio-lime border border-[#111]" />
                    <span className="text-[10px] text-gray-400 font-bold">VIP</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-xs text-white font-bold">26%</span>
                    <div className="w-full h-16 bg-mio-violet border border-[#111]" />
                    <span className="text-[10px] text-gray-400 font-bold">Medio</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <span className="text-xs text-gray-400 font-bold">12%</span>
                    <div className="w-full h-8 bg-gray-700 border border-[#111]" />
                    <span className="text-[10px] text-gray-400 font-bold">Casual</span>
                  </div>
                </div>
              )}

              {bentoTab === 'anomalies' && (
                <div className="h-36 relative border border-dashed border-gray-800 p-2 overflow-hidden flex items-center justify-center">
                  <div className="absolute top-4 left-6 text-red-400 text-xs font-bold animate-pulse">
                    ● OUTLIER DETECTADO (Fila 842: Importe atípico)
                  </div>
                  <div className="w-full h-full flex items-center justify-around opacity-75">
                    {[40, 42, 39, 41, 120, 40, 43, 38, 41].map((val, idx) => (
                      <div
                        key={idx}
                        className={`w-3 ${val > 100 ? 'bg-red-500 animate-bounce' : 'bg-mio-lime'}`}
                        style={{ height: `${Math.min(val, 110)}px` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-600 font-medium mt-5 leading-relaxed">
            MIO compara iterativamente múltiples familias de modelos estadísticos y escoge el que maximiza la métrica R² para tus datos particulares.
          </p>
        </div>

        {/* CELDA 2 (1 Columna): Ingesta Universal de Ultra-Velocidad */}
        <div className="bg-mio-lime border-4 border-[#111] shadow-[6px_6px_0px_#111] sm:shadow-[8px_8px_0px_#111] p-6 sm:p-8 flex flex-col justify-between hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[6px_6px_0px_#111] transition-all">
          <div>
            <div className="w-12 h-12 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-gray-950" />
            </div>
            <span className="font-mono text-[10px] font-black text-gray-950 uppercase tracking-widest block mb-1">
              LATENCIA MÍNIMA
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-950 mb-3 leading-tight tracking-tight">
              De archivo bruto a dashboard en 60s
            </h3>
            <p className="text-sm text-gray-900 font-medium leading-relaxed mb-6">
              Carga tus planillas .CSV o .XLSX sin limpiar. El pipeline parsea formatos de fecha rotos, imputa vacíos y genera visualizaciones autónomas.
            </p>
          </div>

          <div className="bg-white border-2 border-[#111] p-3 font-mono text-xs space-y-1.5 shadow-[2px_2px_0px_#111]">
            <div className="flex justify-between text-gray-600 text-[11px]">
              <span>Ingesta & Limpieza:</span>
              <span className="font-bold text-gray-950">0.42s</span>
            </div>
            <div className="flex justify-between text-gray-600 text-[11px]">
              <span>Entrenamiento ML:</span>
              <span className="font-bold text-gray-950">1.84s</span>
            </div>
            <div className="flex justify-between border-t-2 border-gray-200 pt-1 text-gray-950 font-bold text-xs">
              <span>Total Pipeline:</span>
              <span className="text-mio-violet font-black">Listo</span>
            </div>
          </div>
        </div>

        {/* CELDA 3 (1 Columna): Arquitectura Privada Zero-Knowledge */}
        <div className="bg-white border-4 border-[#111] shadow-[6px_6px_0px_#111] sm:shadow-[8px_8px_0px_#111] p-6 sm:p-8 flex flex-col justify-between hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[6px_6px_0px_#111] transition-all">
          <div>
            <div className="w-12 h-12 bg-[#ff5f56] text-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center mb-6">
              <Lock className="w-6 h-6" />
            </div>
            <span className="font-mono text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
              SEGURIDAD CORPORATIVA
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-950 mb-3 leading-tight tracking-tight">
              Tus datos crudos nunca se guardan
            </h3>
            <p className="text-sm text-gray-600 font-medium leading-relaxed">
              El análisis se procesa de forma transitoria en memoria volátil protegida. Las planillas de tus clientes no se usan para entrenar modelos públicos.
            </p>
          </div>

          <div className="border-2 border-[#111] bg-[#faf8f5] p-3 mt-6 flex items-center gap-3 shadow-[2px_2px_0px_#111]">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span className="font-mono text-[11px] font-bold text-gray-800">
              Cifrado en tránsito y en reposo
            </span>
          </div>
        </div>

        {/* CELDA 4 (2 Columnas): Copiloto IA Conversacional */}
        <div className="lg:col-span-2 bg-[#0b0914] text-white border-4 border-[#111] shadow-[6px_6px_0px_#111] sm:shadow-[8px_8px_0px_#111] p-6 sm:p-8 flex flex-col justify-between hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[6px_6px_0px_#111] transition-all">
          <div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-mio-violet text-white border border-mio-lime/40 flex items-center justify-center shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                  <MessageSquare className="w-5 h-5 text-mio-lime" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Copiloto Ejecutivo MIO</h3>
                  <span className="font-mono text-[11px] font-bold text-gray-400">CHATEÁ DIRECTAMENTE CON TUS TABLAS</span>
                </div>
              </div>
              <span className="font-mono text-[10px] bg-mio-lime/20 text-mio-lime border border-mio-lime/40 px-2.5 py-1 font-bold uppercase tracking-wider">
                LLM AGENT READY
              </span>
            </div>

            {/* Simulación de chat interactivo */}
            <div className="space-y-3 font-mono text-xs">
              {/* Mensaje Usuario */}
              <div className="bg-gray-900 border border-gray-800 p-3 text-gray-200 flex items-start gap-2.5">
                <span className="text-mio-lime font-bold">TÚ:</span>
                <span>¿Cuáles fueron los 2 productos con menor margen en el último trimestre?</span>
              </div>
              {/* Mensaje IA */}
              <div className="bg-mio-violet/20 border border-mio-violet/50 p-3.5 text-white flex items-start gap-2.5">
                <span className="text-mio-lime font-bold">MIO:</span>
                <div className="space-y-1">
                  <p>
                    Los productos con menor margen fueron <strong className="text-white">SKU-402 (11.2%)</strong> y <strong className="text-white">SKU-119 (14.8%)</strong> debido a un alza imprevista del 18% en costos logísticos.
                  </p>
                  <p className="text-[11px] text-mio-lime">
                    ✦ Generé una simulación de ajuste de precio sugerida (+6%) para recuperar margen sin perder demanda.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-300 font-medium mt-6 leading-relaxed">
            No pierdas horas creando fórmulas complejas: hacé preguntas en lenguaje natural y obtené respuestas de nivel consultor de datos en el acto.
          </p>
        </div>

      </div>
    </section>
  );
}

// Banner de compatibilidad universal y multi-archivo
function FormatBanner() {
  return (
    <div className="w-full bg-[#111] text-white py-7 border-y-4 border-gray-900 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 bg-mio-lime/20 border-2 border-mio-lime flex items-center justify-center shrink-0">
            <Files className="w-6 h-6 text-mio-lime" />
          </div>
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h4 className="text-lg font-black tracking-tight text-white">
                Carga de Datos Universal y Multi-Archivo
              </h4>
              <span className="px-2 py-0.5 bg-mio-lime text-black font-mono text-[10px] font-black uppercase tracking-wider">
                Batch Processing
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 font-medium max-w-xl">
              Subí uno o múltiples archivos en simultáneo. Compatible con <span className="text-white font-bold">.CSV</span>, <span className="text-white font-bold">.XLSX (Excel)</span> y <span className="text-white font-bold">.JSON</span> sin necesidad de limpieza ni formateo previo.
            </p>
          </div>
        </div>
        
        {/* Formatos y multi-archivo badges */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="bg-white/10 px-3.5 py-1.5 border-2 border-white/20 font-mono text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-mio-lime"></span>
            <span className="text-mio-lime font-mono">.csv</span>
          </div>
          <div className="bg-white/10 px-3.5 py-1.5 border-2 border-white/20 font-mono text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <span className="text-green-400 font-mono">.xlsx</span>
          </div>
          <div className="bg-white/10 px-3.5 py-1.5 border-2 border-white/20 font-mono text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-amber-400 font-mono">.json</span>
          </div>
          <div className="bg-mio-violet/30 px-3.5 py-1.5 border-2 border-mio-violet/60 font-mono text-xs font-bold flex items-center gap-2 text-white">
            <Layers className="w-3.5 h-3.5 text-mio-lime" />
            <span>Varios archivos a la vez</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// CÓMO FUNCIONA MIO (RESTAURADO CON EL STICKY SCROLL ORIGINAL)
// =========================================================================
function HowItWorks() {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end end"],
  });

  // Highlight logic for the 3 steps
  // 0 to 0.33 -> Step 1 active
  // 0.33 to 0.66 -> Step 2 active
  // 0.66 to 1 -> Step 3 active

  // Text Opacity
  const t1O = useTransform(scrollYProgress, [0, 0.3, 0.4], [1, 1, 0.3]);
  const t2O = useTransform(scrollYProgress, [0.2, 0.35, 0.65, 0.75], [0.3, 1, 1, 0.3]);
  const t3O = useTransform(scrollYProgress, [0.55, 0.7, 1], [0.3, 1, 1]);

  // Text Scale
  const t1S = useTransform(scrollYProgress, [0, 0.3, 0.4], [1.05, 1.05, 0.85]);
  const t2S = useTransform(scrollYProgress, [0.2, 0.35, 0.65, 0.75], [0.85, 1.05, 1.05, 0.85]);
  const t3S = useTransform(scrollYProgress, [0.55, 0.7, 1], [0.85, 1.05, 1.05]);

  // Right Visualizer Opacity (Clean solid crossfade)
  const v1O = useTransform(scrollYProgress, [0, 0.28, 0.38], [1, 1, 0]);
  const v2O = useTransform(scrollYProgress, [0.28, 0.38, 0.62, 0.72], [0, 1, 1, 0]);
  const v3O = useTransform(scrollYProgress, [0.62, 0.72, 1], [0, 1, 1]);

  return (
    <section ref={targetRef} className="relative bg-[#fafafc] border-y-4 border-[#111]" style={{ height: '200vh' }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        
        <div className="text-center absolute top-10 md:top-20 left-0 right-0 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] font-mono text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">
            <span className="w-2 h-2 rounded-full bg-mio-lime border border-[#111] animate-pulse" />
            WORKFLOW // 3 PASOS SIMPLES
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-950 tracking-tighter mb-4 px-4">
            Cómo Funciona MIO
          </h2>
        </div>

        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mt-20 md:mt-24">
          
          {/* Left Text (All 3 stacked, highlighting one by one) */}
          <div className="relative flex flex-col justify-center gap-6 md:gap-10">
            
            {/* Paso 1 */}
            <motion.div style={{ opacity: t1O, scale: t1S, transformOrigin: 'left center' }} className="flex gap-4 md:gap-6 items-start">
              <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 bg-white border-4 border-[#111] shadow-[4px_4px_0px_#111] flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-[#111]">PASO 01</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-gray-950 tracking-tight mb-1 md:mb-2">1. Subí tus datos</h2>
                <p className="text-base md:text-lg text-gray-600 font-medium">Soltá tus archivos .CSV, .XLSX o .JSON (uno o varios en lote). MIO limpia nulos y prepara la matriz automáticamente.</p>
              </div>
            </motion.div>
            
            {/* Paso 2 */}
            <motion.div style={{ opacity: t2O, scale: t2S, transformOrigin: 'left center' }} className="flex gap-4 md:gap-6 items-start">
              <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 bg-mio-lime border-4 border-[#111] shadow-[4px_4px_0px_#111] flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 md:w-8 md:h-8 text-gray-950" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-mio-lime text-gray-950 border border-[#111]">PASO 02</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-gray-950 tracking-tight mb-1 md:mb-2">2. Magia Neuronal</h2>
                <p className="text-base md:text-lg text-gray-600 font-medium">Nuestra IA escanea anomalías y proyecta el futuro sin que toques nada.</p>
              </div>
            </motion.div>

            {/* Paso 3 */}
            <motion.div style={{ opacity: t3O, scale: t3S, transformOrigin: 'left center' }} className="flex gap-4 md:gap-6 items-start">
              <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 bg-mio-violet border-4 border-[#111] shadow-[4px_4px_0px_#111] flex items-center justify-center">
                <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 bg-mio-violet text-white border border-[#111]">PASO 03</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-gray-950 tracking-tight mb-1 md:mb-2">3. Decisión Rápida</h2>
                <p className="text-base md:text-lg text-gray-600 font-medium">Obtené un reporte narrado y gráficas listas para exportar a PDF.</p>
              </div>
            </motion.div>
            
          </div>

          {/* Right Visualizer */}
          <div className="relative h-72 md:h-[30rem] w-full flex items-center justify-center">
             <div className="w-full h-full max-w-sm md:max-w-md bg-[#fafafc] border-4 border-[#111] shadow-[8px_8px_0px_#111] md:shadow-[16px_16px_0px_#111] overflow-hidden relative pointer-events-none">
                
                {/* Barra superior de terminal de hardware fija */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-[#161224] border-b-2 border-[#111] flex items-center justify-between px-3 z-40">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500/80 border border-black" />
                    <span className="w-2 h-2 rounded-full bg-amber-400/80 border border-black" />
                    <span className="w-2 h-2 rounded-full bg-mio-lime border border-black shadow-[0_0_6px_#bdf559]" />
                  </div>
                  <span className="text-[9px] font-mono font-black text-gray-300 tracking-wider uppercase">
                    MIO PIPELINE // LIVE ENGINE
                  </span>
                  <span className="text-[9px] font-mono text-mio-lime font-bold">● VIVO</span>
                </div>

                {/* ============================================================ */}
                {/* VISUALIZADOR 1: SUBÍ TUS DATOS (Tarjetas de archivos 2.5D)   */}
                {/* ============================================================ */}
                <motion.div
                  style={{ opacity: v1O }}
                  className="absolute inset-0 pt-11 pb-4 px-4 sm:px-6 flex flex-col justify-center gap-3 bg-[#f8f7fd] z-10 w-full h-full overflow-hidden"
                >
                  {/* Tarjeta 1: XLSX */}
                  <div className="w-full bg-white border-2 border-[#111] shadow-[3px_3px_0px_#111] p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-950 border border-emerald-600 font-mono font-black text-[9px] uppercase">
                        .XLSX
                      </span>
                      <div>
                        <div className="text-xs font-black text-gray-900 font-mono">ventas_retail_q4.xlsx</div>
                        <div className="text-[10px] text-gray-500 font-mono">14,280 filas · 12 columnas</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      LIMPIO
                    </span>
                  </div>

                  {/* Tarjeta 2: CSV */}
                  <div className="w-full bg-white border-2 border-[#111] shadow-[3px_3px_0px_#111] p-3 flex items-center justify-between -translate-x-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-1.5 py-0.5 bg-mio-lime text-gray-950 border border-[#111] font-mono font-black text-[9px] uppercase">
                        .CSV
                      </span>
                      <div>
                        <div className="text-xs font-black text-gray-900 font-mono">clientes_segmentados.csv</div>
                        <div className="text-[10px] text-gray-500 font-mono">8,950 registros · 0 nulos</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-gray-900 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-mio-lime shadow-[0_0_4px_#bdf559]" />
                      VALIDADO
                    </span>
                  </div>

                  {/* Tarjeta 3: JSON */}
                  <div className="w-full bg-white border-2 border-[#111] shadow-[3px_3px_0px_#111] p-3 flex items-center justify-between translate-x-1">
                    <div className="flex items-center gap-2.5">
                      <span className="px-1.5 py-0.5 bg-mio-violet text-white border border-[#111] font-mono font-black text-[9px] uppercase">
                        .JSON
                      </span>
                      <div>
                        <div className="text-xs font-black text-gray-900 font-mono">telemetria_eventos.json</div>
                        <div className="text-[10px] text-gray-500 font-mono">Auto-join activo</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-mio-violet flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-mio-violet" />
                      PARSED
                    </span>
                  </div>

                  {/* Badge de velocidad de ingesta */}
                  <div className="mt-1 self-center inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] text-[10px] font-mono font-black text-gray-800">
                    <Sparkles className="w-3 h-3 text-mio-lime fill-mio-lime" />
                    <span>INGESTA Y MATRIZ EN 0.42s</span>
                  </div>
                </motion.div>

                {/* ============================================================ */}
                {/* VISUALIZADOR 2: MAGIA NEURONAL (Cápsula 2.5D con energía)    */}
                {/* ============================================================ */}
                <motion.div
                  style={{ opacity: v2O }}
                  className="absolute inset-0 pt-11 pb-4 px-4 sm:px-6 flex flex-col items-center justify-between bg-[#f2fbe9] z-20 w-full h-full overflow-hidden"
                >
                  {/* Fila superior de telemetría */}
                  <div className="w-full flex items-center justify-between pt-1 z-10">
                    <span className="px-2 py-0.5 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] text-[9px] font-mono font-black text-gray-900 uppercase">
                      AUTOML K-TUNER
                    </span>
                    <span className="px-2 py-0.5 bg-mio-lime border-2 border-[#111] shadow-[2px_2px_0px_#111] text-[9px] font-mono font-black text-gray-950 uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                      R²: 0.942 OPT
                    </span>
                  </div>

                  {/* CÁPSULA NEURONAL CENTRAL 2.5D PROTAGÓNICA */}
                  <div className="relative my-auto flex items-center justify-center">
                    {/* Ondas concéntricas de pulso neuronal */}
                    <div className="absolute w-56 h-56 rounded-full border-2 border-mio-lime/80 animate-ping opacity-30 pointer-events-none" />
                    <div className="absolute w-44 h-44 rounded-full border-2 border-dashed border-[#111]/25 animate-[spin_24s_linear_infinite] pointer-events-none" />

                    {/* Resplandor neón perimetral */}
                    <div className="absolute -inset-2 rounded-full bg-mio-lime opacity-45 blur-md" />

                    {/* Disco principal 2.5D */}
                    <div
                      className="relative w-36 h-36 md:w-42 md:h-42 rounded-full border-4 border-[#111] flex items-center justify-center shadow-[6px_6px_0px_#111]"
                      style={{
                        background: 'linear-gradient(145deg, #ffffff 0%, #f4fbf0 60%, #d8f5b8 100%)',
                      }}
                    >
                      {/* Aro interior decorativo */}
                      <div className="w-26 h-26 md:w-32 md:h-32 rounded-full border-2 border-[#111]/30 flex items-center justify-center bg-white shadow-inner">
                        <BrainCircuit className="w-14 h-14 md:w-18 md:h-18 text-gray-950 animate-pulse" />
                      </div>

                      {/* Mini luces satélites en el perímetro */}
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-mio-lime border-2 border-[#111] shadow-sm" />
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-mio-violet border-2 border-[#111] shadow-sm" />
                    </div>
                  </div>

                  {/* Subtexto técnico integrado sin solapamiento */}
                  <div className="w-full text-center pb-2 z-10">
                    <span className="text-xs font-mono font-black text-gray-950 uppercase tracking-widest block">
                      PROCESAMIENTO NEURONAL
                    </span>
                    <span className="text-[10px] font-mono text-gray-600 font-bold block mt-0.5">
                      Detección de anomalías · Regresión continua
                    </span>
                  </div>
                </motion.div>

                {/* ============================================================ */}
                {/* VISUALIZADOR 3: DECISIÓN RÁPIDA (Gráfico y reporte PDF listo)*/}
                {/* ============================================================ */}
                <motion.div
                  style={{ opacity: v3O }}
                  className="absolute inset-0 pt-11 pb-4 px-4 sm:px-6 flex flex-col justify-between bg-[#faf6fe] z-30 w-full h-full overflow-hidden"
                >
                  {/* Tarjeta de Insight Narrado por IA */}
                  <div className="bg-white border-2 border-[#111] shadow-[3px_3px_0px_#111] p-3">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-gray-500 mb-1">
                      <span className="flex items-center gap-1 text-mio-violet font-black">
                        <Sparkles className="w-3 h-3" />
                        INSIGHT EJECUTIVO IA
                      </span>
                      <span className="text-emerald-700 font-mono font-bold">CONF: 99.1%</span>
                    </div>
                    <div className="text-xs font-black text-gray-950 font-mono leading-snug">
                      "Proyección de ventas Q1: +24.8% impulsada por recompras digitales."
                    </div>
                  </div>

                  {/* Gráfico Neo-Brutalista de Barras Ascendentes */}
                  <div className="bg-[#0e0a1a] border-2 border-[#111] shadow-[3px_3px_0px_#111] p-3.5 relative">
                    {/* Header del gráfico */}
                    <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 border-b border-gray-800 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-mio-lime shadow-[0_0_6px_#bdf559]" />
                        <span className="text-mio-lime font-black">CURVA PREDICTIVA 2026</span>
                      </div>
                      <span className="text-gray-300 font-bold">INTERVALO P95</span>
                    </div>

                    {/* Línea de meta punteada */}
                    <div className="absolute top-16 left-4 right-4 border-b border-dashed border-mio-lime/30 z-0 pointer-events-none" />

                    {/* Área de barras con altura explícita garantizada */}
                    <div className="h-28 flex items-end justify-between gap-2 px-1 relative z-10">
                      {[
                        { height: 32, label: 'Ene', val: '12k', color: 'bg-gray-600' },
                        { height: 46, label: 'Feb', val: '18k', color: 'bg-gray-500' },
                        { height: 62, label: 'Mar', val: '24k', color: 'bg-mio-violet' },
                        { height: 78, label: 'Abr', val: '31k', color: 'bg-mio-violet' },
                        { height: 92, label: 'May', val: '38k', color: 'bg-mio-lime' },
                        { height: 104, label: 'Jun', val: '45k', color: 'bg-mio-lime shadow-[0_0_10px_#bdf559]' },
                      ].map((bar, i) => (
                        <div key={i} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                          <span className="text-[8px] font-mono text-gray-400 font-bold">{bar.val}</span>
                          <div
                            className={`w-full ${bar.color} border border-black/60 shadow-sm transition-all`}
                            style={{ height: `${bar.height}px` }}
                          />
                          <span className="text-[8.5px] font-mono text-gray-400 font-bold">{bar.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botón de exportación rápida a PDF */}
                  <div className="flex items-center justify-between bg-mio-lime border-2 border-[#111] shadow-[3px_3px_0px_#111] px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📄</span>
                      <span className="text-[11px] font-mono font-black text-gray-950 uppercase tracking-tight">
                        REPORTE_EJECUTIVO.PDF
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-black text-mio-lime font-mono font-black text-[9px] uppercase border border-black shadow-[1px_1px_0px_#111]">
                      DESCARGAR ↓
                    </span>
                  </div>
                </motion.div>

             </div>
          </div>

        </div>

      </div>
    </section>
  );
}

// Llamado a la acción de alta conversión
function FinalCallToAction({ user }: { user?: User | null }) {
  return (
    <section className="py-20 sm:py-28 bg-[#0b0914] text-white border-y-4 border-[#111] relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-mio-lime/20 border border-mio-lime/40 text-mio-lime font-mono text-[11px] font-black uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5 text-mio-lime" />
          <span>EMPEZÁ HOY SIN FRICCIÓN</span>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.05] mb-6">
          Dejá de adivinar.<br />
          <span className="text-mio-lime">Empezá a predecir.</span>
        </h2>

        <p className="text-base sm:text-lg text-gray-300 max-w-xl mx-auto mb-10 font-medium leading-relaxed">
          Probá MIO gratis con tus propios archivos y obtené modelos predictivos y respuestas ejecutivas en menos de un minuto.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <>
              <Link
                href="/projects"
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-mio-lime text-gray-950 font-black text-base sm:text-lg border-4 border-[#111] shadow-[6px_6px_0px_#fff] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all flex items-center justify-center gap-3 tracking-tight"
              >
                <Layers className="w-5 h-5" strokeWidth={2.5} />
                <span>Mis proyectos</span>
              </Link>
              <Link
                href="/dashboard?new=true"
                onClick={() => {
                  try {
                    localStorage.removeItem('mio_active_analysis');
                  } catch (e) {}
                }}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-mio-violet text-white font-black text-base sm:text-lg border-4 border-[#111] shadow-[6px_6px_0px_#fff] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all flex items-center justify-center gap-3 tracking-tight"
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
                <span>Nuevo proyecto</span>
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto px-10 py-5 bg-mio-lime text-gray-950 font-black text-lg border-4 border-[#111] shadow-[6px_6px_0px_#fff] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all flex items-center justify-center gap-3 tracking-tight"
            >
              <span>Crear Cuenta Gratis</span>
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-full sm:w-auto px-8 py-5 bg-white/10 text-white font-black text-base border-2 border-white/20 hover:bg-white/20 transition-all"
          >
            Explorar Consola 3D ↑
          </button>
        </div>
      </div>
    </section>
  );
}

// Sección Quiénes Somos (Original MIO)
function AboutUs() {
  return (
    <section className="py-20 lg:py-32 bg-white border-t-4 border-[#111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-gray-950 tracking-tighter mb-4">
            Quiénes Somos
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
            Estudiantes con la visión de democratizar la analítica de datos avanzada para emprendedores y PyMEs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Tadeo */}
          <div className="bg-[#fafafc] border-4 border-[#111] shadow-[8px_8px_0px_#111] p-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-mio-violet rounded-full border-4 border-[#111] mb-6 flex items-center justify-center text-white text-3xl font-black">
              T
            </div>
            <h3 className="text-2xl font-black text-gray-950 mb-1">Tadeo Muñoz Garcés</h3>
            <p className="text-gray-700 font-bold text-sm mb-4">Co-Founder & Developer</p>
            <p className="text-gray-700 text-sm font-medium mb-6">
              Estudiante de Ciencia de Datos. Apasionado por analizar, visualizar y dar vida a los datos mediante arquitecturas de software sólidas e inteligencia artificial.
            </p>
            <div className="flex gap-4 mt-auto">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Perfil de GitHub de Tadeo Muñoz Garcés (se abre en nueva pestaña)"
                className="w-10 h-10 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center hover:translate-y-1 hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-mio-violet"
              >
                <Github className="w-5 h-5 text-gray-900" aria-hidden="true" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Perfil de LinkedIn de Tadeo Muñoz Garcés (se abre en nueva pestaña)"
                className="w-10 h-10 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center hover:translate-y-1 hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-mio-violet"
              >
                <Linkedin className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Milena */}
          <div className="bg-[#fafafc] border-4 border-[#111] shadow-[8px_8px_0px_#111] p-8 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-mio-lime rounded-full border-4 border-[#111] mb-6 flex items-center justify-center text-black text-3xl font-black">
              M
            </div>
            <h3 className="text-2xl font-black text-gray-950 mb-1">Milena Abraham</h3>
            <p className="text-gray-700 font-bold text-sm mb-4">Co-Founder & Developer</p>
            <p className="text-gray-700 text-sm font-medium mb-6">
              Estudiante de Ciencia de Datos. Apasionada por analizar, visualizar y construir modelos predictivos para encontrar valor estratégico en el caos de la información.
            </p>
            <div className="flex gap-4 mt-auto">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Perfil de GitHub de Milena Abraham (se abre en nueva pestaña)"
                className="w-10 h-10 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center hover:translate-y-1 hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-mio-violet"
              >
                <Github className="w-5 h-5 text-gray-900" aria-hidden="true" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Perfil de LinkedIn de Milena Abraham (se abre en nueva pestaña)"
                className="w-10 h-10 bg-white border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center hover:translate-y-1 hover:shadow-none transition-all focus-visible:ring-2 focus-visible:ring-mio-violet"
              >
                <Linkedin className="w-5 h-5 text-blue-600" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// PÁGINA PRINCIPAL
// =========================================================================
export default function LandingPage() {
  const [heroTab, setHeroTab] = useState<'cartridges' | '3d'>('3d');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col selection:bg-mio-lime selection:text-black">
      <Navbar />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Hero Section */}
        <section className="relative pt-16 sm:pt-24 pb-12 lg:pt-32 lg:pb-16 overflow-hidden" style={{ perspective: '1200px' }}>
        {/* Fondo interactivo de Shaders MIO */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <MioBackgroundShader theme="light" opacity={0.45} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white border-2 sm:border-4 border-[#111] text-mio-violet text-xs sm:text-sm font-bold mb-6 sm:mb-10 shadow-[2px_2px_0px_#111] sm:shadow-[4px_4px_0px_#111]"
          >
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Inteligencia Artificial para Negocios</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8, type: 'spring', damping: 12, stiffness: 100 }}
            className="text-4xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-gray-950 tracking-tighter max-w-6xl mx-auto leading-[1.1] sm:leading-[1.05] mb-6 sm:mb-8"
          >
            Convertí planillas de datos en <span style={{ backgroundImage: "linear-gradient(to right, #bdf559 45%, #815ae1 55%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>decisiones inteligentes.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 sm:mb-12 font-medium leading-relaxed"
          >
            Subí tus datos. MIO limpia la información, corre modelos predictivos y selecciona automáticamente los gráficos más óptimos para vos en 60 segundos.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6"
          >
            {user ? (
              <>
                <Link
                  href="/projects"
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-mio-lime text-gray-950 font-black text-base sm:text-lg border-4 border-[#111] shadow-[4px_4px_0px_#111] sm:shadow-[6px_6px_0px_#111] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] sm:hover:translate-y-[6px] sm:hover:translate-x-[6px] transition-all flex items-center justify-center gap-3"
                >
                  <Layers className="w-5 h-5" strokeWidth={2.5} />
                  <span>Mis proyectos</span>
                </Link>
                <Link
                  href="/dashboard?new=true"
                  onClick={() => {
                    try {
                      localStorage.removeItem('mio_active_analysis');
                    } catch (e) {}
                  }}
                  className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-mio-violet text-white font-black text-base sm:text-lg border-4 border-[#111] shadow-[4px_4px_0px_#111] sm:shadow-[6px_6px_0px_#111] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] sm:hover:translate-y-[6px] sm:hover:translate-x-[6px] transition-all flex items-center justify-center gap-3"
                >
                  <Plus className="w-5 h-5" strokeWidth={3} />
                  <span>Nuevo proyecto</span>
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-mio-lime text-gray-950 font-black text-base sm:text-lg border-4 border-[#111] shadow-[4px_4px_0px_#111] sm:shadow-[6px_6px_0px_#111] hover:shadow-none hover:translate-y-[4px] hover:translate-x-[4px] sm:hover:translate-y-[6px] sm:hover:translate-x-[6px] transition-all flex items-center justify-center gap-3"
              >
                <span>Comenzar Gratis</span>
                <ArrowRight className="w-5 h-5" strokeWidth={3} />
              </Link>
            )}
          </motion.div>

        </div>

        {/* Switcher de Vista Hero (Consola MIO-Drive vs 3D Hardware) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16 flex flex-col items-center relative z-20">
          <div className="inline-flex flex-wrap justify-center p-1.5 bg-white border-4 border-[#111] shadow-[6px_6px_0px_#111] gap-2">
            <button
              type="button"
              onClick={() => setHeroTab('3d')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 ${
                heroTab === '3d'
                  ? 'bg-mio-lime text-gray-950 border-2 border-[#111] shadow-[3px_3px_0px_#111] -translate-y-0.5'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-mio-violet" />
              <span>🕹️ MIO-Dev 3D</span>
            </button>
            <button
              type="button"
              onClick={() => setHeroTab('cartridges')}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center gap-2 ${
                heroTab === 'cartridges'
                  ? 'bg-mio-lime text-gray-950 border-2 border-[#111] shadow-[3px_3px_0px_#111] -translate-y-0.5'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>💾 Consola MIO-Drive</span>
            </button>
          </div>

          <p className="text-xs font-mono font-bold text-gray-500 mt-3 text-center">
            {heroTab === '3d'
              ? '✦ Hacé click en los botones físicos para cambiar de modo de análisis en la pantalla.'
              : '✦ Cliqueá en los cartuchos 3D de la bandeja para insertarlos por arriba y correr inferencia AutoML en vivo.'}
          </p>
        </div>

        {/* ============================================================ */}
        {/* VISTAS HERO: MIO-DRIVE (CARTRIDGES) / MIO-DEV 3D             */}
        {/* ============================================================ */}
        {heroTab === 'cartridges' ? (
          <div className="mt-8 max-w-5xl mx-auto w-full px-4 flex justify-center relative z-10">
            <CartridgeDeckBlock />
          </div>
        ) : (
          <div className="mt-6 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-8 lg:gap-12">

              {/* COLUMNA IZQUIERDA: Editorial */}
              <div className="hidden lg:flex flex-col justify-center text-left">
                {/* Eyebrow */}
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-mio-lime border border-[#111]" />
                  <span className="text-[11px] font-mono font-black tracking-[0.2em] text-gray-400 uppercase">
                    01 / the pocket edition
                  </span>
                </div>

                {/* Headline */}
                <h2 className="text-4xl xl:text-5xl font-black text-gray-950 tracking-tight leading-[1.05] mb-4">
                  Small screen.<br />
                  <span className="italic" style={{ backgroundImage: "linear-gradient(to right, #815ae1, #bdf559)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Big decisions.
                  </span>
                </h2>

                {/* Descripción */}
                <p className="text-sm text-gray-600 font-medium leading-relaxed mb-8 max-w-xs">
                  Analítica predictiva en tu bolsillo. MIO entrena modelos AutoML, detecta anomalías y segmenta tus clientes — sin escribir una línea de código.
                </p>

                {/* Firma */}
                <div className="border-t-2 border-[#111] pt-4">
                  <div className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest mb-0.5">
                    + MIO DATA ANALYTICS SYSTEM™
                  </div>
                  <div className="text-[10px] font-mono text-gray-400 font-medium">
                    Ciencia de Datos · Inteligencia Artificial
                  </div>
                </div>

                {/* Nota */}
                <div className="mt-6 relative">
                  <span className="italic font-semibold text-gray-400 text-sm">
                    Hecho para explorar. →
                  </span>
                </div>
              </div>

              {/* COLUMNA CENTRAL: Consola 3D Protagónica */}
              <div className="flex justify-center">
                <MioDevCanvas />
              </div>

              {/* COLUMNA DERECHA: Guía de Controles */}
              <div className="hidden lg:flex flex-col justify-center text-left">
                <div className="border-4 border-[#111] shadow-[6px_6px_0px_#111] p-5 bg-white">
                  <div className="flex items-center justify-between border-b-2 border-[#111] pb-2 mb-4">
                    <span className="text-[11px] font-mono font-black tracking-[0.15em] text-gray-900 uppercase">
                      HOW TO OPERATE
                    </span>
                    <span className="text-[9px] font-mono font-bold text-mio-violet">● V2.6</span>
                  </div>

                  <div className="space-y-3.5">
                    {/* D-PAD */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#1a1726] text-white flex items-center justify-center font-black text-xs shrink-0 border-2 border-[#111] shadow-[2px_2px_0px_#111]">
                        ◀▶
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">D-PAD (◀ ▶ ▲ ▼)</div>
                        <div className="text-[11px] text-gray-500 font-medium">Explorar barras, clusters y puntos</div>
                      </div>
                    </div>

                    {/* Botón A */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-mio-lime border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center font-black text-[11px] shrink-0 text-gray-900">
                        A
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">BOTÓN A</div>
                        <div className="text-[11px] text-gray-500 font-medium">Siguiente gráfico</div>
                      </div>
                    </div>

                    {/* Botón B */}
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-mio-violet border-2 border-[#111] shadow-[2px_2px_0px_#111] flex items-center justify-center font-black text-[11px] shrink-0 text-white">
                        B
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">BOTÓN B</div>
                        <div className="text-[11px] text-gray-500 font-medium">Gráfico anterior</div>
                      </div>
                    </div>

                    {/* START */}
                    <div className="flex items-start gap-3">
                      <div className="px-2 h-6 bg-mio-lime/20 border-2 border-[#111] shadow-[1px_1px_0px_#111] flex items-center font-black text-[9px] shrink-0 text-gray-900 tracking-widest mt-0.5">
                        START
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">START</div>
                        <div className="text-[11px] text-gray-500 font-medium">Ejecutar optimización AutoML</div>
                      </div>
                    </div>

                    {/* SELECT */}
                    <div className="flex items-start gap-3">
                      <div className="px-2 h-6 bg-white border-2 border-[#111] shadow-[1px_1px_0px_#111] flex items-center font-black text-[9px] shrink-0 text-gray-700 tracking-widest mt-0.5">
                        SELECT
                      </div>
                      <div>
                        <div className="text-xs font-black text-gray-900">SELECT</div>
                        <div className="text-[11px] text-gray-500 font-medium">Proyección 2026 / Histórico 2025</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </section>

      {/* 1. Banner de Carga de Datos Universal y Multi-Archivo */}
      <FormatBanner />

      {/* 2. Arquitectura de Cómputo (Bento Grid con AutoML, Latencia 60s, Privacidad Zero-Knowledge y Copiloto) */}
      <BentoGrid />

      {/* 3. Cómo Funciona MIO (Paso a Paso interactivo con Sticky Scroll) */}
      <HowItWorks />

      {/* 4. Llamado a la Acción de Alta Conversión */}
      <FinalCallToAction user={user} />

      {/* 5. Quiénes Somos (Dossier Fundadores) */}
      <AboutUs />
      </main>

      {/* 6. Footer Legal y Cumplimiento Normativo */}
      <footer className="py-12 bg-white border-t-4 border-[#111] text-sm font-bold text-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-3">
            <Image
              src="/MIO.png"
              alt="MIO - Logotipo de Analítica Inteligente y AutoML"
              width={32}
              height={32}
              className="border-2 border-[#111] shadow-[2px_2px_0px_#111] rounded-md"
            />
            <div>
              <p className="font-black text-gray-950 text-base tracking-tight">MIO</p>
              <p className="text-xs text-gray-600 font-medium">
                © 2026 MIO. Neo-Brutal Analytics. Creado con ❤️ en Argentina.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold">
            <Link
              href="/privacidad"
              className="text-gray-800 hover:text-mio-violet underline transition-colors focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none"
            >
              Política de Privacidad
            </Link>
            <Link
              href="/terminos"
              className="text-gray-800 hover:text-mio-violet underline transition-colors focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none"
            >
              Términos y Condiciones
            </Link>
            <Link
              href="/cookies"
              className="text-gray-800 hover:text-mio-violet underline transition-colors focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none"
            >
              Política de Cookies
            </Link>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('mio:open-cookie-preferences'));
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#faf8f5] hover:bg-mio-lime border-2 border-[#111] shadow-[2px_2px_0px_#111] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] text-gray-950 text-xs font-black uppercase transition-all focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none"
              aria-label="Abrir panel de preferencias de cookies y privacidad"
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Preferencias de Cookies</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
