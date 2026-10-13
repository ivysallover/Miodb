/**
 * The engine runs few analyses at a time; the rest wait in line (backend `core/analysis_queue.py`).
 * This is what the waiting screen needs from that line, and what it says while an analysis is in it.
 */
export interface LineStatus {
  state: 'waiting' | 'running' | 'none';
  position: number;
}

/** The place to show while an analysis waits its turn (1 = next); null when it is not waiting. */
export function placeInLine(status: LineStatus | null | undefined): number | null {
  if (!status || status.state !== 'waiting') return null;
  const place = Math.floor(Number(status.position));
  return Number.isFinite(place) && place >= 1 ? place : 1;
}

/** The note under the steps while the analysis is in line. */
export function lineNote(place: number): string {
  const where = place <= 1 ? 'Tu análisis es el próximo en la fila.' : `Tu análisis está ${place}.º en la fila.`;
  return `${where} Arranca solo cuando le toque: no hace falta que hagas nada. No cierres esta pestaña o tendrías que empezar de nuevo.`;
}
