/**
 * Single source of truth for the landing's narrative structure.
 *
 * Every consumer (progress rail, floating guide, section plates) reads from here,
 * so the order, numbering and copy of the story live in one place instead of
 * being re-typed across components.
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
    id: 'capacidades',
    index: '02',
    label: 'Capacidades',
    guide: {
      mood: 'trabajando',
      line: 'Cuatro pilares: cada uno reemplaza un paso que hoy hacés a mano en Excel.',
    },
  },
  {
    id: 'casos-estudio',
    index: '03',
    label: 'Caso',
    guide: {
      mood: 'anomalia',
      line: 'Acá aislamos las anomalías de un retail real. Abrí la auditoría y revisalas una por una.',
    },
  },
  {
    id: 'como-funciona',
    index: '04',
    label: 'Método',
    guide: {
      mood: 'trabajando',
      line: 'Tres fases: ingesta, competencia de modelos y explicación. Scrolleá y se van apilando.',
    },
  },
  {
    id: 'quienes-somos',
    index: '05',
    label: 'Equipo',
    guide: {
      mood: 'reposo',
      line: 'Nos armaron dos estudiantes de Ciencia de Datos en Rosario.',
    },
  },
  {
    id: 'cta',
    index: '06',
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
