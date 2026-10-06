import React, { useEffect, useMemo, useRef, useState } from 'react';

/* Small SVG charts for the "MIO mejorado" results view. No chart library: they never trap the
   page scroll, they share the landing's palette, and every axis uses round numbers. */

export const fmtCompact = (n: number): string => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' M';
  if (a >= 1e4) return (n / 1e3).toFixed(0) + ' K';
  if (a >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + ' K';
  return n.toLocaleString('es-AR', { maximumFractionDigits: a < 10 ? 2 : 0 });
};
/** Whole numbers once the value is in the thousands: 119.613, not 119.612,7 next to 122.807. */
export const fmtFull = (n: number): string =>
  n.toLocaleString('es-AR', { maximumFractionDigits: Math.abs(n) >= 1000 ? 0 : 2 });
export const fmtDate = (t: number): string =>
  new Date(t).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtMonth = (t: number): string =>
  new Date(t).toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).replace('.', '');

/** Round, human tick values covering [lo, hi]. */
export const niceTicks = (lo: number, hi: number, target = 5): number[] => {
  if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
  if (lo === hi) { lo -= 1; hi += 1; }
  const raw = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  // Always include one tick at or above the maximum, so no point is drawn outside the axis.
  for (let v = start; ; v += step) {
    out.push(Number(v.toPrecision(12)));
    if (v >= hi || out.length > 40) break;
  }
  return out;
};

const useWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
};

export interface SeriesPoint { t: number; v: number; flag?: boolean }
export interface ForecastPoint { t: number; v: number; lo?: number; hi?: number }

interface LineProps {
  points: SeriesPoint[];
  forecast?: ForecastPoint[];
  height?: number;
  isDark: boolean;
  label: string;
}

export const LineChart: React.FC<LineProps> = ({ points, forecast = [], height = 380, isDark, label }) => {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const M = { l: 56, r: 16, t: 14, b: 30 };
  const all = useMemo(() => [...points.map((p) => ({ t: p.t, v: p.v })), ...forecast.map((p) => ({ t: p.t, v: p.v }))], [points, forecast]);

  const geo = useMemo(() => {
    if (!width || all.length < 2) return null;
    const vs = [...points.map((p) => p.v), ...forecast.flatMap((f) => [f.v, f.lo ?? f.v, f.hi ?? f.v])];
    const ticks = niceTicks(Math.min(...vs), Math.max(...vs));
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const t0 = all[0].t, t1 = all[all.length - 1].t;
    const iw = width - M.l - M.r, ih = height - M.t - M.b;
    const x = (t: number) => M.l + ((t - t0) / (t1 - t0 || 1)) * iw;
    const y = (v: number) => M.t + (1 - (v - y0) / (y1 - y0 || 1)) * ih;
    // month ticks
    const xt: number[] = [];
    const d = new Date(t0); d.setDate(1); d.setMonth(d.getMonth() + 1);
    const months = Math.max(1, Math.round((t1 - t0) / (30 * 864e5)));
    const every = Math.max(1, Math.ceil(months / Math.max(3, Math.floor(iw / 110))));
    for (let i = 0; d.getTime() <= t1; i++) { if (i % every === 0) xt.push(d.getTime()); d.setMonth(d.getMonth() + 1); }
    return { ticks, x, y, xt, ih, iw };
  }, [width, height, all, points, forecast]);

  const ink = isDark ? '#e4e4e7' : '#18181b';
  const grid = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,9,20,0.08)';
  const muted = isDark ? '#a1a1aa' : '#71717a';

  const onMove = (e: React.PointerEvent) => {
    if (!geo || !ref.current) return;
    const px = e.clientX - ref.current.getBoundingClientRect().left;
    let best = 0, bd = Infinity;
    for (let i = 0; i < all.length; i++) { const d = Math.abs(geo.x(all[i].t) - px); if (d < bd) { bd = d; best = i; } }
    setHover(best);
  };

  const path = geo ? points.map((p, i) => `${i ? 'L' : 'M'}${geo.x(p.t).toFixed(1)},${geo.y(p.v).toFixed(1)}`).join('') : '';
  const fStart = points.length ? [{ t: points[points.length - 1].t, v: points[points.length - 1].v }] : [];
  const fLine = geo && forecast.length ? [...fStart, ...forecast].map((p, i) => `${i ? 'L' : 'M'}${geo.x(p.t).toFixed(1)},${geo.y(p.v).toFixed(1)}`).join('') : '';
  const band = geo && forecast.some((f) => f.lo != null && f.hi != null)
    ? `M${forecast.map((f) => `${geo.x(f.t).toFixed(1)},${geo.y(f.hi ?? f.v).toFixed(1)}`).join('L')}L${[...forecast].reverse().map((f) => `${geo.x(f.t).toFixed(1)},${geo.y(f.lo ?? f.v).toFixed(1)}`).join('L')}Z`
    : '';
  const hp = hover != null ? all[hover] : null;
  const hIsForecast = hover != null && hover >= points.length;
  const hf = hIsForecast ? forecast[hover! - points.length] : null;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      {geo && (
        <svg width={width} height={height} role="img" aria-label={`Gráfico de ${label} en el tiempo`}>
          <defs>
            <linearGradient id="mio-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7647eb" stopOpacity="0.2" />
              <stop offset="1" stopColor="#7647eb" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={width - M.r} y1={geo.y(v)} y2={geo.y(v)} stroke={grid} />
              <text x={M.l - 10} y={geo.y(v) + 4} textAnchor="end" fontSize="11" fontFamily="JetBrains Mono, monospace" fill={muted}>{fmtCompact(v)}</text>
            </g>
          ))}
          {geo.xt.map((t) => (
            <text key={t} x={geo.x(t)} y={height - 8} textAnchor="middle" fontSize="11" fontFamily="JetBrains Mono, monospace" fill={muted}>{fmtMonth(t)}</text>
          ))}
          {points.length > 1 && (
            <path d={`${path}L${geo.x(points[points.length - 1].t)},${M.t + geo.ih}L${geo.x(points[0].t)},${M.t + geo.ih}Z`} fill="url(#mio-area)" />
          )}
          {band && <path d={band} fill="#7647eb" opacity="0.16" />}
          <path d={path} fill="none" stroke="#7647eb" strokeWidth="2" strokeLinejoin="round" />
          {fLine && <path d={fLine} fill="none" stroke="#7647eb" strokeWidth="2" strokeDasharray="5 5" />}
          {forecast.length > 0 && points.length > 0 && (
            <line x1={geo.x(points[points.length - 1].t)} x2={geo.x(points[points.length - 1].t)} y1={M.t} y2={M.t + geo.ih} stroke={muted} strokeDasharray="3 4" />
          )}
          {points.filter((p) => p.flag).map((p) => (
            <circle key={p.t} cx={geo.x(p.t)} cy={geo.y(p.v)} r={hp && hp.t === p.t ? 8.5 : 5.5} fill="#bdf559" stroke={isDark ? '#fff' : '#0b0914'} strokeWidth="1.5" style={{ transition: 'r 160ms ease-out' }} />
          ))}
          {hp && (
            <g>
              <line x1={geo.x(hp.t)} x2={geo.x(hp.t)} y1={M.t} y2={M.t + geo.ih} stroke={ink} strokeOpacity="0.35" />
              <circle cx={geo.x(hp.t)} cy={geo.y(hp.v)} r="6" fill={isDark ? '#0b0914' : '#fff'} stroke="#7647eb" strokeWidth="2.5" />
            </g>
          )}
        </svg>
      )}
      {geo && hp && (
        <div
          className={`pointer-events-none absolute z-10 rounded-mio-sm border px-3 py-2 font-mono text-xs ${isDark ? 'bg-[#0b0914] border-white/15 text-white' : 'bg-white border-zinc-200 text-zinc-950'}`}
          style={{ left: Math.min(Math.max(geo.x(hp.t) + 12, 0), width - 190), top: Math.max(geo.y(hp.v) - 56, 0) }}
        >
          <div className="text-zinc-500">{fmtDate(hp.t)}{hIsForecast ? ' · estimado' : ''}</div>
          <div className="mt-0.5 text-sm font-bold">{fmtFull(hp.v)}</div>
          {hf && hf.lo != null && hf.hi != null && <div className="text-zinc-500">entre {fmtCompact(hf.lo)} y {fmtCompact(hf.hi)}</div>}
          {!hIsForecast && points[hover!]?.flag && <div className="mt-0.5 font-bold text-[#7647eb] dark:text-[#bdf559]">Fuera de lo normal</div>}
        </div>
      )}
    </div>
  );
};

interface BarsProps { items: { label: string; value: number; detail?: string }[]; isDark: boolean; height?: number; highlightMax?: boolean; unit?: string }

/** Vertical bars in the order given (used for the distribution, sorted by value range).
    Hovering a bar lifts it and shows its exact value. */
export const ColumnChart: React.FC<BarsProps> = ({ items, isDark, height = 260, highlightMax = true, unit = 'registros' }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  const top = items.findIndex((i) => i.value === max);
  return (
    <div className="flex w-full items-end gap-1.5 sm:gap-2.5" style={{ height }} role="img" aria-label="Distribución por rangos" onPointerLeave={() => setHover(null)}>
      {items.map((it, i) => {
        const on = hover === i;
        return (
          <div key={it.label} className="relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1.5" onPointerEnter={() => setHover(i)}>
            {on && (
              <div className={`mio-swap pointer-events-none absolute z-10 whitespace-nowrap border px-2.5 py-1.5 font-mono text-[11px] ${isDark ? 'bg-[#0b0914] border-white/20 text-white' : 'bg-zinc-950 border-zinc-950 text-white'}`} style={{ bottom: `calc(${Math.max(2, (it.value / max) * 78)}% + 34px)` }}>
                <span className="block text-zinc-400">{it.detail ?? it.label}</span>
                <span className="block text-sm font-bold">{it.value.toLocaleString('es-AR')} {unit}</span>
              </div>
            )}
            <span className={`font-mono text-[11px] font-bold tabular-nums transition-transform duration-200 ${on ? '-translate-y-1.5' : ''} ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{it.value}</span>
            <div
              className={`w-full transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${on ? '-translate-y-1.5 bg-[#7647eb]' : highlightMax && i === top ? 'bg-[#7647eb]' : isDark ? 'bg-[#7647eb]/45' : 'bg-[#7647eb]/30'}`}
              style={{ height: `${Math.max(2, (it.value / max) * 78)}%` }}
            />
            <span className={`w-full truncate text-center font-mono text-[10px] ${on ? (isDark ? 'text-white' : 'text-zinc-950') : 'text-zinc-500'}`}>{it.label}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Horizontal bars, largest first (used for "what weighed most"). */
export const RankBars: React.FC<{ items: { label: string; value: number }[]; isDark: boolean }> = ({ items, isDark }) => {
  const max = Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={it.label} title={`${it.label}: ${fmtFull(it.value)}`} className="group grid grid-cols-[minmax(0,34%)_1fr_auto] items-center gap-3 transition-transform duration-200 hover:-translate-y-0.5">
          <span className={`truncate text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`} title={it.label}>{it.label}</span>
          <span className={`block h-3 ${isDark ? 'bg-white/10' : 'bg-zinc-900/[0.06]'}`}>
            <span className={`block h-full transition-colors duration-200 group-hover:bg-[#7647eb] ${i === 0 ? 'bg-[#7647eb]' : 'bg-[#7647eb]/50'}`} style={{ width: `${(Math.abs(it.value) / max) * 100}%` }} />
          </span>
          <span className="font-mono text-xs font-bold tabular-nums text-zinc-500 group-hover:text-[#7647eb]">{fmtFull(it.value)}</span>
        </li>
      ))}
    </ul>
  );
};
