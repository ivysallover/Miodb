import React, { useState } from 'react';
import { MioPet2D, MioPetMood, MioPetMaterial } from '@/components/pet/MioPet2D';
import { MioPet3D } from '@/components/pet/MioPet3D';
import { MioRaymarcherCanvas } from '@/components/canvas/MioRaymarcherCanvas';
import { useMioStore } from '@/utils/useMioStore';
import {
  ArrowLeft,
  RotateCw,
  Sparkles,
  Layers,
  Activity,
  Cpu,
  Moon,
  Sun,
  ShieldAlert,
  Smile,
  Zap,
} from 'lucide-react';

const MOODS: { id: MioPetMood; label: string; matrix: string; sigma: string; icon: any }[] = [
  { id: 'reposo', label: '01 REPOSO', matrix: '[2,3,2] [2,3,2]', sigma: 'σ=0.47', icon: Activity },
  { id: 'trabajando', label: '02 TRABAJANDO', matrix: '[1,2,3] [3,2,1]', sigma: 'σ=0.82', icon: Zap },
  { id: 'celebrando', label: '03 CELEBRANDO', matrix: '[2,3,4] [2,3,4]', sigma: 'σ=0.82', icon: Smile },
  { id: 'anomalia', label: '04 ANOMALÍA', matrix: '[2,2,2] [2,2,4]', sigma: 'σ=0.75', icon: ShieldAlert },
  { id: 'durmiendo', label: '05 DURMIENDO', matrix: '[1,1,1] [1,1,1]', sigma: 'σ=0.00', icon: Moon },
];

const MATERIALS: { id: MioPetMaterial; label: string; spec: string; color: string }[] = [
  { id: 'violet', label: 'Violeta Anodizado', spec: 'Rug. 0.24 · F0 Violeta', color: '#7647eb' },
  { id: 'titanium', label: 'Titanio Satén', spec: 'Rug. 0.32 · F0 Neutro', color: '#8e8e9c' },
  { id: 'blackChrome', label: 'Cromo Negro', spec: 'Rug. 0.16 · F0 Oscuro', color: '#1a1924' },
];

export const TestPetPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const setTheme = useMioStore((s) => s.setTheme);
  const isDark = theme === 'dark';

  const [activeMood, setActiveMood] = useState<MioPetMood>('reposo');
  const [activeMaterial, setActiveMaterial] = useState<MioPetMaterial>('violet');
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewMode, setViewMode] = useState<'both' | '3d' | '2d'>('both');
  const [hoveredCardMood, setHoveredCardMood] = useState<MioPetMood | null>(null);
  const [engineMode, setEngineMode] = useState<'gpu_raymarcher' | 'three' | 'lamina_png'>('gpu_raymarcher');
  const [liveStats, setLiveStats] = useState<{ fps: number; resolution: string; eyes: string; sigma: string }>({
    fps: 60,
    resolution: '780×890',
    eyes: '[2,3,2] [2,3,2]',
    sigma: '0.47',
  });

  const getRaymarcherImg = (mood: MioPetMood, mat: MioPetMaterial) => {
    const moodKey = mood === 'reposo' ? 'idle' : mood === 'trabajando' ? 'working' : mood === 'celebrando' ? 'celebrating' : mood === 'anomalia' ? 'anomaly' : 'sleeping';
    if (mat === 'titanium') return `/renders/mio_idle_titanio.png`;
    if (mat === 'blackChrome') return `/renders/mio_idle_obsidiana.png`;
    return `/renders/mio_${moodKey}_violet.png`;
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const currentMoodObj = MOODS.find((m) => m.id === activeMood) || MOODS[0];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#07070a] text-zinc-100' : 'bg-[#f6f6f2] text-zinc-950'}`}>
      
      {/* 1. TOP TECHNICAL HEADER BAR */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-[#07070a]/80 border-b border-zinc-200 dark:border-white/10 h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all duration-200 active:scale-[0.97] cursor-pointer ${
              isDark
                ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                : 'border-zinc-300 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Landing</span>
          </button>

          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-zinc-950 dark:text-white">
              MIO // ESPÉCIMEN 01 LAB
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
            <span className="text-[10px] text-zinc-500 font-semibold hidden md:inline">
              LÁMINA I-IV TAXONOMÍA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => navigateTo('/dashboard')}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border cursor-pointer ${
              isDark
                ? 'bg-[#7647eb]/20 text-[#a78bfa] border-[#7647eb]/30 hover:bg-[#7647eb]/30'
                : 'bg-[#7647eb]/10 text-[#602cd1] border-[#7647eb]/30 hover:bg-[#7647eb]/20 shadow-sm'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Ir a Dashboard</span>
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-[0.95] cursor-pointer ${
              isDark
                ? 'border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                : 'border-zinc-300 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 shadow-sm'
            }`}
            aria-label="Cambiar tema"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

        {/* Section Eyebrow Title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono tracking-tight bg-[#7647eb]/10 text-[#7647eb] dark:text-[#a78bfa] border border-[#7647eb]/20 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559]" />
              <span>SISTEMA DE MASCOTA & STICKER PROCEDURAL</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-sans tracking-tight">
              MIO Espécimen 01: Taxonomía de Datos
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl font-normal leading-relaxed">
              Un espécimen robótico construido a partir de la cuadrícula que lo mide. Los ojos no son ojos: son histogramas de frecuencias que cambian según el estado matemático del motor AutoML.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-zinc-200/80 dark:bg-white/[0.06] rounded-md border border-zinc-300 dark:border-white/10 shrink-0">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm transition-all cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-white dark:bg-[#0e0c19] text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950'
              }`}
            >
              2D + 3D
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm transition-all cursor-pointer ${
                viewMode === '3d'
                  ? 'bg-white dark:bg-[#0e0c19] text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950'
              }`}
            >
              Solo 3D
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-sm transition-all cursor-pointer ${
                viewMode === '2d'
                  ? 'bg-white dark:bg-[#0e0c19] text-zinc-950 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950'
              }`}
            >
              Solo 2D
            </button>
          </div>
        </div>

        {/* 3. HERO INTERACTIVE LAB BENCH (3D + 2D DUAL VIEW) */}
        {(viewMode === 'both' || viewMode === '3d') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-zinc-200 dark:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08]">
            
            {/* LEFT / CENTER: The Live 3D Interactive Stage */}
            <div className={`${viewMode === '3d' ? 'lg:col-span-8' : 'lg:col-span-7'} p-6 sm:p-10 bg-white dark:bg-[#0e0c19] flex flex-col justify-between relative overflow-hidden min-h-[440px] sm:min-h-[520px]`}>
              
              {/* Stage Top Legend & Engine Mode Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 z-10">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#bdf559]" />
                  <span className="font-bold tracking-wider text-zinc-700 dark:text-zinc-300">
                    {engineMode === 'gpu_raymarcher'
                      ? 'GPU RAYMARCHER SDF // TIEMPO REAL 60FPS'
                      : engineMode === 'three'
                      ? 'STAGE 3D THREE.JS // BLENDER GLB + HDR'
                      : 'LÁMINA 1:1 // RENDER ORIGINAL SUPERSAMPLED'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Engine Toggle Pill */}
                  <div className="flex items-center p-0.5 bg-zinc-100 dark:bg-white/5 rounded-md border border-zinc-300 dark:border-white/10 text-[11px] font-mono">
                    <button
                      onClick={() => setEngineMode('gpu_raymarcher')}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        engineMode === 'gpu_raymarcher'
                          ? 'bg-[#7647eb] text-white font-bold shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Raymarcher SDF en tiempo real sobre WebGL2 con shaders nativos"
                    >
                      ⚡ GPU Shaders
                    </button>
                    <button
                      onClick={() => setEngineMode('three')}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        engineMode === 'three'
                          ? 'bg-[#7647eb] text-white font-bold shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="WebGL Three.js con modelos .glb y mapa de entorno HDR"
                    >
                      Three.js 3D
                    </button>
                    <button
                      onClick={() => setEngineMode('lamina_png')}
                      className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                        engineMode === 'lamina_png'
                          ? 'bg-[#7647eb] text-white font-bold shadow-sm'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Render exacto de la lámina (99.5% match píxel por píxel)"
                    >
                      Lámina 1:1
                    </button>
                  </div>

                  {engineMode !== 'lamina_png' && (
                    <button
                      onClick={() => setAutoRotate(!autoRotate)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-md border transition-all cursor-pointer ${
                        autoRotate
                          ? 'bg-[#7647eb]/20 text-[#7647eb] dark:text-[#a78bfa] border-[#7647eb]/30 font-bold'
                          : 'border-zinc-300 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <RotateCw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
                      <span>Auto-rotar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport: GPU Raymarcher, Three.js 3D, or Exact PNG */}
              <div className="w-full h-[320px] sm:h-[400px] flex items-center justify-center relative my-2 bg-[#f6f6f2] rounded-md overflow-hidden">
                {engineMode === 'gpu_raymarcher' ? (
                  <MioRaymarcherCanvas
                    mood={activeMood}
                    material={activeMaterial}
                    autoRotate={autoRotate}
                    interactive={true}
                    onStats={(s) => setLiveStats(s)}
                  />
                ) : engineMode === 'three' ? (
                  <MioPet3D
                    mood={activeMood}
                    material={activeMaterial}
                    modelSource="glb"
                    autoRotate={autoRotate}
                    interactive={true}
                    floatAnimation={true}
                  />
                ) : (
                  <img
                    src={getRaymarcherImg(activeMood, activeMaterial)}
                    alt={`Mio ${activeMood} ${activeMaterial}`}
                    className="max-h-full max-w-full object-contain filter select-none transition-opacity duration-200"
                  />
                )}
              </div>

              {/* Stage Bottom Instruction */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 z-10 border-t border-zinc-200 dark:border-white/10 pt-3">
                <div className="flex items-center gap-2">
                  <span>
                    {engineMode === 'gpu_raymarcher'
                      ? 'WebGL2 SDF Shaders · Arrastrá para orbitar · Rueda para zoom'
                      : engineMode === 'three'
                      ? 'Three.js · Blender GLB + HDR mio_env_three · 360°'
                      : 'Render original SDF supersampling ×2 (mio3d.py) · 99.5% match'}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">|</span>
                  <span className="text-[#7647eb] dark:text-[#a78bfa] font-bold">
                    {engineMode === 'gpu_raymarcher'
                      ? `${liveStats.fps} FPS · ${liveStats.resolution}`
                      : engineMode === 'three'
                      ? 'PBR Studio Rig'
                      : 'Lámina Original'}
                  </span>
                </div>
                <span className="text-emerald-700 dark:text-[#bdf559] font-bold">
                  {engineMode === 'gpu_raymarcher' ? 'WEBGL2 GPU RAYMARCHER' : engineMode === 'three' ? 'THREE.JS · ACES FILMIC' : 'RAYMARCHER 1:1'}
                </span>
              </div>
            </div>

            {/* RIGHT: Calibration & Telemetry Controls */}
            <div className={`${viewMode === '3d' ? 'lg:col-span-4' : 'lg:col-span-5'} p-6 sm:p-8 bg-zinc-50 dark:bg-[#07070a] flex flex-col justify-between space-y-6`}>
              
              {/* A. State / Mood Selector */}
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
                  ESTADOS DE ANÁLISIS (OJOS = HISTOGRAMA)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    const isActive = activeMood === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setActiveMood(m.id)}
                        className={`p-3 text-left border rounded-md transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-[#0e0c19] border-[#7647eb] shadow-sm ring-1 ring-[#7647eb]/30'
                            : 'bg-white/60 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-sm ${isActive ? 'bg-[#7647eb] text-white' : 'bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400'}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="text-xs font-bold font-mono text-zinc-950 dark:text-white">
                              {m.label}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                              {m.matrix}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                          m.id === 'anomalia'
                            ? 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400'
                            : 'bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {m.sigma}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* B. Material Specimen Selector */}
              <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-white/10">
                <div className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
                  MATERIAL DEL CHASIS (LÁMINA III)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {MATERIALS.map((mat) => {
                    const isActive = activeMaterial === mat.id;
                    return (
                      <button
                        key={mat.id}
                        onClick={() => setActiveMaterial(mat.id)}
                        className={`p-2.5 text-center border rounded-md transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-white dark:bg-[#0e0c19] border-[#7647eb] shadow-sm ring-1 ring-[#7647eb]/30'
                            : 'bg-white/60 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 hover:border-zinc-300'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded-full border border-black/30 shadow-sm"
                          style={{ backgroundColor: mat.color }}
                        />
                        <span className="text-[11px] font-bold font-mono leading-tight text-zinc-950 dark:text-white">
                          {mat.label.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* C. Live Telemetry Readout */}
              <div className="p-3.5 bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 rounded-md font-mono text-[11px] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">ESTADO ACTIVO:</span>
                  <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">{currentMoodObj.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">VECTOR DE OJOS:</span>
                  <span className="font-bold text-emerald-700 dark:text-[#bdf559]">{currentMoodObj.matrix}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">DESVIACIÓN ESTÁNDAR:</span>
                  <span className="font-bold text-zinc-950 dark:text-white">{currentMoodObj.sigma}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">CHASIS ACABADO:</span>
                  <span className="font-bold text-zinc-950 dark:text-white">
                    {MATERIALS.find((m) => m.id === activeMaterial)?.spec}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-200/60 dark:border-white/5 pt-1.5 mt-1.5">
                  <span className="text-zinc-500">ARCHIVO 3D:</span>
                  <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">
                    mio_{activeMood}.glb (Blender PBR)
                  </span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 4. LÁMINA II: ESTADOS COMPARATIVOS 2D (PIXEL TAXONOMY) */}
        {(viewMode === 'both' || viewMode === '2d') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] tracking-wider">
                  LÁMINA II — TAXONOMÍA VECTORIAL (ANIMADA)
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Los 5 Estados del Espécimen (2D SVG Puro)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[11px] font-mono bg-zinc-200 dark:bg-white/10 px-2 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  ⚡ Pasá el mouse sobre cada tarjeta para animar
                </span>
                <span className="text-xs font-mono text-zinc-500">GRILLA 15×19u</span>
              </div>
            </div>

            {/* 5-Column Monolithic Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-zinc-200 dark:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08]">
              {MOODS.map((m) => {
                const isSelected = activeMood === m.id;
                const isCardHovered = hoveredCardMood === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setActiveMood(m.id)}
                    onMouseEnter={() => setHoveredCardMood(m.id)}
                    onMouseLeave={() => setHoveredCardMood(null)}
                    className={`p-6 bg-white dark:bg-[#0e0c19] flex flex-col items-center justify-between text-center transition-all cursor-pointer relative group ${
                      isSelected ? 'ring-2 ring-[#7647eb] relative z-10' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-500 mb-2">
                      <span>{m.label.split(' ')[0]}</span>
                      {isCardHovered ? (
                        <span className="text-emerald-600 dark:text-[#bdf559] font-bold animate-pulse">● ACTIVO</span>
                      ) : (
                        <span className="text-zinc-400 opacity-60">HOVER</span>
                      )}
                    </div>

                    <div className="py-4">
                      <MioPet2D
                        mood={m.id}
                        material={activeMaterial}
                        size={110}
                        showShadow={true}
                        isHovered={isCardHovered}
                      />
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="text-xs font-bold font-mono text-zinc-950 dark:text-white">
                        {m.label.split(' ')[1]}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        {m.matrix}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 dark:text-[#bdf559] font-bold">
                        n=6 · {m.sigma}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4B. LÁMINA GLB: COMPARATIVA 3D EN TIEMPO REAL (LOS 5 MODELOS BLENDER) */}
        {(viewMode === 'both' || viewMode === '3d') && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] tracking-wider">
                  LÁMINA BLENDER 3D — RENDER EN VIVO DE TUS 5 ARCHIVOS GLB
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Inspección 3D Simultánea de los 5 Modelos
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-zinc-200 dark:bg-white/10 px-2.5 py-1 rounded text-zinc-700 dark:text-zinc-300">
                  📁 5 Modelos .glb cargados · Arrastrá para rotar 360°
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px bg-zinc-200 dark:bg-white/[0.08] border border-zinc-200 dark:border-white/[0.08]">
              {MOODS.map((m) => {
                const isSelected = activeMood === m.id;
                return (
                  <div
                    key={`glb-card-${m.id}`}
                    onClick={() => setActiveMood(m.id)}
                    className={`p-4 bg-white dark:bg-[#0e0c19] flex flex-col items-center justify-between text-center transition-all cursor-pointer relative group ${
                      isSelected ? 'ring-2 ring-[#7647eb] relative z-10' : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full text-[10px] font-mono text-zinc-500 mb-1">
                      <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">{m.label.split(' ')[0]}</span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-zinc-100 dark:bg-white/10 text-[9px] font-mono text-zinc-600 dark:text-zinc-300 font-semibold">
                        mio_{m.id}.glb
                      </span>
                    </div>

                    <div className="w-full h-[180px] relative my-1">
                      <MioPet3D
                        mood={m.id}
                        material={activeMaterial}
                        modelSource="glb"
                        autoRotate={isSelected || autoRotate}
                        interactive={true}
                        floatAnimation={true}
                      />
                    </div>

                    <div className="space-y-1 mt-2 w-full pt-2 border-t border-zinc-100 dark:border-white/5">
                      <div className="text-xs font-bold font-mono text-zinc-950 dark:text-white">
                        {m.label.split(' ')[1]}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-700 dark:text-[#bdf559] font-bold">
                        {m.matrix} · {m.sigma}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-400">
                        PBR Studio Softbox
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. LÁMINA III: ESCALAS DE RESOLUCIÓN (SURVIVAL TEST) */}
        <div className="p-6 sm:p-8 bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
            <div>
              <span className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa] tracking-wider">
                LÁMINA III — ESCALA DE RESOLUCIÓN
              </span>
              <h3 className="text-lg font-bold tracking-tight">
                Prueba de Supervivencia Vectorial
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">30px → 180px</span>
          </div>

          <p className="text-xs font-mono text-zinc-500">
            La forma debe sobrevivir idéntica desde un favicon hasta un póster sin perder un solo rasgo.
          </p>

          <div className="flex flex-wrap items-end justify-between gap-6 pt-4">
            <div className="flex flex-col items-center gap-2">
              <MioPet2D mood={activeMood} material={activeMaterial} size={30} showShadow={false} />
              <span className="text-[10px] font-mono text-zinc-500">30px (Favicon)</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <MioPet2D mood={activeMood} material={activeMaterial} size={45} showShadow={false} />
              <span className="text-[10px] font-mono text-zinc-500">45px (Badge)</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <MioPet2D mood={activeMood} material={activeMaterial} size={75} showShadow={true} />
              <span className="text-[10px] font-mono text-zinc-500">75px (Widget)</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <MioPet2D mood={activeMood} material={activeMaterial} size={120} showShadow={true} />
              <span className="text-[10px] font-mono text-zinc-500">120px (Empty State)</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <MioPet2D mood={activeMood} material={activeMaterial} size={180} showShadow={true} />
              <span className="text-[10px] font-mono text-zinc-500">180px (Hero Sticker)</span>
            </div>
          </div>
        </div>

        {/* 6. LÁMINA IV: SISTEMA DE COLOR & REGLAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 space-y-3">
            <div className="text-xs font-mono font-bold text-[#7647eb] dark:text-[#a78bfa]">
              PALETA RESTRINGIDA
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
              <div className="space-y-1">
                <div className="h-10 bg-[#7647eb] rounded-sm border border-black/20" />
                <div className="font-bold">VIOLETA</div>
                <div className="text-zinc-500">#7647EB</div>
              </div>
              <div className="space-y-1">
                <div className="h-10 bg-[#bdf559] rounded-sm border border-black/20" />
                <div className="font-bold text-zinc-950 dark:text-white">LIMA</div>
                <div className="text-zinc-500">#BDF559</div>
              </div>
              <div className="space-y-1">
                <div className="h-10 bg-[#0e0c19] rounded-sm border border-white/20" />
                <div className="font-bold">OBSIDIANA</div>
                <div className="text-zinc-500">#0E0C19</div>
              </div>
              <div className="space-y-1">
                <div className="h-10 bg-[#f6f6f2] rounded-sm border border-zinc-300" />
                <div className="font-bold text-zinc-950 dark:text-white">CREMA</div>
                <div className="text-zinc-500">#F6F6F2</div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 space-y-3 font-mono text-xs">
            <div className="font-bold text-[#7647eb] dark:text-[#a78bfa]">
              PARÁMETROS DEL HARDWARE
            </div>
            <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between border-b border-zinc-200 dark:border-white/[0.06] pb-1">
                <span>RADIO DE ESQUINAS:</span>
                <span className="font-bold text-zinc-950 dark:text-white">0 (Escalón angular estricto)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 dark:border-white/[0.06] pb-1">
                <span>BISEL 3D:</span>
                <span className="font-bold text-zinc-950 dark:text-white">0.28u con chamfer reflectivo</span>
              </div>
              <div className="flex justify-between border-b border-zinc-200 dark:border-white/[0.06] pb-1">
                <span>CONTOUR INK:</span>
                <span className="font-bold text-zinc-950 dark:text-white">1/2u #07050E</span>
              </div>
              <div className="flex justify-between">
                <span>OFFSET SOMBRA:</span>
                <span className="font-bold text-zinc-950 dark:text-white">1u - 1u duro</span>
              </div>
            </div>
          </div>
        </div>

      </main>

    </div>
  );
};

export default TestPetPage;
