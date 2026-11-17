import { PaletteTheme } from './types';

const DARK_ADAPTIVE = {
  text: '#f4f4f5',
  border: 'rgba(255,255,255,0.2)',
  splitLine: 'rgba(255,255,255,0.09)',
  tooltipBg: '#241f40',
  tooltipText: '#ffffff',
};

// Lines stay quiet so the data carries the chart; the tooltip is a solid obsidian block.
const LIGHT_ADAPTIVE = {
  text: '#27272a',
  border: 'rgba(11,9,20,0.18)',
  splitLine: 'rgba(11,9,20,0.07)',
  tooltipBg: '#0b0914',
  tooltipText: '#ffffff',
};

export const DEFAULT_PALETTE: Omit<PaletteTheme, 'text' | 'border' | 'splitLine' | 'tooltipBg' | 'tooltipText'> = {
  violet: '#602cd1', // WCAG AA compliant (> 4.5:1 on light backgrounds)
  lime: '#bdf559',
  black: '#111111',
  red: '#ff6b6b', // Restored vibrant coral red
  teal: '#0072b2', // Accessible blue (Okabe-Ito)
  emerald: '#009e73', // Accessible bluish-green (Okabe-Ito)
  amber: '#e69f00', // Accessible amber/orange (Okabe-Ito)
  purple: '#cc79a7', // Accessible reddish purple (Okabe-Ito)
  bg: '#fafafc',
};

export const COLORBLIND_PALETTE: Omit<PaletteTheme, 'text' | 'border' | 'splitLine' | 'tooltipBg' | 'tooltipText'> = {
  violet: '#0033bb', // Pure Accessible Cobalt Blue (contrast > 7:1)
  lime: '#ffe500',   // Pure High-Luminance Accessible Yellow
  black: '#000000',
  red: '#d55e00',    // Accessible Vermillion
  teal: '#0072b2',    // Sky Blue
  emerald: '#009e73', // Bluish Green
  amber: '#e69f00',   // Orange
  purple: '#cc79a7',  // Reddish Purple
  bg: '#ffffff',
};

type Colors = Omit<PaletteTheme, 'text' | 'border' | 'splitLine' | 'tooltipBg' | 'tooltipText'>;

/**
 * Las paletas sobrias, para mostrar en una reunión (se elige una en Ajustes y el botón del resultado la
 * prende y la apaga). `acento` pinta los bloques de la app (`usePreferences` arma con él las variables
 * `--pal-*`) y la primera serie de los gráficos; `series`, las otras, en orden; `rojo`, lo que está mal.
 * Tonos apagados de igual peso, que se distinguen entre sí y no compiten con los números.
 */
export const SOBRIAS = {
  acero: { label: 'Acero', acento: '#3e5f86', series: ['#3e5f86', '#a8926a', '#6f8a7f', '#8a7f9e', '#5b7a99', '#4b535c'], rojo: '#a8574f' },
  grafito: { label: 'Grafito', acento: '#4a5059', series: ['#4a5059', '#a3907a', '#6b7d74', '#7d6f8c', '#8a99a8', '#2c3036'], rojo: '#9c5a52' },
  bosque: { label: 'Bosque', acento: '#3f6b57', series: ['#3f6b57', '#b08d57', '#5f7896', '#9a6f63', '#88a294', '#2b3a33'], rojo: '#a35a4c' },
  marino: { label: 'Marino', acento: '#26406e', series: ['#26406e', '#c19a3e', '#6c8f86', '#8a6f9c', '#6f8bb8', '#1c2638'], rojo: '#a64b4b' },
  tierra: { label: 'Tierra', acento: '#8a5a44', series: ['#8a5a44', '#5f7a6b', '#4f6680', '#a3955f', '#b98f78', '#3a2b24'], rojo: '#9c3f3a' },
  ciruela: { label: 'Ciruela', acento: '#5e3a63', series: ['#5e3a63', '#b0905a', '#5f7d8c', '#7f8f6a', '#a07a96', '#2e2231'], rojo: '#a9533f' },
} as const;
export type Sobria = keyof typeof SOBRIAS;
export const SOBRIA_DEFAULT: Sobria = 'acero';

/** Si la pantalla está con colores sobrios (`paleta-sobria` en <html>) y cuál (`data-sobria`). */
export const isSober = () => typeof document !== 'undefined' && document.documentElement.classList.contains('paleta-sobria');
export const currentSobria = (): Sobria => {
  const id = typeof document !== 'undefined' ? document.documentElement.dataset.sobria : undefined;
  return id && id in SOBRIAS ? (id as Sobria) : SOBRIA_DEFAULT;
};

/** La paleta sobria elegida, con los nombres de color que usan los gráficos. */
const soberColors = (): Colors => {
  const p = SOBRIAS[currentSobria()];
  const [violet, amber, emerald, purple, teal, black] = p.series;
  return { violet, lime: teal, black, red: p.rojo, teal, emerald, amber, purple, bg: '#fafafb' };
};

export function getPalette(isColorblind: boolean, isDark = false): PaletteTheme {
  const adaptive = isDark ? DARK_ADAPTIVE : LIGHT_ADAPTIVE;
  if (isColorblind) return { ...COLORBLIND_PALETTE, ...adaptive };
  return { ...(isSober() ? soberColors() : DEFAULT_PALETTE), ...adaptive };
}

export function getSeriesColors(isColorblind: boolean): string[] {
  return isColorblind
    ? [
        COLORBLIND_PALETTE.violet,
        COLORBLIND_PALETTE.lime,
        COLORBLIND_PALETTE.teal,
        COLORBLIND_PALETTE.amber,
        COLORBLIND_PALETTE.emerald,
        COLORBLIND_PALETTE.purple,
        COLORBLIND_PALETTE.black,
      ]
    : (() => {
        if (isSober()) return [...SOBRIAS[currentSobria()].series];
        const p = DEFAULT_PALETTE;
        return [p.violet, p.teal, p.amber, p.emerald, p.purple, p.black];
      })();
}

