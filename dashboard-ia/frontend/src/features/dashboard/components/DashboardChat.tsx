import React from 'react';
import { Bot } from 'lucide-react';
import DataChatbot, { Message as ChatMessage } from '@/components/DataChatbot';
import { AnalysisResponseSchema, ChartSchema } from '@/types/analysis';

interface DashboardChatProps {
  isAdmin: boolean;
  result: AnalysisResponseSchema;
  charts: ChartSchema[];
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
  onChartOverride: (index: number, chartData: any) => void;
}

export const DashboardChat: React.FC<DashboardChatProps> = ({
  isAdmin,
  result,
  charts,
  messages,
  onMessagesChange,
  onChartOverride,
}) => {
  if (!isAdmin) return null;

  return (
    <div className="mt-8 mb-12">
      <div className="bg-white/95 dark:bg-[#0e0c19] p-6 md:p-8 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#7647eb]/15 border border-[#7647eb]/30 text-[#7647eb] dark:text-[#a78bfa] rounded-2xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-sans text-zinc-950 dark:text-white tracking-tight">
              Asistente Copilot MIO
            </h3>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              CONSULTAS SOBRE EL DATASET & MODELOS CALIBRADOS
            </span>
          </div>
        </div>
        <DataChatbot
          context={result}
          charts={charts}
          messages={messages}
          onMessagesChange={onMessagesChange}
          onChartOverride={onChartOverride}
        />
      </div>
    </div>
  );
};
