import React, { useState } from 'react';
import { Loader2, LogOut, RefreshCw, WifiOff } from 'lucide-react';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { MAX_OFFLINE_DAYS, type Validation } from './useValidation';
import { PRIMARY, lilac, muted, slab, slabText, soft } from './ui';

const TEXTS: Record<'validando' | 'vencida' | 'reloj' | 'invalida', { title: string; text: string }> = {
  validando: { title: 'Validando tu cuenta…', text: 'Un momento: MIO confirma tu cuenta antes de abrir.' },
  vencida: {
    title: 'No pudimos validar tu cuenta.',
    text: `Hace más de ${MAX_OFFLINE_DAYS} días que MIO no se conecta para confirmarla. Conectate a internet y probá de nuevo: tus proyectos siguen guardados en esta compu.`,
  },
  reloj: {
    title: 'La fecha de la compu no coincide.',
    text: 'El reloj está antes de la última vez que usaste MIO. Revisá la fecha y la hora, o conectate a internet para validar tu cuenta.',
  },
  invalida: { title: 'Tenés que volver a ingresar.', text: 'Tu sesión venció o la cuenta cambió. Ingresá de nuevo para seguir: tus proyectos siguen guardados en esta compu.' },
};

/**
 * Cuando la cuenta no se puede usar: validándose, sin conexión hace más de `MAX_OFFLINE_DAYS`, con el
 * reloj atrasado o la cuenta que ya no vale. Ocupa la ventana entera, con reintentar o salir.
 */
export const Validacion: React.FC<{ state: Exclude<Validation, { kind: 'ok' } | { kind: 'aviso' }>; isDark: boolean; onRetry: () => Promise<void>; onLeave: () => void }> = ({ state, isDark, onRetry, onLeave }) => {
  const [retrying, setRetrying] = useState(false);
  const t =
    state.kind === 'invalida' && state.disabled
      ? { title: 'Esta cuenta está desactivada.', text: 'No se puede usar MIO con ella. Si creés que es un error, escribinos; o ingresá con otra cuenta.' }
      : TEXTS[state.kind];
  const retry = async () => {
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };
  return (
    <main className="flex min-h-screen w-full items-center justify-center p-3">
      <section className={`grid w-full max-w-3xl grid-cols-1 items-center gap-8 rounded-mio p-8 sm:grid-cols-[auto_1fr] sm:p-12 ${slab(isDark)}`} role={state.kind === 'validando' ? 'status' : 'alert'}>
        <div className="flex justify-center">
          <MioPet2D mood={state.kind === 'validando' ? 'trabajando' : 'anomalia'} size={150} showShadow={false} animated />
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl">{t.title}</h1>
          <p className={`mt-4 text-base leading-relaxed ${slabText(isDark)}`}>{t.text}</p>
          {state.kind !== 'validando' && (
            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              {state.kind !== 'invalida' && (
                <button type="button" onClick={retry} disabled={retrying} className={PRIMARY}>
                  {retrying ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <RefreshCw className="h-5 w-5" aria-hidden />} Probar de nuevo
                </button>
              )}
              <button type="button" onClick={onLeave} className={state.kind === 'invalida' ? PRIMARY : soft(isDark)}>
                <LogOut className="h-4 w-4" aria-hidden /> {state.kind === 'invalida' ? 'Ingresar de nuevo' : 'Salir de la cuenta'}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

/** Sin conexión, cerca del límite: cuántos días quedan para conectarse. */
export const AvisoConexion: React.FC<{ daysLeft: number; isDark: boolean }> = ({ daysLeft, isDark }) => (
  <p className={`flex items-center gap-3 rounded-mio px-5 py-3.5 text-sm font-bold ${lilac(isDark)}`} role="status">
    <WifiOff className="h-4 w-4 shrink-0 text-[#7647eb]" aria-hidden />
    <span>
      Conectate a internet {daysLeft <= 1 ? 'hoy' : `en los próximos ${daysLeft} días`} para validar tu cuenta y seguir usando MIO.{' '}
      <span className={`font-medium ${muted(isDark)}`}>Sin conexión, MIO se puede usar hasta {MAX_OFFLINE_DAYS} días.</span>
    </span>
  </p>
);
