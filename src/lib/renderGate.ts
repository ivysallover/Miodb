/**
 * renderGate — pauses a requestAnimationFrame loop while its host element is
 * off-screen or the browser tab is hidden, and resumes it automatically.
 *
 * Why: every WebGL canvas on the landing keeps its own renderer. Without a gate
 * they all burn GPU time even when scrolled far out of view, which is what drags
 * FPS down on the M2 and on mobile.
 *
 * Usage:
 *   const stop = startGatedLoop(container, (dt, elapsed) => { ...render... });
 *   // cleanup: stop();
 */
export function startGatedLoop(
  element: Element,
  frame: (dt: number, elapsed: number) => void,
  rootMargin = '120px'
): () => void {
  let rafId = 0;
  let running = false;
  let inView = true;
  let tabVisible = !document.hidden;
  let last = 0;
  let elapsed = 0;

  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);
    // Clamp dt so a long pause (tab switch, scroll far away) never causes a jump.
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    elapsed += dt;
    frame(dt, elapsed);
  };

  const sync = () => {
    const shouldRun = inView && tabVisible;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    } else if (!shouldRun && running) {
      running = false;
      cancelAnimationFrame(rafId);
    }
  };

  const observer = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      sync();
    },
    { rootMargin }
  );
  observer.observe(element);

  const onVisibility = () => {
    tabVisible = !document.hidden;
    sync();
  };
  document.addEventListener('visibilitychange', onVisibility);

  sync();

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
