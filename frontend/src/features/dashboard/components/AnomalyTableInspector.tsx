'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ShieldAlert,
  CheckCircle2,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface AnomalyTableInspectorProps {
  anomalyRecords?: Record<string, any>[];
  sampleRecords?: Record<string, any>[];
  tableColumns?: string[];
  filename?: string;
}

type FilterMode = 'anomalies' | 'all' | 'normal';

export type InspectorRecord = Record<string, any> & { _is_anomaly: boolean };

/**
 * Formateador seguro de valores de celdas.
 * CONTRATO CRÍTICO: Las columnas en modo DECIMAL viajan como `string` en JSON
 * para evitar la pérdida de precisión IEEE 754 de los floats.
 * Esta función detecta números, strings numéricos y fechas de forma segura
 * sin invocar jamás `.toFixed()` a ciegas.
 */
function formatCellValue(val: any): React.ReactNode {
  if (val === null || val === undefined || val === '') {
    return <span className="text-gray-400 italic font-mono text-xs">—</span>;
  }

  if (typeof val === 'boolean') {
    return (
      <span
        className={`px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider border-2 border-[#111] shadow-[1px_1px_0px_#111] ${
          val ? 'bg-emerald-300 text-black' : 'bg-gray-200 text-gray-700'
        }`}
      >
        {val ? 'true' : 'false'}
      </span>
    );
  }

  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return <span className="font-mono">{val.toLocaleString('es-AR')}</span>;
    }
    return (
      <span className="font-mono">
        {val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
      </span>
    );
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();

    // 1. Fecha / Hora ISO (ej. 2024-03-15T12:00:00)
    if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return (
          <span className="font-mono text-xs whitespace-nowrap text-gray-700">
            {d.toLocaleDateString('es-AR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        );
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return <span className="font-mono text-xs text-gray-700">{trimmed}</span>;
    }

    // 2. String numérico (ej. Decimal "1200.50" o "-3456.78")
    // Se preservan los dígitos exactos sin error de punto flotante
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const parts = trimmed.split('.');
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const formattedDecimalStr = parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
      return <span className="font-mono font-medium">{formattedDecimalStr}</span>;
    }

    // 3. Texto largo
    if (trimmed.length > 40) {
      return (
        <span title={trimmed} className="cursor-help" tabIndex={0}>
          {trimmed.slice(0, 37)}...
        </span>
      );
    }
    return <span>{trimmed}</span>;
  }

  if (typeof val === 'object') {
    return <span className="font-mono text-xs text-gray-500">{JSON.stringify(val)}</span>;
  }

  return <span>{String(val)}</span>;
}

export const AnomalyTableInspector: React.FC<AnomalyTableInspectorProps> = ({
  anomalyRecords = [],
  sampleRecords = [],
  tableColumns = [],
  filename = 'dataset',
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('anomalies');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Consolidar todos los registros
  const allRecords = useMemo<InspectorRecord[]>(() => {
    const anom: InspectorRecord[] = (anomalyRecords || []).map((r) => ({ ...r, _is_anomaly: true }));
    const norm: InspectorRecord[] = (sampleRecords || []).map((r) => ({ ...r, _is_anomaly: false }));
    return [...anom, ...norm];
  }, [anomalyRecords, sampleRecords]);

  // Determinar columnas a mostrar
  const displayColumns = useMemo(() => {
    if (tableColumns && tableColumns.length > 0) {
      return tableColumns.filter((c) => !c.startsWith('_'));
    }
    if (allRecords.length > 0) {
      return Object.keys(allRecords[0]).filter((c) => !c.startsWith('_'));
    }
    return [];
  }, [tableColumns, allRecords]);

  // Filtrado por modo y búsqueda
  const filteredRecords = useMemo(() => {
    let result = allRecords;

    if (filterMode === 'anomalies') {
      result = result.filter((r) => r._is_anomaly);
    } else if (filterMode === 'normal') {
      result = result.filter((r) => !r._is_anomaly);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) =>
        Object.entries(row).some(([key, val]) => {
          if (key.startsWith('_')) return false;
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    return result;
  }, [allRecords, filterMode, searchQuery]);

  // Ordenamiento
  const sortedRecords = useMemo(() => {
    if (!sortColumn) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Comparación numérica o decimal
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
        return sortDirection === 'asc' ? numA - numB : numB - numA;
      }

      // Comparación de fechas
      const dateA = new Date(valA).getTime();
      const dateB = new Date(valB).getTime();
      if (!isNaN(dateA) && !isNaN(dateB) && typeof valA === 'string' && valA.includes('-')) {
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Comparación de strings
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortColumn, sortDirection]);

  // Paginación
  const totalRows = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, validCurrentPage, pageSize]);

  // Manejar clic en encabezado para ordenar
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColumn(null);
      }
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  // Exportar vista actual a CSV
  const handleExportCsv = () => {
    if (sortedRecords.length === 0) return;
    const headers = ['Estado_Registro', ...displayColumns];
    const rows = sortedRecords.map((row) => {
      const status = row._is_anomaly ? 'ANOMALIA' : 'NORMAL';
      const cells = displayColumns.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return '""';
        const str = String(v).replace(/"/g, '""');
        return `"${str}"`;
      });
      return [status, ...cells].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `anomalias_vista_${filename.replace(/\.[^/.]+$/, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const anomCount = anomalyRecords.length;
  const normalCount = sampleRecords.length;

  if (allRecords.length === 0) {
    return (
      <div className="mt-6 p-6 border-2 border-[#111] bg-gray-50 text-center shadow-[4px_4px_0px_#111]">
        <TableIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-gray-700 uppercase">
          No hay registros detallados disponibles para esta vista
        </p>
        <p className="text-xs text-gray-500 mt-1">
          El análisis no devolvió muestras individuales de anomalías.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 border-2 border-[#111] bg-white shadow-[6px_6px_0px_#111]">
      {/* Barra de herramientas / Header */}
      <div className="p-4 bg-gray-50 border-b-2 border-[#111] flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Filtros de estado */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterMode('anomalies');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#111] transition-all flex items-center gap-1.5 ${
              filterMode === 'anomalies'
                ? 'bg-[#ff6b6b] text-white shadow-none translate-y-[2px]'
                : 'bg-white text-gray-800 shadow-[2px_2px_0px_#111] hover:bg-gray-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Solo Anomalías ({anomCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#111] transition-all flex items-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-gray-900 text-white shadow-none translate-y-[2px]'
                : 'bg-white text-gray-800 shadow-[2px_2px_0px_#111] hover:bg-gray-100'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Todos ({allRecords.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('normal');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-[#111] transition-all flex items-center gap-1.5 ${
              filterMode === 'normal'
                ? 'bg-emerald-600 text-white shadow-none translate-y-[2px]'
                : 'bg-white text-gray-800 shadow-[2px_2px_0px_#111] hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Normales ({normalCount})
          </button>
        </div>

        {/* Búsqueda y descarga rápida */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en registros..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border-2 border-[#111] bg-white font-medium focus:outline-none focus:ring-2 focus:ring-mio-violet/50 shadow-[2px_2px_0px_#111]"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            title="Exportar vista filtrada a CSV"
            className="px-3 py-1.5 text-xs font-bold border-2 border-[#111] bg-white hover:bg-yellow-100 text-gray-900 shadow-[2px_2px_0px_#111] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Contenedor de la tabla scrollable */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-gray-100 sticky top-0 border-b-2 border-[#111] z-10 select-none">
            <tr>
              <th className="p-3 font-black text-gray-900 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                Estado
              </th>
              {displayColumns.map((col) => {
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="p-3 font-black text-gray-900 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span>{col}</span>
                      <span className="text-gray-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-gray-900 font-bold" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-gray-900 font-bold" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={displayColumns.length + 1}
                  className="p-8 text-center text-gray-500 font-bold uppercase text-xs"
                >
                  No se encontraron registros que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((row, idx) => {
                const isAnom = Boolean(row._is_anomaly);
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isAnom ? 'bg-[#fff5f5] hover:bg-[#ffebeb]' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-3 whitespace-nowrap border-r border-gray-200">
                      {isAnom ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-[#ff6b6b] text-white border border-[#111] shadow-[1px_1px_0px_#111]">
                          <ShieldAlert className="w-3 h-3" />
                          Atípico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Normal
                        </span>
                      )}
                    </td>
                    {displayColumns.map((col) => (
                      <td key={col} className="p-3 whitespace-nowrap border-r border-gray-200">
                        {formatCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Barra de paginación y totales */}
      <div className="p-3 bg-gray-50 border-t-2 border-[#111] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-600 font-medium">
          <span>
            Mostrando{' '}
            <strong className="text-gray-900">
              {totalRows === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1}
            </strong>{' '}
            a{' '}
            <strong className="text-gray-900">
              {Math.min(validCurrentPage * pageSize, totalRows)}
            </strong>{' '}
            de <strong className="text-gray-900">{totalRows}</strong> registros
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Selector de tamaño de página */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-bold">Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border-2 border-[#111] bg-white text-xs font-bold shadow-[2px_2px_0px_#111] focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Navegación de páginas */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 border-2 border-[#111] bg-white hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white shadow-[2px_2px_0px_#111] active:translate-y-[1px] active:shadow-none transition-all"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-bold text-gray-800">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 border-2 border-[#111] bg-white hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white shadow-[2px_2px_0px_#111] active:translate-y-[1px] active:shadow-none transition-all"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
