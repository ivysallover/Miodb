'use client';

import React, { useState, useRef, useEffect } from 'react';
import { askGemini } from '@/lib/api';
import { Send, Bot, RotateCcw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MioPet2D, MioPetMood } from './pet/MioPet2D';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DataChatbotProps {
  context: any;
  charts?: any[];
  messages: Message[];
  onMessagesChange: (msgs: Message[]) => void;
  onChartOverride?: (index: number, chartData: any) => void;
}

export default function DataChatbot({ context, charts, messages, onMessagesChange, onChartOverride }: DataChatbotProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mioMood, setMioMood] = useState<MioPetMood>('reposo');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Inactivity detector: 2 minutes -> 'durmiendo'
  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setMioMood((prev) => (prev === 'reposo' ? 'durmiendo' : prev));
    }, 120000);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [input, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { id: Date.now().toString(), role: 'user', content: userMsg }];
    onMessagesChange(newMessages);
    setIsLoading(true);
    setMioMood('trabajando');

    try {
      const result = await askGemini(userMsg, context, charts);
      const assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.response };
      onMessagesChange([...newMessages, assistantMsg]);

      // Apply chart override if Gemini returned one
      if (result.chart_override && onChartOverride) {
        const { index, chart_data } = result.chart_override;
        if (typeof index === 'number' && chart_data) {
          onChartOverride(index, chart_data);
        }
      }

      // Detect anomalies or celebrate successful insight
      const text = (result.response || '').toLowerCase();
      const hasAnomaly = text.includes('anomal') || text.includes('outlier') || text.includes('riesgo') || text.includes('alerta') || text.includes('spike');
      if (hasAnomaly) {
        setMioMood('anomalia');
        setTimeout(() => setMioMood('reposo'), 6000);
      } else {
        setMioMood('celebrando');
        setTimeout(() => setMioMood('reposo'), 4000);
      }
    } catch (error: any) {
      setMioMood('anomalia');
      setTimeout(() => setMioMood('reposo'), 5000);
      onMessagesChange([...newMessages, { id: (Date.now() + 1).toString(), role: 'assistant', content: `**Error**: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMioMood('reposo');
    onMessagesChange([{
      id: '1',
      role: 'assistant',
      content: '¡Chat reiniciado! Soy tu Asistente de Datos MIO. ¿En qué te puedo ayudar?'
    }]);
  };

  return (
    <div className="flex flex-col h-[560px] bg-white/95 dark:bg-[#0e0c19] rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-[#7647eb] to-[#602cd1] flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center p-0.5 backdrop-blur-sm shadow-inner">
            <MioPet2D mood={mioMood} size={32} showShadow={false} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Copilot Analítico MIO</h3>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider font-semibold transition-all ${
                mioMood === 'trabajando' ? 'bg-[#bdf559]/25 border-[#bdf559]/60 text-[#bdf559] animate-pulse' :
                mioMood === 'celebrando' ? 'bg-amber-400/25 border-amber-400/60 text-amber-300' :
                mioMood === 'anomalia' ? 'bg-rose-500/25 border-rose-500/60 text-rose-300' :
                mioMood === 'durmiendo' ? 'bg-zinc-500/25 border-zinc-500/40 text-zinc-300' :
                'bg-white/10 border-white/20 text-white/80'
              }`}>
                {mioMood}
              </span>
            </div>
            <p className="text-white/70 text-[10px] font-mono">Inferencia autónoma · Consulta tus datos</p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          title="Reiniciar chat"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 rounded-full transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
      
      {/* Suggestion pills */}
      {messages.length <= 1 && (
        <div className="px-4 py-2.5 flex flex-wrap gap-2 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-white/[0.01]">
          {['¿Cuáles son los KPIs más importantes?', '¿Qué anomalías detectaste?', '¿Qué recomendaciones operativas sugerís?'].map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); }}
              className="text-[11px] px-3 py-1 border border-[#7647eb]/30 bg-[#7647eb]/10 text-[#7647eb] dark:text-[#a78bfa] hover:bg-[#7647eb] hover:text-white transition-all rounded-full font-medium cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isLatest = idx === messages.length - 1;
          const isAnomalyMsg = msg.content.toLowerCase().includes('anomal');
          const messageMood: MioPetMood =
            isLatest && mioMood !== 'reposo' && mioMood !== 'durmiendo'
              ? mioMood
              : isAnomalyMsg
              ? 'anomalia'
              : 'reposo';

          return (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-[#7647eb]/10 border border-[#7647eb]/20 flex items-center justify-center p-0.5 shadow-sm">
                  <MioPet2D mood={messageMood} size={32} showShadow={false} />
                </div>
              )}
              <div className={`max-w-[82%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#7647eb] text-white rounded-2xl rounded-tr-sm shadow-sm'
                  : 'bg-zinc-50 dark:bg-white/[0.04] text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-white/10 rounded-2xl rounded-tl-sm shadow-sm'
              }`}>
                <div className="markdown-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-2.5 justify-start items-center">
            <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-[#7647eb]/10 border border-[#7647eb]/20 flex items-center justify-center p-0.5 shadow-sm">
              <MioPet2D mood="trabajando" size={32} showShadow={false} animated />
            </div>
            <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-2.5 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7647eb]" />
              <span className="text-xs text-zinc-600 dark:text-zinc-300 font-mono">
                MIO está analizando correlaciones y modelos...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              if (mioMood === 'durmiendo') setMioMood('reposo');
              setInput(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Preguntale a tus datos sobre correlaciones, riesgos o proyecciones..."
            className="flex-1 bg-white dark:bg-white/[0.04] border border-zinc-300 dark:border-white/10 rounded-full px-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#7647eb]"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-[#7647eb] hover:bg-[#602cd1] text-white rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] font-mono text-zinc-400 mt-1.5 pl-2">Podés pedirle análisis de quiebres o variaciones en los datos</p>
      </div>
    </div>
  );
}
