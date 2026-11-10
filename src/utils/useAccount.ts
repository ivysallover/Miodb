import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebaseAuth';
import { acceptTerms, acceptedHere, hasAcceptedTerms, type TermsApp } from '@/lib/terms';

/** En qué anda la cuenta: averiguándolo, sin ingresar, con el mail sin verificar, ingresada sin los
 *  términos vigentes, o lista. */
export type Account =
  | { kind: 'cargando' }
  | { kind: 'afuera' }
  | { kind: 'verificar'; user: User }
  | { kind: 'terminos'; user: User }
  | { kind: 'adentro'; user: User };

/** Una cuenta de mail y contraseña tiene que probar que el mail es suyo (con Google ya viene probado). */
export const needsVerifying = (user: User) => !user.emailVerified && user.providerData.some((p) => p.providerId === 'password');

/**
 * La cuenta de MIO y sus términos (`src/lib/terms.ts`), igual en la web y en la app de escritorio:
 * sigue el ingreso de Firebase y, con alguien adentro, mira si aceptó la versión vigente.
 */
export function useAccount(app: TermsApp) {
  const [account, setAccount] = useState<Account>({ kind: 'cargando' });
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settle = useCallback(async (user: User | null) => {
    if (!user) return setAccount({ kind: 'afuera' });
    if (needsVerifying(user)) return setAccount({ kind: 'verificar', user });
    // Si esta compu ya sabe que los aceptó, se entra de una (sin conexión, preguntarle a la cuenta
    // tarda); igual se confirma, por si cambió la versión.
    if (acceptedHere(user.uid)) setAccount({ kind: 'adentro', user });
    const accepted = await hasAcceptedTerms(user.uid);
    // Si mientras tanto cambió la cuenta, esta respuesta ya no vale.
    if (auth.currentUser?.uid === user.uid) setAccount({ kind: accepted ? 'adentro' : 'terminos', user });
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, settle);
  }, [settle]);

  /** Pregunta de nuevo si el mail ya quedó verificado (la persona tocó el enlace del mail). Renueva la
   *  sesión para que Firestore y el motor también lo sepan. Devuelve si quedó verificado. */
  const recheck = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return false;
    await user.reload();
    if (user.emailVerified) await user.getIdToken(true);
    await settle(user);
    return user.emailVerified;
  }, [settle]);

  /** Acepta los términos vigentes con la cuenta ingresada. */
  const accept = useCallback(async () => {
    if (account.kind !== 'terminos') return;
    setAccepting(true);
    setError(null);
    try {
      await acceptTerms(account.user.uid, app);
      setAccount({ kind: 'adentro', user: account.user });
    } catch {
      setError('No pudimos guardar la aceptación. Revisá tu conexión y probá de nuevo.');
    } finally {
      setAccepting(false);
    }
  }, [account, app]);

  const leave = useCallback(() => signOut(auth), []);

  return { account, accept, accepting, error, leave, recheck };
}
