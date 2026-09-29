import React from 'react';

export default function LogDetailsRenderer({ log }: { log: any }) {
  // Remove known keys
  const { type, timestamp, id, ...metadata } = log;
  
  if (Object.keys(metadata).length === 0) return <span className="text-gray-400">-</span>;

  // Render a clean key-value grid for metadata
  return (
    <div className="bg-white dark:bg-[#121024] border border-zinc-200 dark:border-white/10 p-2 max-h-48 overflow-auto rounded-xl">
      <table className="w-full text-left text-xs">
        <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
          {Object.entries(metadata).map(([k, v]) => (
            <tr key={k}>
              <td className="py-1 pr-2 font-mono font-bold text-zinc-700 dark:text-zinc-300 align-top w-1/4 break-all">{k}</td>
              <td className="py-1 font-mono text-zinc-600 dark:text-zinc-400 align-top break-words">
                {typeof v === 'object' ? (
                  <pre className="text-[10px] whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
                ) : (
                  String(v)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
