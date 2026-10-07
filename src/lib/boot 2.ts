/**
 * Tiny boot-state channel. The boot sequence marks itself done (or is skipped),
 * and anything that should wait for it (the hero entrance) subscribes here.
 * Module-level on purpose: it must survive route changes and effect ordering.
 */
let done = false;
const listeners = new Set<() => void>();

export function isBootDone(): boolean {
  return done;
}

export function markBootDone(): void {
  if (done) return;
  done = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

/** Runs `fn` once when boot finishes. Returns an unsubscribe function. */
export function onBootDone(fn: () => void): () => void {
  if (done) {
    fn();
    return () => {};
  }
  listeners.add(fn);
  return () => listeners.delete(fn);
}
