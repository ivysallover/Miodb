import { create } from 'zustand';
import { playMioDevSound } from '@/lib/sound';

export type InteractiveButtonKey =
  | 'buttonA'
  | 'buttonB'
  | 'dpadUp'
  | 'dpadDown'
  | 'dpadLeft'
  | 'dpadRight'
  | 'dpadCenter'
  | 'switchPwr'
  | 'pillSelect'
  | 'pillStart'
  | 'jogDial';

export interface MioState {
  // OLED & Hardware Operating State
  modeIndex: number; // 0: Holographic Forecast, 1: Anomaly Radar Matrix, 2: AutoML Benchmark Showdown
  forecastIdx: number; // 0 to 11
  anomalyIdx: number; // 0 to 7
  benchmarkIdx: number; // 0 to 3
  timeHorizon: '2026' | '2025';
  isPoweredOn: boolean;
  isComputing: boolean;
  computeProgress: number; // 0 to 1
  computeText: string;
  selectToast: string | null;
  activeHoverButton: InteractiveButtonKey | null;

  // Scene & Kinematics State
  isDocked: boolean;
  scrollProgress: number;

  // Theme State ('dark' | 'light')
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;

  // Actions
  setModeIndex: (idx: number) => void;
  setForecastIdx: (idx: number) => void;
  setAnomalyIdx: (idx: number) => void;
  setBenchmarkIdx: (idx: number) => void;
  setTimeHorizon: (horizon: '2026' | '2025') => void;
  togglePower: () => void;
  triggerCompute: () => void;
  pressButton: (key: InteractiveButtonKey) => void;
  setActiveHoverButton: (btn: InteractiveButtonKey | null) => void;
  setDocked: (docked: boolean) => void;
  setScrollProgress: (progress: number) => void;
}

export const useMioStore = create<MioState>((set, get) => ({
  theme: 'light',
  modeIndex: 0,
  forecastIdx: 10, // Noviembre por defecto
  anomalyIdx: 0,
  benchmarkIdx: 0,
  timeHorizon: '2026',
  isPoweredOn: true,
  isComputing: false,
  computeProgress: 0,
  computeText: '',
  selectToast: null,
  activeHoverButton: null,

  isDocked: true,
  scrollProgress: 1,

  toggleTheme: () => {
    playMioDevSound('select');
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  },

  setTheme: (theme: 'dark' | 'light') => {
    set({ theme });
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }
  },

  setModeIndex: (idx: number) => {
    playMioDevSound('buttonA');
    set({ modeIndex: (idx + 3) % 3 });
  },

  setForecastIdx: (idx: number) => {
    set({ forecastIdx: idx });
  },

  setAnomalyIdx: (idx: number) => {
    set({ anomalyIdx: idx });
  },

  setBenchmarkIdx: (idx: number) => {
    set({ benchmarkIdx: idx });
  },

  setTimeHorizon: (horizon: '2026' | '2025') => {
    playMioDevSound('select');
    set({
      timeHorizon: horizon,
      selectToast:
        horizon === '2026'
          ? '⟲ VISTA: PROYECCIÓN 2026 (IA AUTOML)'
          : '⟲ VISTA: HISTÓRICO 2025 (DATOS AUDITADOS)',
    });
    setTimeout(() => {
      if (get().timeHorizon === horizon) set({ selectToast: null });
    }, 1500);
  },

  togglePower: () => {
    playMioDevSound('toggle');
    set((state) => ({
      isPoweredOn: !state.isPoweredOn,
      selectToast: !state.isPoweredOn ? 'MIO OS v2.6 REANUDADO' : 'STANDBY MODE',
    }));
    setTimeout(() => set({ selectToast: null }), 1500);
  },

  triggerCompute: () => {
    if (get().isComputing) return;
    playMioDevSound('start');
    set({
      isComputing: true,
      computeProgress: 0,
      computeText: 'OPTIMIZANDO HIPERPARÁMETROS...',
    });

    setTimeout(() => {
      set({ computeProgress: 0.45, computeText: 'CALIBRANDO CONO DE INCERTIDUMBRE P95...' });
    }, 450);

    setTimeout(() => {
      set({ computeProgress: 0.9, computeText: 'ENSEMBLE R²: 0.984 // SINCRONIZADO' });
    }, 900);

    setTimeout(() => {
      set({ isComputing: false, computeProgress: 1, computeText: '' });
    }, 1400);
  },

  pressButton: (key: InteractiveButtonKey) => {
    const { modeIndex, forecastIdx, anomalyIdx, benchmarkIdx, timeHorizon, isPoweredOn } = get();
    if (!isPoweredOn && key !== 'switchPwr') return;

    switch (key) {
      case 'buttonA': {
        playMioDevSound('buttonA');
        const nextMode = (modeIndex + 1) % 3;
        set({
          modeIndex: nextMode,
          selectToast:
            nextMode === 0
              ? 'MODO: FORECAST HOLOGRÁFICO'
              : nextMode === 1
              ? 'MODO: MATRIZ DE ANOMALÍAS'
              : 'MODO: AUTOML BENCHMARK',
        });
        setTimeout(() => set({ selectToast: null }), 1200);
        break;
      }

      case 'buttonB': {
        playMioDevSound('buttonB');
        const prevMode = (modeIndex + 2) % 3;
        set({
          modeIndex: prevMode,
          selectToast:
            prevMode === 0
              ? 'MODO: FORECAST HOLOGRÁFICO'
              : prevMode === 1
              ? 'MODO: MATRIZ DE ANOMALÍAS'
              : 'MODO: AUTOML BENCHMARK',
        });
        setTimeout(() => set({ selectToast: null }), 1200);
        break;
      }

      case 'dpadLeft': {
        playMioDevSound('dpad');
        if (modeIndex === 0) set({ forecastIdx: (forecastIdx + 11) % 12 });
        else if (modeIndex === 1) set({ anomalyIdx: (anomalyIdx + 7) % 8 });
        else set({ benchmarkIdx: (benchmarkIdx + 3) % 4 });
        break;
      }

      case 'dpadRight': {
        playMioDevSound('dpad');
        if (modeIndex === 0) set({ forecastIdx: (forecastIdx + 1) % 12 });
        else if (modeIndex === 1) set({ anomalyIdx: (anomalyIdx + 1) % 8 });
        else set({ benchmarkIdx: (benchmarkIdx + 1) % 4 });
        break;
      }

      case 'dpadUp': {
        playMioDevSound('dpad');
        if (modeIndex === 0) set({ forecastIdx: (forecastIdx + 1) % 12 });
        else if (modeIndex === 1) set({ anomalyIdx: (anomalyIdx + 7) % 8 });
        else set({ benchmarkIdx: (benchmarkIdx + 3) % 4 });
        break;
      }

      case 'dpadDown': {
        playMioDevSound('dpad');
        if (modeIndex === 0) set({ forecastIdx: (forecastIdx + 11) % 12 });
        else if (modeIndex === 1) set({ anomalyIdx: (anomalyIdx + 1) % 8 });
        else set({ benchmarkIdx: (benchmarkIdx + 1) % 4 });
        break;
      }

      case 'dpadCenter': {
        playMioDevSound('dpad');
        get().triggerCompute();
        break;
      }

      case 'switchPwr': {
        get().togglePower();
        break;
      }

      case 'pillSelect': {
        const nextHorizon = timeHorizon === '2026' ? '2025' : '2026';
        get().setTimeHorizon(nextHorizon);
        break;
      }

      case 'pillStart': {
        get().triggerCompute();
        break;
      }

      case 'jogDial': {
        playMioDevSound('jogDial');
        if (modeIndex === 0) set({ forecastIdx: (forecastIdx + 1) % 12 });
        else if (modeIndex === 1) set({ anomalyIdx: (anomalyIdx + 1) % 8 });
        else set({ benchmarkIdx: (benchmarkIdx + 1) % 4 });
        break;
      }
    }
  },

  setActiveHoverButton: (btn) => set({ activeHoverButton: btn }),
  setDocked: (docked) => set({ isDocked: docked }),
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
}));
