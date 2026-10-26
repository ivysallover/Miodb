import { flushSync } from 'react-dom';

/** Un cuadro de pantalla (o 50 ms, si la ventana no dibuja cuadros: oculta o en segundo plano). */
const frame = () =>
  new Promise<void>((done) => {
    requestAnimationFrame(() => done());
    setTimeout(done, 50);
  });

/**
 * Cambia el tema de toda la ventana de una sola vez. Sin esto, cada elemento pasaba al color nuevo a
 * su ritmo (los que tienen `transition-colors` tarde, el resto de golpe) y los gráficos se redibujaban
 * después: la página quedaba un instante mitad clara y mitad oscura.
 *
 * Con View Transitions la ventana se congela, se aplica el cambio (sin transiciones de color, ver
 * `.theme-switching` en `globals.css`), se esperan dos cuadros para que los gráficos se redibujen y el
 * tema nuevo se abre en un círculo desde `from` (el botón que se tocó), o se funde si no hay punto.
 * Con movimiento reducido, o sin View Transitions, cambia al instante y entero.
 */
export function switchTheme(change: () => void, from?: { x: number; y: number }) {
  const root = document.documentElement;
  // Sin animación si la compu pide menos movimiento o si se eligió en la app (`mio-quieto`).
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || root.classList.contains('mio-quieto');
  root.classList.add('theme-switching');
  const done = () => root.classList.remove('theme-switching', 'theme-reveal');

  if (still || !document.startViewTransition) {
    flushSync(change);
    frame().then(done);
    return;
  }

  if (from) root.classList.add('theme-reveal');
  const t = document.startViewTransition(async () => {
    flushSync(change);
    await frame();
    await frame();
  });
  t.ready
    .then(() => {
      if (!from) return;
      const radius = Math.hypot(Math.max(from.x, innerWidth - from.x), Math.max(from.y, innerHeight - from.y));
      root.animate(
        { clipPath: [`circle(0px at ${from.x}px ${from.y}px)`, `circle(${radius}px at ${from.x}px ${from.y}px)`] },
        { duration: 520, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined); // si la transición se corta, el tema igual quedó aplicado
  t.finished.then(done, done);
}

/** El centro de lo que se tocó, para que el tema nuevo se abra desde ahí. */
export const originOf = (e: { currentTarget: Element }) => {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
