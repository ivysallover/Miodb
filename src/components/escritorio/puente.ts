/**
 * Solo en desarrollo (`npm run dev`; en lo que se publica no existe): con `?puente` en la dirección, las
 * pantallas de la app se usan desde un navegador común y le piden lo mismo al motor por el servidor de la
 * app de prueba (`desktop/src-tauri/src/puente.rs`, que se enciende con `MIO_PUENTE`). Sin cuenta: es para
 * probar la app entera, no para entrar a ella. Los diálogos del sistema contestan lo que diga
 * `sessionStorage` (`mio_puente_abrir`: las planillas a abrir; `mio_puente_guardar`: dónde guardar).
 */

const PORT = 4317;

/** Si esta página usa el puente. */
export const viaBridge = () => import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('puente');

const call = async (cmd: string, args: Record<string, unknown> = {}) => {
  if (cmd === 'plugin:log|log') {
    console.error('[registro]', args.message);
    return null;
  }
  const res = await fetch(`http://127.0.0.1:${PORT}/invoke`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ cmd, args }) });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? `El puente contestó ${res.status}`);
  return body;
};

const stored = (key: string) => {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};

/** Pone en la ventana lo que pondría la app de escritorio, hablando por el puente. */
export function installBridge() {
  if (!viaBridge() || (window as any).__TAURI__) return;
  (window as any).__TAURI__ = {
    core: { invoke: call },
    event: { listen: async () => () => undefined },
    dialog: {
      open: async () => stored('mio_puente_abrir'),
      save: async ({ defaultPath }: { defaultPath?: string }) => stored('mio_puente_guardar') ?? (defaultPath ? `/tmp/${defaultPath}` : null),
    },
    webview: { getCurrentWebview: () => ({ setZoom: async () => undefined }) },
    opener: { revealItemInDir: async () => undefined, openUrl: async (url: string) => void window.open(url) },
    app: { getVersion: async () => '0.0.0-puente' },
  };
}
