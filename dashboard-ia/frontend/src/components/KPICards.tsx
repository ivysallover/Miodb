'use client';

import React from 'react';

import { TrendingUp, Database, DollarSign, Layers, Hash } from 'lucide-react';

interface KPICardsProps {
  kpis: Record<string, any>;
}

export default function KPICards({ kpis }: KPICardsProps) {
  const entries = Object.entries(kpis);

  const getIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('total') || k.includes('suma') || k.includes('ingreso') || k.includes('monto')) {
      return <DollarSign className="w-5 h-5 text-emerald-600" />;
    }
    if (k.includes('promedio') || k.includes('mean')) {
      return <TrendingUp className="w-5 h-5 text-mio-violet" />;
    }
    if (k.includes('registros') || k.includes('filas')) {
      return <Database className="w-5 h-5 text-purple-600" />;
    }
    if (k.includes('columnas')) {
      return <Layers className="w-5 h-5 text-blue-600" />;
    }
    return <Hash className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
      {entries.slice(0, 4).map(([key, value], idx) => (
        <div
          key={idx}
          className="bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl p-5 rounded-none border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-[#7647eb]/30 transition-all flex items-start justify-between"
        >
          <div>
            <p className="text-xs font-mono font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              {key}
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white tracking-tight">
              {String(value)}
            </h3>
          </div>
          <div className="p-2.5 bg-zinc-50 dark:bg-white/[0.04] rounded-mio border border-zinc-200 dark:border-white/10">
            {getIcon(key)}
          </div>
        </div>
      ))}
    </div>
  );
}
