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
    <div className="flex items-center rounded-full bg-[#f3f3f5] dark:bg-white/[0.06] p-1">
      {RANGES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`min-h-[30px] rounded-full px-3 text-[11px] font-bold transition-colors cursor-pointer ${
            value === key
              ? 'bg-[#111] dark:bg-white text-white dark:text-zinc-900'
              : 'bg-transparent text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
