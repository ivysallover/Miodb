import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * ScrollTrigger.create that cannot take the page down. GSAP occasionally throws while it measures
 * pinned sections ("Cannot read properties of undefined (reading 'end')") when a trigger is created
 * in the middle of another refresh, for instance right after a route change. One retry on the next
 * frame is almost always enough; if it still fails the section simply loses its scroll effect and
 * the page stays usable instead of ending on the error screen.
 */
export const createScrollTrigger = (vars: ScrollTrigger.Vars): ScrollTrigger | null => {
  try {
    return ScrollTrigger.create(vars);
  } catch (first) {
    console.warn('[MIO] ScrollTrigger failed once, retrying:', first);
    try {
      ScrollTrigger.getAll().forEach((t) => { if (!t || !t.vars) { try { t?.kill(); } catch { /* already gone */ } } });
      return ScrollTrigger.create(vars);
    } catch (second) {
      console.warn('[MIO] ScrollTrigger skipped:', second);
      return null;
    }
  }
};

export { gsap, ScrollTrigger };
