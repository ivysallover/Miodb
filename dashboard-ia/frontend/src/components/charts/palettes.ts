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

/** La paleta sobria, para mostrar en una reunión: azul acero y tonos apagados, sin lima ni violeta. */
export const SOBER_PALETTE: Omit<PaletteTheme, 'text' | 'border' | 'splitLine' | 'tooltipBg' | 'tooltipText'> = {
  violet: '#3e5f86',
  lime: '#9db2c9',
  black: '#14181d',
  red: '#a8574f',
  teal: '#5b7a99',
  emerald: '#6f8a7f',
  amber: '#a8926a',
  purple: '#8a7f9e',
  bg: '#fafafb',
};

/** Si la pantalla está con la paleta sobria (`paleta-sobria` en <html>, ver `globals.css`). */
export const isSober = () => typeof document !== 'undefined' && document.documentElement.classList.contains('paleta-sobria');

export function getPalette(isColorblind: boolean, isDark = false): PaletteTheme {
  const adaptive = isDark ? DARK_ADAPTIVE : LIGHT_ADAPTIVE;
  if (isColorblind) return { ...COLORBLIND_PALETTE, ...adaptive };
  return { ...(isSober() ? SOBER_PALETTE : DEFAULT_PALETTE), ...adaptive };
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
        const p = isSober() ? SOBER_PALETTE : DEFAULT_PALETTE;
        return [p.violet, p.teal, p.amber, p.emerald, p.purple, p.black];
      })();
}

