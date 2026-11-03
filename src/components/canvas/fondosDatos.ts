import type { ShaderUniformValue } from '@/components/canvas/ShaderCanvas';
import asciiPeaks from '@/shaders/datos/asciiPeaks.frag.glsl?raw';
import dataCube from '@/shaders/datos/dataCube.frag.glsl?raw';
import inbound from '@/shaders/datos/inbound.frag.glsl?raw';
import digitalActivation from '@/shaders/datos/digitalActivation.frag.glsl?raw';
import deepSignal from '@/shaders/datos/deepSignal.frag.glsl?raw';
import ditherField from '@/shaders/datos/ditherField.frag.glsl?raw';

/** Los colores de la paleta que está en uso (la de MIO o la sobria), como '#rrggbb'. */
export type Tintas = { violet: string; lavender: string; lime: string; night: string };

type Fondo = { fragment: string; uniforms: (t: Tintas) => Record<string, ShaderUniformValue> };

/**
 * Los fondos de datos para `ShaderCanvas`, con los colores de la paleta en uso (`FondoDatos` los arma).
 * Son transparentes: van sobre el color de la página, en los dos temas.
 */
export const FONDOS_DATOS = {
  asciiPeaks: { fragment: asciiPeaks, uniforms: (t) => ({ uCell: 11, uBase: t.violet, uCrest: t.lime }) },
  dataCube: { fragment: dataCube, uniforms: (t) => ({ uCell: 9, uBase: t.night, uEdge: t.lavender }) },
  inbound: { fragment: inbound, uniforms: (t) => ({ uColor: t.lavender }) },
  digitalActivation: { fragment: digitalActivation, uniforms: (t) => ({ uCell: 10, uColor: t.lavender }) },
  deepSignal: { fragment: deepSignal, uniforms: (t) => ({ uColor: t.lavender, uLines: 26 }) },
  ditherField: { fragment: ditherField, uniforms: (t) => ({ uDot: 3, uColor: t.violet, uAccent: t.lime, uMask: null, uHasMask: 0 }) },
} satisfies Record<string, Fondo>;

export type FondoDatosKind = keyof typeof FONDOS_DATOS;
