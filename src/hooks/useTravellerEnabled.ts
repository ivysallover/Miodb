import { useEffect, useState } from 'react';

const WIDE = '(min-width: 1024px)';
const REDUCED = '(prefers-reduced-motion: reduce)';

const read = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(WIDE).matches &&
  !window.matchMedia(REDUCED).matches;

/**
 * Is the travelling 3D specimen on? Desktop-width screens that did not ask for reduced motion.
 * Everyone else keeps the previous behaviour (static hero stage on wide + reduced motion, the 2D
 * companion on phones and tablets), so nothing downloads three.js that did not before.
 */
export function useTravellerEnabled(): boolean {
  const [on, setOn] = useState(read);

  useEffect(() => {
    const queries = [window.matchMedia(WIDE), window.matchMedia(REDUCED)];
    const update = () => setOn(read());
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, []);

  return on;
}
