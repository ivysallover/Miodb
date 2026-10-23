import React, { useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { User } from 'firebase/auth';
import { TermsBox } from '@/components/ui/TermsAcceptance';
import { TERMS_VERSION } from '@/lib/terms';
import { desktop } from './desktop';
import { muted, soft, surface } from './ui';

const since = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);

/** La cuenta ingresada: quién es, los términos aceptados (para releerlos) y salir. */
export const Cuenta: React.FC<{ isDark: boolean; user: User; onLeave: () => void }> = ({ isDark, user, onLeave }) => {
  const [reading, setReading] = useState(false);
  const created = since(user.metadata.creationTime);
  return (
    <section className="space-y-2.5 sm:space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-mio bg-[#7647eb] p-6 text-white sm:p-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#ece6ff]">Cuenta</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-4xl">{user.email}</h1>
          {created && <p className="mt-2 text-[15px] text-[#ece6ff]">Con MIO desde el {created}.</p>}
        </div>
        <div className={`flex flex-col justify-between gap-5 rounded-mio p-6 sm:p-8 ${surface(isDark)}`}>
          <p className={`text-[15px] leading-relaxed ${muted(isDark)}`}>
            La cuenta es la misma de la web. Tus planillas y proyectos no se suben a ella: quedan en esta compu.
          </p>
          <button type="button" onClick={onLeave} className={`${soft(isDark)} self-start`}>
            <LogOut className="h-4 w-4" aria-hidden /> Salir de la cuenta
          </button>
        </div>
      </div>

      <div className={`rounded-mio p-6 sm:p-8 ${surface(isDark)}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.02em]">Términos y condiciones</h2>
            <p className={`mt-1 text-[14px] ${muted(isDark)}`}>Aceptaste la versión {TERMS_VERSION}. Quedó guardado en tu cuenta.</p>
          </div>
          <button type="button" onClick={() => setReading(!reading)} aria-expanded={reading} className={soft(isDark)}>
            {reading ? 'Cerrar' : 'Leerlos'} <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${reading ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
        {reading && (
          <TermsBox isDark={isDark} onNavigate={desktop.openWeb} className="mt-6 max-h-[60vh]" />
        )}
      </div>
    </section>
  );
};
