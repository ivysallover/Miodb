import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { keepPref, readPref } from '@/utils/prefs';

/**
 * Los términos y condiciones aceptados por cada cuenta, en la web y en la app de escritorio.
 *
 * La aceptación queda en Firestore, en `users/{uid}.terminos = { version, aceptados, desde, app }`
 * (las reglas en `dashboard-ia/firestore.rules` dejan que cada cuenta escriba solo la suya). Cambiar
 * `TERMS_VERSION` vuelve a pedirla a todos. También se recuerda en esta compu, para que la app de
 * escritorio abra sin conexión una vez aceptados.
 */

/** La versión vigente: la fecha de la última actualización, como la muestra la página de términos. */
export const TERMS_VERSION = 'Septiembre 2026';

export type TermsApp = 'web' | 'escritorio';

const localKey = (uid: string) => `mio_terminos_${uid}`;

/** Si esta compu recuerda que la cuenta aceptó la versión vigente (para abrir al instante, aun sin conexión). */
export const acceptedHere = (uid: string) => readPref(localKey(uid)) === TERMS_VERSION;

/** Si esta cuenta aceptó la versión vigente. Sin conexión, vale lo recordado en esta compu. */
export async function hasAcceptedTerms(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const accepted = snap.get('terminos.version') === TERMS_VERSION && snap.get('terminos.aceptados') === true;
    if (accepted) keepPref(localKey(uid), TERMS_VERSION);
    return accepted;
  } catch {
    return acceptedHere(uid);
  }
}

/** Guarda que esta cuenta aceptó la versión vigente, desde la web o desde la app. */
export async function acceptTerms(uid: string, app: TermsApp): Promise<void> {
  await setDoc(doc(db, 'users', uid), { terminos: { version: TERMS_VERSION, aceptados: true, desde: serverTimestamp(), app } }, { merge: true });
  keepPref(localKey(uid), TERMS_VERSION);
}
