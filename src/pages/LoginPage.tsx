import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { auth } from '@/lib/firebaseAuth';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { playMioDevSound } from '@/lib/sound';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { authMessage } from '@/lib/authErrors';
import { acceptTerms } from '@/lib/terms';

export const LoginPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  // Where the visitor comes from ("planilla": the upload screen, "ejemplo": the example). It only
  // changes what the page says and which form opens first.
  const from = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('desde') : null;
  const forSheet = from === 'planilla' || from === 'ejemplo';
  const [isRegister, setIsRegister] = useState(forSheet);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigateTo = (path: string) => {
    playMioDevSound('select');
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    playMioDevSound('buttonA');
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      setSuccess(true);
      try {
        localStorage.setItem('mio_user_email', userCred.user.email || '');
        localStorage.setItem('mio_user_name', userCred.user.displayName || '');
      } catch {}
      setTimeout(() => {
        navigateTo('/dashboard');
      }, 700);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Cerraste la ventana de Google antes de terminar. Probá de nuevo.');
      } else {
        setError('No pudimos ingresar con Google. Probá de nuevo en un momento.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Completá tu mail y tu contraseña.');
      return;
    }
    if (isRegister && !acceptedTerms) {
      setError('Para crear tu cuenta tenés que aceptar los Términos y la Política de Privacidad.');
      return;
    }
    setError(null);
    setLoading(true);
    playMioDevSound('buttonA');
    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // Si no se pudo guardar (sin conexión), el dashboard la vuelve a pedir.
        await acceptTerms(userCred.user.uid, 'web').catch(() => undefined);
        setSuccess(true);
        try {
          localStorage.setItem('mio_user_email', userCred.user.email || '');
        } catch {}
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        setSuccess(true);
        try {
          localStorage.setItem('mio_user_email', userCred.user.email || '');
        } catch {}
      }
      setTimeout(() => {
        navigateTo('/dashboard');
      }, 700);
    } catch (err) {
      console.error(err);
      setError(authMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const title = isRegister
    ? forSheet ? 'Creá tu cuenta para subir tu planilla.' : 'Creá tu cuenta.'
    : forSheet ? 'Entrá para subir tu planilla.' : 'Entrá a tu cuenta.';
  const field = `w-full min-h-[48px] rounded-mio-sm px-4 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7647eb] ${
    isDark ? 'bg-white/[0.07] text-white placeholder:text-zinc-400' : 'bg-[#f3f3f5] text-zinc-950 placeholder:text-zinc-600'
  }`;
  const link = 'font-bold underline underline-offset-2 cursor-pointer';

  return (
    <div className={`mio-sheet-bg min-h-screen transition-colors duration-300 flex flex-col justify-center py-10 px-4 sm:px-6 ${
      isDark ? 'bg-[#07070a] text-white' : 'bg-[#f3f3f5] text-zinc-950'
    }`}>
      <div className="mx-auto w-full max-w-4xl">
        <button
          type="button"
          onClick={() => navigateTo(forSheet ? '/dashboard' : '/')}
          className={`mb-4 inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors duration-200 active:scale-[0.97] cursor-pointer ${
            isDark ? 'bg-white/[0.08] text-white hover:bg-white/[0.16]' : 'bg-white text-zinc-900 hover:bg-[#e4dcff]'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{forSheet ? 'Volver' : 'Volver al inicio'}</span>
        </button>

        <div className="grid gap-2.5 md:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col rounded-mio bg-[#0b0914] p-6 text-white sm:p-9">
            <MioPet2D mood={success ? 'celebrando' : loading ? 'trabajando' : 'reposo'} size={72} showShadow={false} animated={true} />
            <h1 className="mt-6 text-3xl sm:text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.04em] [text-wrap:balance]">{title}</h1>
            <ul className="mt-5 space-y-2 text-[15px] leading-relaxed text-[#cfc8f5]">
              <li>Es gratis.</li>
              <li>Cada análisis queda guardado en tus proyectos.</li>
              <li>Le preguntás a MIO sobre tus números y te llevás el informe.</li>
            </ul>
          </div>

          <div className={`rounded-mio p-6 sm:p-9 ${isDark ? 'bg-[#0e0d16]' : 'bg-white'}`}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className={`flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full px-5 text-base font-bold transition-colors duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
                isDark ? 'bg-white/[0.08] text-white hover:bg-white/[0.16]' : 'bg-[#f3f3f5] text-zinc-950 hover:bg-[#e4dcff]'
              }`}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#7647eb]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Continuar con Google</span>
            </button>
            <p className={`mt-2.5 text-[13px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Al continuar, aceptás los{' '}
              <button type="button" onClick={() => navigateTo('/terminos')} className={link}>Términos</button>{' '}
              y la{' '}
              <button type="button" onClick={() => navigateTo('/privacidad')} className={link}>Política de Privacidad</button>.
            </p>

            <p className="mt-7 text-sm font-bold">O con tu mail</p>

            {error && (
              <div role="alert" className={`mt-3 flex items-start gap-2.5 rounded-mio-sm p-3.5 text-sm font-medium ${isDark ? 'bg-[#3a1220] text-[#ffd5dc]' : 'bg-[#ffe3e6] text-[#7a1022]'}`}>
                <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-3 space-y-3.5">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-bold">Mail</label>
                <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@tunegocio.com" className={field} />
              </div>
              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-bold">Contraseña</label>
                <input id="login-password" type="password" required autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Tu contraseña'} className={field} />
              </div>

              {isRegister && (
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="login-terms-checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#7647eb]"
                  />
                  <label htmlFor="login-terms-checkbox" className={`text-sm leading-relaxed cursor-pointer ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Acepto los{' '}
                    <button type="button" onClick={() => navigateTo('/terminos')} className={link}>Términos</button>{' '}
                    y la{' '}
                    <button type="button" onClick={() => navigateTo('/privacidad')} className={link}>Política de Privacidad</button>.
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#7647eb] px-5 text-base font-bold text-white transition-colors duration-200 hover:bg-[#602cd1] active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle2 className="w-4 h-4 text-[#bdf559]" /> : <ArrowRight className="w-4 h-4 text-[#bdf559]" />}
                <span aria-live="polite">{success ? 'Listo, entrando…' : isRegister ? 'Crear cuenta' : 'Entrar'}</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className={`mt-4 min-h-[44px] text-sm ${link} ${isDark ? 'text-[#c9b8ff]' : 'text-[#5a2fd0]'}`}
            >
              {isRegister ? '¿Ya tenés cuenta? Entrá' : '¿No tenés cuenta? Creala gratis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
