import React from 'react';
import { ArrowRight, Layers, Link2, Loader2 } from 'lucide-react';
import { num, type UnionChoices, type UnionPlan } from './desktop';
import { FOCUS, PRIMARY, field, muted, slab, slabText, soft, surface } from './ui';

type File = UnionPlan['archivos'][number];

/** "cliente_id = id · 98 %" */
const keyLabel = (k: { clave: string; clave_otra: string; encontradas: number }) =>
  `${k.clave === k.clave_otra ? k.clave : `${k.clave} = ${k.clave_otra}`} · ${num(k.encontradas * 100)} %`;
const NONE = '__no__';

/** Qué es cada planilla en la unión, en pocas palabras. */
const role = (f: File) => {
  if (f.papel === 'fuera') return 'Afuera';
  if (f.papel === 'principal') return f.apiladas > 1 ? `Principal, apilada con ${f.apiladas - 1} más` : 'Principal';
  if (f.papel === 'cruzada') return f.apiladas > 1 ? `Cruzada (apilada con ${f.apiladas - 1} más)` : 'Cruzada';
  return 'Sin cruzar';
};

/**
 * Antes de analizar varias planillas: cómo quedarían unidas (la principal, qué se apila, por qué
 * columna se cruza cada una) y lo que se puede cambiar: dejar una afuera, cruzarla por otra columna
 * (de las que coinciden en valores) o no cruzarla. Cada cambio muestra al momento cómo queda.
 */
export const Union: React.FC<{
  plan: UnionPlan;
  choices: UnionChoices;
  updating: boolean;
  isDark: boolean;
  onChange: (c: UnionChoices) => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ plan, choices, updating, isDark, onChange, onConfirm, onCancel }) => {
  const reason = (file: string) => plan.pasos.find((p) => p.tipo === 'omitido' && p.archivo === file);
  const toggle = (file: string, inside: boolean) =>
    onChange({ ...choices, fuera: inside ? choices.fuera.filter((f) => f !== file) : [...choices.fuera, file] });
  const setKey = (file: string, value: string) => {
    const claves = { ...choices.claves };
    const f = plan.archivos.find((a) => a.archivo === file);
    const k = f?.candidatas.find((c) => `${c.clave}\u0000${c.clave_otra}` === value);
    claves[file] = value === NONE ? null : k ? [k.clave, k.clave_otra] : null;
    onChange({ ...choices, claves });
  };
  const inside = plan.archivos.filter((f) => f.papel !== 'fuera').length;

  return (
    <>
      <section className={`flex flex-col gap-6 rounded-mio p-7 sm:p-10 lg:flex-row lg:items-end lg:justify-between ${slab(isDark)}`}>
        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl">Revisá cómo se unen.</h1>
          <p className={`mt-4 max-w-2xl text-lg leading-relaxed ${slabText(isDark)}`} aria-live="polite">
            {inside === 1 ? 'Queda una sola planilla' : `Quedan ${num(plan.filas)} filas y ${num(plan.columnas)} columnas`}, con <strong className="font-bold">{plan.principal}</strong> como principal. Si algo no te convence, cambialo abajo.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button type="button" onClick={onCancel} className={soft(isDark)}>Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={updating} className={PRIMARY}>
            {updating ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ArrowRight className="h-5 w-5" aria-hidden />} Analizar
          </button>
        </div>
      </section>

      <section className={`rounded-mio p-3 sm:p-4 ${surface(isDark)}`} aria-busy={updating}>
        <ul className="space-y-1">
          {plan.archivos.map((f) => {
            const out = f.papel === 'fuera';
            const chosen = f.elegida ? `${f.elegida[0]}\u0000${f.elegida[1]}` : NONE;
            const why = reason(f.archivo);
            const Icon = f.papel === 'cruzada' ? Link2 : Layers;
            return (
              <li key={f.archivo} className={`grid grid-cols-1 items-center gap-4 rounded-mio-sm px-4 py-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,22rem)] ${out ? 'opacity-55' : ''}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={!out} disabled={updating || (!out && inside === 1)} onChange={(e) => toggle(f.archivo, e.target.checked)} className={`h-5 w-5 cursor-pointer rounded ${FOCUS}`} />
                  <span className="sr-only">Incluir {f.archivo}</span>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${f.papel === 'principal' || f.papel === 'cruzada' ? 'bg-[#7647eb] text-white' : isDark ? 'bg-white/10' : 'bg-[#f3f3f5]'}`} aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                </label>
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-extrabold tracking-[-0.01em]" title={f.archivo}>{f.archivo}</p>
                  <p className={`mt-0.5 text-[13px] ${muted(isDark)}`}>
                    {role(f)} · {num(f.filas)} filas · {f.columnas} columnas
                    {why && !out && <> · {why.tipo === 'omitido' && why.motivo}</>}
                  </p>
                </div>
                <div>
                  {f.papel !== 'principal' && !out && f.candidatas.length > 0 && (
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-bold">Cruzar por</span>
                      <select value={chosen} disabled={updating} onChange={(e) => setKey(f.archivo, e.target.value)} className={`${field(isDark)} w-full cursor-pointer`}>
                        {f.candidatas.map((c) => (
                          <option key={`${c.clave}-${c.clave_otra}`} value={`${c.clave}\u0000${c.clave_otra}`}>
                            {keyLabel(c)}{c.sugerida ? '' : ' (no sugerida)'}
                          </option>
                        ))}
                        <option value={NONE}>No cruzar</option>
                      </select>
                    </label>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
};
