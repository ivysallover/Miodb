'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAdminState } from '@/features/admin/useAdminState';
import { AdminHeader, AdminStats, AdminLogsTable } from '@/features/admin/components';

export default function AdminDashboard() {
  const {
    authorized,
    logs,
    cleaning,
    filterType,
    setFilterType,
    search,
    setSearch,
    cleanOldLogs,
    filteredLogs,
    stats,
    chartData,
  } = useAdminState();

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-[#fafafc] flex items-center justify-center text-gray-500 font-medium">
        Verificando acceso...
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen bg-[#fafafc] flex flex-col items-center justify-center p-4 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
        <p className="text-sm text-gray-500">No tenés permisos de administrador para ver este panel.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col">
      <Navbar />
      <div className="flex-1 p-6 lg:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <AdminHeader cleaning={cleaning} onCleanLogs={cleanOldLogs} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AdminStats stats={stats} chartData={chartData} />

            <div className="lg:col-span-2">
              <AdminLogsTable
                logs={logs}
                filteredLogs={filteredLogs}
                filterType={filterType}
                onFilterChange={setFilterType}
                search={search}
                onSearchChange={setSearch}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
