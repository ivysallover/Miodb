/**
 * Dónde se bajan los instaladores de la app de escritorio: el espacio público `mio-descargas` de
 * Cloudflare R2 (ver DEPLOY.md §3). Estos links apuntan siempre a la última versión publicada.
 */
const BASE = 'https://pub-21e06231ebb5439a9d49a06fcb08b70a.r2.dev/escritorio';

export const DESCARGAS = {
  windows: { label: 'Windows', url: `${BASE}/MIO-Windows.exe` },
  mac: { label: 'Mac (Apple M1 en adelante)', url: `${BASE}/MIO-Mac-Apple-Silicon.dmg` },
} as const;
export type Plataforma = keyof typeof DESCARGAS;

/**
 * La compu de quien mira, si se puede bajar ahí: Windows o Mac (las Mac con Apple Silicon; la versión
 * para Mac con Intel se arma solo a pedido). En un celular o una tablet, `null`.
 */
export function plataforma(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): Plataforma | null {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  return null;
}
