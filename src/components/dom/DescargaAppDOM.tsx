import React, { useEffect, useState } from 'react';
import { Download, Monitor } from 'lucide-react';
import { DESCARGAS, plataforma, type Plataforma } from '@/lib/descargas';

/**
 * En el cierre de la landing: la app de escritorio, para quien prefiere que la planilla no salga de su
 * compu. Ofrece el instalador de la compu de quien mira (Windows o Mac) y deja los otros como links;
 * en un celular, solo dice que se baja desde una compu. Los archivos están en Cloudflare R2.
 */
export const DescargaAppDOM: React.FC = () => {
  // Se decide en el navegador: un iPad se presenta como Mac, pero tiene pantalla táctil.
  const [mine, setMine] = useState<Plataforma | null | undefined>(undefined);
  useEffect(() => {
    const p = plataforma();
    setMine(p === 'mac' && navigator.maxTouchPoints > 1 ? null : p);
  }, []);
  const others = (Object.keys(DESCARGAS) as Plataforma[]).filter((k) => k !== mine);

  return (
    <div className="flex flex-col gap-4 rounded-mio-sm bg-white/[0.07] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-3.5">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-[#bdf559]" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-base font-bold text-white">¿Preferís que tu planilla no salga de tu compu?</p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-300">
            {mine === null
              ? 'MIO también es una app para Windows y Mac: se baja desde una compu.'
              : 'Bajá MIO para escritorio: analiza en tu compu, funciona sin internet y se actualiza sola.'}{' '}
            {others.map((k, i) => (
              <React.Fragment key={k}>
                {i > 0 && ' · '}
                <a href={DESCARGAS[k].url} className="whitespace-nowrap font-medium text-white underline decoration-1 underline-offset-4 hover:text-[#bdf559]">
                  {DESCARGAS[k].label}
                </a>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
      {mine && (
        <a
          href={DESCARGAS[mine].url}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#0b0914] transition-colors duration-200 hover:bg-[#bdf559] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bdf559]"
        >
          <Download className="h-4 w-4" aria-hidden="true" /> Descargar para {mine === 'windows' ? 'Windows' : 'Mac'}
        </a>
      )}
    </div>
  );
};
