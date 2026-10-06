'use client';

import React from 'react';
import { ArrowRight, Database, Link2 } from 'lucide-react';

interface JoinStep {
  left: string;
  right: string;
  key: string;
  type: string;
  rows_before?: number;
  rows_after?: number;
  rowsBefore?: number;
  rowsAfter?: number;
}

interface JoinSummary {
  tables_detected?: string[];
  tablesDetected?: string[];
  join_keys?: string[];
  joinKeys?: string[];
  total_rows?: number;
  totalRows?: number;
  total_columns?: number;
  totalColumns?: number;
  message?: string;
  join_log?: JoinStep[];
  joinLog?: JoinStep[];
}

interface DatasetJoinPanelProps {
  joinSummary?: JoinSummary | null;
}

function fmtNum(n?: number): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

export default function DatasetJoinPanel({ joinSummary }: DatasetJoinPanelProps) {
  if (!joinSummary) return null;

  const tables: string[] = joinSummary.tables_detected || joinSummary.tablesDetected || [];
  const keys: string[] = joinSummary.join_keys || joinSummary.joinKeys || [];
  const totalRows: number = joinSummary.total_rows ?? joinSummary.totalRows ?? 0;
  const totalCols: number | undefined = joinSummary.total_columns ?? joinSummary.totalColumns;
  const joinLog: JoinStep[] = joinSummary.join_log || joinSummary.joinLog || [];

  if (tables.length <= 1) return null;

  return (
    <div className="bg-white/95 dark:bg-[#0e0c19] border border-zinc-200 dark:border-white/10 rounded-none p-6 mb-6 select-none">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-200 dark:border-white/10">
        <div className="w-9 h-9 rounded-mio bg-[#7647eb]/15 border border-[#7647eb]/30 flex items-center justify-center text-[#7647eb] dark:text-[#a78bfa]">
          <Link2 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold font-sans text-zinc-950 dark:text-white tracking-tight text-sm">
            Unión Relacional Auto-Detectada (Auto-Join)
          </h3>
          <p className="text-xs font-mono text-zinc-500">
            {tables.length} tablas consolidadas en {fmtNum(totalRows)} filas
            {totalCols ? ` × ${totalCols} columnas` : ''}
          </p>
        </div>
      </div>

      {/* Tables diagram */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {tables.map((table, idx) => (
          <React.Fragment key={table}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-mio bg-[#7647eb]/10 border border-[#7647eb]/20 text-[#7647eb] dark:text-[#a78bfa]">
              <Database className="w-3.5 h-3.5" />
              <span className="text-xs font-mono font-bold">{table}</span>
            </div>
            {idx < tables.length - 1 && (
              <ArrowRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Join keys */}
      {keys.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Claves de Unión Detectadas
          </p>
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#bdf559]/20 border border-[#bdf559]/30 text-xs font-mono font-bold text-emerald-950 dark:text-[#bdf559]"
              >
                <span>{key}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Join log */}
      {joinLog.length > 0 && (
        <details className="group">
          <summary className="text-xs font-mono font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer select-none">
            Ver detalle de transformaciones aplicadas ({joinLog.length})
          </summary>
          <div className="mt-2 space-y-1.5">
            {joinLog.map((step, idx) => {
              const rowsBefore = step.rows_before ?? step.rowsBefore ?? 0;
              const rowsAfter = step.rows_after ?? step.rowsAfter ?? 0;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-xs rounded-mio-sm bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/10 px-3.5 py-2 font-mono"
                >
                  <span className="font-bold text-[#7647eb] dark:text-[#a78bfa] uppercase">{step.type} JOIN</span>
                  <span className="text-zinc-500">
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">{step.left}</span>
                    {' + '}
                    <span className="font-bold text-zinc-900 dark:text-zinc-200">{step.right}</span>
                    {' vía '}
                    <code className="bg-zinc-200 dark:bg-white/10 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200">{step.key}</code>
                  </span>
                  <span className="ml-auto text-zinc-400">
                    {fmtNum(rowsBefore)} → <span className="font-bold text-zinc-900 dark:text-zinc-200">{fmtNum(rowsAfter)}</span> filas
                  </span>
                </div>
              );
            })}
          </div>
        </details>
      )}

      {/* Message fallback */}
      {joinSummary.message && (
        <p className="text-xs text-zinc-500 italic mt-2">{joinSummary.message}</p>
      )}
    </div>
  );
}
