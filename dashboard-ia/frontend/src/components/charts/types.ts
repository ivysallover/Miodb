import { ChartSchema } from '@/types/analysis';

export interface PaletteTheme {
  violet: string;
  lime: string;
  black: string;
  red: string;
  teal: string;
  emerald: string;
  amber: string;
  purple: string;
  bg: string;
  // Adaptive dark/light tokens
  text: string;
  border: string;
  splitLine: string;
  tooltipBg: string;
  tooltipText: string;
}

export interface ChartBuildContext {
  payload: ChartSchema;
  dataset: {
    dimensions: string[];
    source: Record<string, any>[];
  };
  palette: PaletteTheme;
  seriesColors: string[];
  isColorblind: boolean;
  isDark: boolean;
  canLog: boolean;
  resolvedXAxisType: string;
  resolvedYAxisType: string;
}

export type ChartBuilder = (baseOptions: any, context: ChartBuildContext) => void;
