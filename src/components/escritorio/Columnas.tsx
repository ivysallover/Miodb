import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronsUpDown, Search } from 'lucide-react';
import { compact, num, type Choosing, type Column, type Result } from './desktop';
import { FOCUS, PRIMARY, field, lilac, muted, slab, slabText, soft, surface } from './ui';

/** Desde cuántas columnas aparece el buscador. */
const SEARCH_FROM = 10;

const matches = (query: string) => (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());

/** Cómo se movió una columna mes a mes, en una línea; el último mes, con la chispa lima. */
const Sparkline: React.FC<{ values: number[] }> = ({ values }) => {
  const [w, h, pad] = [128, 40, 4];
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values.map((v, i) => [(i / (values.length - 1)) * (w - pad * 2) + pad, h - pad - ((v - min) / span) * (h - pad * 2)]);
  const [lx, ly] = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0 overflow-visible" aria-hidden>
      <polyline points={points.map((p) => p.join(',')).join(' ')} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3.5} className="fill-[#bdf559]" />
    </svg>
  );
};

/** Flechas, Inicio y Fin para moverse entre las opciones de una lista (las que tienen `data-opcion`). */
const moveFocus = (e: React.KeyboardEvent<HTMLElement>) => {
  const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if (!step && e.key !== 'Home' && e.key !== 'End') return;
  const options = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-opcion]')];
  const at = options.indexOf(document.activeElement as HTMLElement);
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : Math.min(options.length - 1, Math.max(0, at + (step ?? 0)));
  e.preventDefault();
  options[next]?.focus();
};

/**
 * La primera vez que se abre una planilla, ya leída y limpia: qué analizar. Las columnas con números
 * (primero la que sugiere MIO) como bloques con su total y cómo se movieron mes a mes; abajo, las
 * categorías, que también se pueden analizar pero sin predicción ni "qué lo mueve". Doble clic o el
 * botón principal la analizan.
 */
export const Elegir: React.FC<{ choosing: Choosing; isDark: boolean; onAnalyze: (column: string) => void; onBack: () => void }> = ({ choosing, isDark, onAnalyze, onBack }) => {
  const { columnas } = choosing;
  const [picked, setPicked] = useState(columnas[0]?.nombre ?? '');
  const [query, setQuery] = useState('');
  const shown = columnas.filter((c) => matches(query)(c.nombre));
  const numbers = shown.filter((c) => c.tipo === 'numérica');
  const categories = shown.filter((c) => c.tipo === 'categórica');
  const best = columnas.find((c) => c.sugerida)?.nombre;

  const option = (c: Column) => ({
    type: 'button' as const,
    role: 'radio',
    'aria-checked': picked === c.nombre,
    'data-opcion': true,
    tabIndex: picked === c.nombre ? 0 : -1,
    onClick: () => setPicked(c.nombre),
    onDoubleClick: () => onAnalyze(c.nombre),
    onFocus: () => setPicked(c.nombre),
  });

  return (
    <>
      <section className={`flex flex-col gap-6 rounded-mio p-7 sm:p-10 lg:flex-row lg:items-end lg:justify-between ${slab(isDark)}`}>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${slabText(isDark)} [overflow-wrap:anywhere]`}>
            {choosing.nombre} · {num(choosing.filas)} filas · {choosing.n_columnas} columnas · calidad {choosing.calidad}/100
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-5xl">¿Qué querés entender?</h1>
          <p className={`mt-4 max-w-2xl text-lg leading-relaxed ${slabText(isDark)}`}>
            Elegí un número: MIO busca qué lo mueve, lo que se sale de lo normal y, si hay fechas, cómo sigue. Después lo podés cambiar arriba del resultado.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <button type="button" onClick={onBack} className={soft(isDark)}>Volver</button>
          <button type="button" onClick={() => onAnalyze(picked)} disabled={!picked} className={`${PRIMARY} max-w-[24rem]`}>
            <span className="truncate">Analizar {picked}</span> <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        </div>
      </section>

      {columnas.length >= SEARCH_FROM && (
        <label className={`flex items-center gap-3 rounded-mio px-5 ${surface(isDark)}`}>
          <Search className={`h-5 w-5 ${muted(isDark)}`} aria-hidden />
          <span className="sr-only">Buscar una columna</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar una columna" className="min-h-[56px] w-full bg-transparent text-base font-medium outline-none placeholder:text-zinc-500" />
        </label>
      )}

      {numbers.length > 0 ? (
        <div role="radiogroup" aria-label="Columnas con números" onKeyDown={moveFocus} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 2xl:grid-cols-3">
          {numbers.map((c) => {
            const on = picked === c.nombre;
            return (
              <button
                key={c.nombre}
                {...option(c)}
                className={`flex min-h-[156px] min-w-0 flex-col justify-between gap-5 rounded-mio p-5 text-left transition-colors duration-200 cursor-pointer sm:p-6 ${FOCUS} ${
                  on ? 'bg-[#7647eb] text-white' : `${surface(isDark)} ${isDark ? 'hover:bg-[#1a1530]' : 'hover:bg-[#efeaff]'}`
                }`}
              >
                <span className="flex w-full items-start justify-between gap-3">
                  <span className="min-w-0 text-xl font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">{c.nombre}</span>
                  {c.nombre === best && <span className="shrink-0 rounded-full bg-[#bdf559] px-2.5 py-1 text-xs font-bold text-zinc-950">La que sugiere MIO</span>}
                </span>
                <span className="flex w-full items-end justify-between gap-4">
                  <span className="min-w-0">
                    <span className={`block text-xs font-bold ${on ? 'text-white/75' : muted(isDark)}`}>{c.meses ? `Total · ${c.meses.length} meses` : 'Total'}</span>
                    <span className="block text-2xl font-extrabold tabular-nums tracking-[-0.02em]">{compact(c.total ?? 0)}</span>
                  </span>
                  {c.meses && <span className={on ? 'text-white' : isDark ? 'text-[#a58bff]' : 'text-[#7647eb]'}><Sparkline values={c.meses} /></span>}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className={`rounded-mio p-6 text-base ${surface(isDark)}`}>{query ? 'Ninguna columna con números se llama así.' : 'Esta planilla no tiene columnas con números: se puede analizar una categoría.'}</p>
      )}

      {categories.length > 0 && (
        <section className={`rounded-mio p-5 sm:p-6 ${surface(isDark)}`}>
          <h2 className="text-lg font-extrabold tracking-[-0.01em]">Categorías</h2>
          <p className={`mt-1 text-sm ${muted(isDark)}`}>También se pueden analizar, pero sin predicción ni qué las mueve.</p>
          <div role="radiogroup" aria-label="Categorías" onKeyDown={moveFocus} className="mt-4 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.nombre}
                {...option(c)}
                className={`inline-flex min-h-[40px] max-w-full items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200 cursor-pointer ${FOCUS} ${
                  picked === c.nombre ? 'bg-[#7647eb] text-white' : isDark ? 'bg-white/[0.08] hover:bg-white/[0.16]' : 'bg-[#f3f3f5] hover:bg-[#e4dcff]'
                }`}
              >
                <span className="truncate">{c.nombre}</span>
                <span className="font-mono text-xs font-medium opacity-70">{num(c.distintos)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

/**
 * Arriba del resultado: lo que se analiza, en un bloque que abre la lista de columnas (las que sugiere
 * MIO, los otros números y las categorías) para analizar otra. Se cierra con Esc o tocando afuera.
 */
export const CambiarColumna: React.FC<{ result: Result; isDark: boolean; busy: boolean; onAnalyze: (column: string) => void }> = ({ result, isDark, busy, onAnalyze }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const p = result.profile;
  const current = result.targetCol;

  const groups = useMemo(() => {
    const suggested = p.suggestedTargets as string[];
    const all = [
      { label: 'Las que sugiere MIO', names: suggested },
      { label: 'Otros números', names: (p.numericColumns as string[]).filter((c) => !suggested.includes(c)) },
      { label: 'Categorías (sin predicción)', names: p.categoricalColumns as string[] },
    ];
    return all.map((g) => ({ ...g, names: g.names.filter(matches(query)) })).filter((g) => g.names.length > 0);
  }, [p, query]);
  const total = p.numericColumns.length + p.categoricalColumns.length;

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !box.current?.contains(e.target as Node) && close(false);
    document.addEventListener('pointerdown', outside);
    // Al abrir, el foco va a la columna actual (o al buscador, si lo hay).
    box.current?.querySelector<HTMLElement>('[data-buscar], [aria-selected="true"]')?.focus();
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const pick = (name: string) => {
    close();
    if (name !== current) onAnalyze(name);
  };

  return (
    <div
      ref={box}
      className="relative"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return;
        e.stopPropagation();
        close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={busy}
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        className={`flex min-h-[68px] w-full min-w-[16rem] items-center justify-between gap-4 rounded-mio-sm px-4 py-3 text-left transition-colors duration-200 cursor-pointer disabled:opacity-60 sm:w-auto ${FOCUS} ${lilac(isDark)} ${isDark ? 'hover:bg-[#2b2156]' : 'hover:bg-[#ddd3ff]'}`}
      >
        <span className="min-w-0">
          <span className={`block text-xs font-bold ${muted(isDark)}`}>Lo que se analiza</span>
          <span className="block max-w-[18rem] truncate text-lg font-extrabold tracking-[-0.01em]">{current}</span>
        </span>
        <ChevronsUpDown className="h-5 w-5 shrink-0 opacity-70" aria-hidden />
      </button>

      {open && (
        <div className={`absolute right-0 top-full z-30 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-mio p-2 shadow-[0_28px_60px_-24px_rgba(11,9,20,0.45)] ${slab(isDark)}`}>
          {total >= SEARCH_FROM && (
            <label className="mb-1 flex items-center gap-2 px-2">
              <Search className={`h-4 w-4 ${muted(isDark)}`} aria-hidden />
              <span className="sr-only">Buscar una columna</span>
              <input data-buscar value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar" className={`${field(isDark)} min-h-[40px] w-full`} />
            </label>
          )}
          <div id={listId} role="listbox" aria-label="Columnas" onKeyDown={moveFocus} className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain">
            {groups.length === 0 && <p className={`px-3 py-4 text-sm ${muted(isDark)}`}>Ninguna columna se llama así.</p>}
            {groups.map((g) => (
              <div key={g.label} role="group" aria-label={g.label} className="py-1">
                <p className={`px-3 pb-1 pt-2 text-xs font-bold ${muted(isDark)}`}>{g.label}</p>
                {g.names.map((name) => {
                  const on = name === current;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={on}
                      data-opcion
                      onClick={() => pick(name)}
                      className={`flex min-h-[40px] w-full items-center justify-between gap-3 rounded-mio-sm px-3 text-left text-[15px] transition-colors duration-150 cursor-pointer ${FOCUS} ${
                        on ? `font-bold ${isDark ? 'text-[#bdb0ff]' : 'text-[#5b32cc]'}` : ''
                      } ${isDark ? 'hover:bg-white/[0.07]' : 'hover:bg-[#f3f3f5]'}`}
                    >
                      <span className="truncate">{name}</span>
                      {on && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
