import React, { useEffect, useState } from 'react';

/**
 * A quiet "Probar con mi planilla" pill that appears once the visitor has seen the example
 * (the moment of highest intent) and leaves before the closing CTA, so it never doubles up.
 */
export const StickyCta: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const ej = document.getElementById('ejemplo');
      const cta = document.getElementById('cta');
      if (!ej) return;
      const passedExample = ej.getBoundingClientRect().bottom < window.innerHeight * 0.4;
      const ctaNear = cta ? cta.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
      const mq = document.getElementById('como-funciona')?.getBoundingClientRect();
      const inMethod = !!mq && mq.top < window.innerHeight * 0.5 && mq.bottom > window.innerHeight * 0.5;
      const phone = window.innerWidth < 640;
      setShow(passedExample && !ctaNear && !(phone && inMethod));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const go = () => {
    try { localStorage.removeItem('mio_active_analysis'); } catch {}
    window.history.pushState({}, '', '/dashboard?new=1');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <button
      type="button"
      onClick={go}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`fixed z-[60] left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 bottom-4 sm:bottom-6 inline-flex min-h-[48px] items-center gap-2.5 rounded-full border border-black/80 bg-[#bdf559] px-6 text-sm font-semibold text-black transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] cursor-pointer ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      Probar con mi planilla
      <span aria-hidden>→</span>
    </button>
  );
};

export default StickyCta;
