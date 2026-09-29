import { PaletteTheme } from './types';

const DARK_ADAPTIVE = {
  text: '#f4f4f5',
  border: 'rgba(255,255,255,0.26)',
  splitLine: 'rgba(255,255,255,0.12)',
  tooltipBg: '#14112a',
  tooltipText: '#ffffff',
};

const LIGHT_ADAPTIVE = {
  text: '#27272a',
  border: '#18181b',
  splitLine: 'rgba(0,0,0,0.08)',
  tooltipBg: '#ffffff',
  tooltipText: '#18181b',
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

export function getPalette(isColorblind: boolean, isDark = false): PaletteTheme {
  const adaptive = isDark ? DARK_ADAPTIVE : LIGHT_ADAPTIVE;
  return isColorblind
    ? { ...COLORBLIND_PALETTE, ...adaptive }
    : { ...DEFAULT_PALETTE, ...adaptive };
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
    : [
        DEFAULT_PALETTE.violet,
        DEFAULT_PALETTE.teal,
        DEFAULT_PALETTE.amber,
        DEFAULT_PALETTE.emerald,
        DEFAULT_PALETTE.purple,
        DEFAULT_PALETTE.black,
      ];
}

