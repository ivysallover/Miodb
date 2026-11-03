import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { FONDOS_DATOS, type FondoDatosKind, type Tintas } from './fondosDatos';

// three.js se baja recién cuando se elige uno de estos fondos: la app de escritorio no lo usa en otro lado.
const ShaderCanvas = lazy(() => import('./ShaderCanvas'));

/** '#rrggbb' de una variable de color de la paleta ("118 71 235"). */
const hexOf = (name: string) => {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).map(Number);
  return rgb.length === 3 && rgb.every(Number.isFinite) ? `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}` : '#7647eb';
};

/** Los colores de la paleta en uso; en el tema claro, los claros pasan a los fuertes para que se vean. */
const read = (isDark: boolean): Tintas => {
  const [violet, lavender, lime, night] = ['--pal-violet', '--pal-lavender', '--pal-lime', '--pal-night'].map(hexOf);
  return isDark ? { violet, lavender, lime, night } : { violet, lavender: violet, lime: violet, night: lavender };
};

/** Al día cuando se cambia de tema o de paleta (la sobria es una clase en `<html>`). */
function useTintas(isDark: boolean) {
  const [tintas, setTintas] = useState(() => read(isDark));
  useEffect(() => {
    setTintas(read(isDark));
    const watch = new MutationObserver(() => setTintas(read(isDark)));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => watch.disconnect();
  }, [isDark]);
  return tintas;
}

/** Uno de `FONDOS_DATOS` a todo lo que mida su contenedor, con los colores de la paleta en uso. */
export const FondoDatos: React.FC<{ kind: FondoDatosKind; isDark: boolean }> = ({ kind, isDark }) => {
  const tintas = useTintas(isDark);
  const { fragment, uniforms } = FONDOS_DATOS[kind];
  const values = useMemo(() => uniforms(tintas), [uniforms, tintas]);
  return (
    <Suspense fallback={null}>
      <ShaderCanvas fragment={fragment} uniforms={values} />
    </Suspense>
  );
};
