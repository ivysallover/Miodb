import React, { useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';
import { Reveal } from '@/components/ui/Reveal';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

const BASE_REVENUE = 104800;
const BASE_MARGIN = 24.2;

/**
 * The third step of the method, after the flight: MIO explains the number and lets you try a
 * change before deciding. Two blocks side by side; the right one is a working example (demo
 * figures, price elasticity -0.65, the same assumption the method always showed).
 */
export const DecisionDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [price, setPrice] = useState(10); // % change in price

  const m = 1 + price / 100;
  const revenue = BASE_REVENUE * m * (1 + (m - 1) * -0.65);
  const margin = BASE_MARGIN + (m - 1) * 18;
  const rows = [
    { label: 'Ventas del mes', value: money(revenue), from: money(BASE_REVENUE), fill: revenue / (BASE_REVENUE * 1.12) },
    { label: 'Margen', value: margin.toFixed(1).replace('.', ',') + ' %', from: BASE_MARGIN.toFixed(1).replace('.', ',') + ' %', fill: margin / 31 },
  ];

  return (
    <section aria-label="Decisión: MIO explica el número y te deja probar cambios" className="relative z-10 w-full select-none pb-24 pt-10 sm:pb-32">
      <div className="mx-auto w-full max-w-[1440px] px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
            <div className={`flex flex-col justify-end gap-10 rounded-mio p-8 sm:p-10 lg:col-span-5 xl:p-12 ${isDark ? 'bg-[#2a1766] text-white' : 'bg-[#e4dcff] text-zinc-950'}`}>
              <div>
                <h2 className="text-4xl font-extrabold leading-[1.0] tracking-[-0.045em] sm:text-5xl xl:text-6xl" style={{ textWrap: 'balance' }}>
                  Después decidís vos.
                </h2>
                <p className={`mt-5 max-w-xl text-base leading-relaxed sm:text-lg ${isDark ? 'text-white/80' : 'text-zinc-700'}`}>
                  MIO te dice qué factores pesaron en cada número y te deja simular un cambio antes de hacerlo. También le
                  preguntás a tu planilla en castellano.
                </p>
              </div>
            </div>

            <div className="rounded-mio bg-[#0b0914] p-8 text-white sm:p-10 lg:col-span-7 xl:p-12">
              <label htmlFor="decision-price" className="flex items-end justify-between gap-6">
                <span className="text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-3xl">¿Y si subo el precio?</span>
                <span className="font-extrabold leading-none tracking-[-0.05em] text-[#bdf559] text-6xl tabular-nums sm:text-7xl">
                  +{price}
                  <span className="text-[0.42em] tracking-normal"> %</span>
                </span>
              </label>
              <input
                id="decision-price"
                type="range"
                min={0}
                max={30}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-6 w-full"
              />

              <div className="mt-8 space-y-6">
                {rows.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-semibold text-white/70">{r.label}</span>
                      <span className="text-3xl font-extrabold tabular-nums tracking-[-0.03em] sm:text-4xl">{r.value}</span>
                    </div>
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full origin-left rounded-full bg-[#7647eb] transition-transform duration-200 ease-out"
                        style={{ transform: `scaleX(${Math.min(1, Math.max(0.02, r.fill)).toFixed(3)})` }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-[11px] text-white/55">Hoy: {r.from}</p>
                  </div>
                ))}
              </div>

              <p className="mt-8 font-mono text-[11px] leading-relaxed text-white/55">
                Ejemplo con datos de demostración. Con tu planilla usa lo que muestran tus propias ventas. Es una estimación, no una garantía.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default DecisionDOM;
