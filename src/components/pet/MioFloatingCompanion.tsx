import React, { useState, useEffect, useRef } from 'react';
import { MioPet3D } from './MioPet3D';
import { MioPet2D, MioPetMood, MioPetMaterial } from './MioPet2D';
import { playMioDevSound } from '@/lib/sound';
import { X, Sparkles, ArrowRight, RotateCw } from 'lucide-react';
import { useActiveSection } from '@/hooks/useActiveSection';
import { SECTION_BY_ID } from '@/lib/landingSections';
import { onGuide } from '@/lib/guide';

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
  // The hero already stages MIO Espécimen 01; hide this floating copy while the hero is in view.
  const [heroInView, setHeroInView] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    if (!hero || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setHeroInView(entry.intersectionRatio > 0.35), {
      threshold: [0, 0.35, 0.6, 1],
    });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const showBubbleTemporarily = (duration = 5000) => {
    setIsBubbleOpen(true);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => {
      setIsBubbleOpen(false);
    }, duration);
  };

  // Section guide: when a new section takes over the viewport, MIO changes mood and says one line,
  // unless the visitor played with the pet in the last 8 s or closed the bubble (then it only changes mood).
  const activeSection = useActiveSection();
  const [guideLine, setGuideLine] = useState<string | null>(null);
  const manualAtRef = useRef(0);
  const dismissedRef = useRef(false);

  useEffect(() => {
    const guide = SECTION_BY_ID[activeSection]?.guide;
    if (!guide) return;
    if (Date.now() - manualAtRef.current < 8000) return;
    setMood(guide.mood);
    setGuideLine(guide.line);
    if (!dismissedRef.current) showBubbleTemporarily(6500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Initial welcome bubble: shows for 5s then fades away
  useEffect(() => {
    showBubbleTemporarily(5000);
    return () => {
      if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    };
  }, []);

  const cycleMood = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setHasInteracted(true);
    manualAtRef.current = Date.now();
    setGuideLine(null);
    playMioDevSound('buttonA');

    const currentIndex = MOOD_SEQUENCE.indexOf(mood);
    const nextMood = MOOD_SEQUENCE[(currentIndex + 1) % MOOD_SEQUENCE.length];
    const nextPhraseIdx = Math.floor(Math.random() * MOOD_DIALOGUES[nextMood].messages.length);

    setMood(nextMood);
    setMessageIndex(nextPhraseIdx);
    showBubbleTemporarily(5500);
  };

  const cycleMaterial = (e: React.MouseEvent) => {
    e.stopPropagation();
    playMioDevSound('toggle');
    const currentIndex = MATERIAL_SEQUENCE.indexOf(material);
    const nextMaterial = MATERIAL_SEQUENCE[(currentIndex + 1) % MATERIAL_SEQUENCE.length];
    setMaterial(nextMaterial);
    showBubbleTemporarily(4000);
  };

  // Cues sent by individual sections (e.g. each phase of the method) follow the same politeness rules.
  useEffect(
    () =>
      onGuide((cue) => {
        if (Date.now() - manualAtRef.current < 8000) return;
        setMood(cue.mood);
        setGuideLine(cue.line);
        if (!dismissedRef.current) showBubbleTemporarily(6500);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSelectMood = (m: MioPetMood, e: React.MouseEvent) => {
    e.stopPropagation();
    playMioDevSound('select');
    setHasInteracted(true);
    manualAtRef.current = Date.now();
    setGuideLine(null);
    setMood(m);
    setMessageIndex(Math.floor(Math.random() * MOOD_DIALOGUES[m].messages.length));
    showBubbleTemporarily(5500);
  };

  const navigateToDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    playMioDevSound('shockwave');
    window.location.href = '/dashboard';
  };

  const currentDialogue = MOOD_DIALOGUES[mood];
  const activeMessage = guideLine ?? currentDialogue.messages[messageIndex % currentDialogue.messages.length];

  if (heroInView) return null;

  if (isMinimized) {
    return (
      <aside aria-label="MIO Companion" className="fixed bottom-6 right-6 z-50">
        <button
          type="button"
          onClick={() => {
            playMioDevSound('select');
            setIsMinimized(false);
            setIsBubbleOpen(true);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-none border-2 border-black dark:border-white/30 bg-[#bdf559] text-black text-xs font-mono font-bold uppercase tracking-wider shadow-[3px_3px_0_#7647eb] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_#7647eb] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#7647eb] transition-[transform,box-shadow] duration-150 cursor-pointer"
        >
          <span className="w-2 h-2 bg-black animate-pulse" />
          <span>Despertar a MIO</span>
        </button>
      </aside>
    );
  }

  const onDockKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cycleMood();
    }
  };

  return (
    <aside aria-label="MIO Companion" className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      {/* Speech panel: solid slab, hard offset shadow, no blur */}
      {isBubbleOpen && (
        <div
          onMouseEnter={() => {
            if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
          }}
          onMouseLeave={() => {
            showBubbleTemporarily(3500);
          }}
          className="relative mb-4 w-[330px] max-w-[calc(100vw-2.5rem)] animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
          <div className="relative rounded-none bg-[#0b0914] border-2 border-black dark:border-white/30 p-4 text-white shadow-[6px_6px_0_#7647eb]">
            <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-none" style={{ backgroundColor: currentDialogue.color }} />
                <h4 className="text-xs font-bold font-mono tracking-tight text-white">{currentDialogue.title}</h4>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cycleMaterial}
                  title="Cambiar acabado de material"
                  aria-label="Cambiar acabado de material"
                  className="p-1 rounded-none border border-white/20 text-zinc-400 hover:text-black hover:bg-[#bdf559] hover:border-[#bdf559] transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissedRef.current = true;
                    setIsBubbleOpen(false);
                  }}
                  title="Cerrar mensaje"
                  aria-label="Cerrar mensaje"
                  className="p-1 rounded-none border border-white/20 text-zinc-400 hover:text-black hover:bg-[#bdf559] hover:border-[#bdf559] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-200 leading-relaxed font-sans min-h-[38px]">{activeMessage}</p>

            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between gap-1 text-[10px] font-mono">
              <span className="text-zinc-400 uppercase tracking-wider text-[9px]">Modos</span>
              <div className="flex items-center gap-1">
                {(['reposo', 'trabajando', 'celebrando', 'anomalia'] as MioPetMood[]).map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={(e) => handleSelectMood(m, e)}
                    className={`px-2 py-0.5 rounded-none border transition-colors cursor-pointer uppercase ${
                      mood === m
                        ? 'bg-[#bdf559] text-black border-[#bdf559] font-bold'
                        : 'bg-transparent text-zinc-300 border-white/20 hover:border-[#bdf559] hover:text-white'
                    }`}
                  >
                    {m === 'trabajando' ? 'IA' : m === 'celebrando' ? 'Win' : m === 'anomalia' ? 'Spike' : 'Idle'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={cycleMood}
                className="flex-1 py-1.5 px-3 rounded-none border border-white/25 hover:border-[#bdf559] text-white text-[11px] font-mono font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#bdf559]" />
                <span>Siguiente estado</span>
              </button>
              <button
                type="button"
                onClick={navigateToDashboard}
                className="py-1.5 px-3 rounded-none border-2 border-black bg-[#bdf559] text-black text-[11px] font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0_#7647eb] hover:-translate-x-px hover:-translate-y-px active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-[transform,box-shadow] duration-150 flex items-center gap-1 cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Tail: a square notch, in keeping with the rest of the system */}
            <div className="absolute -bottom-[7px] right-12 w-3 h-3 bg-[#0b0914] border-r-2 border-b-2 border-black dark:border-white/30 rotate-45" />
          </div>
        </div>
      )}

      {/* Pet dock: a square terminal tile with a status strip and the live 3D pet inside */}
      <div
        role="button"
        tabIndex={0}
        onClick={cycleMood}
        onKeyDown={onDockKey}
        title="Hacé clic en MIO para cambiar su estado"
        aria-label={`MIO, estado ${mood}. Hacé clic para cambiarlo.`}
        className="relative w-32 sm:w-36 rounded-none border-2 border-black dark:border-white/30 bg-[#0b0914] shadow-[4px_4px_0_#bdf559] hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#bdf559] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#bdf559] transition-[transform,box-shadow] duration-150 cursor-pointer"
      >
        <div className="flex items-center justify-between px-2 py-1 border-b-2 border-black dark:border-white/30 bg-[#bdf559] text-black font-mono text-[9px] font-bold tracking-wider uppercase">
          <span>ESP-01</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-black animate-pulse" />
            {mood}
          </span>
        </div>

        <div className="relative h-28 sm:h-32 overflow-hidden bg-[#0b0914]">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
            <MioPet2D mood={mood} material={material} size={80} showShadow={false} />
          </div>
          <MioPet3D
            mood={mood}
            material={material}
            showFloor={false}
            backgroundColor="transparent"
            cameraDistance={6.2}
            cameraTargetY={0.72}
            cameraAzimuth={22}
            cameraElevation={10}
            enableBloom={false}
            autoRotate={true}
            interactive={true}
            className="absolute inset-0 w-full h-full z-10"
          />
        </div>

        {!hasInteracted && (
          <div className="absolute -top-3 -left-3 px-2 py-0.5 rounded-none border-2 border-black bg-white text-black text-[9px] font-mono font-bold uppercase tracking-wider shadow-[2px_2px_0_#7647eb] whitespace-nowrap">
            Tocame
          </div>
        )}
      </div>
    </aside>
  );
};
