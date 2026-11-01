import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Filter, Loader2, Search, X } from 'lucide-react';
import { desktop, num, type ActiveFilter, type Condition, type Field, type Fields } from './desktop';
import { FOCUS, PRIMARY, field as fieldStyle, lilac, muted, slab, slabHover, soft } from './ui';

/** "01/02/2025" de "2025-02-01". */
const day = (iso: string) => iso.split('-').reverse().join('/');

/** Una condición en palabras. */
const words = (c: Condition) => {
  if ('valores' in c) return `${c.columna}: ${c.valores.length > 3 ? `${c.valores.length} valores` : c.valores.join(', ')}`;
  return `${c.columna}: ${c.desde ? `desde ${day(c.desde)}` : ''}${c.desde && c.hasta ? ' ' : ''}${c.hasta ? `hasta ${day(c.hasta)}` : ''}`;
};

/** Lo que se está mirando, cuando no es toda la planilla: qué condiciones, cuántas filas, y cambiarlo o volver a todo. */
export const FiltroActivo: React.FC<{ filter: ActiveFilter; busy: boolean; isDark: boolean; onChange: () => void; onClear: () => void }> = ({ filter, busy, isDark, onChange, onClear }) => (
  <section className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-mio px-5 py-4 sm:px-7 ${lilac(isDark)}`} data-no-print>
    <div className="min-w-0 flex-1">
      <p className="text-lg font-extrabold tracking-[-0.02em]">
        Mirando {num(filter.filas)} de {num(filter.filas_total)} filas.
      </p>
      <p className={`mt-0.5 text-sm [overflow-wrap:anywhere] ${muted(isDark)}`}>{filter.condiciones.map(words).join(' · ')}. Todo lo de abajo, y lo que exportes, sale de estas filas.</p>
    </div>
    <span className="flex flex-wrap gap-2">
      <button type="button" onClick={onChange} disabled={busy} className={soft(isDark)}>Cambiar</button>
      <button type="button" onClick={onClear} disabled={busy} className={soft(isDark)}>
        <X className="h-4 w-4" aria-hidden /> Ver toda la planilla
      </button>
    </span>
  </section>
);

/** Lo elegido de una columna: los valores marcados o las dos puntas de las fechas. */
type Draft = Record<string, { valores?: string[]; desde?: string; hasta?: string }>;

const toDraft = (conditions: Condition[]): Draft =>
  Object.fromEntries(conditions.map((c) => ('valores' in c ? [c.columna, { valores: c.valores }] : [c.columna, { desde: c.desde, hasta: c.hasta }])));

const toConditions = (draft: Draft): Condition[] =>
  Object.entries(draft).flatMap(([columna, d]): Condition[] => {
    if (d.valores) return d.valores.length ? [{ columna, valores: d.valores }] : [];
    return d.desde || d.hasta ? [{ columna, desde: d.desde ?? '', hasta: d.hasta ?? '' }] : [];
  });

/** Los valores de una columna, para marcar los que quedan. */
const Valores: React.FC<{ f: Field; marked: string[]; isDark: boolean; onChange: (values: string[]) => void }> = ({ f, marked, isDark, onChange }) => {
  const [query, setQuery] = useState('');
  const values = f.valores ?? [];
  const shown = values.filter(([v]) => v.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (v: string) => onChange(marked.includes(v) ? marked.filter((x) => x !== v) : [...marked, v]);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {values.length > 8 && (
          <label className="relative min-w-[12rem] flex-1">
            <span className="sr-only">Buscar un valor</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" className={`${fieldStyle(isDark)} w-full pl-9`} />
          </label>
        )}
        <button type="button" onClick={() => onChange(Array.from(new Set([...marked, ...shown.map(([v]) => v)])))} className={`${soft(isDark)} min-h-[40px] px-4`}>Marcar {query ? 'estos' : 'todos'}</button>
        <button type="button" onClick={() => onChange([])} disabled={!marked.length} className={`${soft(isDark)} min-h-[40px] px-4`}>Ninguno</button>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto" aria-label={`Valores de ${f.nombre}`}>
        {shown.map(([v, k]) => {
          const on = marked.includes(v);
          return (
            <li key={v}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => toggle(v)} className={`flex min-h-[40px] w-full items-center gap-3 rounded-mio-sm px-2 text-left text-sm cursor-pointer ${FOCUS} ${slabHover(isDark)}`}>
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] ${on ? 'bg-pal-violet text-white' : isDark ? 'bg-white/10' : 'bg-zinc-950/10'}`}>
                  {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold" title={v}>{v}</span>
                <span className={`font-mono text-xs tabular-nums ${muted(isDark)}`}>{num(k)}</span>
              </button>
            </li>
          );
        })}
        {!shown.length && <li className={`p-2 text-sm ${muted(isDark)}`}>Ningún valor con eso.</li>}
      </ul>
    </div>
  );
};

/**
 * Elegir qué parte de la planilla mirar: de cada columna, los valores que quedan, y de una fecha, desde
 * y hasta cuándo. Tienen que cumplirse todas las columnas elegidas. Al aplicar se vuelve a analizar
 * solo eso; la planilla y el proyecto guardado no cambian.
 */
export const ElegirFiltro: React.FC<{ current: Condition[]; isDark: boolean; onApply: (conditions: Condition[]) => void; onClose: () => void }> = ({ current, isDark, onApply, onClose }) => {
  const [fields, setFields] = useState<Fields | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => toDraft(current));
  const [column, setColumn] = useState<string | null>(current[0]?.columna ?? null);

  useEffect(() => {
    desktop.fields().then(setFields, (e) => setError(String(e?.message || e)));
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Primero las fechas y las categorías; los números solo si tienen pocos valores.
  const options = useMemo(() => {
    const all = (fields?.columnas ?? []).filter((f) => f.desde || (f.valores && f.valores.length >= 2));
    const rank = (f: Field) => (f.desde ? 0 : f.tipo === 'numérica' ? 2 : 1);
    return [...all].sort((a, b) => rank(a) - rank(b));
  }, [fields]);
  const open = options.find((f) => f.nombre === column) ?? options[0];
  const conditions = toConditions(draft);
  const set = (name: string, d: Draft[string]) => setDraft((old) => ({ ...old, [name]: d }));
  const chosen = (f: Field) => {
    const d = draft[f.nombre];
    if (!d) return null;
    return d.valores ? (d.valores.length ? String(d.valores.length) : null) : d.desde || d.hasta ? '✓' : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-pal-ink/40 p-3 sm:items-center" data-no-print onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Filtrar la planilla"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        className={`flex h-[85vh] max-h-[720px] w-full max-w-4xl flex-col rounded-mio p-5 sm:p-7 ${slab(isDark)}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-[-0.035em]">Filtrar</h2>
            <p className={`mt-1 text-sm ${muted(isDark)}`}>Elegí qué filas mirar y MIO vuelve a analizar solo esas. Tu planilla no cambia.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={`rounded-full p-2 cursor-pointer ${FOCUS} ${isDark ? 'hover:bg-white/10' : 'hover:bg-[#f3f3f5]'}`}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {error && <p className="mt-5 text-sm font-bold text-[#b4233a]" role="alert">{error}</p>}
        {!fields && !error && (
          <p className={`mt-6 flex items-center gap-2 text-sm ${muted(isDark)}`}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Leyendo las columnas…
          </p>
        )}
        {fields && !options.length && <p className={`mt-6 text-sm ${muted(isDark)}`}>Esta planilla no tiene fechas ni columnas con pocos valores para filtrar.</p>}
        {open && (
          <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
            <ul className="max-h-40 overflow-y-auto sm:max-h-none" aria-label="Columnas">
              {options.map((f) => (
                <li key={f.nombre}>
                  <button type="button" aria-current={f === open} onClick={() => setColumn(f.nombre)} className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-mio-sm px-3 text-left text-sm font-bold cursor-pointer ${FOCUS} ${f === open ? (isDark ? 'bg-white/10' : 'bg-[#f3f3f5]') : slabHover(isDark)}`}>
                    <span className="min-w-0 truncate" title={f.nombre}>{f.nombre}</span>
                    {chosen(f) && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-pal-violet px-1.5 text-xs text-white">{chosen(f)}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex min-h-0 flex-col">
              {open.desde ? (
                <div className="flex flex-wrap gap-3">
                  {(['desde', 'hasta'] as const).map((end) => (
                    <label key={end} className="flex flex-col gap-1 text-sm font-bold">
                      {end === 'desde' ? 'Desde' : 'Hasta'}
                      <input
                        type="date"
                        min={open.desde}
                        max={open.hasta}
                        value={draft[open.nombre]?.[end] ?? ''}
                        onChange={(e) => set(open.nombre, { ...draft[open.nombre], [end]: e.target.value })}
                        className={fieldStyle(isDark)}
                      />
                    </label>
                  ))}
                  <p className={`w-full text-[13px] ${muted(isDark)}`}>La planilla va del {day(open.desde)} al {day(open.hasta!)}.</p>
                </div>
              ) : (
                <Valores key={open.nombre} f={open} marked={draft[open.nombre]?.valores ?? []} isDark={isDark} onChange={(valores) => set(open.nombre, { valores })} />
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">
          {conditions.length > 0 && <button type="button" onClick={() => setDraft({})} className={soft(isDark)}>Limpiar todo</button>}
          <button type="button" onClick={() => onApply(conditions)} disabled={!conditions.length && !current.length} className={PRIMARY}>
            <Filter className="h-5 w-5" aria-hidden /> {conditions.length ? 'Analizar estas filas' : 'Ver toda la planilla'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
