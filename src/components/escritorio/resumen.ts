import { buildModel, type Finding, type Step } from '@/components/dashboard/insights';
import { num, type Changes, type Result } from './desktop';

/** Cómo se llama cada período, según la frecuencia de la predicción. */
const UNITS: Record<string, [string, string]> = { Diaria: ['día', 'días'], Semanal: ['semana', 'semanas'], Mensual: ['mes', 'meses'] };
export const unit = (frecuencia: string, n: number) => (UNITS[frecuencia] ?? ['período', 'períodos'])[n === 1 ? 0 : 1];

/** El cambio del total en porcentaje, con un decimal (como se muestra); `null` si no hay total o antes era cero. */
export const totalChange = (c: Changes) => (c.total && c.total[0] !== 0 ? Math.round(((c.total[1] - c.total[0]) / Math.abs(c.total[0])) * 1000) / 10 : null);

/** "entraron 1.044 filas nuevas y monto subió 37,0 %" */
export const changesSaid = (c: Changes, target: string) => {
  const rows = c.filas[1] - c.filas[0];
  const pct = totalChange(c);
  return [
    rows > 0 ? `entraron ${num(rows)} filas nuevas` : rows < 0 ? `hay ${num(-rows)} filas menos` : 'las filas son las mismas',
    pct ? `${target} ${pct > 0 ? 'subió' : 'bajó'} ${num(Math.abs(pct), 1)} %` : null,
  ].filter(Boolean).join(' y ');
};

/** "acertó 11 de 12 semanas", o `null` si todavía no se puede comparar. */
export const forecastSaid = (c: Changes) => {
  const p = c.prediccion;
  return p ? `acertó ${p.dentro} de ${p.periodos.length} ${unit(p.frecuencia, p.periodos.length)}` : null;
};

export type Summary = {
  target: string;
  filename: string;
  facts: string;
  findings: Finding[];
  /** Desde la última vez, en una frase (si la planilla cambió). */
  changes: string | null;
  steps: Step[];
};

/** Lo principal de un resultado, para una página o un mail: los mismos hallazgos y pasos que la pantalla. */
export function summaryOf(result: Result, changes?: Changes): Summary {
  const m = buildModel(result);
  const target = String(result.targetCol ?? 'lo que se analiza');
  const p = result.profile;
  const exam = changes && forecastSaid(changes);
  return {
    target,
    filename: String(result.filename ?? ''),
    facts: `${num(p.nRows)} filas · ${p.nCols} columnas · calidad ${p.qualityScore}/100`,
    findings: m.findings,
    changes: changes ? `Desde el análisis anterior, ${changesSaid(changes, target)}${exam ? `; la predicción de entonces ${exam}` : ''}.` : null,
    steps: m.steps,
  };
}

export const today = () => new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/** El resumen como texto, para pegar en un mail. */
export function summaryText(s: Summary, empresa: string): string {
  const lines = [
    `${empresa ? `${empresa} · ` : ''}${s.target} en ${s.filename}`,
    `${today()} · ${s.facts}`,
    '',
    'Lo principal',
    ...s.findings.map((f) => `• ${f.big ? `${f.big} ` : ''}${f.text}`),
  ];
  if (s.changes) lines.push('', s.changes);
  if (s.steps.length) lines.push('', 'Qué hacer ahora', ...s.steps.map((st, i) => `${i + 1}. ${st.title}: ${st.text}`));
  lines.push('', 'Hecho con MIO, en esta compu: la planilla no salió de acá.');
  return lines.join('\n');
}

