import React, { useEffect, useRef, useState } from 'react';
import { applyActionCode, checkActionCode, confirmPasswordReset, sendPasswordResetEmail, verifyPasswordResetCode } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebaseAuth';
import { authMessage, passwordProblem } from '@/lib/authErrors';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { Fondo } from '@/components/canvas/Fondo';
import { useMioStore } from '@/utils/useMioStore';

/** Lo que pasa con el enlace: comprobándolo, listo, pidiendo la contraseña nueva, o vencido / usado. */
type Step =
  | { kind: 'cargando' }
  | { kind: 'listo'; title: string; text: string }
  | { kind: 'clave'; email: string }
  | { kind: 'fallo'; text: string };

const EXPIRED = 'El enlace venció o ya se usó. Pedí uno nuevo desde la app de MIO.';

/** Qué se le dice a quien vuelve a la app, según de dónde vino. */
const BACK = 'Volvé a la app de MIO (o a la página donde estabas): ya podés seguir.';

/**
 * Los enlaces de los mails de la cuenta (verificar el mail, crear una contraseña nueva, deshacer un
 * cambio de mail) llegan acá en vez de a la página genérica de Firebase: en la plantilla de cada mail,
 * la "URL de acción" es `https://miodb.pages.dev/cuenta` (ver `docs/MAILS_DE_CUENTA.md`). Firebase
 * agrega `mode` y `oobCode`; el código es de un solo uso y vence.
 */
export const CuentaPage: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const [step, setStep] = useState<Step>({ kind: 'cargando' });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const code = params.get('oobCode') || '';
  // El código sirve una sola vez: que el doble arranque de React en desarrollo no lo gaste dos veces.
  const used = useRef(false);

  useEffect(() => {
    if (used.current) return;
    used.current = true;
    if (!code) return setStep({ kind: 'fallo', text: 'Este enlace está incompleto. Abrilo de nuevo desde el mail.' });
    (async () => {
      switch (mode) {
        case 'verifyEmail':
          await applyActionCode(auth, code);
          return setStep({ kind: 'listo', title: 'Tu mail quedó verificado.', text: BACK });
        case 'resetPassword':
          return setStep({ kind: 'clave', email: await verifyPasswordResetCode(auth, code) });
        case 'recoverEmail': {
          // Alguien cambió el mail de la cuenta y la persona lo deshace: vuelve el de antes.
          const info = await checkActionCode(auth, code);
          await applyActionCode(auth, code);
          const email = info.data.email || '';
          if (email) await sendPasswordResetEmail(auth, email).catch(() => undefined);
          return setStep({
            kind: 'listo',
            title: 'Volvió tu mail de antes.',
            text: `La cuenta usa otra vez ${email}. Por las dudas, te mandamos un mail para crear una contraseña nueva.`,
          });
        }
        default:
          return setStep({ kind: 'fallo', text: 'No reconocemos este enlace. Abrilo de nuevo desde el mail.' });
      }
    })().catch(() => setStep({ kind: 'fallo', text: EXPIRED }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const weak = await passwordProblem(auth, password);
      if (weak) return setError(weak);
      await confirmPasswordReset(auth, code, password);
      setStep({ kind: 'listo', title: 'Listo, ya tenés contraseña nueva.', text: 'Entrá a la app de MIO con tu mail y la contraseña nueva.' });
    } catch (err) {
      const c = (err as { code?: string })?.code;
      setError(c === 'auth/expired-action-code' || c === 'auth/invalid-action-code' ? EXPIRED : authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  return (
    <main className="mio-app flex min-h-screen w-full items-center justify-center p-4">
      <Fondo kind="planilla" isDark={isDark} sober={null} />
      <section className={`flex w-full max-w-md flex-col items-center rounded-mio p-8 text-center sm:p-10 ${isDark ? 'bg-[#16122a] text-white' : 'bg-white text-zinc-950'}`}>
        <MioPet2D mood={step.kind === 'cargando' || busy ? 'trabajando' : step.kind === 'listo' ? 'celebrando' : step.kind === 'fallo' ? 'anomalia' : 'reposo'} size={120} showShadow={false} animated />
        {step.kind === 'cargando' && (
          <p className={`mt-6 inline-flex items-center gap-2 text-[15px] ${muted}`} aria-busy="true">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Comprobando el enlace…
          </p>
        )}
        {step.kind === 'listo' && (
          <>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em]">{step.title}</h1>
            <p className={`mt-3 text-[15px] leading-relaxed ${muted}`}>{step.text}</p>
          </>
        )}
        {step.kind === 'fallo' && (
          <>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em]">Este enlace no sirve.</h1>
            <p className={`mt-3 text-[15px] leading-relaxed ${muted}`}>{step.text}</p>
          </>
        )}
        {step.kind === 'clave' && (
          <form onSubmit={save} className="mt-6 w-full text-left">
            <h1 className="text-center text-3xl font-extrabold tracking-[-0.035em]">Creá tu contraseña nueva.</h1>
            <p className={`mt-3 text-center text-[15px] ${muted}`}>Para {step.email}.</p>
            {/* El mail va escondido para que el administrador de contraseñas la guarde con la cuenta correcta. */}
            <input type="email" autoComplete="username" value={step.email} readOnly hidden />
            <label className="mt-6 block">
              <span className="mb-1.5 block text-sm font-bold">Contraseña nueva</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 o más, con mayúscula, minúscula y número"
                className={`min-h-[48px] w-full rounded-mio-sm px-3 text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pal-violet ${isDark ? 'bg-white/[0.08] text-white placeholder:text-zinc-500' : 'bg-[#f3f3f5] text-zinc-950 placeholder:text-zinc-500'}`}
              />
            </label>
            {error && <p role="alert" className="mt-4 text-sm font-bold text-[#c0264a]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-6 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#7647eb] px-6 text-base font-bold text-white transition-colors duration-200 hover:bg-[#602cd1] active:scale-[0.98] cursor-pointer disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7647eb]"
            >
              {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
              Guardar la contraseña
            </button>
          </form>
        )}
      </section>
    </main>
  );
};

export default CuentaPage;
