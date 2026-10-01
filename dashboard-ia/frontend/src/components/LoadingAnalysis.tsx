'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { MioPet2D } from './pet/MioPet2D';

const MESSAGES = [
  'Lectura y parseo optimizado C Engine...',
  'Limpieza inteligente y normalización...',
  'Profiling estadístico y correlaciones...',
  'Seleccionando visualizaciones óptimas...',
  'Ejecutando Modelos ML y Predicción...',
  'Finalizando análisis y empaquetado...',
];

export default function LoadingAnalysis({
  fileSize = 25000000,
  isUploading = false,
  uploadProgress = 0,
  currentFile = 1,
  totalFiles = 1,
}: {
  fileSize?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  currentFile?: number;
  totalFiles?: number;
}) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const isCloud = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  const fileSizeInMB = (fileSize || 20000000) / (1024 * 1024);
  
  // En localhost: procesamiento ultrarrápido (2-6s)
  // En la nube (Render free): subida por internet + cómputo de 4 modelos ML (35-65s)
  const estimatedTotalSeconds = isCloud
    ? Math.min(100, Math.max(25, 15 + fileSizeInMB * 1.8))
    : Math.min(45, Math.max(2.5, 1.5 + fileSizeInMB * 0.08));

  const [overtime, setOvertime] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const totalMs = estimatedTotalSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = elapsed / totalMs;

      if (ratio >= 1.0 && !overtime) {
        setOvertime(true);
      }

      let currentProgress: number;
      if (ratio <= 0.85) {
        currentProgress = ratio * 100;
      } else {
        // Desaceleración suave asintótica hacia el 98.5%
        const extraTime = (elapsed - totalMs * 0.85) / (totalMs * 1.2);
        currentProgress = 85 + 13.5 * (1 - Math.exp(-extraTime));
      }

      if (currentProgress > 98.8) currentProgress = 98.8;
      setProgress(currentProgress);

      const remaining = (totalMs - elapsed) / 1000;
      setTimeLeft(remaining > 0 ? remaining : 0);

      let mIndex = Math.floor((elapsed / totalMs) * MESSAGES.length);
      if (mIndex >= MESSAGES.length) mIndex = MESSAGES.length - 1;
      setMsgIndex(mIndex);
    }, 100);

    return () => clearInterval(interval);
  }, [estimatedTotalSeconds, overtime]);

  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl rounded-3xl border border-zinc-200 dark:border-white/10 shadow-2xl max-w-lg mx-auto text-center my-8 select-none">
      {/* MIO 2D trabajando (Reemplazo del spinner circular genérico) */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="w-28 h-28 flex items-center justify-center p-1.5 rounded-3xl bg-gradient-to-b from-[#7647eb]/15 via-[#7647eb]/5 to-transparent border border-[#7647eb]/25 shadow-inner">
          <MioPet2D
            mood="trabajando"
            size={110}
            showShadow={false}
            animated={true}
          />
        </div>
      </div>

      <h3 className="text-xl font-bold font-sans text-gray-900 dark:text-white mb-1.5 tracking-tight">
        Procesando {totalFiles > 1 ? `archivo ${currentFile} de ${totalFiles}` : 'tus datos'}
      </h3>
      <p className="text-xs sm:text-sm text-[#7647eb] dark:text-[#a78bfa] font-mono font-medium h-6 transition-all duration-300">
        {isUploading
          ? `Subiendo a la nube de manera segura...`
          : overtime
          ? 'Finalizando cálculos predictivos en la nube (casi listo)...'
          : MESSAGES[msgIndex]}
      </p>

      <div className="w-full bg-zinc-200 dark:bg-white/10 border border-zinc-300 dark:border-white/10 h-2.5 rounded-full mt-6 overflow-hidden">
        <div
          className="bg-gradient-to-r from-[#7647eb] to-[#bdf559] h-full transition-all duration-150 ease-out rounded-full"
          style={{ width: `${isUploading ? uploadProgress : progress}%` }}
        />
      </div>
      <div className="mt-2.5 flex justify-between w-full text-[10px] text-gray-500 dark:text-zinc-400 font-mono font-bold uppercase tracking-wider">
        <span>{isUploading ? Math.floor(uploadProgress) : Math.floor(progress)}% Completado</span>
        <span>
          {isUploading
            ? 'Subiendo...'
            : timeLeft > 1
            ? `Est. ~${Math.ceil(timeLeft)}s restantes`
            : 'Finalizando análisis...'}
        </span>
      </div>
    </div>
  );
}
