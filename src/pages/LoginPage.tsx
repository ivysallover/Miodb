import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMioStore } from '@/utils/useMioStore';
import { auth } from '@/lib/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { playMioDevSound } from '@/lib/sound';

export const LoginPage: React.FC = () => {
  const theme = useMioStore((s) => s.theme);
  const isDark = theme === 'dark';

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        setError('Ventana de acceso cerrada por el usuario.');
      } else {
        setError(err.message || 'Error al autenticar con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completá todos los campos.');
      return;
    }
    setError(null);
    setLoading(true);
    playMioDevSound('buttonA');
    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
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
    } catch (err: any) {
      console.error(err);
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password'
      ) {
        setError('Email o contraseña incorrectos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este email ya está registrado. Intentá iniciar sesión.');
      } else if (err.code === 'auth/weak-password') {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setError(err.message || 'Error al autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen transition-colors duration-300 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <button
          type="button"
          onClick={() => navigateTo('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] mb-6 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Landing</span>
        </button>

        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7647eb] to-[#5b24c6] text-white font-mono font-bold flex items-center justify-center shadow-lg">
            M
          </div>
          <span className="text-2xl font-bold font-mono tracking-tight">MIO PLATFORM</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-sans tracking-tight">
          {isRegister ? 'Creá tu cuenta corporativa' : 'Ingresá a tu cuenta'}
        </h2>
        <p className={`mt-2 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          Sincronizá tus modelos predictivos y proyectos en la nube
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
            isDark
              ? 'bg-white/[0.03] border-white/10 text-white'
              : 'bg-white border-zinc-200 text-zinc-950 shadow-sm'
          }`}
        >
          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-2xl border font-sans font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'bg-white/[0.06] border-white/15 text-white hover:bg-white/[0.1]'
                : 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#7647eb]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continuar con Google</span>
          </button>

          {/* Separator */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-black/[0.08] dark:border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-mono">
              <span className={`px-3 ${isDark ? 'bg-[#0b0914] text-zinc-500' : 'bg-white text-zinc-400'}`}>
                O con correo electrónico
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-500">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${
                  isDark
                    ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider mb-1.5 text-zinc-500">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#7647eb] ${
                  isDark
                    ? 'bg-white/[0.04] border-white/10 text-white placeholder-zinc-500'
                    : 'bg-zinc-50 border-zinc-300 text-zinc-950 placeholder-zinc-400'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : success ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#bdf559]" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-[#bdf559]" />
              )}
              <span>{success ? '✓ Acceso Concedido' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-[#7647eb] dark:text-[#a78bfa] hover:underline cursor-pointer"
            >
              {isRegister ? '¿Ya tenés cuenta? Iniciá sesión' : '¿No tenés una cuenta? Registrate gratis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
