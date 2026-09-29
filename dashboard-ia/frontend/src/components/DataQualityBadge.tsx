'use client';

import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface DataQualityBadgeProps {
  score: number;
  label: string;
}

export default function DataQualityBadge({ score, label }: DataQualityBadgeProps) {
  let colorBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let Icon = ShieldCheck;

  if (score < 55) {
    colorBg = 'bg-red-50 text-red-700 border-red-200';
    Icon = AlertOctagon;
  } else if (score < 80) {
    colorBg = 'bg-amber-50 text-amber-700 border-amber-200';
    Icon = AlertTriangle;
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-none border text-xs font-semibold ${colorBg}`}>
      <Icon className="w-4 h-4" />
      <span>Calidad de datos: {score}/100 ({label})</span>
    </div>
  );
}
