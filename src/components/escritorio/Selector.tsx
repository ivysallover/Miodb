import React, { useEffect, useState } from 'react';
import { desktop, type Field, type Fields } from './desktop';
import { field, muted } from './ui';

/** Elegir una opción de una lista larga: el selector del sistema con su nombre arriba. */
export function Selector<T extends string>({ label, value, options, isDark, disabled, onChange }: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  isDark: boolean;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1">
      <span className={`text-xs font-bold ${muted(isDark)}`}>{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as T)} className={`${field(isDark)} w-full cursor-pointer font-bold`}>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Lo que se puede elegir de cada columna de la planilla abierta; `error` si no se pudo leer. */
export function useCampos() {
  const [fields, setFields] = useState<Fields | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    desktop.fields().then(setFields, (e) => setError(String(e?.message || e)));
  }, []);
  return { fields, error };
}

/** Una columna con pocos valores o de números que en realidad son grupos (un año, un código de zona). */
const FEW_NUMBERS = 31;
/** Las columnas por las que se puede agrupar. */
export const groupable = (f: Field) => !!f.desde || (!!f.valores && f.valores.length >= 1 && (f.tipo !== 'numérica' || f.valores.length <= FEW_NUMBERS));
/** Las columnas de números. */
export const numeric = (f: Field) => f.tipo === 'numérica';
