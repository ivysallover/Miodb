import type { GuideMood } from '@/lib/landingSections';

/**
 * Lets any section nudge the floating MIO guide (mood + one line) without importing it.
 * Sections emit; the companion listens. Fire-and-forget, no state kept here.
 */
export interface GuideCue {
  mood: GuideMood;
  line: string;
}

const EVT = 'mio:guide';

export function emitGuide(cue: GuideCue): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<GuideCue>(EVT, { detail: cue }));
}

export function onGuide(fn: (cue: GuideCue) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<GuideCue>).detail);
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
