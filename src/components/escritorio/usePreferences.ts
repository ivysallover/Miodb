import { useEffect, useState } from 'react';
import { keepPref, readPref } from '@/utils/prefs';
import { STILL_CLASS } from '@/lib/motion';
import { FONDOS, type FondoKind } from '@/components/canvas/Fondo';
import { desktop, inDesktop } from './desktop';

/** Los tamaños de texto que se pueden elegir (zoom de toda la ventana). */
export const ZOOMS = [0.9, 1, 1.1, 1.25] as const;
export type Zoom = (typeof ZOOMS)[number];
/** El movimiento: como lo pide la compu, o reducido siempre. */
export type Motion = 'sistema' | 'reducido';
/** Qué muestra la app al abrirse. */
export type OnOpen = 'inicio' | 'ultimo';

const KEYS = { zoom: 'mio_escritorio_zoom', motion: 'mio_escritorio_movimiento', onOpen: 'mio_escritorio_al_abrir', fondo: 'mio_escritorio_fondo' };
const saved = <T extends string | number>(key: string, options: readonly T[], fallback: T): T =>
  options.find((o) => String(o) === readPref(key)) ?? fallback;


/**
 * Las preferencias de la app de escritorio que no son el tema (`useTheme.ts`): tamaño del texto
 * (también con ⌘+, ⌘− y ⌘0), movimiento, fondo y qué abrir al arrancar. Cada una se guarda en esta compu.
 */
export function usePreferences() {
  const [zoom, setZoomState] = useState<Zoom>(() => saved(KEYS.zoom, ZOOMS, 1));
  const [motion, setMotionState] = useState<Motion>(() => saved(KEYS.motion, ['sistema', 'reducido'] as const, 'sistema'));
  const [onOpen, setOnOpenState] = useState<OnOpen>(() => saved(KEYS.onOpen, ['inicio', 'ultimo'] as const, 'inicio'));
  const [fondo, setFondoState] = useState<FondoKind>(() => saved(KEYS.fondo, Object.keys(FONDOS) as FondoKind[], 'planilla'));

  const setZoom = (z: Zoom) => {
    keepPref(KEYS.zoom, String(z));
    setZoomState(z);
  };
  const setMotion = (m: Motion) => {
    keepPref(KEYS.motion, m);
    setMotionState(m);
  };
  const setFondo = (f: FondoKind) => {
    keepPref(KEYS.fondo, f);
    setFondoState(f);
  };
  const setOnOpen = (o: OnOpen) => {
    keepPref(KEYS.onOpen, o);
    setOnOpenState(o);
  };

  useEffect(() => {
    if (inDesktop()) desktop.setZoom(zoom).catch(() => undefined);
  }, [zoom]);

  useEffect(() => {
    document.documentElement.classList.toggle(STILL_CLASS, motion === 'reducido');
  }, [motion]);

  // ⌘+ / ⌘= agranda, ⌘− achica y ⌘0 vuelve al tamaño normal, dentro de los tamaños de la lista.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const at = ZOOMS.indexOf(zoom);
      const next = e.key === '+' || e.key === '=' ? ZOOMS[Math.min(at + 1, ZOOMS.length - 1)] : e.key === '-' ? ZOOMS[Math.max(at - 1, 0)] : e.key === '0' ? 1 : null;
      if (next == null) return;
      e.preventDefault();
      setZoom(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  return { zoom, setZoom, motion, setMotion, onOpen, setOnOpen, fondo, setFondo };
}
