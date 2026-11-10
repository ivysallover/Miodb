import React, { useEffect, useState } from 'react';
import { sendEmailVerification, type User } from 'firebase/auth';
import { Check, Loader2, LogOut, Mail } from 'lucide-react';
import { authMessage } from '@/lib/authErrors';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pal-violet';
/** Entre un mail y el siguiente: Firebase frena los pedidos seguidos y la persona no gana nada mandando cinco. */
const WAIT_S = 60;

/**
 * La cuenta se creó con mail y contraseña y el mail todavía no está verificado: se le pide que toque el
 * enlace del mail (la página `/cuenta` lo confirma). Al volver a esta ventana se pregunta solo; también
 * con el botón. La usan la web (`TermsGate`) y la app de escritorio.
 */
export const VerifyEmail: React.FC<{
  isDark: boolean;
  user: User;
  /** Pregunta si ya quedó verificado (`useAccount().recheck`). */
  onCheck: () => Promise<boolean>;
  onLeave: () => void;
}> = ({ isDark, user, onCheck, onLeave }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(id);
  }, [wait]);

  // Quien tocó el enlace en el navegador vuelve a esta ventana: ahí se pregunta, sin hacerle tocar nada.
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === 'visible') onCheck().catch(() => undefined);
    };
    window.addEventListener('focus', back);
    document.addEventListener('visibilitychange', back);
    return () => {
      window.removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', back);
    };
  }, [onCheck]);

  const check = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!(await onCheck())) setNotice('Todavía no figura verificado. Tocá el enlace del mail y volvé.');
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await sendEmailVerification(user);
      setNotice(`Te mandamos otro mail a ${user.email}.`);
      setWait(WAIT_S);
    } catch (err) {
      setError(authMessage(err));
    }
  };

  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  return (
    <section aria-labelledby="verificar-titulo" className={`flex w-full max-w-xl flex-col rounded-mio p-6 sm:p-8 ${isDark ? 'bg-pal-night-4 text-white' : 'bg-white text-zinc-950'}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pal-violet text-pal-lime" aria-hidden>
        <Mail className="h-6 w-6" />
      </span>
      <h1 id="verificar-titulo" className="mt-6 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl">Confirmá que el mail es tuyo.</h1>
      <p className={`mt-3 text-base leading-relaxed ${muted}`}>
        Te mandamos un mail a <strong className={isDark ? 'text-white' : 'text-zinc-950'}>{user.email}</strong> con un enlace. Tocalo y volvé acá: la cuenta se abre sola.
        Si no llega en un par de minutos, mirá en correo no deseado.
      </p>
      {error && <p role="alert" className="mt-4 text-sm font-bold text-[#c0264a]">{error}</p>}
      {notice && <p role="status" className="mt-4 text-sm font-bold text-pal-violet">{notice}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={check}
          disabled={busy}
          className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-pal-violet px-7 text-base font-bold text-white transition-colors duration-200 hover:bg-pal-violet-strong active:scale-[0.97] cursor-pointer disabled:opacity-60 ${focus}`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Check className="h-5 w-5 text-pal-lime" aria-hidden />}
          Ya lo verifiqué
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={wait > 0}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-default ${focus} ${isDark ? 'bg-white/[0.08] hover:bg-white/[0.16]' : 'bg-[#f3f3f5] hover:bg-pal-soft'}`}
        >
          {wait > 0 ? `Mandar otro (${wait} s)` : 'Mandar otro mail'}
        </button>
        <button type="button" onClick={onLeave} className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-bold cursor-pointer ${focus} ${isDark ? 'text-zinc-300 hover:bg-white/[0.08]' : 'text-zinc-600 hover:bg-[#f3f3f5]'}`}>
          <LogOut className="h-4 w-4" aria-hidden /> Salir de la cuenta
        </button>
      </div>
    </section>
  );
};
