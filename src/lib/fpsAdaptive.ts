/**
 * fpsAdaptive — Dynamic resolution and DPR governor for high-performance WebGL.
 *
 * Automatically scales DPR down (1.5 -> 1.0 -> 0.75) if frame rate drops below
 * target thresholds, preventing GPU thermal throttling and stutter on mobile or
 * battery saver modes.
 */

export interface FpsGovernorOptions {
  sampleIntervalMs?: number;
  lowFpsThreshold?: number;
  criticalFpsThreshold?: number;
  onDprChange?: (newDpr: number) => void;
}

export function createFpsGovernor(options: FpsGovernorOptions = {}) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const maxDpr = isMobile ? 1.0 : Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 1.5);
  
  let currentDpr = maxDpr;
  let frameCount = 0;
  let lastTime = typeof performance !== 'undefined' ? performance.now() : 0;
  let lowFpsStreak = 0;
  let isRunning = true;

  const sampleInterval = options.sampleIntervalMs ?? 1500;
  const lowThreshold = options.lowFpsThreshold ?? 42;
  const criticalThreshold = options.criticalFpsThreshold ?? 25;

  const measure = (now: number): number => {
    if (!isRunning) return currentDpr;
    frameCount++;
    const delta = now - lastTime;

    if (delta >= sampleInterval) {
      const fps = (frameCount * 1000) / delta;
      frameCount = 0;
      lastTime = now;

      if (fps < criticalThreshold) {
        if (currentDpr > 0.75) {
          currentDpr = 0.75;
          options.onDprChange?.(currentDpr);
        }
      } else if (fps < lowThreshold) {
        lowFpsStreak++;
        if (lowFpsStreak >= 2 && currentDpr > 1.0) {
          currentDpr = 1.0;
          options.onDprChange?.(currentDpr);
        }
      } else {
        lowFpsStreak = 0;
      }
    }

    return currentDpr;
  };

  return {
    getDpr: () => currentDpr,
    measure,
    destroy: () => {
      isRunning = false;
    },
  };
}
