import { useEffect, useState } from 'react';
import { LANDING_SECTIONS } from '@/lib/landingSections';

/**
 * Returns the id of the landing section currently crossing the middle of the viewport.
 * One IntersectionObserver for all sections (no scroll listeners, no layout reads).
 */
export function useActiveSection(): string {
  const [active, setActive] = useState<string>(LANDING_SECTIONS[0].id);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const elements = LANDING_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (elements.length === 0) return;

    // A thin band at the vertical center: whichever section overlaps it is "active".
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return active;
}
