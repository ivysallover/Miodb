import { useCallback, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { desktop } from './desktop';

/** Qué se imprime: el informe entero (`InformeImpreso`) o el resumen de una página (`ResumenImpreso`). */
export type PrintKind = 'informe' | 'resumen';

/** Lo que se da para que carguen y se dibujen los gráficos del informe antes de imprimir. */
const DRAW_MS = 1200;
/** Desde cuándo se toma el mouse como señal de que se cerró el diálogo (no todas las ventanas avisan `afterprint`). */
const DIALOG_MS = 1500;
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * Imprimir lo que se eligió: se pasa a claro (el papel es blanco, sea cual sea el tema), se dibuja lo que va
 * en la hoja, se abre el diálogo del sistema y al cerrarse todo vuelve como estaba. `printing` dice qué se
 * está armando, para montarlo y avisar mientras tanto.
 */
export function useImpresion(onError: (message: string) => void) {
  const [printing, setPrinting] = useState<PrintKind | null>(null);
  const setTheme = useMioStore((s) => s.setTheme);

  const print = useCallback(async (kind: PrintKind) => {
    const root = document.documentElement;
    const theme = useMioStore.getState().theme;
    const events = ['pointermove', 'pointerdown', 'keydown'];
    const restore = () => {
      window.removeEventListener('afterprint', restore);
      events.forEach((e) => window.removeEventListener(e, restore));
      root.classList.remove(`print-${kind}`);
      setTheme(theme);
      setPrinting(null);
    };
    setTheme('light');
    root.classList.add(`print-${kind}`);
    setPrinting(kind);
    try {
      await wait(kind === 'informe' ? DRAW_MS : 100);
      window.addEventListener('afterprint', restore);
      await desktop.print();
      await wait(DIALOG_MS);
      events.forEach((e) => window.addEventListener(e, restore, { once: true }));
    } catch (e) {
      onError(`No pude abrir la impresión: ${String((e as Error)?.message || e)}`);
      restore();
    }
  }, [onError, setTheme]);

  return { printing, print };
}
