/** La clase que apaga animaciones y transiciones en toda la ventana (`globals.css`): movimiento reducido elegido en la app. */
export const STILL_CLASS = 'mio-quieto';

/** Si hay que quedarse quieto: la compu pide menos movimiento o se eligió en la app. */
export const isStill = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains(STILL_CLASS);
