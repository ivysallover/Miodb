import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Presentation } from 'lucide-react';
import { ResultadoMejorado } from '@/components/dashboard/ResultadoMejorado';
import { MioPet2D } from '@/components/pet/MioPet2D';
import { normalizeAnalysisResponse } from '@/lib/api';
import { openShare, type Share } from '@/lib/compartir';

const Presentar = lazy(() => import('@/components/dashboard/Presentar'));

type State = { kind: 'cargando' } | { kind: 'no' } | { kind: 'fallo' } | { kind: 'listo'; share: Share; result: ReturnType<typeof normalizeAnalysisResponse> };

const long = (d: Date | null) => (d ? d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }) : null);
const BUTTON = 'inline-flex min-h-[48px] items-center gap-2.5 rounded-full px-6 text-[15px] font-bold transition-colors duration-200 active:scale-[0.97] cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pal-violet';

/**
 * Un análisis compartido desde la app de escritorio (`src/lib/compartir.ts`), solo para mirar: los mismos
 * bloques que ve quien lo hizo y el modo Presentar. No se recalcula nada ni hace falta cuenta.
 */
export const CompartidoPage: React.FC<{ id: string; isDark: boolean; onNavigate: (path: string) => void }> = ({ id, isDark, onNavigate }) => {
  const [state, setState] = useState<State>({ kind: 'cargando' });
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    let alive = true;
    openShare(id).then(
      (found) => alive && setState(found ? { kind: 'listo', share: found.share, result: normalizeAnalysisResponse(found.analisis) } : { kind: 'no' }),
      () => alive && setState({ kind: 'fallo' }),
    );
    return () => {
      alive = false;
    };
  }, [id]);

  // Que no quede en buscadores aunque alguien lo enlace.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  const surface = isDark ? 'bg-pal-surface-dark text-white' : 'bg-white text-zinc-950';

  if (state.kind !== 'listo') {
    const [title, text] =
      state.kind === 'cargando' ? ['Abriendo el análisis…', '']
      : state.kind === 'no' ? ['Este enlace ya no abre.', 'Venció o quien lo compartió lo dio de baja. Pedile uno nuevo.']
      : ['No pude abrir el análisis.', 'Revisá tu conexión y volvé a cargar la página.'];
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center p-4 sm:p-8">
        <section className="rounded-mio bg-pal-ink p-8 text-white sm:p-12" role={state.kind === 'cargando' ? 'status' : undefined}>
          <MioPet2D mood={state.kind === 'cargando' ? 'trabajando' : 'durmiendo'} size={96} showShadow={false} animated />
          <h1 className="mt-6 text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-4xl">{title}</h1>
          {text && <p className="mt-3 text-base leading-relaxed text-white/80">{text}</p>}
          {state.kind !== 'cargando' && (
            <button type="button" onClick={() => onNavigate('/')} className={`${BUTTON} mt-8 bg-pal-lime text-zinc-950 hover:bg-pal-lime-hover`}>Conocer MIO</button>
          )}
        </section>
      </main>
    );
  }

  const { share, result } = state;
  const made = long(share.creado);
  const facts = [
    result.profile?.nRows != null ? `${Number(result.profile.nRows).toLocaleString('es-AR')} filas` : null,
    result.profile?.nCols != null ? `${result.profile.nCols} columnas` : null,
    made ? `compartido el ${made}` : null,
    share.vence ? `disponible hasta el ${long(share.vence)}` : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-2.5 p-3 sm:space-y-3 sm:p-5">
      <header className={`rounded-mio p-5 sm:p-7 ${surface}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-baseline gap-1.5 font-mono text-sm font-bold">MIO<span className="h-1.5 w-1.5 rounded-full bg-pal-lime" aria-hidden /></p>
            <p className="mt-4 text-sm font-bold text-pal-violet">Análisis de {share.columna || result.targetCol}</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-[1.05] tracking-[-0.035em] [overflow-wrap:anywhere] sm:text-4xl">{share.nombre || result.filename}</h1>
            <p className={`mt-2 font-mono text-[12px] ${muted}`}>{facts.join(' · ')}</p>
          </div>
          <button type="button" onClick={() => setPresenting(true)} className={`${BUTTON} shrink-0 self-start bg-pal-violet text-white hover:bg-pal-violet-strong lg:self-auto`}>
            <Presentation className="h-5 w-5" aria-hidden /> Presentar
          </button>
        </div>
      </header>

      <ResultadoMejorado result={result} isDark={isDark} />

      <footer className="flex flex-col gap-5 rounded-mio bg-pal-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <p className="max-w-2xl text-[15px] leading-relaxed text-white/85">
          Esto es una copia para mirar: se calculó en la compu de quien lo compartió, con MIO, y la planilla no se subió.
        </p>
        <button type="button" onClick={() => onNavigate('/')} className={`${BUTTON} shrink-0 bg-pal-lime text-zinc-950 hover:bg-pal-lime-hover`}>Analizá la tuya con MIO</button>
      </footer>

      {presenting && (
        <Suspense fallback={null}>
          <Presentar result={result} isDark={isDark} onClose={() => setPresenting(false)} />
        </Suspense>
      )}
    </main>
  );
};
