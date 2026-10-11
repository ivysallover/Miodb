'use client';

import React, { useState, useEffect } from 'react';
import { MioPet2D } from './pet/MioPet2D';

// What MIO does with a sheet, in the order it does it.
const STEPS = [
  'Leyendo tu planilla',
  'Ordenando y completando los datos',
  'Buscando qué se mueve junto',
  'Armando los gráficos',
  'Calculando qué viene y qué se sale de lo normal',
];

/**
 * The wait while a sheet is analysed. The server does not report progress, so this shows no
 * percentage and no countdown: only the steps of the work, advancing at the usual pace, and a
 * plain note when it is taking longer than usual.
 */
export default function LoadingAnalysis({
  fileSize = 25000000,
  currentFile = 1,
  totalFiles = 1,
}: {
  fileSize?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  currentFile?: number;
  totalFiles?: number;
}) {
  const [step, setStep] = useState(0);
  const [overtime, setOvertime] = useState(false);

  const isCloud = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const fileSizeInMB = (fileSize || 20000000) / (1024 * 1024);
  // The usual duration: a few seconds on a local server, around a minute on the hosted one.
  const usualSeconds = isCloud
    ? Math.min(100, Math.max(25, 15 + fileSizeInMB * 1.8))
    : Math.min(45, Math.max(2.5, 1.5 + fileSizeInMB * 0.08));

  useEffect(() => {
    const start = Date.now();
    const totalMs = usualSeconds * 1000;
    const interval = setInterval(() => {
      const ratio = (Date.now() - start) / totalMs;
      // The last step stays "in progress" until the result actually arrives.
      setStep(Math.min(STEPS.length - 1, Math.floor(ratio * STEPS.length)));
      if (ratio >= 1.3) setOvertime(true);
    }, 400);
    return () => clearInterval(interval);
  }, [usualSeconds]);

  return (
    <div role="status" aria-live="polite" className="mx-auto my-8 max-w-xl rounded-mio bg-[#0b0914] p-7 sm:p-10 text-white">
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <MioPet2D mood="trabajando" size={84} showShadow={false} animated={true} />
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#bdf559]">
            {totalFiles > 1 ? `Archivo ${currentFile} de ${totalFiles}` : 'Analizando'}
          </p>
          <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-[-0.035em] leading-[1.05]">MIO está leyendo tu planilla.</h3>
        </div>
      </div>

      <div className="mio-loading-track mt-7 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className="mio-loading-bar h-full w-1/3 rounded-full bg-[#7647eb]" />
      </div>

      <ol className="mt-6 space-y-2.5">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className={`flex items-center gap-3 text-sm sm:text-[15px] transition-colors duration-300 ${current ? 'font-bold text-white' : done ? 'text-white/60' : 'text-white/35'}`}>
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold ${
                  done ? 'bg-[#bdf559] text-zinc-950' : current ? 'bg-[#7647eb] text-white animate-pulse' : 'bg-white/10 text-transparent'
                }`}
              >
                {done ? '✓' : ''}
              </span>
              <span>{label}{current ? '…' : ''}</span>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-[13px] leading-relaxed text-white/60">
        {overtime
          ? 'Está tardando más de lo habitual. Si es el primer análisis en un rato, el servidor tarda más de un minuto en despertarse; después va mucho más rápido. No hace falta que hagas nada.'
          : 'Puede tardar hasta un par de minutos con planillas grandes. No cierres esta pestaña.'}
      </p>
    </div>
  );
}
