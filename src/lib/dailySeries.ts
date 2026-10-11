import { useEffect, useState } from 'react';
import type { DailySeries } from '@/lib/paisaje';

let pending: Promise<DailySeries> | null = null;

/** The benchmark's daily series, fetched once however many scenes ask for it. */
export function loadDailySeries(): Promise<DailySeries> {
  if (!pending) {
    pending = fetch('/data/daily_series.json')
      .then((r) => (r.ok ? (r.json() as Promise<DailySeries>) : Promise.reject(new Error(String(r.status)))))
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
}

/** `data` once it is there; `failed` when it could not be loaded (the caller shows its static version). */
export function useDailySeries(enabled: boolean): { data: DailySeries | null; failed: boolean } {
  const [data, setData] = useState<DailySeries | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    loadDailySeries()
      .then((d) => alive && setData(d))
      .catch((err) => {
        console.warn('[MIO] daily series not available:', err);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { data, failed };
}
