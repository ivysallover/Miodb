import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createScrollTrigger } from '@/lib/gsap';
import { useTravellerEnabled } from '@/hooks/useTravellerEnabled';
import { useMioStore } from '@/utils/useMioStore';
import { MONTH_LONG, beatAt, canvasIn, captionOn, fmt, oddLit, slotOf, type DailySeries } from '@/lib/paisaje';

const PaisajeCanvas = lazy(() =>
  import('@/components/canvas/PaisajeCanvas').then((m) => ({ default: m.PaisajeCanvas }))
);

const pct = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' %';

/** Everything the captions say is computed from the series, so it cannot drift from the data. */
function facts(d: DailySeries) {
  const sum = new Array(12).fill(0);
  const cnt = new Array(12).fill(0);
  d.values.forEach((v, i) => {
    const m = slotOf(d.first_day, i).month;
    sum[m] += v;
    cnt[m]++;
  });
  const mean = sum.map((s, m) => (cnt[m] ? s / cnt[m] : 0));
  const oddMonths = Array.from(new Set(d.odd_days.map((i) => slotOf(d.first_day, i).month))).sort((a, b) => a - b);
  const inSeason = (m: number) => oddMonths.includes(m);
  const season = mean.filter((_, m) => inSeason(m));
  const rest = mean.filter((_, m) => !inSeason(m));
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const lowest = mean.indexOf(Math.min(...mean));
  const years = slotOf(d.first_day, d.values.length - 1).row + 1;
  return {
    days: d.values.length,
    years,
    lowest: MONTH_LONG[lowest],
    seasonNames: oddMonths.map((m) => MONTH_LONG[m]),
    seasonLift: avg(rest) > 0 ? (avg(season) / avg(rest) - 1) * 100 : 0,
    odd: d.odd_days.length,
    horizon: d.backtest.mio.length,
  };
}

const join = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

/**
 * "El paisaje de 1.826 días" — the proof, as a place you fly over.
 *
 * Desktop without reduced motion: the section pins and the scroll is the camera. It opens as the
 * page's own sheet seen from above, which then lies down and becomes the landscape, so there is no
 * cut on the way in. Everyone else skips it; the figures that follow (La prueba) say the same in
 * numbers.
 */
export const PaisajeDOM: React.FC = () => {
  const enabled = useTravellerEnabled();
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [caption, setCaption] = useState(false);
  const [data, setData] = useState<DailySeries | null>(null);
  const [beat, setBeat] = useState(0);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch('/data/daily_series.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: DailySeries) => alive && setData(d))
      .catch((err) => console.warn('[MIO] daily series not available:', err));
    return () => {
      alive = false;
    };
  }, [enabled]);

  useEffect(() => {
    const pin = pinRef.current;
    if (!enabled || !data || !pin) return;
    const total = data.odd_days.length;
    const st = createScrollTrigger({
      trigger: pin,
      start: 'top top',
      end: '+=500%',
      pin: true,
      anticipatePin: 1,
      scrub: true,
      onUpdate: (self) => {
        progress.current = self.progress;
        // The scene fades in over the flat page in the first few pixels, then takes over.
        if (stageRef.current) stageRef.current.style.opacity = canvasIn(self.progress).toFixed(3);
        const on = captionOn(self.progress);
        setCaption((prev) => (prev === on ? prev : on));
        const b = beatAt(self.progress);
        setBeat((prev) => (prev === b ? prev : b));
        const n = Math.round(oddLit(self.progress) * total);
        setLit((prev) => (prev === n ? prev : n));
      },
    });
    return () => {
      st?.kill();
      progress.current = 0;
    };
  }, [enabled, data]);

  const f = useMemo(() => (data ? facts(data) : null), [data]);
  if (!enabled || !data || !f) return null;

  const captions: { title: React.ReactNode; body: React.ReactNode }[] = [
    {
      title: <>{f.years === 5 ? 'Cinco' : f.years} años de ventas, día por día.</>,
      body: (
        <>
          {fmt(f.days)} días y {fmt(data.transactions)} ventas de un comercio online. Cada columna es un día real, a la
          altura de lo que vendió.
        </>
      ),
    },
    {
      title: <>El año tiene forma.</>,
      body: (
        <>
          {f.lowest.charAt(0).toUpperCase() + f.lowest.slice(1)} es el valle. En {join(f.seasonNames)} se vende cerca
          de un {Math.round(f.seasonLift / 5) * 5} % más que el resto del año, y pasa igual los {f.years} años.
        </>
      ),
    },
    {
      title: (
        <>
          <span className="tabular-nums text-[#bdf559]">{lit}</span> días se salieron de lo normal.
        </>
      ),
      body: (
        <>
          MIO los marca sin que nadie le diga dónde mirar. Los {f.odd} caen en {join(f.seasonNames)}: es la temporada
          alta.
        </>
      ),
    },
    {
      title: <>Le escondimos los últimos {f.horizon} días.</>,
      body: (
        <>
          La columna es lo que pasó. La varilla{' '}
          <span className="inline-block h-2.5 w-2.5 translate-y-px bg-[#bdf559]" aria-hidden="true" /> lima es lo que
          predijo MIO; la{' '}
          <span className="inline-block h-2.5 w-2.5 translate-y-px bg-[#9a93b8]" aria-hidden="true" /> gris, repetir la
          semana anterior. En este tramo MIO erró {pct(data.backtest.mio_smape)} y la línea base{' '}
          {pct(data.backtest.naive_smape)}.
        </>
      ),
    },
  ];
  const c = captions[beat];

  return (
    <section id="paisaje" aria-label="Cinco años de ventas reales, recorridos día por día" className="relative z-10 w-full select-none">
      <div ref={pinRef} className={`mio-sheet-bg relative h-[100dvh] min-h-[620px] w-full overflow-hidden ${isDark ? 'bg-[#07070a]' : 'bg-[#f3f3f5]'}`}>
        <div ref={stageRef} className="absolute inset-0" style={{ opacity: 0 }}>
          <Suspense fallback={null}>
            <PaisajeCanvas data={data} progress={progress} className="absolute inset-0" />
          </Suspense>
        </div>

        {/* The caption lives in the sky: nothing behind it but the scene. */}
        <div className={`pointer-events-none absolute left-6 right-6 top-[15vh] sm:left-10 lg:left-16 lg:right-auto lg:max-w-[40rem] ${caption ? '' : 'invisible'}`}>
          <div key={`${beat}-${caption ? 1 : 0}`} className="mio-slide">
            <h2 className="text-4xl font-extrabold leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl xl:text-6xl" style={{ textWrap: 'balance' }}>
              {c.title}
            </h2>
            <p className="mt-4 max-w-[34rem] text-base leading-relaxed text-[#d9d2ff] sm:text-lg">{c.body}</p>
          </div>
        </div>

        {caption && beat === 0 && (
          <p className="pointer-events-none absolute inset-x-0 bottom-7 flex items-center justify-center gap-2 text-sm font-medium text-[#d9d2ff]">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
            Deslizá para recorrer los cinco años
          </p>
        )}

        {/* The same facts for anyone who cannot see the flight. */}
        <p className="sr-only">
          {fmt(f.days)} días y {fmt(data.transactions)} ventas reales. {f.odd} días fuera de lo normal, todos en{' '}
          {join(f.seasonNames)}. En los últimos {f.horizon} días, que el modelo no había visto, MIO erró{' '}
          {pct(data.backtest.mio_smape)} y repetir la semana anterior {pct(data.backtest.naive_smape)}.
        </p>
      </div>
    </section>
  );
};

export default PaisajeDOM;
