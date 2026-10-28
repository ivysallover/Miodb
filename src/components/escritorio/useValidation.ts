import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { keepPref, readPref } from '@/utils/prefs';

/** Días que se puede usar la app sin conectarse a validar la cuenta. */
export const MAX_OFFLINE_DAYS = 7;
/** Desde cuántos días antes del límite se avisa. */
const WARN_DAYS = 2;
const DAY = 86_400_000;
/** Cuánto puede ir para atrás el reloj (un cambio de horario, una corrección) sin que cuente como atrasarlo. */
const CLOCK_SLACK = 3_600_000;

export type Validation =
  | { kind: 'validando' }
  | { kind: 'ok' }
  /** Sin conexión, cerca del límite: quedan `daysLeft` días. */
  | { kind: 'aviso'; daysLeft: number }
  /** Sin conexión desde hace más de `MAX_OFFLINE_DAYS` (o nunca se validó en esta compu). */
  | { kind: 'vencida' }
  /** El reloj de la compu está antes de la última vez que se usó la app. */
  | { kind: 'reloj' }
  /** La cuenta ya no vale (desactivada, borrada o la sesión venció): hay que volver a ingresar. */
  | { kind: 'invalida'; disabled: boolean };

/**
 * Lo que vale sin conexión: hasta `MAX_OFFLINE_DAYS` desde la última validación, avisando los últimos
 * `WARN_DAYS`. Si el reloj está antes de la última vez que se usó, no se confía en él.
 */
export function offlineState(now: number, validated: number | null, seen: number | null): Validation {
  if (seen != null && now < seen - CLOCK_SLACK) return { kind: 'reloj' };
  if (validated == null) return { kind: 'vencida' };
  const left = MAX_OFFLINE_DAYS - (now - validated) / DAY;
  if (left <= 0) return { kind: 'vencida' };
  return left <= WARN_DAYS ? { kind: 'aviso', daysLeft: Math.ceil(left) } : { kind: 'ok' };
}

/** Errores de Firebase que dicen que la cuenta ya no vale (y no que falta conexión). */
const INVALID = ['auth/user-disabled', 'auth/user-not-found', 'auth/user-token-expired', 'auth/invalid-user-token'];
/** Cada cuánto se vuelve a validar con la app abierta. */
const RECHECK = 30 * 60_000;

const stamp = (key: string) => {
  const v = Number(readPref(key));
  return Number.isFinite(v) && v > 0 ? v : null;
};

/** Dónde queda en esta compu cuándo se validó la cuenta y la última vez que se usó la app. */
const keysOf = (uid: string) => ({ validated: `mio_validada_${uid}`, seen: `mio_vista_${uid}` });
const offlineFor = (uid: string) => {
  const keys = keysOf(uid);
  return offlineState(Date.now(), stamp(keys.validated), stamp(keys.seen));
};

/**
 * La cuenta de la app de escritorio, validada con Firebase cada vez que hay conexión (al entrar, al
 * volver la conexión y cada media hora). Sin conexión se puede seguir usando hasta
 * `MAX_OFFLINE_DAYS` desde la última validación; la fecha queda en esta compu.
 */
export function useValidation(user: User) {
  // Mientras se pregunta: si sin conexión ya alcanzaría, se usa eso; si no, "validando".
  const [state, setState] = useState<Validation>(() => {
    const s = offlineFor(user.uid);
    return s.kind === 'ok' || s.kind === 'aviso' ? s : { kind: 'validando' };
  });

  const check = useCallback(async () => {
    const keys = keysOf(user.uid);
    const now = Date.now();
    try {
      // `true`: pregunta a Firebase aunque el permiso guardado siga vigente.
      await user.getIdToken(true);
      keepPref(keys.validated, String(now));
      keepPref(keys.seen, String(now));
      setState({ kind: 'ok' });
    } catch (e) {
      const code = String((e as { code?: string })?.code || '');
      if (INVALID.includes(code)) return setState({ kind: 'invalida', disabled: code === 'auth/user-disabled' });
      const s = offlineFor(user.uid);
      if (s.kind !== 'reloj') keepPref(keys.seen, String(Math.max(now, stamp(keys.seen) ?? 0)));
      setState(s);
    }
  }, [user]);

  useEffect(() => {
    check();
    const id = window.setInterval(check, RECHECK);
    window.addEventListener('online', check);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', check);
    };
  }, [check]);

  return { state, retry: check };
}
