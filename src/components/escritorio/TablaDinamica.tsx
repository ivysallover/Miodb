import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, FileSpreadsheet, Loader2, Sheet } from 'lucide-react';
import { Block, H2 } from '@/components/dashboard/blocks';
import { desktop, num, type Calc, type Fields, type Period, type PivotRequest, type PivotTable } from './desktop';
import { Leyendo, Selector, groupable, numeric, useCampos } from './Selector';
import { muted, soft, surface } from './ui';

const DynamicChartRenderer = lazy(() => import('@/components/DynamicChartRenderer'));

const CALCS: { id: Calc; label: string; word: string }[] = [
  { id: 'suma', label: 'Suma', word: 'Suma' },
  { id: 'promedio', label: 'Promedio', word: 'Promedio' },
  { id: 'maximo', label: 'Máximo', word: 'Máximo' },
  { id: 'minimo', label: 'Mínimo', word: 'Mínimo' },
];
const PERIODS: { id: Period; label: string; by: string }[] = [
  { id: 'dia', label: 'Día', by: 'día' },
  { id: 'semana', label: 'Semana', by: 'semana' },
  { id: 'mes', label: 'Mes', by: 'mes' },
  { id: 'trimestre', label: 'Trimestre', by: 'trimestre' },
  { id: 'anio', label: 'Año', by: 'año' },
];
/** Cuántos grupos entran en el gráfico de arriba, y cuántas líneas. */
const CHART_BARS = 15;
const CHART_LINES = 6;

const cell = (v: number | null, decimals: number) => (v == null ? '–' : num(v, decimals));

/** Lo que se ve al entrar: por mes si hay fechas (si no, por la primera categoría) de lo que se está analizando. */
export const firstPivot = (fields: Fields, target?: string | null): PivotRequest | null => {
  const groups = fields.columnas.filter(groupable);
  const rows = groups.find((f) => f.desde) ?? groups.find((f) => !numeric(f)) ?? groups[0];
  if (!rows) return null;
  const numbers = fields.columnas.filter(numeric);
  const value = numbers.find((f) => f.nombre === target) ?? numbers[0];
  return { filas: rows.nombre, columnas: '', valor: value?.nombre ?? '', calculo: 'suma', periodo: 'mes' };
};

/** Lo que dibuja el gráfico de arriba: en el tiempo, líneas (una por columna, si hay); si no, los grupos más grandes en barras. */
const chartOf = (t: PivotTable, what: string) => {
  const hasCols = t.etiquetas_columnas.length > 0;
  if (t.dias_filas) {
    const lines = hasCols ? t.etiquetas_columnas.slice(0, CHART_LINES) : [what];
    const source = t.dias_filas.map((d, r) => Object.fromEntries([['periodo', d], ...lines.map((name, k) => [name, hasCols ? t.celdas[r][k] : t.total_filas[r]])]));
    return { chartId: 'tabla_tiempo', metadata: { title: what }, layoutDirectives: { chartType: 'LineChart', xAxisType: 'time', yAxisType: 'value' }, dataset: { dimensions: ['periodo', ...lines], source } };
  }
  const source = t.etiquetas_filas.map((name, r) => ({ grupo: name, [what]: t.total_filas[r] })).filter((r) => r[what] != null && r.grupo !== 'Otros');
  const biggest = [...source].sort((a, b) => Number(b[what]) - Number(a[what])).slice(0, CHART_BARS);
  return { chartId: 'tabla_grupos', metadata: { title: what }, layoutDirectives: { chartType: 'HorizontalBar', xAxisType: 'value', yAxisType: 'category' }, dataset: { dimensions: ['grupo', what], source: biggest } };
};

/**
 * Cruzar los datos sin salir de MIO: qué va en las filas, qué en las columnas y qué se calcula. Las
 * fechas se agrupan por el período que se elija. Se puede ordenar tocando un encabezado y guardar en
 * Excel o CSV. Se calcula en el motor (`explore::pivot`), con todas las filas.
 */
export const TablaDinamica: React.FC<{
  request: PivotRequest | null;
  onRequest: (r: PivotRequest) => void;
  target?: string | null;
  /** Cambia cuando cambia lo que se está mirando (el filtro). */
  version: string;
  isDark: boolean;
  onExport: (r: PivotRequest, format: 'xlsx' | 'csv') => void;
}> = ({ request, onRequest, target, version, isDark, onExport }) => {
  const { fields, error: fieldsError } = useCampos();
  const [table, setTable] = useState<PivotTable | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** Por qué columna se ordena (`-1`, el total), y para dónde; sin elegir, como viene. */
  const [sort, setSort] = useState<{ by: number; up: boolean } | null>(null);
  const turn = useRef(0);

  const known = (name: string) => !name || !!fields?.columnas.some((f) => f.nombre === name);
  const req = useMemo(() => {
    if (!fields) return null;
    return request && known(request.filas) && known(request.columnas) && known(request.valor) ? request : firstPivot(fields, target);
  }, [fields, request, target]);

  useEffect(() => {
    if (!req) return;
    const id = ++turn.current;
    setLoading(true);
    desktop.pivot(req).then(
      (t) => {
        if (id !== turn.current) return;
        setTable(t);
        setError(null);
        setSort(null);
        setLoading(false);
      },
      (e) => {
        if (id !== turn.current) return;
        setError(String(e?.message || e));
        setLoading(false);
      },
    );
  }, [req, version]);

  const order = useMemo(() => {
    const rows = table ? table.etiquetas_filas.map((_, r) => r) : [];
    if (!table || !sort) return rows;
    const at = (r: number) => (sort.by < 0 ? table.total_filas[r] : table.celdas[r][sort.by]) ?? -Infinity;
    return rows.sort((a, b) => (sort.up ? at(a) - at(b) : at(b) - at(a)));
  }, [table, sort]);

  const what = !req || !req.valor ? 'Cantidad de filas' : `${(CALCS.find((c) => c.id === req.calculo) ?? CALCS[0]).word} de ${req.valor}`;
  // Se arma una vez por tabla: un gráfico nuevo en cada dibujo se volvería a animar con cada toque.
  const chart = useMemo(() => (table ? chartOf(table, what) : null), [table]);

  if (fieldsError) return <p className={`rounded-mio p-6 ${surface(isDark)}`}>{fieldsError}</p>;
  if (!fields) return <Leyendo isDark={isDark} />;
  if (loading && !table && !error) return <Leyendo isDark={isDark} />;
  if (!req) return <p className={`rounded-mio p-6 ${surface(isDark)}`}>Esta planilla no tiene fechas ni columnas con pocos valores para agrupar.</p>;

  const set = (patch: Partial<PivotRequest>) => onRequest({ ...req, ...patch });
  const groups = fields.columnas.filter(groupable).map((f) => ({ id: f.nombre, label: f.nombre }));
  const dates = fields.columnas.filter((f) => f.desde).map((f) => f.nombre);
  const usesDate = dates.includes(req.filas) || dates.includes(req.columnas);
  const period = PERIODS.find((p) => p.id === req.periodo) ?? PERIODS[2];

  const byRows = dates.includes(req.filas) ? period.by : req.filas;
  const byCols = req.columnas ? ` y ${dates.includes(req.columnas) ? period.by : req.columnas}` : '';
  // Con decimales solo si hace falta: los promedios y las columnas con centavos.
  const every = table ? [...table.total_filas, ...table.celdas.flat()].filter((v): v is number => v != null) : [];
  const decimals = every.some((v) => !Number.isInteger(v)) ? 2 : 0;
  const biggest = Math.max(1e-9, ...(table ? table.celdas.flat().map((v) => Math.abs(v ?? 0)) : [0]));
  const line = 'whitespace-nowrap px-3 py-2 text-right tabular-nums';
  const head = isDark ? 'bg-pal-surface-dark' : 'bg-white';
  const toggle = (by: number) => setSort((s) => (s?.by === by ? (s.up ? null : { by, up: true }) : { by, up: false }));
  const arrow = (by: number) => (sort?.by === by ? (sort.up ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />) : null);
  const ariaSort = (by: number) => (sort?.by === by ? (sort.up ? 'ascending' : 'descending') : undefined);

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
      <Block span={12} tone="white" isDark={isDark}>
        <div className="flex flex-wrap gap-3">
          <Selector label="En las filas" value={req.filas} options={groups} isDark={isDark} onChange={(filas) => set({ filas, columnas: filas === req.columnas ? '' : req.columnas })} />
          <Selector label="En las columnas" value={req.columnas} options={[{ id: '', label: 'Nada' }, ...groups.filter((g) => g.id !== req.filas)]} isDark={isDark} onChange={(columnas) => set({ columnas })} />
          <Selector label="Qué se mira" value={req.valor} options={[{ id: '', label: 'Cantidad de filas' }, ...fields.columnas.filter(numeric).map((f) => ({ id: f.nombre, label: f.nombre }))]} isDark={isDark} onChange={(valor) => set({ valor })} />
          {req.valor && <Selector label="Cómo se calcula" value={req.calculo} options={CALCS} isDark={isDark} onChange={(calculo) => set({ calculo })} />}
          {usesDate && <Selector label="Las fechas, por" value={req.periodo} options={PERIODS} isDark={isDark} onChange={(periodo) => set({ periodo })} />}
        </div>
      </Block>

      {error && <Block span={12} tone="mute" isDark={isDark}><p className="text-lg font-bold" role="alert">{error}</p></Block>}

      {table && !error && (
        <>
          {table.etiquetas_filas.length >= 2 && (
            <Block span={12} tone="white" kicker={what} isDark={isDark} className={`h-[28rem] transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
              <h3 className={H2}>Por {byRows}{byCols}.</h3>
              <div className="relative mt-3 min-h-0 flex-1">
                <div className="absolute inset-0">
                  <Suspense fallback={null}>
                    <DynamicChartRenderer key={`${req.filas}-${req.columnas}-${req.periodo}`} payload={chart as never} height="fill" />
                  </Suspense>
                </div>
              </div>
            </Block>
          )}
          <Block span={12} tone="white" isDark={isDark} className={`transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-lg font-extrabold tracking-[-0.02em]">{what}{loading && <Loader2 className="h-4 w-4 animate-spin" aria-label="Calculando" />}</p>
              <span className="flex gap-2" data-no-print>
                <button type="button" onClick={() => onExport(req, 'xlsx')} className={`${soft(isDark)} min-h-[40px] px-4`}><FileSpreadsheet className="h-4 w-4" aria-hidden /> Excel</button>
                <button type="button" onClick={() => onExport(req, 'csv')} className={`${soft(isDark)} min-h-[40px] px-4`}><Sheet className="h-4 w-4" aria-hidden /> CSV</button>
              </span>
            </div>
            <div className="mt-4 max-h-[70vh] overflow-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={`sticky left-0 top-0 z-20 px-3 py-2 text-left font-bold ${head}`}>{req.filas}</th>
                    {table.etiquetas_columnas.map((c, k) => (
                      <th key={c} scope="col" aria-sort={ariaSort(k)} className={`sticky top-0 z-10 p-0 font-bold ${head}`}>
                        <button type="button" onClick={() => toggle(k)} className="ml-auto flex items-center gap-1 whitespace-nowrap px-3 py-2 cursor-pointer">{arrow(k)}{c}</button>
                      </th>
                    ))}
                    <th scope="col" aria-sort={ariaSort(-1)} className={`sticky top-0 z-10 p-0 font-extrabold ${head}`}>
                      <button type="button" onClick={() => toggle(-1)} className="ml-auto flex items-center gap-1 px-3 py-2 cursor-pointer">{arrow(-1)}Total</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.map((r) => (
                    <tr key={table.etiquetas_filas[r]}>
                      <th scope="row" className={`sticky left-0 z-10 max-w-[16rem] truncate px-3 py-2 text-left font-semibold ${head}`} title={table.etiquetas_filas[r]}>{table.etiquetas_filas[r]}</th>
                      {table.celdas[r].map((v, k) => (
                        <td key={k} className={`${line} rounded-[6px]`} style={v == null ? undefined : { background: `rgb(var(--pal-violet) / ${(0.04 + (Math.abs(v) / biggest) * 0.3).toFixed(3)})` }}>{cell(v, decimals)}</td>
                      ))}
                      <td className={`${line} font-extrabold`}>{cell(table.total_filas[r], decimals)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" className={`sticky bottom-0 left-0 z-20 px-3 py-2 text-left font-extrabold ${head}`}>Total</th>
                    {table.total_columnas.map((v, k) => <td key={k} className={`${line} sticky bottom-0 font-extrabold ${head}`}>{cell(v, decimals)}</td>)}
                    <td className={`${line} sticky bottom-0 font-extrabold ${head}`}>{cell(table.total, decimals)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {(table.otras_filas > 0 || table.otras_columnas > 0) && (
              <p className={`mt-3 text-[13px] ${muted(isDark)}`}>
                En «Otros» se juntan {[table.otras_filas > 0 && `${num(table.otras_filas)} filas`, table.otras_columnas > 0 && `${num(table.otras_columnas)} columnas`].filter(Boolean).join(' y ')} de esta tabla: las que menos pesan.
              </p>
            )}
          </Block>
        </>
      )}
    </div>
  );
};
