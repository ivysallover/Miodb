'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, CheckCircle2, FileJson, XCircle, ShieldCheck } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
}

export default function FileUploader({ onFileSelect, selectedFiles }: FileUploaderProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    setErrorMsg(null);
    if (fileRejections.length > 0) {
      const err = fileRejections[0].errors[0];
      if (err.code === 'file-too-large') {
        setErrorMsg('El archivo es demasiado grande (máx. 100 MB).');
      } else if (err.code === 'file-invalid-type') {
        setErrorMsg('Formato no soportado. Usá .csv, .xlsx, .xls o .json');
      } else {
        setErrorMsg(err.message);
      }
      return;
    }
    
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject, isDragAccept } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/json': ['.json'],
    },
    multiple: true,
    maxSize: 100 * 1024 * 1024,
  });

  // Calculate dynamic classes for drag states
  let borderColor = 'border-zinc-300 dark:border-white/15 hover:border-[#7647eb]';
  let bgColor = 'bg-white/80 dark:bg-white/[0.02] hover:bg-white/95 dark:hover:bg-white/[0.04] backdrop-blur-md';
  if (isDragReject) {
    borderColor = 'border-rose-500 animate-pulse';
    bgColor = 'bg-rose-50/80 dark:bg-rose-500/10 backdrop-blur-md';
  } else if (isDragAccept) {
    borderColor = 'border-[#bdf559] scale-[1.01]';
    bgColor = 'bg-[#bdf559]/10 backdrop-blur-md';
  } else if (isDragActive) {
    borderColor = 'border-[#7647eb] scale-[1.01]';
    bgColor = 'bg-[#7647eb]/10 backdrop-blur-md';
  } else if (selectedFiles.length > 0) {
    borderColor = 'border-emerald-500/80';
    bgColor = 'bg-emerald-50/40 dark:bg-emerald-500/5 backdrop-blur-md';
  }

  return (
    <div className="w-full select-none">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 ${borderColor} ${bgColor} focus-visible:ring-2 focus-visible:ring-[#7647eb] focus-visible:outline-none shadow-sm hover:shadow-md`}
        role="button"
        tabIndex={0}
        aria-label="Zona para arrastrar y soltar datasets o hacer clic para seleccionar archivos"
      >
        <input {...getInputProps()} aria-label="Cargar archivos de datos en formato CSV, Excel o JSON" />

        {selectedFiles.length > 0 ? (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1 font-mono tracking-tight">
              {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} archivos seleccionados`}
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mb-4 font-mono">
              Cola lista para procesar • {(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total
            </p>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/15 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
              Hacé click o arrastrá para cambiar la selección
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-transform ${isDragReject ? 'bg-rose-100 text-rose-500' : 'bg-[#7647eb]/10 text-[#7647eb] dark:text-[#a78bfa] group-hover:scale-105'}`}>
              {isDragReject ? <XCircle className="w-8 h-8" aria-hidden="true" /> : <UploadCloud className="w-8 h-8" aria-hidden="true" />}
            </div>
            <h4 className={`text-lg sm:text-xl font-bold mb-1 tracking-tight ${isDragReject ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
              {isDragReject ? 'Archivo no válido' : isDragAccept ? 'Soltá para cargar' : 'Arrastrá tus archivos acá'}
            </h4>
            
            {errorMsg ? (
              <p className="text-sm text-rose-500 max-w-sm mb-4 font-semibold">{errorMsg}</p>
            ) : (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 max-w-sm mb-4">
                Soporta archivos individuales o múltiples (.csv, .xlsx, .xls, .json)
              </p>
            )}
            
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#7647eb] dark:text-[#a78bfa] bg-[#7647eb]/10 border border-[#7647eb]/20 px-3 py-1 rounded-full">
                <FileSpreadsheet className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Excel / CSV</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                <FileJson className="w-3.5 h-3.5" aria-hidden="true" />
                <span>JSON</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Aviso de minimización de datos y confidencialidad */}
      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 text-xs font-medium text-gray-600 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>Minimización de datos: solo se procesan las columnas necesarias para el modelo.</span>
        </div>
        <Link
          href="/privacidad"
          className="underline font-bold text-[#7647eb] dark:text-[#a78bfa] hover:opacity-80 transition-opacity"
        >
          Garantías de Privacidad
        </Link>
      </div>
    </div>
  );
}

