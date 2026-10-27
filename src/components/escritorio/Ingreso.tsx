import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebaseAuth';
import { authMessage } from '@/lib/authErrors';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { GoogleMark } from '@/components/ui/GoogleMark';
import { desktop } from './desktop';
import { FOCUS, field, muted, slab, soft } from './ui';

type Mode = 'entrar' | 'crear';
const MODES: Record<Mode, string> = { entrar: 'Entrar', crear: 'Crear cuenta' };

/**
 * El ingreso a la app de escritorio, con la misma cuenta de la web: con Google (en el navegador de la
 * compu: `google.rs`) o con mail y contraseña (entrar, crear la cuenta o pedir
 * una contraseña nueva). Los términos se aceptan después, con el texto completo (`TermsAcceptance`).
 */
export const Ingreso: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await (mode === 'crear' ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(auth, email.trim(), password);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  /** Con Google: el navegador de la compu hace el ingreso y la ventana entra a Firebase con la credencial. */
  const withGoogle = async () => {
    setError(null);
    setNotice('Seguí en el navegador: elegí tu cuenta de Google y volvé acá.');
    setBusy(true);
    try {
      const idToken = await desktop.google();
      await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
    } catch (err) {
      setNotice(null);
      // Lo que falla en el navegador lo cuenta la app; lo que falla en Firebase, `authMessage`.
      setError(typeof err === 'string' ? err : authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim()) return setError('Escribí tu mail y te mandamos cómo crear una contraseña nueva.');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setNotice(`Te mandamos un mail a ${email.trim()} para crear una contraseña nueva.`);
    } catch (err) {
      setError(authMessage(err));
    }
  };

  const tab = (active: boolean) =>
    `relative min-h-[40px] flex-1 rounded-full px-4 text-sm font-bold transition-colors duration-200 cursor-pointer ${FOCUS} ${active ? 'text-white' : muted(isDark)}`;
  const toCreate = mode === 'crear';

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-3">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-3 md:grid-cols-[1fr_1.1fr]">
        <section className="relative flex min-h-[520px] flex-col justify-between overflow-hidden rounded-mio bg-[#7647eb] p-8 text-white sm:p-10">
          <p className="font-climate text-3xl leading-none tracking-[0.06em]">MIO</p>
          <div className="flex justify-center">
            <MioPet2D mood={busy ? 'trabajando' : 'reposo'} size={190} showShadow={false} animated />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold leading-[1.05] tracking-[-0.035em]">Tu planilla, analizada en esta compu.</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#ece6ff]">Entrá con tu cuenta de MIO, la misma de la web. Tus planillas no se suben a la cuenta: se leen y se analizan acá.</p>
          </div>
        </section>

        <section className={`flex flex-col justify-center rounded-mio p-8 sm:p-10 ${slab(isDark)}`}>
          <div role="tablist" aria-label="Cuenta" className={`relative isolate flex gap-1 rounded-full p-1 ${isDark ? 'bg-white/[0.06]' : 'bg-[#f3f3f5]'}`}>
            {/* Una sola marca que se desliza de lado a lado (no salta aunque cambie lo de abajo). */}
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.375rem)] rounded-full bg-[#7647eb] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: toCreate ? 'translateX(calc(100% + 0.25rem))' : 'none' }}
            />
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(null); setNotice(null); }} className={tab(mode === m)}>
                {MODES[m]}
              </button>
            ))}
          </div>
          {/* El título entra desde el lado del modo elegido, como si la tarjeta se corriera. */}
          <motion.h2
            key={mode}
            initial={{ opacity: 0, x: toCreate ? 18 : -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="mt-8 text-3xl font-extrabold tracking-[-0.035em]"
          >
            {toCreate ? 'Creá tu cuenta.' : 'Hola de nuevo.'}
          </motion.h2>
          <button type="button" onClick={withGoogle} disabled={busy} className={`${soft(isDark)} mt-6 w-full justify-center min-h-[52px] text-base`}>
            <GoogleMark /> Continuar con Google
          </button>
          <p className={`mt-5 text-center text-[13px] ${muted(isDark)}`} aria-hidden>o con tu mail</p>
          <form onSubmit={submit} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Mail</span>
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@empresa.com" className={`${field(isDark)} w-full`} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold">Contraseña</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={toCreate ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={toCreate ? 'Mínimo 6 caracteres' : 'Tu contraseña'}
                className={`${field(isDark)} w-full`}
              />
            </label>
            {error && <p role="alert" className="text-sm font-bold text-[#c0264a]">{error}</p>}
            {notice && <p role="status" className="text-sm font-bold text-[#7647eb]">{notice}</p>}
            <button
              type="submit"
              disabled={busy}
              className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#7647eb] px-6 text-base font-bold text-white transition-colors duration-200 hover:bg-[#602cd1] active:scale-[0.98] cursor-pointer disabled:opacity-60 ${FOCUS}`}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ArrowRight className="h-5 w-5 text-[#bdf559]" aria-hidden />}
              {MODES[mode]}
            </button>
          </form>
          {/* El mismo alto en los dos modos: cambiar de uno a otro no mueve el resto. */}
          <div className="mt-4 min-h-[44px]">
            {toCreate ? (
              <p className={`text-sm leading-snug ${muted(isDark)}`}>Al crearla vas a leer y aceptar los términos y condiciones.</p>
            ) : (
              <button type="button" onClick={reset} className={`rounded-full px-1 text-sm font-bold underline-offset-4 hover:underline cursor-pointer ${FOCUS} ${muted(isDark)}`}>
                Me olvidé la contraseña
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};
