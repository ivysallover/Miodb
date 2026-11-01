import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Block, H2 } from '@/components/dashboard/blocks';
import { compact, desktop, num, type CompareRequest, type CompareSide, type Comparison, type Fields } from './desktop';
import { FROM_FILE } from './panorama';
import { Leyendo, Selector, numeric, useCampos } from './Selector';
import { muted, surface } from './ui';

const DynamicChartRenderer = lazy(() => import('@/components/DynamicChartRenderer'));

const pct = (x: number) => `${num(x * 100, x !== 0 && Math.abs(x) < 0.1 ? 1 : 0)} %`;
const amount = (x: number | null) => (x == null ? '–' : num(x, Number.isInteger(x) ? 0 : 2));

/** Las columnas que se pueden comparar: categorías con al menos dos valores. */
const comparable = (fields: Fields) => fields.columnas.filter((f) => !numeric(f) && (f.valores?.length ?? 0) >= 2);

/** Cuántos grupos tiene, como mucho, una columna para empezar por ella; ni el archivo de origen ni un código dicen mucho. */
const FEW_GROUPS = 12;
const plain = (name: string) => name !== FROM_FILE && !/(^|[_\s])(id|cod|codigo|código)($|[_\s])/i.test(name);

/** Lo que se ve al entrar: los dos valores con más filas de la primera categoría con pocos grupos, en lo que se está analizando. */
export const firstCompare = (fields: Fields, target?: string | null): CompareRequest | null => {
  const columns = comparable(fields);
  const column = columns.find((f) => plain(f.nombre) && f.valores!.length <= FEW_GROUPS) ?? columns[0];
  if (!column?.valores) return null;
  const numbers = fields.columnas.filter(numeric);
  const value = numbers.find((f) => f.nombre === target) ?? numbers[0];
  return { columna: column.nombre, a: column.valores[0][0], b: column.valores[1][0], objetivo: value?.nombre ?? '' };
};

/** La diferencia en una frase: cuánto más tiene uno que el otro, o que son casi iguales. */
export const headline = (c: Comparison): string => {
  const what = c.objetivo ?? 'filas';
  const [x, y] = c.objetivo ? [c.a.suma ?? 0, c.b.suma ?? 0] : [c.a.filas, c.b.filas];
  const [top, low, hi, lo] = x >= y ? [c.a.valor, c.b.valor, x, y] : [c.b.valor, c.a.valor, y, x];
  if (lo <= 0) return `${top} tiene ${amount(hi)} de ${what} y ${low}, ${amount(lo)}.`;
  const more = hi / lo - 1;
  if (more < 0.02) return `${c.a.valor} y ${c.b.valor} tienen casi lo mismo de ${what}.`;
  return more >= 1 ? `${top} tiene ${num(hi / lo, 1)} veces más ${what} que ${low}.` : `${top} tiene ${pct(more)} más de ${what} que ${low}.`;
};

/** Un grupo: su total en grande y sus números. */
const Lado: React.FC<{ side: CompareSide; target: string | null; tone: 'violet' | 'ink'; isDark: boolean }> = ({ side, target, tone, isDark }) => (
  <Block span={6} tone={tone} kicker={side.valor} isDark={isDark} sheet>
    <p className="text-5xl font-extrabold leading-none tracking-[-0.045em] text-pal-lime sm:text-6xl">{target ? compact(side.suma ?? 0) : num(side.filas)}</p>
    <p className="mt-3 text-xl font-bold tracking-[-0.02em]">{target ? `de ${target}, en ${num(side.filas)} filas` : 'filas'}</p>
    <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ['De toda la planilla', `${pct(side.parte)} de las filas`],
        ...(target ? [['Promedio', amount(side.promedio)], ['Mediana', amount(side.mediana)], ['De punta a punta', `${compact(side.minimo ?? 0)} a ${compact(side.maximo ?? 0)}`]] : []),
      ].map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-mio-sm bg-white/[0.09] px-3.5 py-3">
          <dt className="text-xs text-white/85">{label}</dt>
          <dd className="mt-1 text-sm font-bold [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  </Block>
);

/**
 * Dos valores frente a frente (dos sucursales, dos marcas): cuál tiene más y cuánto, los dos en el tiempo,
 * lo que más los diferencia y sus otros promedios. Sale del motor (`explore::compare`), con todas las filas.
 */
export const Comparar: React.FC<{
  request: CompareRequest | null;
  onRequest: (r: CompareRequest) => void;
  target?: string | null;
  /** Cambia cuando cambia lo que se está mirando (el filtro). */
  version: string;
  isDark: boolean;
}> = ({ request, onRequest, target, version, isDark }) => {
  const { fields, error: fieldsError } = useCampos();
  const [c, setC] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turn = useRef(0);

  const columns = useMemo(() => (fields ? comparable(fields) : []), [fields]);
  const req = useMemo(() => {
    if (!fields) return null;
    const column = columns.find((f) => f.nombre === request?.columna);
    const has = (v?: string) => !!column?.valores?.some(([x]) => x === v);
    return request && has(request.a) && has(request.b) ? request : firstCompare(fields, target);
  }, [fields, columns, request, target]);

  useEffect(() => {
    if (!req) return;
    const id = ++turn.current;
    setLoading(true);
    desktop.compare(req).then(
      (out) => {
        if (id !== turn.current) return;
        setC(out);
        setError(null);
        setLoading(false);
      },
      (e) => {
        if (id !== turn.current) return;
        setError(String(e?.message || e));
        setLoading(false);
      },
    );
  }, [req, version]);

  const chart = useMemo(() => {
    if (!c?.tiempo) return null;
    const { dias, a, b } = c.tiempo;
    const [nameA, nameB] = [c.a.valor, c.b.valor === c.a.valor ? `${c.b.valor} (2)` : c.b.valor];
    const source = dias.map((d, i) => ({ mes: d, [nameA]: a[i], [nameB]: b[i] }));
    return { chartId: 'comparar_tiempo', metadata: { title: 'Mes a mes' }, layoutDirectives: { chartType: 'LineChart', xAxisType: 'time', yAxisType: 'value' }, dataset: { dimensions: ['mes', nameA, nameB], source } };
  }, [c]);

  if (fieldsError) return <p className={`rounded-mio p-6 ${surface(isDark)}`}>{fieldsError}</p>;
  if (!fields) return <Leyendo isDark={isDark} />;
  if (!req) return <p className={`rounded-mio p-6 ${surface(isDark)}`}>Para comparar hace falta una columna con nombres que se repitan, como sucursales o marcas, y esta planilla no tiene.</p>;
  // La primera vez puede tener que leer la planilla entera.
  if (loading && !c) return <Leyendo isDark={isDark} />;

  const column = columns.find((f) => f.nombre === req.columna) ?? columns[0];
  const values = (column.valores ?? []).map(([v, k]) => ({ id: v, label: `${v} (${num(k)})` }));
  const set = (patch: Partial<CompareRequest>) => onRequest({ ...req, ...patch });
  const changeColumn = (columna: string) => {
    const next = columns.find((f) => f.nombre === columna)?.valores ?? [];
    set({ columna, a: next[0]?.[0] ?? '', b: next[1]?.[0] ?? '' });
  };
  const bar = (share: number, tone: string) => (
    <span className={`block h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-950/10'}`}>
      <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(1, share * 100))}%` }} />
    </span>
  );

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
      <Block span={12} tone="white" isDark={isDark}>
        <div className="flex flex-wrap gap-3">
          <Selector label="Qué querés comparar" value={req.columna} options={columns.map((f) => ({ id: f.nombre, label: f.nombre }))} isDark={isDark} onChange={changeColumn} />
          <Selector label="Esto" value={req.a} options={values} isDark={isDark} onChange={(a) => set({ a })} />
          <Selector label="Contra esto" value={req.b} options={values} isDark={isDark} onChange={(b) => set({ b })} />
          <Selector label="Medido en" value={req.objetivo} options={[{ id: '', label: 'Cantidad de filas' }, ...fields.columnas.filter(numeric).map((f) => ({ id: f.nombre, label: f.nombre }))]} isDark={isDark} onChange={(objetivo) => set({ objetivo })} />
        </div>
      </Block>

      {error && <Block span={12} tone="mute" isDark={isDark}><p className="text-lg font-bold" role="alert">{error}</p></Block>}
      {req.a === req.b && !error && <Block span={12} tone="mute" isDark={isDark}><p className="text-lg font-bold">Elegí dos valores distintos para compararlos.</p></Block>}

      {loading && <p className={`flex items-center gap-2 px-1 text-sm font-bold lg:col-span-12 ${muted(isDark)}`} role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Comparando…</p>}

      {c && !error && req.a !== req.b && !(loading && (c.a.valor !== req.a || c.b.valor !== req.b)) && (
        <>
          <Block span={12} tone="lav" kicker={`Comparando por ${c.columna}`} isDark={isDark}>
            <h2 className="text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-5xl [overflow-wrap:anywhere]">{headline(c)}</h2>
          </Block>
          <Lado side={c.a} target={c.objetivo} tone="violet" isDark={isDark} />
          <Lado side={c.b} target={c.objetivo} tone="ink" isDark={isDark} />

          {chart && (
            <Block span={12} tone="white" kicker="En el tiempo" isDark={isDark} className="h-[24rem]">
              <h3 className={H2}>Mes a mes, en {c.objetivo ?? 'filas'}.</h3>
              <div className="relative mt-3 min-h-0 flex-1">
                <div className="absolute inset-0">
                  <Suspense fallback={null}>
                    <DynamicChartRenderer key={`${c.a.valor}-${c.b.valor}-${c.objetivo}`} payload={chart as never} height="fill" />
                  </Suspense>
                </div>
              </div>
            </Block>
          )}

          {c.diferencias.length > 0 && (
            <Block span={c.numeros.length ? 7 : 12} tone="white" kicker="Qué los diferencia" isDark={isDark}>
              <h3 className={H2}>Lo que más cambia entre uno y otro.</h3>
              <p className={`mt-2 text-sm ${muted(isDark)}`}>Del total {c.objetivo ? `de ${c.objetivo}` : 'de filas'} de cada uno, cuánto corresponde a cada cosa.</p>
              <ul className="mt-5 space-y-4">
                {c.diferencias.map((d) => (
                  <li key={`${d.columna}-${d.valor}`}>
                    <p className="text-[15px] font-bold [overflow-wrap:anywhere]">{d.valor} <span className={`text-[13px] font-medium ${muted(isDark)}`}>en {d.columna}</span></p>
                    <div className="mt-1.5 grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)_3.5rem] items-center gap-x-2 gap-y-1 text-[13px]">
                      <span className="truncate" title={c.a.valor}>{c.a.valor}</span>
                      {bar(d.a, 'bg-pal-violet')}
                      <span className="text-right font-mono tabular-nums">{pct(d.a)}</span>
                      <span className="truncate" title={c.b.valor}>{c.b.valor}</span>
                      {bar(d.b, isDark ? 'bg-white/70' : 'bg-pal-ink')}
                      <span className="text-right font-mono tabular-nums">{pct(d.b)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {c.numeros.length > 0 && (
            <Block span={c.diferencias.length ? 5 : 12} tone="mute" kicker="Otros promedios" isDark={isDark}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="pb-2 font-bold">Promedio por fila</th>
                    <th scope="col" className="max-w-[7rem] truncate pb-2 text-right font-bold" title={c.a.valor}>{c.a.valor}</th>
                    <th scope="col" className="max-w-[7rem] truncate pb-2 pl-3 text-right font-bold" title={c.b.valor}>{c.b.valor}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.numeros.map((n) => (
                    <tr key={n.nombre}>
                      <th scope="row" className="py-1.5 font-semibold [overflow-wrap:anywhere]">{n.nombre}</th>
                      <td className="py-1.5 text-right tabular-nums">{amount(n.a.promedio)}</td>
                      <td className="py-1.5 pl-3 text-right tabular-nums">{amount(n.b.promedio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Block>
          )}
        </>
      )}
    </div>
  );
};
