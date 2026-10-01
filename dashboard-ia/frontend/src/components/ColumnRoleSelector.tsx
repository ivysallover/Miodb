'use client';

import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertCircle, Calendar, Hash, Tag, X, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnRole = 'numeric' | 'categorical' | 'date' | 'identifier';

export interface ColumnDetail {
  name: string;
  inferred_type: string;
  n_unique: number;
  null_pct: number;
  sample_values: string[];
  suggested_role: ColumnRole;
}

export interface ProfileData {
  filename: string;
  n_rows_estimated: number;
  n_cols: number;
  quality_score: number;
  quality_label: string;
  suggested_targets: string[];
  columns: ColumnDetail[];
  preview_rows: Record<string, any>[];
  upload_id: string;
}

interface ColumnRoleSelectorProps {
  profileData: ProfileData;
  onConfirm: (targetCol: string, columnRoles: Record<string, ColumnRole>) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function inferIntelligentRoles(profileData: ProfileData): Record<string, ColumnRole> {
  const initial: Record<string, ColumnRole> = {};
  const dateRegex = /(date|fecha|time|timestamp|datetime|snapped_at|periodo|created_at|updated_at)/i;
  const idRegex = /(?:^|_)(id|uuid|hash|folio|codigo|index|row)(?:$|_)/i;

  profileData.columns.forEach((col) => {
    const colName = col.name.toLowerCase();

    // 1. Check if column name strongly indicates date or timestamp
    if (dateRegex.test(colName)) {
      initial[col.name] = 'date';
      return;
    }

    // 2. Check if sample values look like dates or unix timestamps
    const sampleHasDates = col.sample_values?.some((v) => {
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) return true;
      const num = Number(s);
      if (!isNaN(num) && num > 1000000000 && num < 2500000000000) return true;
      return false;
    });
    if (sampleHasDates && (col.inferred_type === 'fecha' || dateRegex.test(colName))) {
      initial[col.name] = 'date';
      return;
    }

    // 3. Exclude high-cardinality IDs
    if (idRegex.test(colName) && col.n_unique > 20 && col.n_unique >= profileData.n_rows_estimated * 0.95) {
      initial[col.name] = 'identifier';
      return;
    }

    // 4. Fallback to suggested role or inferred type
    if (col.suggested_role) {
      initial[col.name] = col.suggested_role;
    } else if (col.inferred_type === 'numerica') {
      initial[col.name] = 'numeric';
    } else if (col.inferred_type === 'fecha') {
      initial[col.name] = 'date';
    } else {
      initial[col.name] = 'categorical';
    }
  });

  return initial;
}

export function getHighestWeightColumn(profileData: ProfileData): string {
  if (!profileData || !profileData.columns || profileData.columns.length === 0) {
    return '';
  }

  const dateRegex = /(date|fecha|time|timestamp|datetime|snapped_at|periodo|created_at|updated_at)/i;
  const idRegex = /(?:^|_)(id|uuid|hash|folio|codigo|index|row)(?:$|_)/i;
  const preferredTargetRegex = /(price|precio|close|cierre|ventas|sales|revenue|ingreso|demanda|target|valor|amount|total|monto|profit|ganancia|score)/i;

  // 1. If backend explicitly suggested targets, verify it's not a date or ID
  if (profileData.suggested_targets && profileData.suggested_targets.length > 0) {
    const validSuggested = profileData.suggested_targets.find(
      (t) => !dateRegex.test(t) && !idRegex.test(t)
    );
    if (validSuggested) {
      const match = profileData.columns.find((c) => c.name === validSuggested);
      if (match) return match.name;
      return validSuggested;
    }
  }

  // 2. Identify candidate numeric columns (excluding dates and obvious IDs)
  const candidateNumerics = profileData.columns.filter((c) => {
    const name = c.name.toLowerCase();
    if (dateRegex.test(name) || idRegex.test(name)) return false;
    return c.suggested_role === 'numeric' || c.inferred_type?.toLowerCase() === 'numerica' || c.suggested_role !== 'identifier';
  });

  // 3. Priority to business/financial target keywords (e.g. price, close, ventas)
  const keywordTarget = candidateNumerics.find((c) => preferredTargetRegex.test(c.name.toLowerCase()));
  if (keywordTarget) {
    return keywordTarget.name;
  }

  // 4. Rank candidate numerics by information entropy: lowest nulls, highest variance (n_unique)
  if (candidateNumerics.length > 0) {
    const sorted = [...candidateNumerics].sort((a, b) => {
      if (a.null_pct !== b.null_pct) return a.null_pct - b.null_pct;
      return b.n_unique - a.n_unique;
    });
    return sorted[0].name;
  }

  // 5. Fallback to first non-date, non-identifier column
  const fallback = profileData.columns.find((c) => !dateRegex.test(c.name) && !idRegex.test(c.name));
  return fallback?.name || profileData.columns[0]?.name || '';
}

// ---------------------------------------------------------------------------
// Role config
// ---------------------------------------------------------------------------

const ROLES: { value: ColumnRole; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'numeric', label: 'Metrica Numerica', icon: <Hash className="w-3 h-3" />, color: 'bg-violet-100 text-violet-800 border-violet-300' },
  { value: 'categorical', label: 'Dimension', icon: <Tag className="w-3 h-3" />, color: 'bg-lime-100 text-lime-800 border-lime-300' },
  { value: 'date', label: 'Fecha', icon: <Calendar className="w-3 h-3" />, color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'identifier', label: 'Identificador/Ignorar', icon: <X className="w-3 h-3" />, color: 'bg-gray-100 text-gray-500 border-gray-300' },
];

function getRoleConfig(role: ColumnRole) {
  return ROLES.find((r) => r.value === role) ?? ROLES[0];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ColumnRoleSelector({
  profileData,
  onConfirm,
  onCancel,
}: ColumnRoleSelectorProps) {
  const initialRoles = useMemo(() => inferIntelligentRoles(profileData), [profileData]);
  const defaultTarget = useMemo(() => getHighestWeightColumn(profileData), [profileData]);

  const [roles, setRoles] = useState<Record<string, ColumnRole>>(initialRoles);
  const [targetCol, setTargetCol] = useState<string>(defaultTarget);

  // Synchronize state when a new dataset is profiled
  React.useEffect(() => {
    setRoles(initialRoles);
    setTargetCol(defaultTarget);
  }, [initialRoles, defaultTarget]);

  const numericColumns = useMemo(
    () => profileData.columns.filter((c) => roles[c.name] === 'numeric').map((c) => c.name),
    [roles, profileData.columns]
  );

  const hasValidTarget = targetCol && roles[targetCol] !== 'identifier';

  // Sort columns so the target and highest-weight columns appear first in the table
  const sortedColumns = useMemo(() => {
    return [...profileData.columns].sort((a, b) => {
      const isTargetA = targetCol === a.name;
      const isTargetB = targetCol === b.name;
      if (isTargetA && !isTargetB) return -1;
      if (!isTargetA && isTargetB) return 1;

      const isWeightA = a.name === defaultTarget;
      const isWeightB = b.name === defaultTarget;
      if (isWeightA && !isWeightB) return -1;
      if (!isWeightA && isWeightB) return 1;

      const roleA = roles[a.name] || a.suggested_role;
      const roleB = roles[b.name] || b.suggested_role;
      const rolePriority: Record<ColumnRole, number> = {
        numeric: 1,
        date: 2,
        categorical: 3,
        identifier: 4,
      };

      const pA = rolePriority[roleA] || 99;
      const pB = rolePriority[roleB] || 99;
      if (pA !== pB) return pA - pB;

      if (b.n_unique !== a.n_unique) {
        return b.n_unique - a.n_unique;
      }

      return a.name.localeCompare(b.name);
    });
  }, [profileData.columns, targetCol, defaultTarget, roles]);

  function handleRoleChange(colName: string, newRole: ColumnRole) {
    setRoles((prev) => ({ ...prev, [colName]: newRole }));
    // If this column was the target and it's now being marked as identifier, clear target
    if (colName === targetCol && newRole === 'identifier') {
      setTargetCol('');
    }
  }

  function handleConfirm() {
    if (!targetCol) return;
    onConfirm(targetCol, roles);
  }

  return (
    <div className="max-w-5xl mx-auto my-6 select-none">
      {/* Header */}
      <div className="bg-white/95 dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 rounded-none p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold font-sans text-zinc-950 dark:text-white tracking-tight mb-1">
              Vista Previa y Calibración del Dataset
            </h2>
            <p className="text-xs text-zinc-500 font-mono">
              Confirma o ajusta el rol de cada columna antes de iniciar el análisis AutoML.
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500 font-mono space-y-1">
            <div><span className="font-bold text-zinc-900 dark:text-white">{profileData.n_rows_estimated.toLocaleString()}</span> filas</div>
            <div><span className="font-bold text-zinc-900 dark:text-white">{profileData.n_cols}</span> columnas</div>
            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${
              profileData.quality_label === 'Alta' ? 'bg-[#bdf559]/20 border-[#bdf559]/30 text-emerald-800 dark:text-[#bdf559]' :
              profileData.quality_label === 'Media' ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300' :
              'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}>
              Calidad: {profileData.quality_score}/100
            </div>
          </div>
        </div>
      </div>

      {/* Target selector */}
      <div className="bg-[#bdf559]/10 border border-[#bdf559]/30 rounded-none p-5 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <p className="text-xs font-mono font-bold text-emerald-950 dark:text-[#bdf559] uppercase tracking-wider">
            Variable Objetivo (Target a Predecir)
          </p>
          <span className="text-[11px] font-mono text-emerald-800 dark:text-[#bdf559]/90">
            ★ Calibración automática según mayor peso estadístico
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedColumns
            .filter((col) => roles[col.name] !== 'identifier')
            .map((col) => {
              const isSelected = targetCol === col.name;
              const isDefaultWeight = col.name === defaultTarget;
              return (
                <button
                  key={col.name}
                  onClick={() => setTargetCol(col.name)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#7647eb] text-white border-[#7647eb] shadow-sm ring-2 ring-[#bdf559]/40'
                      : 'bg-white dark:bg-white/[0.04] text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {isSelected && <CheckCircle className="inline w-3.5 h-3.5 text-[#bdf559]" />}
                  <span>{col.name}</span>
                  {isDefaultWeight && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-[#bdf559] text-zinc-950' : 'bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'}`}>
                      Mayor peso
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        {!hasValidTarget && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2.5 flex items-center gap-1.5 font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Selecciona la columna que deseas proyectar o analizar.</span>
          </p>
        )}
      </div>

      {/* Column table */}
      <div className="bg-white/95 dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 rounded-none overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04]">
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider w-44">Columna</th>
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider">Muestra de datos</th>
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider w-16">Nulos</th>
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider">Rol Asignado</th>
                <th className="text-center px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider w-20">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-white/[0.06]">
              {sortedColumns.map((col, idx) => {
                const currentRole = roles[col.name];
                const roleConfig = getRoleConfig(currentRole);
                const isTarget = targetCol === col.name;
                const isDefaultWeight = col.name === defaultTarget;
                const isIgnored = currentRole === 'identifier';
                return (
                  <tr
                    key={col.name}
                    className={`transition-colors ${
                      isTarget
                        ? 'bg-violet-50/80 dark:bg-[#7647eb]/20'
                        : isIgnored
                        ? 'bg-zinc-50/50 dark:bg-white/[0.01] opacity-50'
                        : idx % 2 === 0
                        ? 'bg-white dark:bg-[#0e0c19]'
                        : 'bg-zinc-50/40 dark:bg-white/[0.02]'
                    }`}
                  >
                    {/* Column name */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-zinc-950 dark:text-white text-xs truncate max-w-[140px]" title={col.name}>
                          {col.name}
                        </span>
                        {isTarget && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7647eb] text-white">
                            ★ Target
                          </span>
                        )}
                        {!isTarget && isDefaultWeight && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#bdf559]/20 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30">
                            Mayor peso
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-0.5">{col.n_unique} únicos</div>
                    </td>

                    {/* Sample values */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {col.sample_values.slice(0, 3).map((v, i) => (
                          <span
                            key={i}
                            className="inline-block px-1.5 py-0.5 bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-mono truncate max-w-[90px] rounded"
                            title={v}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Null pct */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-bold ${col.null_pct > 20 ? 'text-red-600 dark:text-red-400' : col.null_pct > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-[#bdf559]'}`}>
                        {col.null_pct}%
                      </span>
                    </td>

                    {/* Role selector */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ROLES.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleRoleChange(col.name, r.value)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                              currentRole === r.value
                                ? `${r.color} dark:bg-opacity-25 dark:border-white/20 dark:text-white shadow-sm font-black`
                                : 'bg-white dark:bg-white/[0.04] text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:border-zinc-400 dark:hover:border-white/30 hover:text-zinc-800 dark:hover:text-white'
                            }`}
                          >
                            {r.icon}
                            <span className="hidden sm:inline">{r.label}</span>
                          </button>
                        ))}
                      </div>
                    </td>

                    {/* Target radio */}
                    <td className="px-4 py-3 text-center">
                      {!isIgnored && (
                        <button
                          type="button"
                          onClick={() => setTargetCol(col.name)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all cursor-pointer ${
                            isTarget
                              ? 'border-[#7647eb] bg-[#7647eb] text-white shadow-sm'
                              : 'border-zinc-300 dark:border-white/20 bg-white dark:bg-white/[0.05] hover:border-zinc-500'
                          }`}
                          title="Seleccionar como Target"
                        >
                          {isTarget && <div className="w-2 h-2 rounded-full bg-[#bdf559]" />}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onCancel}
          className="px-6 py-2.5 rounded-full border border-zinc-300 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-all cursor-pointer"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          {targetCol && (
            <span className="text-xs font-mono text-zinc-500">
              Target seleccionado: <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">{targetCol}</span>
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={!hasValidTarget}
            className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-full font-mono text-xs font-bold transition-all cursor-pointer ${
              hasValidTarget
                ? 'bg-[#7647eb] hover:bg-[#602cd1] text-white shadow-lg active:scale-95'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-[#bdf559]" />
            <span>Confirmar y Analizar AutoML</span>
          </button>
        </div>
      </div>
    </div>
  );
}
