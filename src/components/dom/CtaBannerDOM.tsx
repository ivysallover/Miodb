import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BubbleArrowButton } from '@/components/ui/BubbleArrowButton';
import { FlipText } from '@/components/ui/FlipText';
import { Reveal } from '@/components/ui/Reveal';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { DitherArt } from '@/components/ui/DitherArt';
import { ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { useTravellerEnabled } from '@/hooks/useTravellerEnabled';
import { useDailySeries } from '@/lib/dailySeries';
import { MONTH_LONG, fmt, slotOf, type DailySeries } from '@/lib/paisaje';

const PaisajeCanvas = lazy(() =>
  import('@/components/canvas/PaisajeCanvas').then((m) => ({ default: m.PaisajeCanvas }))
);

const go = (path: string) => () => {
  try { localStorage.removeItem('mio_active_analysis'); } catch {}
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

/** What MIO says when you click it: small true things about the days it is standing among. */
function petLines(d: DailySeries): string[] {
  const sum = new Array(12).fill(0);
  const cnt = new Array(12).fill(0);
  let best = 0;
  d.values.forEach((v, i) => {
    const m = slotOf(d.first_day, i).month;
    sum[m] += v;
    cnt[m]++;
    if (v > d.values[best]) best = i;
  });
  const mean = sum.map((x, m) => x / Math.max(1, cnt[m]));
  const quiet = MONTH_LONG[mean.indexOf(Math.min(...mean))];
  const busy = MONTH_LONG[mean.indexOf(Math.max(...mean))];
  const b = slotOf(d.first_day, best);
  const [y, m, day] = d.first_day.split('-').map(Number);
  const bestDate = new Date(Date.UTC(y, m - 1, day) + best * 86_400_000);
  return [
    `Conté ${fmt(d.values.length)} días, uno por uno. No me salteé ninguno.`,
    `Mi favorito es el ${bestDate.getUTCDate()} de ${MONTH_LONG[b.month]} de ${b.year}: ${fmt(d.values[best])} en un solo día.`,
    `${quiet.charAt(0).toUpperCase() + quiet.slice(1)} es tranquilo. Me gusta ${quiet}.`,
    `Las torres de ${busy} me dan un poco de vértigo.`,
    '¿Ves la celda lima? Es mañana. Todavía no sé qué hay ahí.',
    'Si me traés tu planilla, armo uno de estos para vos.',
  ];
}

/**
 * The closing block. On desktop it is the dial of the proof again, at night: the moon hangs in the
 * gap between 31 December and 1 January, the slots of the next days are empty and MIO stands
 * strolling about; click it and it says something about the days around it. Phones, tablets and
 * reduced motion keep the solid slab with the sprite.
 */
export const CtaBannerDOM: React.FC = () => {
  const wide = useTravellerEnabled();
  const blockRef = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  // The scene is only built when the visitor is getting close: it is the last thing on the page.
  const [near, setNear] = useState(false);
  const { data, failed } = useDailySeries(wide && near);
  const scene = wide && !failed;

  // MIO's speech bubble: the canvas keeps it over MIO's head; a click swaps the line.
  const bubbleRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(() => (data ? petLines(data) : []), [data]);
  const [said, setSaid] = useState(-1);
  const onPetTap = useCallback(() => setSaid((n) => n + 1), []);
  useEffect(() => {
    if (said < 0) return;
    const t = window.setTimeout(() => setSaid(-1), 5200);
    return () => clearTimeout(t);
  }, [said]);
  const [nudged, setNudged] = useState(false);
  useEffect(() => {
    if (said >= 0) setNudged(true);
  }, [said]);
  const line = said >= 0 && lines.length ? lines[said % lines.length] : nudged ? null : 'Tocame.';

  useEffect(() => {
    const el = blockRef.current;
    if (!wide || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '150% 0px' }
    );
    io.observe(el);
    // How far the block has travelled through the viewport (0 entering, 1 gone): a slow dolly.
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      progress.current = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [wide]);

  return (
    <section id="cta" className="py-20 sm:py-32 w-full select-none relative z-10">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal from="left">
          <div
            ref={blockRef}
            className={`relative overflow-hidden rounded-mio bg-[#0b0914] text-white ${scene ? 'flex min-h-[min(88vh,820px)] flex-col justify-between p-12 xl:p-16' : 'p-10 sm:p-16 lg:p-24'}`}
          >
            {scene ? (
              <div className="absolute inset-0">
                {data && (
                  <Suspense fallback={null}>
                    <PaisajeCanvas data={data} progress={progress} variant="noche" onPetTap={onPetTap} petLabel={bubbleRef} className="absolute inset-0" />
                  </Suspense>
                )}
                {/* Anchored at MIO's head by the canvas (a zero-size point); the bubble hangs up and left from it. */}
                <div ref={bubbleRef} className="pointer-events-none absolute left-0 top-0 z-20 h-0 w-0" style={{ transform: 'translate3d(-999px,0,0)' }}>
                  {data && line && (
                    <p key={line} role="status" className="mio-bubble mio-pop absolute bottom-3 right-[-1.5rem] w-max max-w-[15rem] origin-bottom-right bg-[#f3f3f5] px-3.5 py-2.5 font-mono text-[13px] font-bold leading-snug text-[#0b0914]">
                      {line}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.6]"
                  style={{ WebkitMaskImage: 'radial-gradient(ellipse at 100% 100%, #000 0%, transparent 65%)', maskImage: 'radial-gradient(ellipse at 100% 100%, #000 0%, transparent 65%)' }}
                  aria-hidden="true"
                >
                  <DitherArt variant="texture" seed={9} tone="dark" pixelSize={4} />
                </div>
                <div className="relative z-10 mx-auto mb-10 flex h-[220px] w-[220px] items-center justify-center" aria-hidden="true">
                  <MioPet2D mood="celebrando" material="violet" size={200} animated showShadow />
                </div>
              </>
            )}

            <div className="relative z-10 max-w-3xl space-y-7 text-left">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.04em] leading-[1.02] text-white" style={{ textWrap: 'balance' }}>
                <FlipText>Los próximos días todavía no están escritos.</FlipText>
              </h2>

              <p className="text-base sm:text-lg text-zinc-200 max-w-xl font-normal leading-relaxed">
                Entrá con una cuenta gratis, subí una planilla tuya y mirá qué encuentra MIO: qué se salió de lo normal, qué viene y con cuánto margen de error.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-5">
                <BubbleArrowButton size="lg" variant="primary" onClick={go('/dashboard?new=1')}>
                  Probar con mi planilla
                </BubbleArrowButton>
                <button
                  type="button"
                  onClick={go('/dashboard?new=1&sample=1')}
                  className="min-h-[44px] text-sm font-medium text-zinc-200 hover:text-white underline underline-offset-4 decoration-1 cursor-pointer"
                >
                  o mirá un ejemplo ya analizado
                </button>
              </div>
            </div>

            <div className={`relative z-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-300 font-mono ${scene ? 'mt-12' : 'mt-10'}`}>
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-[#bdf559]" aria-hidden="true" />
                Excel (.xlsx) y CSV
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#bdf559]" aria-hidden="true" />
                Se procesa en memoria, sin guardar tu archivo
              </span>
              <span>Sin instalar nada</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default CtaBannerDOM;
