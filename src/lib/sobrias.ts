import { SOBRIAS, type Sobria } from '../../dashboard-ia/frontend/src/components/charts/palettes';

/**
 * De una paleta sobria (`SOBRIAS`, compartidas con los gráficos), los colores de toda la app: las variables
 * `--pal-*` de `globals.css` (los de MIO son los de `:root`) y los tonos del fondo animado, cada uno de uno de
 * sus colores, mezclado con blanco (tintes) o con negro (fondos oscuros).
 */

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
/** `c` llevado hacia `to` (`t` = cuánto). */
const toward = (c: Rgb, to: number, t: number): Rgb => c.map((v) => Math.round(v + (to - v) * t)) as Rgb;
const css = (c: Rgb) => c.join(' ');

/**
 * De qué color de la paleta sale cada variable (0 = el acento, 1 a 3 = los que le siguen en `series`, `n` =
 * un neutro apenas teñido del acento) y cuánto se lleva hacia blanco (t > 0) o hacia negro (t < 0). Así una
 * paleta sobria usa cuatro de sus colores en la app, con los mismos papeles que los de MIO:
 * - el acento (0): los bloques principales, los botones y los textos de acento;
 * - la chispa (1, aclarada): los números grandes y lo resaltado sobre un bloque oscuro (lo que en MIO es el lima);
 * - el segundo tono (2): los bloques suaves (claros) y los tintados (oscuros), y el acento sobre oscuro;
 * - el tercero (3): los bloques neutros.
 */
const RECIPE: Record<string, [0 | 1 | 2 | 3 | 'n', number]> = {
  violet: [0, 0], 'violet-strong': [0, -0.16], 'violet-text': [0, -0.24], 'violet-deep': [0, -0.42],
  lime: [1, 0.42], 'lime-hover': [1, 0.55],
  lavender: [2, 0.42], 'lavender-2': [2, 0.46], 'lavender-3': [2, 0.56],
  soft: [2, 0.74], 'soft-2': [2, 0.82], 'soft-3': [2, 0.88], 'soft-4': [2, 0.68], 'soft-5': [2, 0.64],
  night: [2, -0.5], 'night-2': [2, -0.62], 'night-6': [2, -0.4],
  mute: [3, 0.82], 'night-3': [3, -0.7], 'night-5': [3, -0.64],
  'on-dark': [0, 0.88], 'on-dark-2': [0, 0.72],
  'night-4': ['n', -0.74], ink: ['n', -0.82], 'surface-dark': ['n', -0.84], 'surface-dark-2': ['n', -0.83],
};

/** Las variables `--pal-*` de una paleta sobria. */
export function soberVars(id: Sobria): Record<string, string> {
  const p = SOBRIAS[id];
  const colors = [p.acento, p.series[1], p.series[2], p.series[3]].map(rgb);
  // Las superficies de fondo casi sin color: el acento apenas se nota en ellas.
  const neutral = toward(colors[0], 128, 0.7);
  const out: Record<string, string> = {};
  for (const [name, [from, t]] of Object.entries(RECIPE)) {
    const c = from === 'n' ? neutral : colors[from];
    out[`--pal-${name}`] = css(t >= 0 ? toward(c, 255, t) : toward(c, 0, -t));
  }
  return out;
}

/** Los tonos del fondo animado (0 a 1) de una paleta sobria. */
export function soberTints(id: Sobria): { violet: number[]; lavender: number[]; lime: number[] } {
  const p = SOBRIAS[id];
  const unit = (c: Rgb) => c.map((v) => v / 255);
  return { violet: unit(rgb(p.acento)), lavender: unit(toward(rgb(p.series[2]), 255, 0.42)), lime: unit(toward(rgb(p.series[1]), 255, 0.42)) };
}

export { SOBRIAS, type Sobria };
