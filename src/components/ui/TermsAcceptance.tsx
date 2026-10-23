import React from 'react';
import { Check, Loader2, LogOut } from 'lucide-react';
import { TerminosTexto } from '@/pages/TerminosPage';
import { TERMS_VERSION } from '@/lib/terms';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7647eb]';

/** El texto de los términos en su caja, para leerlo con la rueda o el teclado sin mover la página. */
export const TermsBox: React.FC<{ isDark: boolean; onNavigate: (path: string) => void; className?: string }> = ({ isDark, onNavigate, className = '' }) => (
  <div tabIndex={0} aria-label="Términos y condiciones" className={`space-y-6 overflow-y-auto rounded-mio-sm p-5 sm:p-6 ${focus} ${isDark ? 'bg-[#0e0d16]' : 'bg-[#f3f3f5]'} ${className}`} data-lenis-prevent>
    <TerminosTexto onNavigate={onNavigate} />
  </div>
);

/**
 * Aceptar los términos vigentes con la cuenta ingresada: el texto completo para leer y los dos
 * caminos (aceptar o salir de la cuenta). La usan la web (`TermsGate`) y la app de escritorio.
 */
export const TermsAcceptance: React.FC<{
  isDark: boolean;
  email: string | null;
  accepting: boolean;
  error: string | null;
  onAccept: () => void;
  onLeave: () => void;
  /** Abre las páginas que nombran los términos (arrepentimiento, baja). */
  onNavigate: (path: string) => void;
}> = ({ isDark, email, accepting, error, onAccept, onLeave, onNavigate }) => {
  return (
    <section aria-labelledby="terminos-titulo" className={`flex max-h-full w-full max-w-4xl flex-col rounded-mio p-6 sm:p-8 ${isDark ? 'bg-[#16122a] text-white' : 'bg-white text-zinc-950'}`}>
      <h1 id="terminos-titulo" className="text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl">Antes de seguir, leé y aceptá los términos.</h1>
      <p className={`mt-3 text-base ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {email ? <>Ingresaste como <strong className={isDark ? 'text-white' : 'text-zinc-950'}>{email}</strong>. </> : null}
        Son los de {TERMS_VERSION}. La aceptación queda guardada en tu cuenta; si los términos cambian, te los volvemos a pedir.
      </p>
      <TermsBox isDark={isDark} onNavigate={onNavigate} className="mt-6 min-h-0 flex-1" />
      {error && <p role="alert" className="mt-4 text-sm font-bold text-[#c0264a]">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={accepting}
          className={`inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#7647eb] px-7 text-base font-bold text-white transition-colors duration-200 hover:bg-[#602cd1] active:scale-[0.97] cursor-pointer disabled:opacity-60 ${focus}`}
        >
          {accepting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Check className="h-5 w-5 text-[#bdf559]" aria-hidden />}
          Acepto los términos
        </button>
        <button type="button" onClick={onLeave} className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-bold cursor-pointer ${focus} ${isDark ? 'text-zinc-300 hover:bg-white/[0.08]' : 'text-zinc-600 hover:bg-[#f3f3f5]'}`}>
          <LogOut className="h-4 w-4" aria-hidden /> Salir de la cuenta
        </button>
      </div>
    </section>
  );
};
