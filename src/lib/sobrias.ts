import { SOBRIAS, type Sobria } from '../../dashboard-ia/frontend/src/components/charts/palettes';

/**
 * De una paleta sobria (`SOBRIAS`, compartidas con los gráficos), los colores de toda la app: las variables
 * `--pal-*` de `globals.css` (los de MIO son los de `:root`) y los tonos del fondo animado. Todo sale del
 * acento, mezclado con blanco (tintes) o con negro (fondos oscuros), así cada paleta queda pareja.
 */

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
/** `c` llevado hacia `to` (`t` = cuánto). */
const toward = (c: Rgb, to: number, t: number): Rgb => c.map((v) => Math.round(v + (to - v) * t)) as Rgb;
const css = (c: Rgb) => c.join(' ');

/** Cada variable de la paleta: hacia blanco (t > 0) o hacia negro (t < 0), desde el acento. */
const RECIPE: Record<string, number> = {
  violet: 0, 'violet-strong': -0.16, 'violet-text': -0.24, 'violet-deep': -0.42,
  lavender: 0.48, 'lavender-2': 0.52, 'lavender-3': 0.6,
  soft: 0.82, 'soft-2': 0.86, 'soft-3': 0.9, 'soft-4': 0.78, 'soft-5': 0.75,
  mute: 0.9, 'on-dark': 0.88, 'on-dark-2': 0.72,
  // La chispa: en una paleta sobria no hay lima; queda un tinte claro del acento.
  lime: 0.8, 'lime-hover': 0.87,
  night: -0.5, 'night-2': -0.56, 'night-3': -0.68, 'night-4': -0.74, 'night-5': -0.66, 'night-6': -0.45,
  ink: -0.82, 'surface-dark': -0.84, 'surface-dark-2': -0.83,
};

/** Las variables `--pal-*` de una paleta sobria. */
export function soberVars(id: Sobria): Record<string, string> {
  const base = rgb(SOBRIAS[id].acento);
  // Los neutros (mute, tinta, superficies) casi sin color: el acento apenas se nota en ellos.
  const neutral = toward(base, 128, 0.7);
  const out: Record<string, string> = {};
  for (const [name, t] of Object.entries(RECIPE)) {
    const from = /^(mute|ink|surface)/.test(name) ? neutral : base;
    out[`--pal-${name}`] = css(t >= 0 ? toward(from, 255, t) : toward(from, 0, -t));
  }
  return out;
}

/** Los tonos del fondo animado (0 a 1) de una paleta sobria. */
export function soberTints(id: Sobria): { violet: number[]; lavender: number[]; lime: number[] } {
  const base = rgb(SOBRIAS[id].acento);
  const unit = (c: Rgb) => c.map((v) => v / 255);
  return { violet: unit(base), lavender: unit(toward(base, 255, 0.48)), lime: unit(toward(base, 255, 0.8)) };
}

export { SOBRIAS, type Sobria };
