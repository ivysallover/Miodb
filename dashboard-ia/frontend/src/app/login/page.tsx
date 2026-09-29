'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import toast from 'react-hot-toast';
import { Mail, Lock, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { logSystemEvent } from '@/lib/logger';

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Por favor completá todos los campos');
      return;
    }

    if (isRegister && !acceptedTerms) {
      toast.error('Debés aceptar los Términos y la Política de Privacidad para crear tu cuenta.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        logSystemEvent('auth_signup', { method: 'email', uid: userCred.user.uid });
        toast.success('¡Cuenta creada exitosamente!');
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        logSystemEvent('auth_login', { method: 'email', uid: userCred.user.uid });
        toast.success('¡Sesión iniciada!');
      }
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        toast.error('Email o contraseña incorrectos.');
      } else if (err.code === 'auth/email-already-in-use') {
        toast.error('Este email ya está registrado. Intentá iniciar sesión.');
      } else if (err.code === 'auth/weak-password') {
        toast.error('La contraseña debe tener al menos 6 caracteres.');
      } else {
        toast.error(err.message || 'Ocurrió un error al autenticar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      logSystemEvent('auth_login', { method: 'google', uid: userCred.user.uid });
      toast.success('¡Autenticado con Google!');
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error('Ventana de inicio de sesión cerrada.');
      } else {
        toast.error('Error al conectar con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-mio-lime selection:text-black">
      {/* Fondo interactivo de Shaders MIO */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <MioBackgroundShader theme="light" opacity={0.4} />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10 px-4">
        <Link
          href="/"
          className="inline-flex items-center gap-3 mb-6 group focus-visible:ring-2 focus-visible:ring-mio-violet focus-visible:outline-none"
        >
          <div className="w-10 h-10 flex items-center justify-center font-mono font-bold text-base rounded-xl bg-zinc-950 text-white shadow-md transition-transform group-hover:scale-105">
            M
          </div>
          <div className="text-left">
            <span className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight block">
              MIO
            </span>
            <span className="text-[11px] font-mono font-bold text-gray-500 uppercase tracking-wider block -mt-0.5">
              Dashboard Inteligente
            </span>
          </div>
        </Link>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-950 tracking-tight font-sans">
          {isRegister ? 'Creá tu cuenta en MIO' : 'Ingresá a tu cuenta'}
        </h2>
        <p className="mt-2 text-xs text-gray-600 font-medium">
          {isRegister ? '¿Ya tenés cuenta?' : '¿No tenés una cuenta?'}{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="font-bold text-mio-violet hover:underline transition-colors focus-visible:ring-2 focus-visible:ring-mio-violet cursor-pointer"
          >
            {isRegister ? 'Iniciá sesión acá' : 'Registrate gratis'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 rounded-3xl border border-zinc-200/80 shadow-xl">
          {/* Botón de Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 border border-zinc-300 rounded-2xl text-sm font-semibold text-gray-800 bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 focus-visible:ring-2 focus-visible:ring-mio-violet cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <span>Continuar con Google</span>
          </button>

          <div className="my-5 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-mono">
              <span className="bg-white px-3 text-gray-500 font-bold">O con correo</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleAuth}>
            <div>
              <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="block w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mio-violet focus:border-transparent text-gray-900 bg-zinc-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-mio-violet focus:border-transparent text-gray-900 bg-zinc-50"
                  required
                />
              </div>
            </div>

            {/* Checkbox de consentimiento expreso para registro */}
            {isRegister && (
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-mio-violet rounded border-zinc-300 focus-visible:ring-2 focus-visible:ring-mio-violet"
                    required
                  />
                  <span className="leading-snug">
                    Acepto los{' '}
                    <Link href="/terminos" target="_blank" className="font-bold underline text-mio-violet hover:text-black">
                      Términos y Condiciones
                    </Link>{' '}
                    y la{' '}
                    <Link href="/privacidad" target="_blank" className="font-bold underline text-mio-violet hover:text-black">
                      Política de Privacidad
                    </Link>{' '}
                    de MIO.
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white font-mono text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 tracking-wide focus-visible:ring-2 focus-visible:ring-mio-violet cursor-pointer active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isRegister ? 'Registrarse' : 'Ingresar'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#bdf559]" />
                </>
              )}
            </button>
          </form>

          {/* Aviso legal general de consentimiento */}
          <p className="mt-4 text-[11px] text-center text-gray-500 font-medium leading-normal">
            Al continuar, confirmás la aceptación de nuestros{' '}
            <Link href="/terminos" className="underline font-bold text-gray-800 hover:text-mio-violet">
              Términos y Condiciones
            </Link>{' '}
            y{' '}
            <Link href="/privacidad" className="underline font-bold text-gray-800 hover:text-mio-violet">
              Política de Privacidad
            </Link>.
          </p>

          <div className="mt-6 pt-4 border-t border-zinc-200 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-gray-800 bg-[#bdf559]/20 hover:bg-[#bdf559]/30 border border-[#bdf559]/40 rounded-full px-4 py-2 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-mio-violet" />
              <span>Explorar Dashboard sin Cuenta</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
