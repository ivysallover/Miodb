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
  return n.toLocaleString('es-AR');
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
    <div className="bg-white dark:bg-[#0e0d16] rounded-mio p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <Link2 className="mt-1 w-5 h-5 shrink-0 text-[#7647eb] dark:text-[#a78bfa]" />
        <div>
          <h3 className="text-xl font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white">
            MIO unió tus {tables.length} archivos en una sola tabla
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Quedaron {fmtNum(totalRows)} filas
            {totalCols ? ` y ${totalCols} columnas` : ''}. Todo el análisis se hizo sobre esa tabla.
          </p>
        </div>
      </div>

      {/* Tables diagram */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {tables.map((table, idx) => (
          <React.Fragment key={table}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#e4dcff] text-zinc-950 dark:bg-[#2a1766] dark:text-white">
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
          <p className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Columnas que tienen en común
          </p>
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f3f3f5] text-xs font-mono font-bold text-zinc-900 dark:bg-white/[0.08] dark:text-white"
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
          <summary className="text-sm font-bold text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white cursor-pointer select-none">
            Ver cómo los unió ({joinLog.length} {joinLog.length === 1 ? 'paso' : 'pasos'})
          </summary>
          <div className="mt-2 space-y-1.5">
            {joinLog.map((step, idx) => {
              const rowsBefore = step.rows_before ?? step.rowsBefore ?? 0;
              const rowsAfter = step.rows_after ?? step.rowsAfter ?? 0;
              return (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs rounded-mio-sm bg-[#f3f3f5] dark:bg-white/[0.05] px-3.5 py-2.5 font-mono"
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
