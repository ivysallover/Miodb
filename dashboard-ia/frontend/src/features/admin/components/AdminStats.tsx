import React from 'react';
import { Users, BarChart3, Bot, AlertCircle } from 'lucide-react';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts } from '../../../lib/echartsCore';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl p-4 rounded-mio border border-zinc-200/90 dark:border-white/10 shadow-sm flex items-center gap-3">
    <div className={`p-2.5 rounded-mio ${color}`}>{icon}</div>
    <div>
      <p className="text-[11px] font-mono font-bold text-gray-400 dark:text-zinc-500 uppercase">{label}</p>
      <p className="text-2xl font-black font-mono text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

interface AdminStatsProps {
  stats: {
    users: number;
    analyses: number;
    errors: number;
    chats: number;
  };
  chartData: {
    labels: string[];
    datasets: any[];
  };
}

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, chartData }) => {
  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="w-5 h-5 text-zinc-950" />} label="Logins" value={stats.users} color="bg-[#bdf559]/30" />
        <StatCard icon={<BarChart3 className="w-5 h-5 text-white" />} label="Análisis" value={stats.analyses} color="bg-[#7647eb]" />
        <StatCard icon={<Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />} label="IA Chats" value={stats.chats} color="bg-blue-50 dark:bg-blue-500/10" />
        <StatCard icon={<AlertCircle className="w-5 h-5 text-red-500" />} label="Errores" value={stats.errors} color="bg-red-50 dark:bg-red-500/10" />
      </div>

      <div className="bg-white/95 dark:bg-[#0e0c19] backdrop-blur-xl p-6 rounded-mio border border-zinc-200/90 dark:border-white/10 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 font-sans text-sm">Distribución de Eventos</h3>
        <ReactECharts
          echarts={echarts}
          option={{
            grid: { containLabel: true, top: 10, bottom: 20, left: 10, right: 10 },
            tooltip: { trigger: 'axis' },
            xAxis: {
              type: 'category',
              data: chartData.labels,
              axisLine: { lineStyle: { color: '#e4e4e7' } },
              axisLabel: { color: '#71717a', fontSize: 10 },
            },
            yAxis: {
              type: 'value',
              splitLine: { lineStyle: { color: '#f4f4f5' } },
              axisLabel: { color: '#71717a', fontSize: 10 },
            },
            series: chartData.datasets.map((d: any) => ({
              name: d.label,
              type: 'bar',
              barWidth: '40%',
              data: d.data,
              itemStyle: {
                borderRadius: [6, 6, 0, 0],
                color: (params: any) => d.backgroundColor?.[params.dataIndex] || '#7647eb',
              },
            })),
          }}
          style={{ height: '220px' }}
        />
      </div>
    </div>
  );
};
