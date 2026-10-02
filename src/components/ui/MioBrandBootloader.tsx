import React, { useState, useEffect } from 'react';
import { playMioDevSound } from '@/lib/sound';

interface MioBrandBootloaderProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const MioBrandBootloader: React.FC<MioBrandBootloaderProps> = ({
  onComplete,
  forceShow = false,
}) => {
  const [progress, setProgress] = useState(0);
  const [bootStep, setBootStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  const bootLogs = [
    'BOOT SEQUENCE INITIALIZED // MIO OS v2.6.4',
    'DETECTING GPU CORE // WEBGL2 COMPATIBLE',
    'MOUNTING VARIABLE TYPOGRAPHY [CLIMATE CRISIS 1979-2050]',
    'CALIBRATING THREE-POINT STUDIO SOFTBOX ENVIRONMENT',
    'WARMING MIO ESPÉCIMEN 01 PBR MESH TAXONOMY',
    'SYSTEM METROLOGY NOMINAL // LAUNCHING AUTOML RUNTIME',
  ];

  useEffect(() => {
    // Check if user already saw bootloader in this browser session
    if (!forceShow && typeof window !== 'undefined' && sessionStorage.getItem('mio_boot_seen') === '1') {
      setIsMounted(false);
      onComplete?.();
      return;
    }

    let currentProgress = 0;
    const startTime = performance.now();

    // Preload key assets in parallel
    const preloadAssets = async () => {
      try {
        if ('fonts' in document) {
          await document.fonts.ready;
        }
      } catch {}
    };
    void preloadAssets();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      // Fluid progress curve reaching 100% in ~1.4 seconds
      const target = Math.min(100, Math.floor((elapsed / 1350) * 100));

      if (target > currentProgress) {
        currentProgress = target;
        setProgress(currentProgress);

        const stepIdx = Math.min(
          bootLogs.length - 1,
          Math.floor((currentProgress / 100) * bootLogs.length)
        );
        setBootStep(stepIdx);
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        try {
          sessionStorage.setItem('mio_boot_seen', '1');
        } catch {}

        // Sound cue on successful boot
        playMioDevSound('select');

        // Allow user to register 100% state for 180ms before curtain opens
        setTimeout(() => {
          setIsExiting(true);
          // Wait for CSS slide up animation
          setTimeout(() => {
            setIsMounted(false);
            onComplete?.();
          }, 650);
        }, 220);
      }
    }, 28);

    // Keyboard escape key to bypass
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        clearInterval(interval);
        try {
          sessionStorage.setItem('mio_boot_seen', '1');
        } catch {}
        setIsExiting(true);
        setTimeout(() => {
          setIsMounted(false);
          onComplete?.();
        }, 300);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [forceShow, onComplete]);

  if (!isMounted) return null;

  // Visual ASCII progress bar calculation
  const totalBars = 24;
  const filledBars = Math.floor((progress / 100) * totalBars);
  const progressBar = '█'.repeat(filledBars) + '░'.repeat(totalBars - filledBars);

  // ASCII Pet Face evolving as OS boots
  const petFace =
    progress < 35
      ? '[- -]' // Sleeping
      : progress < 75
      ? '[• •]' // Waking up
      : '[^ ^]'; // Nominal / Celebrating

  return (
    <aside
      className={`fixed inset-0 z-[100] flex flex-col justify-between p-6 sm:p-12 bg-[#07070a] text-zinc-300 font-mono select-none overflow-hidden transition-all duration-650 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isExiting ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
      aria-label="Pantalla de inicialización de MIO OS"
    >
      {/* Background CRT scanlines effect */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(189,245,89,0) 50%, rgba(0, 0, 0, 1) 50%)',
          backgroundSize: '100% 4px',
        }}
        aria-hidden="true"
      />

      {/* TOP BAR: Firmware & Architecture Telemetry */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-[10px] sm:text-xs text-zinc-500 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[#bdf559] animate-pulse" />
          <span className="text-zinc-200 font-bold tracking-wider">MIO OS v2.6.4</span>
          <span>// CYBER-PHYSICAL AUTOML RUNTIME</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">ROSARIO, SANTA FE, ARG</span>
          <span className="text-[#bdf559] font-semibold">{progress}% OK</span>
        </div>
      </header>

      {/* CENTER: ASCII Pet Waking Up & Progress Matrix */}
      <main className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto w-full">
        {/* Animated ASCII Pet Micro-Avatar */}
        <div className="text-3xl sm:text-4xl text-[#bdf559] tracking-widest font-black transition-transform duration-200">
          <pre className="font-mono">{`
  /\\___/\\
 ${petFace}
  (  "  )
   U   U
          `}</pre>
        </div>

        {/* ASCII Matrix Bar */}
        <div className="space-y-2 w-full">
          <div className="flex justify-between text-xs tracking-widest text-zinc-400">
            <span>MEMORIA: 64MB UNIFIED</span>
            <span className="text-[#bdf559] font-bold">{progress}%</span>
          </div>
          <div className="text-xs sm:text-sm text-[#bdf559] tracking-tighter sm:tracking-normal overflow-hidden whitespace-nowrap">
            [{progressBar}]
          </div>
        </div>

        {/* Dynamic Boot Sequence Log Line */}
        <div className="h-6 text-xs text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7647eb] animate-ping" />
          <span className="truncate max-w-[320px] sm:max-w-md">{bootLogs[bootStep]}</span>
        </div>
      </main>

      {/* FOOTER: Controls & Skip Cue */}
      <footer className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-[10px] sm:text-xs text-zinc-500 border-t border-white/[0.08] pt-4">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">HARDWARE CONSOLE:</span>
          <span className="text-zinc-200">MIO-DEV 01</span>
          <span className="text-zinc-600">•</span>
          <span className="text-[#a78bfa]">TEENAGE ENGINEERING COMPLIANT</span>
        </div>

        <button
          type="button"
          onClick={() => {
            try { sessionStorage.setItem('mio_boot_seen', '1'); } catch {}
            setIsExiting(true);
            setTimeout(() => {
              setIsMounted(false);
              onComplete?.();
            }, 300);
          }}
          className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-[10px] tracking-wider uppercase border border-white/10 px-2.5 py-1 rounded-none hover:bg-white/[0.04]"
        >
          [ESC / CLIC PARA OMITIR]
        </button>
      </footer>
    </aside>
  );
};

export default MioBrandBootloader;
