import { describe, expect, it } from 'vitest';
import { MAX_OFFLINE_DAYS, offlineState } from '@/components/escritorio/useValidation';

const DAY = 86_400_000;
const now = Date.UTC(2026, 9, 28, 12);

describe('la cuenta sin conexión', () => {
  it('vale una semana desde la última validación y avisa los últimos dos días', () => {
    expect(MAX_OFFLINE_DAYS).toBe(7);
    expect(offlineState(now, now - 1 * DAY, now)).toEqual({ kind: 'ok' });
    expect(offlineState(now, now - 5 * DAY, now)).toEqual({ kind: 'aviso', daysLeft: 2 });
    expect(offlineState(now, now - 6.5 * DAY, now)).toEqual({ kind: 'aviso', daysLeft: 1 });
    expect(offlineState(now, now - 7 * DAY, now)).toEqual({ kind: 'vencida' });
  });

  it('nunca validada en esta compu, o con el reloj atrasado, no abre sin conexión', () => {
    expect(offlineState(now, null, null)).toEqual({ kind: 'vencida' });
    // Atrasar el reloj para estirar la semana: la compu ya se usó "después".
    expect(offlineState(now - 3 * DAY, now - 8 * DAY, now)).toEqual({ kind: 'reloj' });
    // Un cambio de hora chico no cuenta.
    expect(offlineState(now - 30 * 60_000, now - DAY, now)).toEqual({ kind: 'ok' });
  });
});
