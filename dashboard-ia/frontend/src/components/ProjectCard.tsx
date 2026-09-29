'use client';

import React from 'react';
import { FileSpreadsheet, Calendar, Target, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: {
    id: string;
    filename: string;
    target_col: string;
    created_at: any;
    qualityScore: number;
    kpis: Record<string, any>;
    narrative_text?: string;
  };
  index: number;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, index, onDelete }: ProjectCardProps) {
  const router = useRouter();
  const date = project.created_at?.toDate
    ? project.created_at.toDate().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Fecha desconocida';

  const kpiEntries = Object.entries(project.kpis || {}).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/95 backdrop-blur-xl border border-zinc-200/90 rounded-3xl shadow-sm hover:shadow-md hover:border-[#7647eb]/30 transition-all p-5 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#7647eb]/10 border border-[#7647eb]/20 flex items-center justify-center flex-shrink-0 text-[#7647eb]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-950 text-sm truncate">{project.filename}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Target className="w-3 h-3 text-[#7647eb] flex-shrink-0" />
              <span className="text-xs text-[#7647eb] font-medium truncate">
                {project.target_col || 'Sin target'}
              </span>
            </div>
          </div>
        </div>
        <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-[#bdf559]/20 text-emerald-800 text-[10px] font-mono font-bold border border-[#bdf559]/40">
          Q: {Math.round(project.qualityScore ?? 0)}%
        </span>
      </div>

      {/* KPIs */}
      {kpiEntries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-t border-zinc-100 pt-3">
          {kpiEntries.map(([label, val]) => (
            <div key={label} className="text-center">
              <p className="text-[10px] font-mono uppercase text-gray-400 truncate">{label}</p>
              <p className="text-sm font-bold font-mono text-gray-900 truncate">
                {typeof val === 'object' ? val?.value ?? '—' : val ?? '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Narrative snippet */}
      {project.narrative_text && (
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2 border-t border-zinc-100 pt-2">
          {project.narrative_text.slice(0, 120)}…
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-zinc-100 pt-3 mt-auto gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard?project=${project.id}`)}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3.5 py-1.5 rounded-full bg-[#7647eb] hover:bg-[#602cd1] text-white shadow-sm hover:shadow transition-all cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-3 h-3 text-[#bdf559]" />
            <span>Abrir</span>
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(project.id)}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-colors cursor-pointer"
              title="Eliminar proyecto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
