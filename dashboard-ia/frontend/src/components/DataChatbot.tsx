'use client';

import React, { useState, useRef, useEffect } from 'react';
import { askGemini } from '@/lib/api';
import { Send, Bot, RotateCcw, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    } catch (error: any) {
      onMessagesChange([...newMessages, { id: (Date.now() + 1).toString(), role: 'assistant', content: `**Error**: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    onMessagesChange([{
      id: '1',
      role: 'assistant',
      content: '¡Chat reiniciado! Soy tu Asistente de Datos MIO. ¿En qué te puedo ayudar?'
    }]);
  };

  return (
    <div className="flex flex-col h-[560px] bg-white/95 dark:bg-[#0e0c19] rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#7647eb] to-[#602cd1] flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#bdf559]" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Copilot Analítico MIO</h3>
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
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#7647eb]/10 border border-[#7647eb]/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa]" />
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
        ))}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#7647eb]/10 border border-[#7647eb]/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#7647eb] dark:text-[#a78bfa]" />
            </div>
            <div className="bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7647eb]" />
              <span className="text-xs text-zinc-500 font-mono">Consultando modelos y métricas...</span>
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
            onChange={(e) => setInput(e.target.value)}
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
