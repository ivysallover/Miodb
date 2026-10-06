import React, { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';

const TEXT =
  'Tus ventas ya dicen qué va a pasar. Lo que faltaba era alguien que las escuche, las ordene y te lo cuente en castellano.';
const ACCENT = new Set(['escuche,', 'ordene', 'castellano.']);

export const ManifiestoDOM: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const words = TEXT.split(' ');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = el.querySelectorAll<HTMLElement>('[data-w]');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      spans.forEach((s) => (s.style.opacity = '1'));
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        spans,
        { opacity: 0.22 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 70%', end: 'bottom 45%', scrub: true },
        }
      );
    }, el);
    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <section ref={ref} className="relative z-10 w-full bg-[#3d1f8a] text-white py-20 sm:py-28 select-none">
      <p
        className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16 font-extrabold tracking-[-0.045em] leading-[1.02] text-[2.3rem] sm:text-6xl lg:text-[6.2rem]"
        style={{ textWrap: 'balance' }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            data-w
            className={ACCENT.has(w) ? 'text-[#bdf559]' : ''}
            style={{ opacity: 0.22 }}
          >
            {w}{' '}
          </span>
        ))}
      </p>
    </section>
  );
};

export default ManifiestoDOM;
