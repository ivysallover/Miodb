'use client';

import React from 'react';
import { Sparkles, Cpu, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface InsightPanelProps {
  text: string;
  source?: string;
}

export default function InsightPanel({ text, source }: InsightPanelProps) {
  const isGemini = source === 'gemini';

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-white p-6 sm:p-8 rounded-none border border-mio-violet/20 shadow-[4px_4px_0px_#111] relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-none bg-mio-violet text-white flex items-center justify-center shadow-[6px_6px_0px_#111] shadow-mio-violet/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Informe Ejecutivo Inteligente</h3>
            <p className="text-xs text-gray-500">Lectura y síntesis automatizada de tus datos</p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-none text-xs font-semibold ${
            isGemini
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}
        >
          {isGemini ? <Sparkles className="w-3.5 h-3.5" /> : <Cpu className="w-3.5 h-3.5" />}
          {isGemini ? 'Potenciado por Gemini IA' : 'Motor Analítico Heurístico'}
        </span>
      </div>

      <div className="text-gray-700 text-sm leading-relaxed font-sans markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
