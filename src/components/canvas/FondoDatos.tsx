import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { FONDOS_DATOS, type FondoDatosKind, type Tintas } from './fondosDatos';

// three.js se baja recién cuando hay un fondo en pantalla: la app de escritorio no lo usa en otro lado.
const ShaderCanvas = lazy(() => import('./ShaderCanvas'));

/** '#rrggbb' de una variable de color de la paleta ("118 71 235"). */
const hexOf = (name: string) => {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(name).trim().split(/\s+/).map(Number);
  return rgb.length === 3 && rgb.every(Number.isFinite) ? `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}` : '#7647eb';
};
const read = (): Tintas => ({ violet: hexOf('--pal-violet'), lavender: hexOf('--pal-lavender'), lime: hexOf('--pal-lime'), night: hexOf('--pal-night') });

/** Los colores de la paleta en uso, al día cuando se cambia a la sobria (o de vuelta). */
function useTintas() {
  const [tintas, setTintas] = useState(read);
  useEffect(() => {
    const watch = new MutationObserver(() => setTintas(read()));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => watch.disconnect();
  }, []);
  return tintas;
}

/**
 * Un fondo de datos animado (`FONDOS_DATOS`) dentro de un bloque con `relative overflow-hidden`, detrás de
 * su contenido. Con `fade` se apaga hacia la izquierda, donde suele ir el texto.
 */
export const FondoDatos: React.FC<{ kind: FondoDatosKind; fade?: [number, number]; className?: string }> = ({ kind, fade, className = '' }) => {
  const tintas = useTintas();
  const { fragment, uniforms } = FONDOS_DATOS[kind];
  const values = useMemo(() => uniforms(tintas), [uniforms, tintas]);
  return (
    <Suspense fallback={null}>
      <ShaderCanvas fragment={fragment} uniforms={values} fade={fade} className={`-z-10 ${className}`} />
    </Suspense>
  );
};
