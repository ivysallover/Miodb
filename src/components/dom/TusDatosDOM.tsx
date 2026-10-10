import React from 'react';
import { Stagger } from '@/components/ui/Stagger';
import { useMioStore } from '@/utils/useMioStore';
import { FlipText } from '@/components/ui/FlipText';

const nav = (path: string) => () => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const COLS: { head: string; mark: string; items: string[] }[] = [
  {
    head: 'Lo que hacemos',
    mark: '✓',
    items: [
      'Te pedimos tu consentimiento antes de procesar la planilla.',
      'Analizamos tus datos en el momento y te devolvemos el resultado.',
      'Si iniciás sesión, guardamos el resultado del análisis en tus proyectos para que lo retomes.',
    ],
  },
  {
    head: 'Lo que no hacemos',
    mark: '✕',
    items: [
      'No guardamos tu planilla si no iniciaste sesión.',
      'No usamos píxeles publicitarios ni rastreo de terceros.',
      'No te prometemos resultados: te mostramos el margen de error de cada predicción.',
    ],
  },
];

export const TusDatosDOM: React.FC = () => {
  const isDark = useMioStore((s) => s.theme) === 'dark';
  const line = isDark ? 'border-white/15' : 'border-zinc-900/80';
  const muted = isDark ? 'text-zinc-400' : 'text-zinc-600';
  return (
    <section id="tus-datos" className="relative z-10 w-full py-24 sm:py-32 select-none">
      <div className="w-full max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-16">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#7647eb] dark:text-[#a78bfa] mb-5">
          Tus datos
        </p>
        <h2 className={`font-extrabold tracking-[-0.045em] leading-[0.98] text-4xl sm:text-6xl lg:text-8xl max-w-5xl ${isDark ? 'text-white' : 'text-zinc-950'}`} style={{ textWrap: 'balance' }}>
          <FlipText>Tu planilla es tuya. Así la cuidamos.</FlipText>
        </h2>

        <Stagger className={`mt-14 grid grid-cols-1 lg:grid-cols-3 border-t border-b ${line}`}>
          {COLS.map((c, k) => (
            <div key={c.head} className={`py-8 lg:py-10 lg:pr-10 ${k > 0 ? 'lg:pl-10' : ''} border-b lg:border-b-0 lg:border-r ${line}`}>
              <h3 className={`font-mono text-xs font-bold uppercase tracking-wider mb-5 ${isDark ? 'text-white' : 'text-zinc-950'}`}>{c.head}</h3>
              <ul className="space-y-4">
                {c.items.map((it) => (
                  <li key={it} className="flex gap-3">
                    <span aria-hidden className="font-mono font-bold text-[#7647eb] dark:text-[#bdf559] shrink-0 w-4">{c.mark}</span>
                    <span className={`text-base sm:text-lg leading-snug ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="py-8 lg:py-10 lg:pl-10">
            <h3 className={`font-mono text-xs font-bold uppercase tracking-wider mb-5 ${isDark ? 'text-white' : 'text-zinc-950'}`}>Tus derechos</h3>
            <p className={`text-base sm:text-lg leading-snug mb-5 ${muted}`}>
              Cumplimos la Ley 25.326 de protección de datos personales. Podés leer todo, sin letra chica.
            </p>
            <ul className="space-y-2 text-base font-medium">
              {[
                ['Política de privacidad', '/privacidad'],
                ['Términos y condiciones', '/terminos'],
                ['Procesamiento de datos (DPA)', '/dpa'],
                ['Botón de arrepentimiento', '/arrepentimiento'],
              ].map(([label, path]) => (
                <li key={path} className="flex items-center gap-2"><span aria-hidden className="font-mono text-xs text-zinc-400">→</span>
                  <button
                    type="button"
                    onClick={nav(path)}
                    className={`mio-link min-h-[36px] text-left cursor-pointer transition-colors duration-200 ${isDark ? 'text-white hover:text-[#bdf559]' : 'text-zinc-950 hover:text-[#7647eb]'}`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Stagger>
      </div>
    </section>
  );
};

export default TusDatosDOM;
