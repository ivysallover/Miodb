/**
 * Dónde se bajan los instaladores de la app de escritorio: el espacio público `mio-descargas` de
 * Cloudflare R2 (ver DEPLOY.md §3). Estos links apuntan siempre a la última versión publicada.
 */
const BASE = 'https://pub-21e06231ebb5439a9d49a06fcb08b70a.r2.dev/escritorio';

export const DESCARGAS = {
  windows: { label: 'Windows', url: `${BASE}/MIO-Windows.exe` },
  mac: { label: 'Mac (Apple M1 en adelante)', url: `${BASE}/MIO-Mac-Apple-Silicon.dmg` },
  macIntel: { label: 'Mac con Intel', url: `${BASE}/MIO-Mac-Intel.dmg` },
} as const;
export type Plataforma = keyof typeof DESCARGAS;

/**
 * La compu de quien mira, si se puede bajar ahí: Windows o Mac (el navegador no dice si la Mac es
 * Apple o Intel; se ofrece Apple, que son las de los últimos años, y la otra como link). En un
 * celular o una tablet, `null`.
 */
export function plataforma(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent): Plataforma | null {
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'mac';
  return null;
}
