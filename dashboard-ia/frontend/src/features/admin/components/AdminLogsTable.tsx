import React from 'react';
import { Search, Database } from 'lucide-react';
import LogDetailsRenderer from '@/components/LogDetailsRenderer';

interface AdminLogsTableProps {
  logs: any[];
  filteredLogs: any[];
  filterType: string;
  onFilterChange: (type: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

function FilterButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-full transition-all cursor-pointer ${
        active
          ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm font-black'
          : 'bg-white dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/[0.08]'
      }`}
    >
      {children}
    </button>
  );
}

export const AdminLogsTable: React.FC<AdminLogsTableProps> = ({
  logs,
  filteredLogs,
  filterType,
  onFilterChange,
  search,
  onSearchChange,
}) => {
  return (
    <div className="space-y-6">
      {/* Right Column: Interactive Table */}
      <div className="bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 rounded-3xl shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <FilterButton active={filterType === 'all'} onClick={() => onFilterChange('all')}>
              Todos
            </FilterButton>
            <FilterButton active={filterType === 'auth'} onClick={() => onFilterChange('auth')}>
              Auth
            </FilterButton>
            <FilterButton active={filterType === 'analysis'} onClick={() => onFilterChange('analysis')}>
              Análisis
            </FilterButton>
            <FilterButton active={filterType === 'error'} onClick={() => onFilterChange('error')}>
              Errores
            </FilterButton>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar UID, error..."
              className="w-full pl-9 pr-4 py-2 text-xs font-mono border border-zinc-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7647eb] bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/80 dark:bg-[#121024] sticky top-0 border-b border-zinc-200 dark:border-white/10 shadow-sm backdrop-blur-sm">
              <tr>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase">Hora</th>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase">Evento</th>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase">Detalle / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-xs font-mono text-gray-400 dark:text-zinc-500">
                    No hay eventos registrados para mostrar
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-3.5 text-xs font-mono text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : '-'}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-[11px] font-mono font-bold rounded-full border ${
                          log.type.includes('error')
                            ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
                            : log.type.includes('auth')
                            ? 'bg-[#bdf559]/20 text-zinc-950 dark:text-[#bdf559] border-[#bdf559]/50'
                            : log.type.includes('chat')
                            ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                            : 'bg-[#7647eb]/10 dark:bg-[#7647eb]/20 text-[#7647eb] dark:text-[#a78bfa] border-[#7647eb]/30'
                        }`}
                      >
                        {log.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs">
                      <LogDetailsRenderer log={log} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Model Metrics Section */}
      <div className="bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl border border-zinc-200/90 dark:border-white/10 rounded-3xl shadow-sm flex flex-col max-h-[400px] overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 font-sans text-sm">
            <Database className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa]" />
            <span>Métricas de Rendimiento de Modelos</span>
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50/80 dark:bg-[#121024] sticky top-0 border-b border-zinc-200 dark:border-white/10 shadow-sm backdrop-blur-sm">
              <tr>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase">Dataset</th>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase">Prophet (Predicción)</th>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 uppercase">Isolation Forest (Anomalías)</th>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 uppercase">LightGBM (Factores)</th>
                <th className="p-3.5 text-xs font-mono font-bold text-gray-500 uppercase">PCA (Segmentación)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
              {logs.filter((l) => l.type === 'analysis_success' && l.metrics).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs font-mono text-gray-400 dark:text-zinc-500">
                    No hay métricas de modelos registradas aún
                  </td>
                </tr>
              ) : (
                logs
                  .filter((l) => l.type === 'analysis_success' && l.metrics)
                  .map((log) => (
                    <tr key={`metric-${log.id}`} className="hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 text-xs font-mono font-bold text-gray-800 dark:text-zinc-200">{log.filename || 'Desconocido'}</td>
                      <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-zinc-400">
                        {log.metrics.forecast?.error ? (
                          <span className="text-red-500">Error: {log.metrics.forecast.error}</span>
                        ) : log.metrics.forecast?.mae ? (
                          `MAE: ${log.metrics.forecast.mae} | MAPE: ${log.metrics.forecast.mape}%`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-zinc-400">
                        {log.metrics.anomalies?.error ? (
                          <span className="text-red-500">Error: {log.metrics.anomalies.error}</span>
                        ) : log.metrics.anomalies?.pct_anomalias !== undefined || log.metrics.anomalies?.pctAnomalias !== undefined ? (
                          `${log.metrics.anomalies.n_anomalias ?? log.metrics.anomalies.nAnomalias} anomalías (${log.metrics.anomalies.pct_anomalias ?? log.metrics.anomalies.pctAnomalias}%)`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-zinc-400">
                        {log.metrics.feature_importance?.error || log.metrics.featureImportance?.error ? (
                          <span className="text-red-500">Error: {log.metrics.feature_importance?.error || log.metrics.featureImportance?.error}</span>
                        ) : (log.metrics.feature_importance?.n_features || log.metrics.featureImportance?.nFeatures) ? (
                          `${log.metrics.feature_importance?.n_features || log.metrics.featureImportance?.nFeatures} variables analizadas`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-zinc-400">
                        {log.metrics.segmentation?.error ? (
                          <span className="text-red-500">Error: {log.metrics.segmentation.error}</span>
                        ) : (log.metrics.segmentation?.clusters || log.metrics.segmentation?.n_clusters) ? (
                          `${log.metrics.segmentation?.clusters || log.metrics.segmentation?.n_clusters} clusters detectados`
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
