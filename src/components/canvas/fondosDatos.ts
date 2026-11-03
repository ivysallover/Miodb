import type { ShaderUniformValue } from '@/components/canvas/ShaderCanvas';
import deepSignal from '@/shaders/datos/deepSignal.frag.glsl?raw';
import ditherField from '@/shaders/datos/ditherField.frag.glsl?raw';

/** Los colores de la paleta que está en uso (la de MIO o la sobria), como '#rrggbb'. */
export type Tintas = { violet: string; lavender: string; lime: string };

type Fondo = { fragment: string; uniforms: (t: Tintas) => Record<string, ShaderUniformValue> };

/**
 * Los fondos de datos para `ShaderCanvas`, con los colores de la paleta en uso (`FondoDatos` los arma).
 * Son transparentes: van sobre el color de la página, en los dos temas.
 */
export const FONDOS_DATOS = {
  deepSignal: { fragment: deepSignal, uniforms: (t) => ({ uColor: t.lavender, uLines: 26 }) },
  ditherField: { fragment: ditherField, uniforms: (t) => ({ uDot: 3, uColor: t.violet, uAccent: t.lime, uMask: null, uHasMask: 0 }) },
} satisfies Record<string, Fondo>;

export type FondoDatosKind = keyof typeof FONDOS_DATOS;
