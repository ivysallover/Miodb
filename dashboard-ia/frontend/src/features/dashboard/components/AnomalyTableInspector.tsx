'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  AlertTriangle,
} from 'lucide-react';

export interface AnomalyTableInspectorProps {
  anomalyRecords?: Record<string, any>[];
  sampleRecords?: Record<string, any>[];
  tableColumns?: string[];
  columnRoles?: Record<string, string>;
  filename?: string;
}

type FilterMode = 'anomalies' | 'all' | 'normal';

export type InspectorRecord = Record<string, any> & { _is_anomaly: boolean };

interface AnomalyAttribution {
  isAnomaly: boolean;
  features: string[];
  topFeature: string | null;
  reason: string | null;
  details: Record<string, { z_score: number; direction: string; sigma: number; mean?: number }>;
}

/**
 * Formateador seguro de valores de celdas.
 * CONTRATO CRÍTICO:
 * 1. Columnas ID / Identificador: NUNCA aplicar formato de miles ni notación financiera.
 *    Evita deformar códigos de cliente como "1200034" en "1.200.034" o DNIs.
 * 2. Columnas en modo DECIMAL viajan como `string` en JSON para evitar la pérdida
 *    de precisión IEEE 754 de los floats. Esta función detecta números, strings numéricos
 *    y fechas de forma segura sin invocar jamás `.toFixed()` a ciegas.
 */
function formatCellValue(val: any, colName: string = '', colRole?: string): React.ReactNode {
  if (val === null || val === undefined || val === '') {
    return <span className="text-gray-400 italic font-mono text-xs">—</span>;
  }

  // 1. Identificadores / IDs / Códigos / DNI: preservar como string literal limpio
  const isIdentifier =
    colRole === 'identificador' ||
    colRole === 'id' ||
    /(^|_)(id|cod|codigo|código|key|uuid|dni|cuit|cuil)($|_)/i.test(colName);

  if (isIdentifier) {
    return <span className="font-mono text-gray-800">{String(val)}</span>;
  }

  if (typeof val === 'boolean') {
    return (
      <span
        className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
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

    // 2. Fecha / Hora ISO (ej. 2024-03-15T12:00:00 o 2024-03-15 00:00:00)
    if (/^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}/.test(trimmed)) {
      const d = new Date(trimmed.replace(' ', 'T'));
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

    // 3. String numérico (ej. Decimal "1200.50" o "-3456.78")
    // Se preservan los dígitos exactos sin error de punto flotante
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const parts = trimmed.split('.');
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const formattedDecimalStr = parts.length > 1 ? `${intPart},${parts[1]}` : intPart;
      return <span className="font-mono font-medium">{formattedDecimalStr}</span>;
    }

    // 4. Texto largo
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
  columnRoles = {},
  filename = 'dataset',
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('anomalies');
  const [selectedFeatureFilter, setSelectedFeatureFilter] = useState<string | null>(null);
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

  // Determinar columnas de datos a mostrar (excluyendo metadatos internos con prefijo _)
  const displayColumns = useMemo(() => {
    if (tableColumns && tableColumns.length > 0) {
      return tableColumns.filter((c) => !c.startsWith('_'));
    }
    if (allRecords.length > 0) {
      return Object.keys(allRecords[0]).filter((c) => !c.startsWith('_'));
    }
    return [];
  }, [tableColumns, allRecords]);

  // Detección de columnas numéricas para cálculo de desvío z-score fallback
  const numericColumns = useMemo(() => {
    return displayColumns.filter((col) => {
      const role = columnRoles[col];
      if (role === 'identificador' || role === 'id' || role === 'fecha' || role === 'categórica') {
        return false;
      }
      if (/(^|_)(id|cod|dni|key|uuid|fecha|date)($|_)/i.test(col)) {
        return false;
      }
      return allRecords.some((r) => {
        const v = r[col];
        return typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()));
      });
    });
  }, [displayColumns, columnRoles, allRecords]);

  // Estadísticas globales por columna para fallback de inferencia de anomalías en cliente
  const columnStats = useMemo(() => {
    const stats: Record<string, { mean: number; std: number }> = {};
    for (const col of numericColumns) {
      const values: number[] = [];
      for (const r of allRecords) {
        const v = r[col];
        if (typeof v === 'number' && !isNaN(v)) {
          values.push(v);
        } else if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) {
          const parsed = parseFloat(v);
          if (!isNaN(parsed)) values.push(parsed);
        }
      }
      if (values.length > 2) {
        const mean = values.reduce((sum, x) => sum + x, 0) / values.length;
        const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        stats[col] = { mean, std: std > 0 ? std : 1 };
      }
    }
    return stats;
  }, [numericColumns, allRecords]);

  // Atribución de causa de anomalía por fila (combina datos del backend con fallback cliente)
  const getAnomalyAttribution = useCallback(
    (row: InspectorRecord): AnomalyAttribution => {
      if (!row._is_anomaly) {
        return {
          isAnomaly: false,
          features: [],
          topFeature: null,
          reason: null,
          details: {},
        };
      }

      // 1. Si el backend proveyó la atribución exacta, usarla de inmediato
      if (Array.isArray(row._anomaly_features) && row._anomaly_features.length > 0) {
        return {
          isAnomaly: true,
          features: row._anomaly_features,
          topFeature: row._top_anomaly_feature || row._anomaly_features[0],
          reason: row._anomaly_reason || null,
          details: row._anomaly_details || {},
        };
      }

      // 2. Fallback del cliente con z-scores calculados
      let maxZ = 0;
      let topCol: string | null = null;
      let topDir: string = 'alto';
      const features: string[] = [];
      const details: Record<string, { z_score: number; direction: string; sigma: number; mean?: number }> = {};

      for (const col of numericColumns) {
        const stat = columnStats[col];
        if (!stat) continue;
        const v = row[col];
        const num = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
        if (isNaN(num)) continue;

        const z = (num - stat.mean) / stat.std;
        const absZ = Math.abs(z);
        if (absZ > maxZ) {
          maxZ = absZ;
          topCol = col;
          topDir = z > 0 ? 'alto' : 'bajo';
        }
        if (absZ >= 1.8) {
          features.push(col);
          details[col] = {
            z_score: Number(z.toFixed(2)),
            direction: z > 0 ? 'alto' : 'bajo',
            sigma: Number(absZ.toFixed(1)),
            mean: Number(stat.mean.toFixed(2)),
          };
        }
      }

      if (topCol && !features.includes(topCol)) {
        features.unshift(topCol);
        const stat = columnStats[topCol];
        const v = row[topCol];
        const num = Number(v);
        const z = stat ? (num - stat.mean) / stat.std : maxZ;
        details[topCol] = {
          z_score: Number(z.toFixed(2)),
          direction: topDir,
          sigma: Number(maxZ.toFixed(1)),
          mean: stat ? Number(stat.mean.toFixed(2)) : undefined,
        };
      }

      const reason = topCol
        ? `${topCol}: ${maxZ.toFixed(1)}σ (${topDir})`
        : 'Patrón multidimensional atípico';

      return {
        isAnomaly: true,
        features,
        topFeature: topCol,
        reason,
        details,
      };
    },
    [numericColumns, columnStats]
  );

  // Conteo de anomalías por característica detectada para los filtros rápidos
  const anomalyFeatureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of anomalyRecords) {
      const attr = getAnomalyAttribution({ ...r, _is_anomaly: true });
      if (attr.topFeature) {
        counts[attr.topFeature] = (counts[attr.topFeature] || 0) + 1;
      }
    }
    return counts;
  }, [anomalyRecords, getAnomalyAttribution]);

  // Filtrado por modo, causa seleccionada y búsqueda textual
  const filteredRecords = useMemo(() => {
    let result = allRecords;

    if (filterMode === 'anomalies') {
      result = result.filter((r) => r._is_anomaly);
      if (selectedFeatureFilter) {
        result = result.filter((r) => {
          const attr = getAnomalyAttribution(r);
          return attr.features.includes(selectedFeatureFilter) || attr.topFeature === selectedFeatureFilter;
        });
      }
    } else if (filterMode === 'normal') {
      result = result.filter((r) => !r._is_anomaly);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        const attr = getAnomalyAttribution(row);
        if (attr.reason && attr.reason.toLowerCase().includes(q)) return true;
        if (attr.topFeature && attr.topFeature.toLowerCase().includes(q)) return true;

        return Object.entries(row).some(([key, val]) => {
          if (key.startsWith('_')) return false;
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    return result;
  }, [allRecords, filterMode, selectedFeatureFilter, searchQuery, getAnomalyAttribution]);

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

  // Exportar vista actual a CSV con causas atípicas
  const handleExportCsv = () => {
    if (sortedRecords.length === 0) return;
    const headers = ['Estado_Registro', 'Factor_Atipico', 'Desvio_Sigma', ...displayColumns];
    const rows = sortedRecords.map((row) => {
      const isAnom = Boolean(row._is_anomaly);
      const attr = getAnomalyAttribution(row);
      const status = isAnom ? 'ANOMALIA' : 'NORMAL';
      const factor = isAnom && attr.topFeature ? `"${attr.topFeature}"` : '""';
      const sigma = isAnom && attr.reason ? `"${attr.reason}"` : '""';
      const cells = displayColumns.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return '""';
        const str = String(v).replace(/"/g, '""');
        return `"${str}"`;
      });
      return [status, factor, sigma, ...cells].join(';');
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
      <div className="mt-6 p-6 rounded-mio bg-zinc-100 dark:bg-white/[0.04] text-center">
        <TableIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase font-sans">
          No hay registros detallados disponibles para esta vista
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
          El análisis no devolvió muestras individuales de anomalías.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-[#f3f3f5] dark:bg-white/[0.04] rounded-mio overflow-hidden">
      {/* Barra de herramientas / Header */}
      <div className="p-4 sm:p-5 bg-transparent flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Filtros de estado */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFilterMode('anomalies');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'anomalies'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : 'bg-white dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-[#e4dcff] dark:hover:bg-white/[0.08]'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Solo Anomalías ({anomCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setSelectedFeatureFilter(null);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white/15 shadow-sm'
                  : 'bg-white dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-[#e4dcff] dark:hover:bg-white/[0.08]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Todos ({allRecords.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('normal');
                setSelectedFeatureFilter(null);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
                filterMode === 'normal'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-white dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-[#e4dcff] dark:hover:bg-white/[0.08]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Normales ({normalCount})</span>
            </button>
          </div>

          {/* Búsqueda y descarga rápida */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar en registros..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-full border border-transparent bg-white dark:bg-white/[0.06] text-zinc-900 dark:text-white placeholder-zinc-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#7647eb]"
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
              title="Exportar vista filtrada a CSV con factores atípicos"
              className="px-3.5 py-1.5 text-xs font-semibold rounded-full border border-transparent bg-white dark:bg-white/[0.06] hover:bg-zinc-100 dark:hover:bg-white/[0.08] text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Filtros rápidos por característica atípica causante */}
        {filterMode === 'anomalies' && Object.keys(anomalyFeatureCounts).length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mr-1">
              Filtrar por causa:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedFeatureFilter(null);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-mio-sm border transition-all cursor-pointer ${
                selectedFeatureFilter === null
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 border-zinc-900 dark:border-white/15 shadow-sm font-bold'
                  : 'bg-white dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 border-transparent hover:bg-[#e4dcff] dark:hover:bg-white/[0.08]'
              }`}
            >
              Todas ({anomCount})
            </button>
            {Object.entries(anomalyFeatureCounts).map(([feat, c]) => (
              <button
                key={feat}
                type="button"
                onClick={() => {
                  setSelectedFeatureFilter(feat === selectedFeatureFilter ? null : feat);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-mio-sm border transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedFeatureFilter === feat
                    ? 'bg-amber-300 text-black border-amber-400 shadow-sm font-bold'
                    : 'bg-white dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-white/10 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                }`}
              >
                <span>{feat}</span>
                <span className="px-1 py-0.2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 text-[8px] font-mono font-bold rounded">
                  {c}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Banner explicativo visual */}
      <div className="px-4 py-2 bg-[#e4dcff] dark:bg-[#2a1766] dark:text-zinc-100 flex items-center gap-2 text-xs text-gray-800">
        <span className="font-medium text-[11px] text-gray-700">
          Las celdas resaltadas en <strong className="text-red-700 font-bold">rojo con etiqueta ±σ</strong> indican la característica o valor numérico exacto que provocó que el registro fuera clasificado como anomalía.
        </span>
      </div>

      {/* Contenedor de la tabla scrollable */}
      <div className="overflow-x-auto max-h-[500px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#e9e7f1] dark:bg-[#17142a] sticky top-0 z-10 select-none">
            <tr>
              <th className="p-3 font-bold text-gray-900 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                Estado
              </th>
              <th className="p-3 font-bold text-gray-900 uppercase tracking-wider whitespace-nowrap border-r border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span>Factor Atípico</span>
                  <span className="px-1 py-0.2 text-[9px] font-bold uppercase bg-amber-200 text-amber-950">
                    Causa
                  </span>
                </div>
              </th>
              {displayColumns.map((col) => {
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="p-3 font-bold text-gray-900 uppercase tracking-wider whitespace-nowrap border-r border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        {(columnRoles[col] === 'identificador' || /(^|_)(id|cod|dni)($|_)/i.test(col)) && (
                          <span className="px-1 py-0.2 bg-gray-200 text-gray-700 text-[9px] font-mono font-bold border border-gray-400">
                            ID
                          </span>
                        )}
                      </div>
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
                  colSpan={displayColumns.length + 2}
                  className="p-8 text-center text-gray-500 font-bold uppercase text-xs"
                >
                  No se encontraron registros que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((row, idx) => {
                const isAnom = Boolean(row._is_anomaly);
                const attr = getAnomalyAttribution(row);

                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isAnom
                        ? 'bg-[#ff6b6b]/10 dark:bg-[#ff6b6b]/20 hover:bg-[#ff6b6b]/20'
                        : 'bg-white dark:bg-[#0e0c19] hover:bg-zinc-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    {/* Columna Estado */}
                    <td className="p-3 whitespace-nowrap border-r border-gray-200">
                      {isAnom ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#ff6b6b] text-white">
                          <ShieldAlert className="w-3 h-3" />
                          Atípico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Normal
                        </span>
                      )}
                    </td>

                    {/* Columna Factor Atípico / Causa */}
                    <td className="p-3 whitespace-nowrap border-r border-gray-200">
                      {isAnom && attr.topFeature ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-950 w-fit"
                            title={attr.reason || `Valor inusual detectado en ${attr.topFeature}`}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-900 shrink-0" />
                            <span className="truncate max-w-[130px]">{attr.topFeature}</span>
                          </span>
                          {attr.reason && (
                            <span className="text-[10px] font-mono text-gray-600 font-bold pl-0.5">
                              {attr.reason.replace(`${attr.topFeature}: `, '')}
                            </span>
                          )}
                        </div>
                      ) : isAnom ? (
                        <span className="text-gray-500 italic text-[10px] font-mono">Multivariado</span>
                      ) : (
                        <span className="text-gray-400 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Columnas de Datos con Resaltado Inteligente */}
                    {displayColumns.map((col) => {
                      const isAnomalousCol = isAnom && attr.features.includes(col);
                      const detail = attr.details[col];

                      if (isAnomalousCol) {
                        const dirSign = detail?.direction === 'bajo' ? '-' : '+';
                        const sigmaStr = detail?.sigma ? `${dirSign}${detail.sigma}σ` : 'Atípico';
                        const tooltip =
                          detail?.mean !== undefined
                            ? `Valor atípico: ${sigmaStr} sobre la media histórica (${detail.mean})`
                            : `Característica atípica (${sigmaStr})`;

                        return (
                          <td
                            key={col}
                            className="p-3 whitespace-nowrap border-r border-gray-200 bg-[#ffe8e8] border-y-2 border-y-[#ff6b6b] transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2.5">
                              <span className="font-bold text-red-950 underline decoration-[#ff6b6b] decoration-2 underline-offset-2">
                                {formatCellValue(row[col], col, columnRoles[col])}
                              </span>
                              <span
                                className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#ff6b6b] text-white whitespace-nowrap shrink-0 cursor-help"
                                title={tooltip}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {sigmaStr}
                              </span>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={col} className="p-3 whitespace-nowrap border-r border-gray-200">
                          {formatCellValue(row[col], col, columnRoles[col])}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Barra de paginación y totales */}
      <div className="p-4 bg-transparent flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 font-medium font-mono text-[11px]">
          <span>
            Mostrando{' '}
            <strong className="text-zinc-950 dark:text-white">
              {totalRows === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1}
            </strong>{' '}
            a{' '}
            <strong className="text-zinc-950 dark:text-white">
              {Math.min(validCurrentPage * pageSize, totalRows)}
            </strong>{' '}
            de <strong className="text-zinc-950 dark:text-white">{totalRows}</strong> registros
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Selector de tamaño de página */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium text-xs">Filas:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-mio-sm border border-transparent bg-white dark:bg-white/[0.06] text-xs font-mono font-medium focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Navegación de páginas */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={validCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-full border border-transparent bg-white dark:bg-white/[0.06] hover:bg-zinc-100 dark:hover:bg-white/[0.08] disabled:opacity-30 transition-all cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={validCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-full border border-transparent bg-white dark:bg-white/[0.06] hover:bg-zinc-100 dark:hover:bg-white/[0.08] disabled:opacity-30 transition-all cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
