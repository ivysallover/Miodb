import React, { useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { ForecastSection } from '@/features/dashboard/components';
import { CompetitionBlock } from '@/components/dashboard/Competition';
import { noForecastReason, readCompetition, pct } from '@/components/dashboard/insights';

/**
 * La pantalla de la app de escritorio (Tauri). Elige una planilla con el diálogo del sistema y le
 * pide al motor en Rust que la lea y la pronostique: todo pasa en esta compu, sin subir nada.
 * Versión de prueba: por ahora el motor de Rust hace la lectura y el pronóstico con la guerra de
 * modelos; la limpieza y el resto del análisis se suman en las próximas versiones.
 */

type ColumnInfo = { nombre: string; tipo: string; fecha: boolean; numero: boolean };
type Sheet = {
  archivo: string; mb: number; filas: number; columnas: ColumnInfo[];
  fecha_sugerida: string | null; valor_sugerido: string | null;
  codificacion: string; separador: string; filas_titulo: number; segundos_lectura: number;
};
type Forecast = { resultado: { chart_data: any; metrics: any }; segundos_pronostico: number; segundos_total: number; ram_pico_mb: number };

const tauri = () => (typeof window !== 'undefined' ? (window as any).__TAURI__ : undefined);
const num = (n: number, d = 0) => n.toLocaleString('es-AR', { maximumFractionDigits: d, minimumFractionDigits: d });

export const EscritorioPage: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [path, setPath] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [fecha, setFecha] = useState('');
  const [valor, setValor] = useState('');
  const [result, setResult] = useState<Forecast | null>(null);
  const [busy, setBusy] = useState<'leyendo' | 'analizando' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = tauri();

  const choose = async () => {
    setError(null);
    try {
      const picked = await t.dialog.open({ multiple: false, directory: false, filters: [{ name: 'Planillas', extensions: ['csv', 'tsv', 'txt'] }] });
      if (!picked || Array.isArray(picked)) return;
      setBusy('leyendo');
      setResult(null);
      const info: Sheet = await t.core.invoke('leer_planilla', { path: picked });
      setPath(picked);
      setSheet(info);
      setFecha(info.fecha_sugerida || '');
      setValor(info.valor_sugerido || '');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  const analyze = async () => {
    if (!path || !fecha || !valor) return;
    setError(null);
    setBusy('analizando');
    try {
      setResult(await t.core.invoke('pronosticar', { path, fecha, valor }));
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(null);
    }
  };

  const block = `rounded-mio p-6 sm:p-8 ${isDark ? 'bg-[#0e0d16] text-white' : 'bg-white text-zinc-950'}`;
  const select = `min-h-[44px] w-full rounded-mio-sm px-3 text-base font-medium ${isDark ? 'bg-white/[0.08] text-white' : 'bg-[#f3f3f5] text-zinc-950'}`;

  if (!t) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <div className={block}>
          <h1 className="text-3xl font-extrabold tracking-[-0.035em]">Esta pantalla es de la app de escritorio.</h1>
          <p className={`mt-3 text-base ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>Abrila desde MIO para escritorio: ahí la planilla se analiza en tu compu, sin subirla.</p>
        </div>
      </main>
    );
  }

  const m = result?.resultado?.metrics;
  const competition = m ? readCompetition({ forecast: { metrics: m } }) : null;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-2.5 px-4 py-8 sm:space-y-3 sm:px-6">
      <section className="rounded-mio bg-[#0b0914] p-6 text-white sm:p-9">
        <h1 className="text-3xl sm:text-5xl font-extrabold leading-[1.02] tracking-[-0.04em]">MIO de escritorio</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#cfc8f5]">
          Tu planilla se analiza en esta compu: no se sube a ningún lado y no tiene límite de tamaño.
        </p>
        <button
          type="button"
          onClick={choose}
          disabled={busy !== null}
          className="mt-6 min-h-[48px] rounded-full bg-[#bdf559] px-6 text-base font-bold text-zinc-950 transition-colors duration-200 hover:bg-[#cbff6e] active:scale-[0.97] cursor-pointer disabled:opacity-50"
        >
          {busy === 'leyendo' ? 'Leyendo…' : sheet ? 'Elegir otra planilla' : 'Elegir planilla'}
        </button>
        <p className="mt-4 text-[13px] text-white/70">
          Versión de prueba 0.1: el motor en Rust lee la planilla y hace el pronóstico con la guerra de modelos. La limpieza y el resto del análisis llegan en las próximas versiones.
        </p>
      </section>

      {error && (
        <div role="alert" className={`rounded-mio p-5 text-base font-medium ${isDark ? 'bg-[#3a1220] text-[#ffd5dc]' : 'bg-[#ffe3e6] text-[#7a1022]'}`}>{error}</div>
      )}

      {sheet && (
        <section className={block}>
          <h2 className="text-2xl font-extrabold tracking-[-0.03em] [overflow-wrap:anywhere]">{sheet.archivo}</h2>
          <p className={`mt-2 text-[15px] ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
            {num(sheet.mb, 1)} MB · {num(sheet.filas)} filas · {sheet.columnas.length} columnas · leída en {num(sheet.segundos_lectura, 2)} s
            {sheet.filas_titulo > 0 ? ` · ${sheet.filas_titulo} filas de título salteadas` : ''}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Columna de fecha</span>
              <select className={select} value={fecha} onChange={(e) => setFecha(e.target.value)}>
                <option value="">Elegí una</option>
                {sheet.columnas.filter((c) => c.fecha).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Lo que querés proyectar</span>
              <select className={select} value={valor} onChange={(e) => setValor(e.target.value)}>
                <option value="">Elegí una</option>
                {sheet.columnas.filter((c) => c.numero).map((c) => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={analyze}
              disabled={!fecha || !valor || busy !== null}
              className="min-h-[48px] rounded-full bg-[#7647eb] px-6 text-base font-bold text-white transition-colors duration-200 hover:bg-[#602cd1] active:scale-[0.97] cursor-pointer disabled:opacity-40"
            >
              {busy === 'analizando' ? 'Analizando…' : 'Analizar'}
            </button>
          </div>
          {!sheet.columnas.some((c) => c.fecha) && (
            <p className={`mt-3 text-sm ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              No encontré una columna de fechas. Por ahora la app lee fechas como 2024-01-31 o 31/01/2024.
            </p>
          )}
        </section>
      )}

      {result && m && (
        <>
          {m.error ? (
            <section className="rounded-mio bg-[#0b0914] p-6 text-white sm:p-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-[-0.035em]">Sin predicción esta vez.</h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">{noForecastReason(m.error)}</p>
            </section>
          ) : (
            <section className="rounded-mio bg-[#7647eb] p-6 text-white sm:p-8">
              <h2 className="text-2xl sm:text-4xl font-extrabold leading-[1.05] tracking-[-0.035em]">
                De {num(m.ultimo_valor_real)} a {num(m.valor_final_forecast)} en {m.periodos} {String(m.frecuencia).toLowerCase() === 'mensual' ? 'meses' : String(m.frecuencia).toLowerCase() === 'semanal' ? 'semanas' : 'días'}.
              </h2>
              <p className="mt-3 text-base text-[#ece6ff]">
                Ganó {m.motor}: se equivocó {pct(m.mape)} % en promedio con lo que escondimos. Confianza {String(m.confianza).toLowerCase()}.
              </p>
            </section>
          )}
          {!m.error && result.resultado.chart_data && (
            <ForecastSection chartData={result.resultado.chart_data} metrics={m} filename={sheet?.archivo || 'planilla'} />
          )}
          {competition && <CompetitionBlock c={competition} isDark={isDark} />}
          <p className={`px-1 text-[13px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            Pronóstico en {num(result.segundos_pronostico, 2)} s · total {num(result.segundos_total, 2)} s · RAM pico del programa {num(result.ram_pico_mb)} MB
          </p>
        </>
      )}
    </main>
  );
};

export default EscritorioPage;
