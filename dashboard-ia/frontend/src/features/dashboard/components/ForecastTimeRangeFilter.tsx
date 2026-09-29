'use client';

import React from 'react';

export type ForecastTimeRange = '3M' | '6M' | '1Y' | 'ALL';

interface ForecastTimeRangeFilterProps {
  value: ForecastTimeRange;
  onChange: (range: ForecastTimeRange) => void;
}

const RANGES: { key: ForecastTimeRange; label: string }[] = [
  { key: '3M', label: '3 Meses' },
  { key: '6M', label: '6 Meses' },
  { key: '1Y', label: '1 Año' },
  { key: 'ALL', label: 'Todo' },
];

export const ForecastTimeRangeFilter: React.FC<ForecastTimeRangeFilterProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center border border-[#111] dark:border-white/10 bg-[#f4f4f5] dark:bg-[#151224] p-0.5 shadow-[2px_2px_0px_#111] dark:shadow-none">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-2.5 py-1 text-[11px] font-black uppercase transition-all ${
            value === key
              ? 'bg-[#111] dark:bg-white text-white dark:text-zinc-900 shadow-[1px_1px_0px_#815ae1]'
              : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
