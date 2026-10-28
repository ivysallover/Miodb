import { useCallback, useEffect, useRef, useState } from 'react';
import { desktop } from './desktop';

/** Lo que se guardó (para mostrarlo en su carpeta), que se copió el resumen o lo que salió mal. */
export type Notice = { kind: 'guardado'; path: string } | { kind: 'copiado' } | { kind: 'error'; message: string };
/** El informe entero, el resumen de una página, el resumen para pegar en un mail, o la planilla limpia. */
export type ExportFormat = 'pdf' | 'resumen' | 'mail' | 'xlsx' | 'csv';

const FILTERS = { xlsx: [{ name: 'Excel', extensions: ['xlsx'] }], csv: [{ name: 'CSV', extensions: ['csv'] }] };
const message = (e: unknown) => String((e as Error)?.message || e);

/** Texto a base64 (UTF-8), de a pedazos para que un CSV grande no reviente la pila. */
function textToBase64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/**
 * Guardar desde la app de escritorio: exportar la planilla limpia (Excel o CSV), el informe entero o el
 * resumen de una página (PDF, con el diálogo de impresión del sistema), copiar el resumen para un mail
 * (`mailText`), y lo que guardan los gráficos (imagen y datos), que en la app no puede bajarse como en
 * el navegador. Siempre se pregunta dónde, y después se avisa con "Mostrar".
 */
export function useSaving(base: string | null, mailText: () => string | null) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  /** Pregunta dónde y guarda; avisa cómo salió. */
  const store = useCallback(async (name: string, write: (path: string) => Promise<void>, filters?: { name: string; extensions: string[] }[]) => {
    const path = await desktop.saveAs(name, filters);
    if (!path) return;
    try {
      await write(path);
      setNotice({ kind: 'guardado', path });
    } catch (e) {
      setNotice({ kind: 'error', message: message(e) });
    }
  }, []);

  /** Exporta lo abierto: el informe o el resumen en PDF, el resumen para un mail o la planilla limpia. */
  const exportAs = async (format: ExportFormat) => {
    if (exporting) return;
    if (format === 'pdf' || format === 'resumen') {
      // Qué se imprime lo decide la clase (`globals.css`), puesta antes de cada impresión.
      document.documentElement.classList.toggle('print-resumen', format === 'resumen');
      return desktop.print().catch((e) => setNotice({ kind: 'error', message: message(e) }));
    }
    if (format === 'mail') {
      const text = mailText();
      if (!text) return;
      return navigator.clipboard.writeText(text).then(
        () => setNotice({ kind: 'copiado' }),
        (e) => setNotice({ kind: 'error', message: `No pude copiar el resumen: ${message(e)}` }),
      );
    }
    setExporting(format);
    try {
      await store(`${base ?? 'planilla'} (limpia).${format}`, (path) => desktop.exportData(format, path), FILTERS[format]);
    } finally {
      setExporting(null);
    }
  };

  // Lo que guardan los gráficos (`charts/capture.ts`) pasa por acá mientras la app está abierta.
  const storeRef = useRef(store);
  storeRef.current = store;
  useEffect(() => {
    let undo: (() => void) | undefined;
    import('../../../dashboard-ia/frontend/src/components/charts/capture').then((c) => {
      c.setSaver((name, file) =>
        storeRef.current(name, (path) => desktop.writeFile(path, 'dataUrl' in file ? file.dataUrl.split(',')[1] : textToBase64(file.text))),
      );
      undo = () => c.setSaver(null);
    });
    return () => undo?.();
  }, []);

  // El aviso se va solo.
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(id);
  }, [notice]);

  return { notice, dismiss: () => setNotice(null), exporting, exportAs };
}
