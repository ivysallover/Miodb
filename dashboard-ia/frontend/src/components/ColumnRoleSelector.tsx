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
  /** True when `n_rows_estimated` was counted, not estimated from the file size. */
  rows_exact?: boolean;
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
  const idRegex = /^(t|idx|step|row|index|id|uuid|hash|folio|codigo|n|i)$/i;
  const idSubstrRegex = /(?:^|_)(id|uuid|hash|folio|codigo|index|row|idx|step)(?:$|_)/i;
  const preferredTargetRegex = /(price|precio|close|cierre|ventas|sales|revenue|ingreso|demanda|target|valor|amount|total|monto|profit|ganancia|score)/i;

  profileData.columns.forEach((col) => {
    const colName = col.name.toLowerCase();
    const normType = (col.inferred_type || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
    if (sampleHasDates && (normType.includes('fech') || normType.includes('date') || dateRegex.test(colName))) {
      initial[col.name] = 'date';
      return;
    }

    // 3. Exclude single-letter index columns (e.g. "t", "i", "n") and high-cardinality IDs
    const isObviousId = idRegex.test(colName) || idSubstrRegex.test(colName);
    if (isObviousId && (col.n_unique > 15 || colName.length === 1)) {
      initial[col.name] = 'identifier';
      return;
    }

    // 4. Financial & quantitative business metrics must always be numeric
    if (preferredTargetRegex.test(colName)) {
      initial[col.name] = 'numeric';
      return;
    }

    // 5. Fallback with accent-normalized inferred_type
    if (col.suggested_role) {
      initial[col.name] = col.suggested_role;
    } else if (normType.includes('numer')) {
      initial[col.name] = 'numeric';
    } else if (normType.includes('fech') || normType.includes('date')) {
      initial[col.name] = 'date';
    } else if (normType.includes('id') || normType.includes('identif')) {
      initial[col.name] = 'identifier';
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
  const idRegex = /^(t|idx|step|row|index|id|uuid|hash|folio|codigo|n|i)$/i;
  const idSubstrRegex = /(?:^|_)(id|uuid|hash|folio|codigo|index|row|idx|step)(?:$|_)/i;
  const preferredTargetRegex = /(price|precio|close|cierre|ventas|sales|revenue|ingreso|demanda|target|valor|amount|total|monto|profit|ganancia|score)/i;

  const isIdentifierOrDate = (name: string) => {
    const n = name.toLowerCase();
    return dateRegex.test(n) || idRegex.test(n) || idSubstrRegex.test(n) || n.length === 1;
  };

  // 1. Identify candidate numeric columns (strictly excluding dates and index/ID counters)
  const candidateNumerics = profileData.columns.filter((c) => {
    if (isIdentifierOrDate(c.name)) return false;
    const normType = (c.inferred_type || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return c.suggested_role === 'numeric' || normType.includes('numer') || preferredTargetRegex.test(c.name) || c.suggested_role !== 'identifier';
  });

  // 2. Highest priority: explicit financial / business target keywords (e.g. precio, price, ventas, close)
  const keywordTarget = candidateNumerics.find((c) => preferredTargetRegex.test(c.name.toLowerCase()));
  if (keywordTarget) {
    return keywordTarget.name;
  }

  // 3. Next priority: backend suggested_targets, filtering out index counters and dates
  if (profileData.suggested_targets && profileData.suggested_targets.length > 0) {
    const validSuggested = profileData.suggested_targets.find((t) => !isIdentifierOrDate(t));
    if (validSuggested) {
      const match = profileData.columns.find((c) => c.name === validSuggested);
      if (match) return match.name;
      return validSuggested;
    }
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
  const fallback = profileData.columns.find((c) => !isIdentifierOrDate(c.name));
  return fallback?.name || profileData.columns[0]?.name || '';
}

// ---------------------------------------------------------------------------
// Role config
// ---------------------------------------------------------------------------

const ROLES: { value: ColumnRole; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'numeric', label: 'Número', icon: <Hash className="w-3 h-3" />, color: 'bg-violet-100 text-violet-800 border-violet-300' },
  { value: 'categorical', label: 'Categoría', icon: <Tag className="w-3 h-3" />, color: 'bg-lime-100 text-lime-800 border-lime-300' },
  { value: 'date', label: 'Fecha', icon: <Calendar className="w-3 h-3" />, color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'identifier', label: 'Ignorar', icon: <X className="w-3 h-3" />, color: 'bg-gray-100 text-gray-500 border-gray-300' },
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
  // The column table is detail: open by default only when the sheet needs a second look.
  const [showColumns, setShowColumns] = useState<boolean>(profileData.quality_label !== 'Alta');

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

  // How MIO read the sheet, in one line: "4 números, 1 fecha y 1 categoría".
  const kindCount = (role: ColumnRole) => Object.values(roles).filter((r) => r === role).length;
  const kinds = [
    [kindCount('numeric'), 'número', 'números'],
    [kindCount('date'), 'fecha', 'fechas'],
    [kindCount('categorical'), 'categoría', 'categorías'],
  ].filter(([n]) => (n as number) > 0).map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  const ignored = kindCount('identifier');
  const readAs = kinds.length > 1 ? `${kinds.slice(0, -1).join(', ')} y ${kinds[kinds.length - 1]}` : kinds[0] || '';

  return (
    <div className="max-w-5xl mx-auto my-6 space-y-2.5 sm:space-y-3">
      {/* The one decision that matters: what the analysis is about */}
      <div className="rounded-mio bg-[#7647eb] p-6 sm:p-9 text-white">
        <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#bdf559]">Un paso antes de analizar</p>
        <h2 className="mt-2 text-3xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.02]">¿Qué querés entender?</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/80">
          Elegí el dato que más te importa. MIO va a mostrarte qué lo mueve, qué se sale de lo normal y, si tu planilla tiene fechas, qué puede venir.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Dato a analizar">
          {sortedColumns
            .filter((col) => roles[col.name] !== 'identifier')
            .map((col) => {
              const isSelected = targetCol === col.name;
              const isDefaultWeight = col.name === defaultTarget;
              return (
                <button
                  key={col.name}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setTargetCol(col.name)}
                  className={`min-h-[44px] px-4 text-sm font-bold rounded-full transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center gap-2 ${
                    isSelected ? 'bg-[#bdf559] text-zinc-950' : 'bg-white/[0.12] text-white hover:bg-white/[0.22]'
                  }`}
                >
                  {isSelected && <CheckCircle className="w-4 h-4" />}
                  <span>{col.name.replace(/_/g, ' ')}</span>
                  {isDefaultWeight && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${isSelected ? 'bg-zinc-950/10 text-zinc-950' : 'bg-white/15 text-white/80'}`}>
                      Sugerida
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        {!hasValidTarget && (
          <p className="text-sm text-white/85 mt-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#bdf559]" />
            <span>Elegí una columna para seguir.</span>
          </p>
        )}
      </div>

      {/* How MIO read the sheet: a summary, and the detail for whoever wants to correct it */}
      <div className="rounded-mio bg-white dark:bg-[#0e0d16] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white">Así leyó MIO tu planilla</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {profileData.rows_exact ? '' : 'Unas '}{profileData.n_rows_estimated.toLocaleString('es-AR')} filas y {profileData.n_cols} columnas{readAs ? `: ${readAs}` : ''}
              {ignored > 0 ? `, ${ignored} sin usar` : ''}. Calidad de datos {profileData.quality_score}/100.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={showColumns}
            onClick={() => setShowColumns((v) => !v)}
            className="min-h-[44px] shrink-0 self-start rounded-full bg-[#f3f3f5] px-5 text-sm font-bold text-zinc-900 transition-colors hover:bg-[#e4dcff] cursor-pointer dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.16] sm:self-auto"
          >
            {showColumns ? 'Ocultar columnas' : 'Revisar columnas'}
          </button>
        </div>

        {showColumns && (
      <div className="mt-5 overflow-hidden rounded-mio-sm bg-[#f3f3f5] dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.04]">
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider w-44">Columna</th>
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider">Ejemplos</th>
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider w-16">Vacíos</th>
                <th className="text-left px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider">Qué es</th>
                <th className="text-center px-4 py-3 font-mono font-bold text-zinc-700 dark:text-zinc-300 uppercase text-xs tracking-wider w-20">Analizar</th>
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
                            Se analiza
                          </span>
                        )}
                        {!isTarget && isDefaultWeight && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#bdf559]/20 text-emerald-800 dark:text-[#bdf559] border border-[#bdf559]/30">
                            Sugerida
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
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-bold rounded-mio-sm border transition-all cursor-pointer ${
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
                          className={`w-5 h-5 rounded-full border flex items-center justify-center mx-auto transition-all cursor-pointer ${
                            isTarget
                              ? 'border-[#7647eb] bg-[#7647eb] text-white shadow-sm'
                              : 'border-zinc-300 dark:border-white/20 bg-white dark:bg-white/[0.05] hover:border-zinc-500'
                          }`}
                          title="Analizar esta columna"
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
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onCancel}
          className="min-h-[44px] px-6 rounded-full bg-white dark:bg-white/[0.08] hover:bg-[#e4dcff] dark:hover:bg-white/[0.16] text-zinc-800 dark:text-zinc-200 font-bold text-sm transition-all cursor-pointer"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          {targetCol && (
            <span className="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:inline">
              Vas a analizar <span className="font-bold text-[#7647eb] dark:text-[#a78bfa]">{targetCol.replace(/_/g, ' ')}</span>
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={!hasValidTarget}
            className={`inline-flex min-h-[48px] items-center gap-2 px-7 rounded-full text-sm font-bold transition-all cursor-pointer ${
              hasValidTarget
                ? 'bg-[#7647eb] hover:bg-[#602cd1] text-white active:scale-[0.97]'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-4 h-4 text-[#bdf559]" />
            <span>Analizar mi planilla</span>
          </button>
        </div>
      </div>
    </div>
  );
}
