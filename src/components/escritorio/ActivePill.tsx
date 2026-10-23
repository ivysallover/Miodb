import React from 'react';
import { motion } from 'framer-motion';

/** Cómo se mueve la marca de lo elegido: rápida y sin rebote. */
const SLIDE = { type: 'spring', stiffness: 560, damping: 42, mass: 0.8 } as const;

/**
 * La marca violeta detrás de la opción elegida (menú, tema, formato). Con el mismo `group`, al
 * cambiar de opción se desliza de una a otra en lugar de saltar. Va dentro de un elemento `relative`.
 */
export const ActivePill: React.FC<{ group: string; className?: string }> = ({ group, className = 'rounded-full' }) => (
  <motion.span layoutId={group} transition={SLIDE} aria-hidden className={`absolute inset-0 -z-10 bg-[#7647eb] ${className}`} />
);
