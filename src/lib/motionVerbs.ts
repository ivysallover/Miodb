import { gsap } from '@/lib/gsap';

/**
 * One verb per act. The landing used to enter every block with the same wipe; each act now has its
 * own gesture, named for what the section is about. All of them play once, clean up after
 * themselves, are skipped for reduced motion and only touch transform / opacity / clip-path.
 */

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Cleanup = () => void;


/** UNFOLD (Para quién): each row is inserted like a new spreadsheet row, opening from its top rule. */
export function unfoldRows(rows: HTMLElement[], trigger: Element): Cleanup {
  if (reduced() || rows.length === 0) return () => {};
  const tween = gsap.fromTo(
    rows,
    { clipPath: 'inset(0 0 100% 0)', y: -14 },
    {
      clipPath: 'inset(0 0 0% 0)',
      y: 0,
      duration: 0.9,
      ease: 'expo.out',
      stagger: 0.16,
      immediateRender: true,
      clearProps: 'clipPath,transform',
      scrollTrigger: { trigger, start: 'top 78%', once: true },
    }
  );
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}

/** TYPE-IN (Tus datos): the ledger writes itself cell by cell, hard steps, no easing. */
export function typeInCells(cells: HTMLElement[], rule: HTMLElement | null, trigger: Element): Cleanup {
  if (reduced() || cells.length === 0) return () => {};
  const tl = gsap.timeline({ scrollTrigger: { trigger, start: 'top 75%', once: true } });
  if (rule) tl.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'steps(14)', transformOrigin: '0 50%' }, 0);
  tl.fromTo(
    cells,
    { opacity: 0, y: -10 },
    { opacity: 1, y: 0, duration: 0.45, ease: 'steps(4)', stagger: 0.09, clearProps: 'transform,opacity' },
    0.1
  );
  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

/** STAMP (Equipo): the two monograms land like a stamp on paper, then the name is written. */
export function stampPeople(stamps: HTMLElement[], names: HTMLElement[], trigger: Element): Cleanup {
  if (reduced() || stamps.length === 0) return () => {};
  const tl = gsap.timeline({ scrollTrigger: { trigger, start: 'top 75%', once: true } });
  tl.fromTo(
    stamps,
    { scale: 1.55, rotate: -7, opacity: 0 },
    { scale: 1, rotate: 0, opacity: 1, duration: 0.38, ease: 'power4.in', stagger: 0.22, clearProps: 'transform,opacity' },
    0
  );
  tl.fromTo(
    names,
    { clipPath: 'inset(0 100% 0 0)' },
    { clipPath: 'inset(0 0% 0 0)', duration: 0.7, ease: 'expo.out', stagger: 0.22, clearProps: 'clipPath' },
    0.35
  );
  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

/**
 * MELT (Climate Crisis): the font's YEAR axis (1979 solid → 2050 melted) as a scrubbed value. The
 * element solidifies while it climbs from the bottom of the screen to the middle.
 */
export function solidifyOnEnter(el: HTMLElement, trigger: Element, from = 2050): Cleanup {
  if (reduced()) return () => {};
  const state = { year: from };
  el.style.setProperty('--mio-year', String(from));
  const tween = gsap.to(state, {
    year: 1979,
    ease: 'none',
    onUpdate: () => el.style.setProperty('--mio-year', String(Math.round(state.year))),
    scrollTrigger: { trigger, start: 'top 100%', end: 'top 45%', scrub: true },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    el.style.removeProperty('--mio-year');
  };
}
