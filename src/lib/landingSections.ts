/**
 * Single source of truth for the landing's narrative structure.
 *
 * Story in five acts after the hero:
 *   02 El problema  ->  03 El método  ->  04 La prueba  ->  05 El equipo  ->  06 Probar
 * Every consumer (progress rail, floating guide, section plates) reads from here,
 * so the order, numbering and copy of the story live in one place.
 */

export type GuideMood = 'reposo' | 'trabajando' | 'celebrando' | 'anomalia' | 'durmiendo';

export interface LandingSection {
  /** DOM id of the <section> */
  id: string;
  /** Two-digit index shown on plates and in the rail */
  index: string;
  /** Short label for the rail */
  label: string;
  /** What the floating MIO guide does when this section takes over the viewport. */
  guide?: {
    mood: GuideMood;
    line: string;
  };
}

export const LANDING_SECTIONS: readonly LandingSection[] = [
  { id: 'hero', index: '01', label: 'Inicio' },
  {
    id: 'problema',
    index: '02',
    label: 'Problema',
    guide: {
      mood: 'anomalia',
      line: 'Esto es lo que hoy se hace a mano. Fijate cómo se va tachando.',
    },
  },
  {
    id: 'como-funciona',
    index: '03',
    label: 'Método',
    guide: {
      mood: 'trabajando',
      line: 'Tres fases: ingesta, competencia de modelos y explicación. Scrolleá y se van apilando.',
    },
  },
  {
    id: 'casos-estudio',
    index: '04',
    label: 'Prueba',
    guide: {
      mood: 'celebrando',
      line: 'Demostración con datos reales. Abrila y revisá las anomalías.',
    },
  },
  {
    id: 'nucleo-algoritmico',
    index: '05',
    label: 'Motor',
    guide: {
      mood: 'trabajando',
      line: 'El pipeline de Machine Learning en tiempo real: caos, anomalías y proyección.',
    },
  },
  {
    id: 'quienes-somos',
    index: '06',
    label: 'Equipo',
    guide: {
      mood: 'reposo',
      line: 'Nos armaron dos estudiantes de Ciencia de Datos en Rosario.',
    },
  },
  {
    id: 'cta',
    index: '07',
    label: 'Probar',
    guide: {
      mood: 'celebrando',
      line: 'Subí una planilla de prueba y mirá el diagnóstico completo.',
    },
  },
] as const;

export const SECTION_BY_ID: Record<string, LandingSection> = Object.fromEntries(
  LANDING_SECTIONS.map((s) => [s.id, s])
);
