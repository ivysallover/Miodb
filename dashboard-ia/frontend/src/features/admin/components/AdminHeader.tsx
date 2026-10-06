import React from 'react';
import { Database, Trash2, Activity } from 'lucide-react';

interface AdminHeaderProps {
  cleaning: boolean;
  onCleanLogs: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ cleaning, onCleanLogs }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl p-6 rounded-mio border border-zinc-200/90 dark:border-white/10 shadow-sm">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-tight mb-2 bg-[#bdf559]/20 text-zinc-950 dark:text-[#bdf559] border border-[#bdf559]/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#bdf559] animate-pulse" />
          <span>FASTAPI // PANEL ADMINISTRATIVO</span>
        </div>
        <h1 className="text-3xl font-black font-sans text-gray-950 dark:text-white flex items-center gap-3">
          <Activity className="w-7 h-7 text-[#7647eb]" />
          <span>Telemetría y Control</span>
        </h1>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 font-medium">Monitoreo de endpoints, rendimiento de modelos y memoria RAM</p>
      </div>
      <button
        type="button"
        onClick={onCleanLogs}
        disabled={cleaning}
        className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-full px-4 py-2 text-xs font-mono font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer shadow-sm active:scale-95"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>{cleaning ? 'Limpiando...' : 'Purgar Logs'}</span>
      </button>
    </div>
  );
};
