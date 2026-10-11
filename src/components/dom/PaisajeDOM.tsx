import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ScrollTrigger, createScrollTrigger } from '@/lib/gsap';
import { useTravellerEnabled } from '@/hooks/useTravellerEnabled';
import { useDailySeries } from '@/lib/dailySeries';
import { useMioStore } from '@/utils/useMioStore';
import { MONTH_LONG, PROOF_AT, beatAt, canvasIn, captionOn, fmt, oddLit, slotOf, type DailySeries } from '@/lib/paisaje';

const PaisajeCanvas = lazy(() =>
  import('@/components/canvas/PaisajeCanvas').then((m) => ({ default: m.PaisajeCanvas }))
);

/** Length of the pin, in screens. */
const SCREENS = 7.8;

const pct = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
const pts = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
  // The week and the years, measured the same way: is there a shape or not?
  const [y0, m0, d0] = d.first_day.split('-').map(Number);
  const start = Date.UTC(y0, m0 - 1, d0);
  const wSum = new Array(7).fill(0);
  const wCnt = new Array(7).fill(0);
  const ySum = new Map<number, number>();
  let best = 0;
  d.values.forEach((v, i) => {
    const date = new Date(start + i * 86_400_000);
    wSum[date.getUTCDay()] += v;
    wCnt[date.getUTCDay()]++;
    ySum.set(date.getUTCFullYear(), (ySum.get(date.getUTCFullYear()) ?? 0) + v);
    if (v > d.values[best]) best = i;
  });
  const wMean = wSum.map((x, k) => x / Math.max(1, wCnt[k]));
  const wHi = wMean.indexOf(Math.max(...wMean));
  const wLo = wMean.indexOf(Math.min(...wMean));
  const yearList = Array.from(ySum.entries());
  const yHi = yearList.reduce((a, b) => (b[1] > a[1] ? b : a));
  const yLo = yearList.reduce((a, b) => (b[1] < a[1] ? b : a));
  const bestDate = new Date(start + best * 86_400_000);
  const folds = d.folds?.length ? d.folds : [d.backtest];
  // Positive: MIO was that many points closer than the baseline in that test.
  const gaps = folds.map((f) => f.naive_smape - f.mio_smape);
  return {
    days: d.values.length,
    years,
    lowest: MONTH_LONG[lowest],
    seasonNames: oddMonths.map((m) => MONTH_LONG[m]),
    seasonLift: avg(rest) > 0 ? (avg(season) / avg(rest) - 1) * 100 : 0,
    odd: d.odd_days.length,
    horizon: d.backtest.mio.length,
    tests: folds.length,
    mio: d.mean_mio_smape ?? avg(folds.map((f) => f.mio_smape)),
    naive: d.mean_naive_smape ?? avg(folds.map((f) => f.naive_smape)),
    weekHi: WEEKDAYS[wHi],
    weekLo: WEEKDAYS[wLo],
    weekSpread: (wMean[wHi] / wMean[wLo] - 1) * 100,
    yearHi: yHi[0],
    yearLo: yLo[0],
    yearSpread: (yHi[1] / yLo[1] - 1) * 100,
    bestDay: `${bestDate.getUTCDate()} de ${MONTH_LONG[bestDate.getUTCMonth()]} de ${bestDate.getUTCFullYear()}`,
    // How much smaller MIO's error is than the baseline's: on average, and in the test the finale shows.
    closer: 0,
    closerLast: (1 - d.backtest.mio_smape / d.backtest.naive_smape) * 100,
    won: gaps.filter((g) => g > 0),
    lost: gaps.filter((g) => g <= 0).map((g) => -g),
  };
}

const WEEKDAYS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

const join = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

/**
 * The method and its proof, as one flight (id "como-funciona", then "casos-estudio").
 *
 * Desktop without reduced motion: the section pins and the scroll is the camera. It opens as the
 * page's own sheet seen from above, which lies down and becomes the dial of 1.826 real days; MIO
 * does on it what the method says (tidies it up, marks the odd days, predicts 14 hidden days) and
 * the camera then climbs until the dial is a flat print with the four tests in its middle. No cut
 * on the way in or out: both ends are the sheet seen from above.
 *
 * Everyone else (phones, tablets, reduced motion, or the series failing to load) gets `fallback`:
 * the same content as stacked blocks. `after` is what follows the flight only when it is shown (the
 * third step of the method, which the stacked version already carries).
 */
export const PaisajeDOM: React.FC<{ fallback: React.ReactNode; after?: React.ReactNode }> = ({ fallback, after }) => {
  const enabled = useTravellerEnabled();
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const { data, failed } = useDailySeries(enabled);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [caption, setCaption] = useState(false);
  const [beat, setBeat] = useState(0);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const pin = pinRef.current;
    if (!enabled || !data || !pin) return;
    const total = data.odd_days.length;
    const st = createScrollTrigger({
      trigger: pin,
      start: 'top top',
      end: `+=${SCREENS * 100}%`,
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
    // The pin adds six screens to the page: everything below has to be measured again.
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(raf);
      st?.kill();
      progress.current = 0;
    };
  }, [enabled, data]);

  const f = useMemo(() => {
    if (!data) return null;
    const x = facts(data);
    x.closer = (1 - x.mio / x.naive) * 100;
    return x;
  }, [data]);
  if (!enabled || failed) return <>{fallback}</>;

  const captions: { title: React.ReactNode; body: React.ReactNode }[] = !data || !f ? [] : [
    {
      title: <>Subís la planilla tal como está.</>,
      body: (
        <>
          Esta es real: {fmt(data.transactions)} ventas de un comercio online. MIO acomoda fechas y montos y las ordena
          en {fmt(f.days)} días. Cada columna es un día, a la altura de lo que vendió; cada anillo, un año.
        </>
      ),
    },
    {
      title: <>Encuentra la forma del año.</>,
      body: (
        <>
          {f.lowest.charAt(0).toUpperCase() + f.lowest.slice(1)} es el valle. En {join(f.seasonNames)} se vende cerca
          de un {Math.round(f.seasonLift / 5) * 5} % más que el resto del año, y pasa igual los {f.years} años.
        </>
      ),
    },
    {
      title: f.weekSpread < 5 ? <>No inventa patrones donde no hay.</> : <>Encuentra el ritmo de la semana.</>,
      body:
        f.weekSpread < 5 ? (
          <>
            Mirá los anillos: ningún día de la semana manda. Entre los {f.weekHi} y los {f.weekLo} hay apenas{' '}
            {pts(f.weekSpread)} % de diferencia, y MIO te lo dice así en vez de forzar una conclusión.
          </>
        ) : (
          <>
            Los {f.weekHi} venden un {Math.round(f.weekSpread)} % más que los {f.weekLo}, semana tras semana.
          </>
        ),
    },
    {
      title: <>Compara los {f.years === 5 ? 'cinco' : f.years} años.</>,
      body: (
        <>
          {f.yearSpread < 5 ? (
            <>Vendieron casi lo mismo: entre {f.yearHi} y {f.yearLo} hay {pts(f.yearSpread)} % de diferencia.</>
          ) : (
            <>{f.yearHi} fue el más alto: {Math.round(f.yearSpread)} % más que {f.yearLo}.</>
          )}{' '}
          El día récord fue el {f.bestDay}.
        </>
      ),
    },
    {
      title: (
        <>
          Marca <span className="tabular-nums text-[#bdf559]">{lit}</span> días que se salieron de lo normal.
        </>
      ),
      body: (
        <>
          Nadie le dice dónde mirar. Los {f.odd} caen en {join(f.seasonNames)}: es la temporada alta, y te lo dice así
          en vez de dar una alarma por cada uno.
        </>
      ),
    },
    {
      title: <>Le escondemos los últimos {f.horizon} días.</>,
      body: (
        <>
          Y le pedimos que los prediga. La columna blanca es lo que pasó. La varilla{' '}
          <span className="inline-block h-2.5 w-2.5 translate-y-px bg-[#bdf559]" aria-hidden="true" /> lima es lo que
          predijo MIO; la{' '}
          <span className="inline-block h-2.5 w-2.5 translate-y-px bg-[#56507f]" aria-hidden="true" /> gris, lo que haría cualquiera:
          suponer que se repite la semana pasada. Acá MIO se acercó un {Math.round(f.closerLast)} % más a lo que pasó.
        </>
      ),
    },
  ];
  const c = captions[Math.min(beat, captions.length - 1)];
  const proof = beat === 6;

  return (
    <>
      <section aria-label="El método de MIO, probado con cinco años de ventas reales" className="relative z-10 w-full select-none">
        {/* Where each act of the page starts inside the pin: the nav, the sheet frame and MIO read these. */}
        <div id="como-funciona" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" style={{ height: `${PROOF_AT * SCREENS * 100 + 50}vh` }} />
        <div id="casos-estudio" aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0" style={{ top: `${PROOF_AT * SCREENS * 100 + 50}vh` }} />

        <div ref={pinRef} className={`mio-sheet-bg relative h-[100dvh] min-h-[620px] w-full overflow-hidden ${isDark ? 'bg-[#07070a]' : 'bg-[#f3f3f5]'}`}>
          <div ref={stageRef} className="absolute inset-0" style={{ opacity: 0 }}>
            {data && (
              <Suspense fallback={null}>
                <PaisajeCanvas data={data} progress={progress} className="absolute inset-0" />
              </Suspense>
            )}
          </div>

          {data && f && (
            <>
              {/* The caption is a solid block (the page's own block style), so it reads over paper and sky alike. */}
              <div className={`absolute left-4 top-24 sm:left-8 lg:left-14 pointer-events-none ${proof ? 'w-[min(92vw,26rem)]' : 'w-[min(92vw,30rem)]'} ${caption ? '' : 'invisible'}`}>
                <div key={`${beat}-${caption ? 1 : 0}`} className="mio-slide rounded-mio bg-[#0b0914] p-6 sm:p-7">
                  {proof ? (
                    <>
                      <h2 className="text-[4.5rem] font-extrabold leading-[0.9] tracking-[-0.06em] text-[#bdf559] xl:text-[5.25rem]">
                        {fmt(data.transactions)}
                      </h2>
                      <p className="mt-4 text-xl font-semibold leading-snug text-white">
                        ventas reales para ponerlo a prueba.
                      </p>
                      <p className="mt-3 text-base leading-relaxed text-[#cfc8f5]">
                        Le escondimos {f.horizon} días y le pedimos que los prediga, cuatro veces. Al lado pusimos lo
                        que haría cualquiera: suponer que se repite la semana pasada. MIO se acercó un{' '}
                        {Math.round(f.closer)} % más a lo que realmente se vendió.
                      </p>
                      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#bdf559]" aria-hidden="true" /> MIO
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 bg-[#56507f]" aria-hidden="true" /> Suponer que se repite la semana pasada
                        </span>
                        <span>Barra más corta: más cerca de lo que pasó</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-4xl" style={{ textWrap: 'balance' }}>
                        {c.title}
                      </h2>
                      <p className="mt-3 text-base leading-relaxed text-[#cfc8f5]">{c.body}</p>
                    </>
                  )}
                </div>
              </div>

              {caption && beat === 0 && (
                <p className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
                  <span className="flex items-center gap-2 rounded-full bg-[#0b0914] px-4 py-2 text-sm font-medium text-white">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    Deslizá para ver cómo trabaja
                  </span>
                </p>
              )}

              {/* The same facts for anyone who cannot see the flight. */}
              <p className="sr-only">
                El método de MIO sobre {fmt(data.transactions)} ventas reales ({fmt(f.days)} días): ordena la planilla,
                marca {f.odd} días fuera de lo normal (todos en {join(f.seasonNames)}) y predice {f.horizon} días que no
                había visto. En {f.tests} pruebas MIO tuvo un {Math.round(f.closer)} % menos de error que repetir la semana
                anterior ({pct(f.mio)} contra {pct(f.naive)}).
              </p>
            </>
          )}
        </div>
      </section>

      {after}
    </>
  );
};

export default PaisajeDOM;
