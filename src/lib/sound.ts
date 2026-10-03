// src/lib/sound.ts
// Motor de síntesis de audio Web Audio API para hardware MIO (100% nativo, 0 dependencias)
// Acústica física de alta fidelidad: sub-graves de acoplamiento, clics de relé, micro-ratchets y barridos láser
// Calibrado con nodo de ganancia maestro al ~35% para feedback táctil sutil y discreto

let sharedAudioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;

// Nivel maestro por defecto: 22% del nivel original (feedback táctil ultra sutil, nunca invasivo)
export const DEFAULT_MASTER_VOLUME = 0.22;
let currentMasterVolume = DEFAULT_MASTER_VOLUME;

// Check if device is mobile or touch-primary
const isMobileOrCoarse = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
};

// Auto-silence on mobile by default or recover from localStorage
let isSoundMuted = (() => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('mio_sound_muted');
  if (stored !== null) return stored === 'true';
  return isMobileOrCoarse();
})();

type MuteListener = (muted: boolean) => void;
const muteListeners = new Set<MuteListener>();

export function subscribeMuteState(listener: MuteListener): () => void {
  muteListeners.add(listener);
  return () => {
    muteListeners.delete(listener);
  };
}

export function getIsSoundMuted(): boolean {
  return isSoundMuted;
}

export function toggleSoundMute(): boolean {
  isSoundMuted = !isSoundMuted;
  if (typeof window !== 'undefined') {
    localStorage.setItem('mio_sound_muted', String(isSoundMuted));
  }
  if (masterGainNode && sharedAudioCtx) {
    masterGainNode.gain.setValueAtTime(
      isSoundMuted ? 0 : currentMasterVolume,
      sharedAudioCtx.currentTime
    );
  }
  muteListeners.forEach((l) => l(isSoundMuted));
  return isSoundMuted;
}

export function setSoundMuted(muted: boolean) {
  isSoundMuted = muted;
  if (masterGainNode && sharedAudioCtx) {
    masterGainNode.gain.setValueAtTime(
      isSoundMuted ? 0 : currentMasterVolume,
      sharedAudioCtx.currentTime
    );
  }
  muteListeners.forEach((l) => l(isSoundMuted));
}

export function setMasterVolume(volume: number) {
  currentMasterVolume = Math.max(0, Math.min(1, volume));
  if (masterGainNode && sharedAudioCtx && !isSoundMuted) {
    masterGainNode.gain.setValueAtTime(currentMasterVolume, sharedAudioCtx.currentTime);
  }
}

export function getMasterVolume(): number {
  return currentMasterVolume;
}

function unlockAudioBuffer(ctx: AudioContext) {
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {}
}

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
      masterGainNode = null;
    }

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
  } catch (err) {
    console.warn('[MIO Sound] Web Audio initialization notice:', err);
    return null;
  }
}

function getMasterGain(ctx: AudioContext): GainNode {
  if (!masterGainNode || masterGainNode.context !== ctx) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.setValueAtTime(
      isSoundMuted ? 0 : currentMasterVolume,
      ctx.currentTime
    );
    masterGainNode.connect(ctx.destination);
  }
  return masterGainNode;
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        unlockAudioBuffer(ctx);
      }
    } catch {}
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('click', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true, capture: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, capture: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, capture: true });
  window.addEventListener('click', unlockAudio, { passive: true, capture: true });
}

export type MioDevSoundType =
  | 'buttonA'
  | 'buttonB'
  | 'dpad'
  | 'start'
  | 'select'
  | 'toggle'
  | 'jogDial'
  | 'dockThud'
  | 'phosphorHum'
  | 'tick'
  | 'shockwave'
  | 'targetLock'
  | 'whoosh'
  | 'mechanicalClick';

export function playMioDevSound(type: MioDevSoundType) {
  if (isSoundMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  try {
    const now = ctx.currentTime;
    const master = getMasterGain(ctx);

    if (type === 'buttonA') {
      // Clic agudo, nítido y enérgico (Botón A - MIO Lime)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.exponentialRampToValueAtTime(1020, now + 0.04);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === 'buttonB') {
      // Clic grave analógico (Botón B - Dark Graphite)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.065);
    } else if (type === 'dpad') {
      // Micro-clic de contacto de cruceta direccional
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.03);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'jogDial') {
      // Ratchet mecánico ultra-fino de rueda de aluminio
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.018);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.025);
    } else if (type === 'dockThud') {
      // Golpe cinemático de impacto de acoplamiento magnético (Sub-bass 55Hz + chasquido de pinza)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.22);
      subGain.gain.setValueAtTime(0.45, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start(now);
      subOsc.stop(now + 0.3);

      // Clic metálico de cerrojo
      const latch = ctx.createOscillator();
      const latchGain = ctx.createGain();
      latch.type = 'triangle';
      latch.frequency.setValueAtTime(840, now);
      latch.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      latchGain.gain.setValueAtTime(0.30, now);
      latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      latch.connect(latchGain);
      latchGain.connect(master);
      latch.start(now);
      latch.stop(now + 0.075);
    } else if (type === 'phosphorHum') {
      // Destello de fósforo de encendido OLED
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'start') {
      // Chirp electrónico ascendente de inicialización AutoML
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.12);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.135);
    } else if (type === 'select') {
      // Pulso suave de alternancia de horizonte temporal
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === 'toggle') {
      // Chasquido mecánico de interruptor deslizante
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.045);
      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (type === 'tick') {
      // Micro-tick de instrumentación de telemetría (alta frecuencia sutil)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.015);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.02);
    } else if (type === 'shockwave') {
      // Pulso resonante expansivo de convergencia neuronal (Sub-grave y anillo armónico)
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.4);
      subGain.gain.setValueAtTime(0.42, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      sub.connect(subGain);
      subGain.connect(master);
      sub.start(now);
      sub.stop(now + 0.45);

      const chime = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chime.type = 'triangle';
      chime.frequency.setValueAtTime(880, now);
      chime.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      chimeGain.gain.setValueAtTime(0.18, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      chime.connect(chimeGain);
      chimeGain.connect(master);
      chime.start(now);
      chime.stop(now + 0.3);
    } else if (type === 'targetLock') {
      // Micro-chirp sutil al enganchar objetivo con la mira del cursor (880Hz -> 1320Hz en 22ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.022);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.028);
    } else if (type === 'whoosh') {
      // Barrido de ruido blanco filtrado paso-bajo para cortina dither de transición
      const bufferSize = ctx.sampleRate * 0.16; // 160ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(300, now + 0.16);
      filter.Q.setValueAtTime(2.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      noise.start(now);
      noise.stop(now + 0.17);
    } else if (type === 'mechanicalClick') {
      // Clic seco con notch filter para sensación de micro-switch mecánico
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.028);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 0.035);
    }
  } catch (e) {
    console.warn('[MIO Sound] Error playing sound:', e);
  }
}
