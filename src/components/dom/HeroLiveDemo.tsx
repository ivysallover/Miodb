import React, { useEffect, useRef, useState } from 'react';
import { useMioStore } from '@/utils/useMioStore';

const ROWS = [
  ['12/03', 'Tornillos x100', '$18.400'],
  ['13/03', 'Pintura 4 L', '$41.200'],
  ['13/03', 'Cinta aisladora', '$9.900'],
  ['14/03', 'Taladro 650 W', '$184.200'],
  ['15/03', 'Guantes', '$6.400'],
];
const FLAG = 3;
const STEPS = 15; // 0-4 scan · 5 flag · 6 finding 1 · 7 finding 2 · hold · restart

/** Tell the hero specimen to change mood for a moment (see MioHeroStage). */
export const nudgePet = (state: 'anomalia' | 'celebrando' | 'trabajando', ms = 1400) =>
  window.dispatchEvent(new CustomEvent('mio:mood', { detail: { state, ms } }));

/**
 * The product, running, in the first viewport: MIO reads a small sheet row by row, catches the
 * odd sale and says what it found. Loops quietly; pauses off-screen; static under reduced motion.
 */
export const HeroLiveDemo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(8);
      return;
    }
    let timer = 0;
    let visible = false;
    const tick = () => setStep((s) => (s + 1) % STEPS);
    const io = new IntersectionObserver((entries) => {
      const now = entries.some((e) => e.isIntersecting);
      if (now === visible) return;
      visible = now;
      window.clearInterval(timer);
      if (visible) timer = window.setInterval(tick, 560);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (step === 5) nudgePet('anomalia', 1300);
    if (step === 6) nudgePet('celebrando', 1500);
  }, [step]);

  const scanning = step < 5;
  const flagged = step >= 5;

  return (
    <div
      ref={ref}
      className={`w-full max-w-[360px] rounded-mio border overflow-hidden ${
        isDark ? 'bg-[#0e0d16] border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-950'
      } ${className}`}
    >
      <div className={`flex items-center justify-between px-3.5 py-2 border-b font-mono text-[10px] font-bold uppercase tracking-wider ${isDark ? 'border-white/10 text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}>
        <span>ventas_marzo.xlsx</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 ${scanning ? 'bg-[#7647eb] animate-pulse' : 'bg-[#bdf559]'}`} />
          <span key={scanning ? 'a' : 'b'} className="mio-swap">{scanning ? 'Leyendo' : 'Listo'}</span>
        </span>
      </div>

      <table className="w-full font-mono text-[12px]">
        <tbody>
          {ROWS.map((r, i) => {
            const isScan = scanning && step === i;
            const isFlag = flagged && i === FLAG;
            return (
              <tr
                key={i}
                className={`transition-colors duration-200 ${isFlag ? 'bg-[#bdf559]/45 mio-cell-on font-bold' : isScan ? (isDark ? 'bg-[#7647eb]/35' : 'bg-[#7647eb]/15') : ''}`}
              >
                {r.map((c, j) => (
                  <td key={j} className={`px-3.5 py-1.5 border-b ${isDark ? 'border-white/[0.07]' : 'border-zinc-100'} ${j === 2 ? 'text-right tabular-nums' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="min-h-[92px] p-3 space-y-2">
        {step >= 6 && (
          <p className="mio-pop flex items-start gap-2 text-[13px] leading-snug font-medium">
            <span className="mt-0.5 shrink-0 px-1.5 py-0.5 bg-[#bdf559] text-black font-mono text-[10px] font-bold">RARO</span>
            El 14/03 vendiste 3,1 veces lo habitual. Revisalo.
          </p>
        )}
        {step >= 7 && (
          <p className="mio-pop flex items-start gap-2 text-[13px] leading-snug font-medium">
            <span className="mt-0.5 shrink-0 px-1.5 py-0.5 bg-[#7647eb] text-white font-mono text-[10px] font-bold">VIENE</span>
            Sin contar esa venta, la semana próxima ronda entre $412.000 y $468.000.
          </p>
        )}
      </div>
      <p className={`px-3.5 pb-2.5 font-mono text-[9.5px] uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
        Demostración con datos de ejemplo
      </p>
    </div>
  );
};

export default HeroLiveDemo;
