import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebaseAuth';
import { authMessage } from '@/lib/authErrors';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { GoogleMark } from '@/components/ui/GoogleMark';
import { useMioStore } from '@/utils/useMioStore';

/**
 * Entrar con Google para la app de escritorio (`desktop/src-tauri/src/google.rs`). La app abre esta
 * página en el navegador con `puerto` y `estado`; acá se entra con Google como en la web y el
 * navegador vuelve a la app, en esta compu (`127.0.0.1:<puerto>`), con la credencial y el mismo
 * `estado`. La sesión de esta página se cierra al terminar: la cuenta queda adentro de la app.
 */
export const EscritorioGooglePage: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const params = new URLSearchParams(window.location.search);
  const port = Number(params.get('puerto'));
  const state = params.get('estado') || '';
  const valid = Number.isInteger(port) && port >= 1024 && port <= 65535 && /^[A-Za-z0-9]{16,}$/.test(state);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const idToken = GoogleAuthProvider.credentialFromResult(result)?.idToken;
      await signOut(auth);
      if (!idToken) throw new Error('sin credencial');
      // Solo a esta compu: el puerto lo eligió la app, y el estado le prueba que la respuesta es suya.
      window.location.href = `http://127.0.0.1:${port}/?${new URLSearchParams({ estado: state, id_token: idToken })}`;
    } catch (err) {
      setError((err as { code?: string })?.code === 'auth/popup-closed-by-user' ? 'Cerraste la ventana de Google antes de terminar. Probá de nuevo.' : authMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center p-4">
      <section className={`flex w-full max-w-md flex-col items-center rounded-mio p-8 text-center sm:p-10 ${isDark ? 'bg-[#16122a] text-white' : 'bg-white text-zinc-950'}`}>
        <MioPet2D mood={busy ? 'trabajando' : 'reposo'} size={120} showShadow={false} animated />
        {valid ? (
          <>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em]">Entrá a la app de MIO con Google.</h1>
            <p className={`mt-3 text-[15px] leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Elegí tu cuenta y volvé a la app: el ingreso queda allá.</p>
            <button
              type="button"
              onClick={go}
              disabled={busy}
              className="mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-[#7647eb] px-6 text-base font-bold text-white transition-colors duration-200 hover:bg-[#602cd1] active:scale-[0.98] cursor-pointer disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7647eb]"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <span className="rounded-full bg-white p-1"><GoogleMark /></span>}
              Continuar con Google
            </button>
            {error && <p role="alert" className="mt-4 text-sm font-bold text-[#c0264a]">{error}</p>}
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.035em]">Esta página se abre desde la app.</h1>
            <p className={`mt-3 text-[15px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Volvé a MIO para escritorio y tocá "Continuar con Google".</p>
          </>
        )}
      </section>
    </main>
  );
};

export default EscritorioGooglePage;
