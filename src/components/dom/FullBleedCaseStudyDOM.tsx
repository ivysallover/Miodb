import React, { useEffect, useRef } from 'react';
import { gsap } from '@/lib/gsap';
import { useDailySeries } from '@/lib/dailySeries';

/**
 * The proof as a static block: what phones, tablets and reduced-motion visitors get instead of
 * the flight (see PaisajeDOM). One number, the baseline next to it, and the four tests behind the
 * average when the series is available.
 */
export const FullBleedCaseStudyDOM: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useDailySeries(true);
  const folds = data?.folds ?? [];
  const worst = folds.reduce((m, f) => Math.max(m, f.mio_smape, f.naive_smape), 17);
  const closer = data ? Math.round((1 - data.mean_mio_smape / data.mean_naive_smape) * 100) : 21;

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('[data-bar]'), {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 75%', once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [folds.length]);

  const rows = folds.length
    ? folds.map((f, k) => ({ label: `Prueba ${k + 1}`, mio: f.mio_smape, naive: f.naive_smape }))
    : [{ label: 'Promedio', mio: 13.5, naive: 17.0 }];

  return (
    <>
      <section id="casos-estudio" className="relative w-full select-none bg-[#07070a] text-white">
        <div ref={ref} className="mx-auto w-full max-w-[1440px] px-6 py-16 sm:px-10 sm:py-24 lg:px-16">
          <h2 className="max-w-3xl text-3xl font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-5xl" style={{ textWrap: 'balance' }}>
            Probado con 138.116 ventas reales.
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-2.5 lg:grid-cols-12">
            <div className="rounded-mio bg-[#16122b] p-7 sm:p-10 lg:col-span-6">
              <p className="whitespace-nowrap font-extrabold leading-[0.84] tracking-[-0.06em] text-[#bdf559] text-[26vw] sm:text-[11rem]">
                {closer}<span className="text-[0.4em] tracking-normal"> %</span>
              </p>
              <p className="mt-6 text-lg font-semibold leading-snug sm:text-xl">
                más cerca de lo que realmente se vendió que suponer que se repite la semana pasada, que es lo que haría cualquiera.
              </p>
            </div>

            <div className="rounded-mio bg-[#16122b] p-7 sm:p-10 lg:col-span-6">
              <div className="space-y-5">
                {rows.map((r) => (
                  <div key={r.label}>
                    <p className="mb-1.5 font-mono text-xs text-white/70">{r.label}</p>
                    <div className="space-y-1">
                      <div data-bar className="h-2.5 rounded-full bg-[#bdf559]" style={{ width: `${(r.mio / worst) * 100}%` }} />
                      <div data-bar className="h-2.5 rounded-full bg-[#56507f]" style={{ width: `${(r.naive / worst) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-sm leading-relaxed text-[#cfc8f5]">
                Lima es MIO; gris, suponer que se repite la semana pasada. Barra más corta: más cerca de lo que pasó.
              </p>
            </div>
          </div>

          <p className="mt-6 font-mono text-[11px] leading-relaxed text-white/55">
            Cuatro pruebas de 14 días sobre las ventas de un comercio online, 2021-2025.
          </p>
        </div>
      </section>

    </>
  );
};

export default FullBleedCaseStudyDOM;
