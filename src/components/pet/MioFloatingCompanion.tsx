import React, { useState, useEffect, useRef } from 'react';
import { MioPet3D } from './MioPet3D';
import { MioPet2D, MioPetMood, MioPetMaterial } from './MioPet2D';
import { playMioDevSound } from '@/lib/sound';
import { X, Sparkles, ArrowRight, Volume2, RotateCw } from 'lucide-react';

interface PhraseData {
  title: string;
  tag: string;
  color: string;
  messages: string[];
}

const MOOD_DIALOGUES: Record<MioPetMood, PhraseData> = {
  reposo: {
    title: 'MIO Espécimen 01 • Reposo',
    tag: '🟢 STANDBY READY',
    color: '#bdf559',
    messages: [
      '¡Hola! Soy MIO, tu copiloto de Machine Learning. Haceme clic para verme en acción y cambiar mi estado.',
      'Sistemas de telemetría al 100%. Listo para cuando quieras cargar un dataset o consultar correlaciones.',
      'Monitoreando pipelines en segundo plano. Cero anomalías por el momento, todo en orden.'
    ],
  },
  trabajando: {
    title: 'MIO • Entrenando Modelos',
    tag: '⚡ SCANNING & FIT',
    color: '#60a5fa',
    messages: [
      '¡Procesando filas por segundo! Optimizando hiperparámetros con XGBoost, Random Forest y Regresión.',
      'Calculando feature importances y valores SHAP... buscando la menor pérdida cuadrática media (RMSE).',
      'Entrenando red neuronal con regularización L2. Convergencia de gradiente estimada al 96%.'
    ],
  },
  celebrando: {
    title: 'MIO • ¡Insight Hallado!',
    tag: '🎉 98.4% ACCURACY',
    color: '#fbbf24',
    messages: [
      '¡BOOM! Encontré una reducción de costos del 24% y precisión R² de 0.98. ¡Decime si no somos un equipazo!',
      '¡Modelo convergido con éxito rotundo! Sin overfitting y con predicciones hiper precisas. ¡A festejar!',
      '¡Patrón de alta conversión detectado! Ya tenés insights listos para accionar en tus tableros.'
    ],
  },
  anomalia: {
    title: 'MIO • Alerta de Desvío',
    tag: '⚠️ OUTLIER SPIKE ±3σ',
    color: '#f43f5e',
    messages: [
      '¡Ojo al piojo! Detecté 42 valores atípicos severos en el cuartil Q3. Vale la pena revisar la correlación.',
      '¡Spike imprevisto en la serie temporal! Puede ser una falla de sensor o un comportamiento de compra inusual.',
      'Alerta de dispersión: detecté varianza extrema en la variable objetivo. ¡Revisalo en el dashboard!'
    ],
  },
  durmiendo: {
    title: 'MIO • Modo Standby',
    tag: '🌙 MODO AHORRO',
    color: '#a78bfa',
    messages: [
      'Zzz... modo ahorro de energía cuántico activado. Ahorrando ciclos de GPU para el próximo entrenamiento.',
      'Zzz... soñando con datasets limpios y sin valores nulos... Tocame para despertarme.',
      'En reposo profundo. ¡Haceme clic de nuevo para reactivar los núcleos de inferencia!'
    ],
  },
};

const MOOD_SEQUENCE: MioPetMood[] = ['reposo', 'trabajando', 'celebrando', 'anomalia', 'durmiendo'];
const MATERIAL_SEQUENCE: MioPetMaterial[] = ['violet', 'titanium', 'blackChrome'];

export const MioFloatingCompanion: React.FC = () => {
  const [mood, setMood] = useState<MioPetMood>('reposo');
  const [material, setMaterial] = useState<MioPetMaterial>('violet');
  const [messageIndex, setMessageIndex] = useState(0);
  const [isBubbleOpen, setIsBubbleOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-close bubble after 10s if user hasn't interacted yet
  useEffect(() => {
    if (!hasInteracted) {
      bubbleTimeoutRef.current = setTimeout(() => {
        setIsBubbleOpen(false);
      }, 10000);
    }
    return () => {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, [hasInteracted]);

  const cycleMood = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHasInteracted(true);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);

    playMioDevSound('buttonA');

    const currentIndex = MOOD_SEQUENCE.indexOf(mood);
    const nextMood = MOOD_SEQUENCE[(currentIndex + 1) % MOOD_SEQUENCE.length];
    const nextPhraseIdx = Math.floor(Math.random() * MOOD_DIALOGUES[nextMood].messages.length);

    setMood(nextMood);
    setMessageIndex(nextPhraseIdx);
    setIsBubbleOpen(true);
  };

  const cycleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    playMioDevSound('toggle');
    const currentIndex = MATERIAL_SEQUENCE.indexOf(material);
    const nextMaterial = MATERIAL_SEQUENCE[(currentIndex + 1) % MATERIAL_SEQUENCE.length];
    setMaterial(nextMaterial);
  };

  const handleSelectMood = (m: MioPetMood, e: React.MouseEvent) => {
    e.stopPropagation();
    playMioDevSound('select');
    setHasInteracted(true);
    setMood(m);
    setMessageIndex(Math.floor(Math.random() * MOOD_DIALOGUES[m].messages.length));
    setIsBubbleOpen(true);
  };

  const navigateToDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    playMioDevSound('shockwave');
    window.location.href = '/dashboard';
  };

  const currentDialogue = MOOD_DIALOGUES[mood];
  const activeMessage = currentDialogue.messages[messageIndex % currentDialogue.messages.length];

  if (isMinimized) {
    return (
      <aside aria-label="MIO Companion" className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            playMioDevSound('select');
            setIsMinimized(false);
            setIsBubbleOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0e0c19]/90 border border-white/20 text-white shadow-2xl backdrop-blur-xl hover:scale-105 transition-all text-xs font-mono group cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#bdf559] animate-pulse" />
          <span className="font-semibold text-zinc-200 group-hover:text-white">Despertar a MIO 3D</span>
        </button>
      </aside>
    );
  }

  return (
    <aside aria-label="MIO Companion" className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      {/* Speech Bubble */}
      {isBubbleOpen && (
        <div className="relative mb-3 w-[330px] max-w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="relative rounded-2xl bg-[#0e0c19]/95 border border-white/15 p-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            {/* Header: Title + Tag + Close */}
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentDialogue.color, boxShadow: `0 0 8px ${currentDialogue.color}` }}
                />
                <h4 className="text-xs font-bold font-mono tracking-tight text-white">{currentDialogue.title}</h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={cycleMaterial}
                  title="Cambiar acabado de material"
                  className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsBubbleOpen(false)}
                  title="Cerrar mensaje"
                  className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Speech Content */}
            <p className="text-xs text-zinc-200 leading-relaxed font-sans min-h-[38px]">
              "{activeMessage}"
            </p>

            {/* Mood selector pills */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase tracking-wider text-[9px]">Modos:</span>
              <div className="flex items-center gap-1">
                {(['reposo', 'trabajando', 'celebrando', 'anomalia'] as MioPetMood[]).map((m) => (
                  <button
                    key={m}
                    onClick={(e) => handleSelectMood(m, e)}
                    className={`px-2 py-0.5 rounded-full transition-all cursor-pointer capitalize ${
                      mood === m
                        ? 'bg-[#7647eb] text-white font-bold shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {m === 'trabajando' ? 'IA' : m === 'celebrando' ? 'Win' : m === 'anomalia' ? 'Spike' : 'Idl'}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={cycleMood}
                className="flex-1 py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#bdf559]" />
                <span>Siguiente estado</span>
              </button>
              <button
                onClick={navigateToDashboard}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#7647eb] to-[#5b2ec9] hover:brightness-110 text-white text-[11px] font-sans font-semibold transition-all flex items-center gap-1 shadow-md cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Bubble Tail */}
            <div className="absolute -bottom-2 right-10 w-4 h-4 bg-[#0e0c19] border-r border-b border-white/15 rotate-45" />
          </div>
        </div>
      )}

      {/* 3D Pet Dock Container */}
      <div className="relative group">
        {/* Glowing halo ring */}
        <div
          className="absolute -inset-1 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"
          style={{ backgroundColor: currentDialogue.color }}
        />

        {/* Double-bezel Outer Container */}
        <div
          onClick={cycleMood}
          title="¡Hacé clic en MIO para interactuar!"
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-br from-white/20 via-[#7647eb]/30 to-[#bdf559]/20 border border-white/25 shadow-2xl backdrop-blur-xl cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          {/* Inner 3D Canvas Box */}
          <div className="w-full h-full rounded-full overflow-hidden bg-[#0d0c18] relative flex items-center justify-center">
            {/* Ambient instant fallback so it is never an empty void */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <MioPet2D mood={mood} material={material} size={88} showShadow={false} />
            </div>

            <MioPet3D
              mood={mood}
              material={material}
              showFloor={false}
              backgroundColor="transparent"
              cameraDistance={4.2}
              cameraTargetY={0.88}
              enableBloom={false}
              autoRotate={true}
              interactive={true}
              className="absolute inset-0 w-full h-full z-10"
            />

            {/* Subtle gloss highlight */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/10 pointer-events-none z-20" />
          </div>

          {/* Micro status badge on the rim */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#0e0c19] border border-white/20 text-[9px] font-mono tracking-wider text-zinc-300 flex items-center gap-1.5 shadow-md whitespace-nowrap z-30">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: currentDialogue.color }}
            />
            <span className="uppercase text-[8px] font-semibold">{mood}</span>
          </div>

          {/* Click me hint badge (only before first interaction) */}
          {!hasInteracted && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#bdf559] text-black text-[9px] font-bold tracking-tight shadow-lg whitespace-nowrap animate-bounce">
              ¡Tocame!
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
