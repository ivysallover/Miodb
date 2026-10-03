import { useEffect } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsap';
import { useMioStore, PetMood } from '@/utils/useMioStore';

interface SectionMoodMapping {
  selector: string;
  mood: PetMood;
}

const SECTION_MOODS: SectionMoodMapping[] = [
  { selector: '#hero', mood: 'reposo' },
  { selector: '#capacidades', mood: 'trabajando' },
  { selector: '#casos-estudio', mood: 'trabajando' },
  { selector: '#neural-flow', mood: 'trabajando' },
  { selector: '#como-funciona', mood: 'anomalia' },
  { selector: '#showcase', mood: 'anomalia' },
  { selector: '#quienes-somos', mood: 'celebrando' },
  { selector: '#cta', mood: 'celebrando' },
];

/**
 * useLandingPetNarrative:
 * Synchronizes the 3D MIO companion's mood and narrative posture
 * across the entire landing page based on the active viewport section.
 * Implements Lusion-grade single narrative thread scrollytelling.
 */
export function useLandingPetNarrative(enabled = true) {
  const setPetMood = useMioStore((s) => s.setPetMood);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Small delay to allow DOM & Lenis smooth scroll layout to settle
    const timer = setTimeout(() => {
      const ctx = gsap.context(() => {
        SECTION_MOODS.forEach(({ selector, mood }) => {
          const el = document.querySelector(selector);
          if (!el) return;

          ScrollTrigger.create({
            trigger: el,
            start: 'top 55%',
            end: 'bottom 45%',
            onEnter: () => setPetMood(mood),
            onEnterBack: () => setPetMood(mood),
          });
        });
      });

      return () => ctx.revert();
    }, 150);

    return () => clearTimeout(timer);
  }, [enabled, setPetMood]);
}

export default useLandingPetNarrative;
