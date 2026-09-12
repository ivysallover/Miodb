'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import KPICards from '@/components/KPICards';
import LoadingAnalysis from '@/components/LoadingAnalysis';
import ColumnRoleSelector from '@/components/ColumnRoleSelector';
import DatasetJoinPanel from '@/components/DatasetJoinPanel';
import { useDashboardState } from '@/features/dashboard/useDashboardState';
import {
  DashboardHeader,
  DashboardUploader,
  ExecutiveSummary,
  ExploratoryCharts,
  ForecastSection,
  SegmentationSection,
  AnomaliesSection,
  FeatureImportanceSection,
  DashboardChat,
} from '@/features/dashboard/components';

const MioBackgroundShader = dynamic(() => import('@/components/MioBackgroundShader'), {
  ssr: false,
});

function DashboardInner() {
  const {
    loading,
    result,
    filesQueue,
    currentFileIndex,
    isUploading,
    uploadProgress,
    activeFileSize,
    targetCol,
    setTargetCol,
    setFilesQueue,
    handleStartAnalysis,
    handleLoadSample,
    downloadingPdf,
    downloadingPptx,
    downloadingCleanData,
    handleDownloadPdf,
    handleDownloadPptx,
    handleDownloadCleanData,
    handleReset,
    handleRefresh,
    isNarrativeExpanded,
    setIsNarrativeExpanded,
    effectiveCharts,
    isAdmin,
    chatMessages,
    setChatMessages,
    handleChartOverride,
    // New profiling and multi-dataset state
    profileData,
    showProfileSelector,
    handleProfileAndSelect,
    handleConfirmRoles,
    handleCancelProfileSelector,
    registerChart,
  } = useDashboardState();

  const effectiveFileSize =
    filesQueue[currentFileIndex]?.size ||
    activeFileSize ||
    (result?.profile?.nRows ? result.profile.nRows * 95 : undefined);

  return (
    <div className="min-h-screen bg-[#fafafc] flex flex-col relative overflow-hidden selection:bg-mio-lime selection:text-black">
      {/* Fondo interactivo de Shaders MIO en todo el dashboard */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <MioBackgroundShader theme="light" opacity={0.42} />
      </div>

      <Navbar />

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 relative z-10">
        {loading ? (
          <LoadingAnalysis
            fileSize={effectiveFileSize}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            currentFile={currentFileIndex + 1}
            totalFiles={filesQueue.length}
          />
        ) : showProfileSelector && profileData ? (
          <ColumnRoleSelector
            profileData={profileData}
            onConfirm={handleConfirmRoles}
            onCancel={handleCancelProfileSelector}
          />
        ) : !result ? (
          <DashboardUploader
            filesQueue={filesQueue}
            targetCol={targetCol}
            onFilesSelected={(files) => {
              setFilesQueue(files);
              if (files.length === 1) {
                handleProfileAndSelect(files);
              }
            }}
            onTargetColChange={setTargetCol}
            onStartAnalysis={handleStartAnalysis}
            onLoadSampleData={handleLoadSample}
          />
        ) : (
          <div className="space-y-6">
            <DashboardHeader
              result={result}
              downloadingPdf={downloadingPdf}
              downloadingPptx={downloadingPptx}
              downloadingCleanData={downloadingCleanData}
              onDownloadPdf={handleDownloadPdf}
              onDownloadPptx={handleDownloadPptx}
              onDownloadCleanData={handleDownloadCleanData}
              onReset={handleReset}
              onRefresh={handleRefresh}
            />

            {/* Panel de unión relacional si proviene de auto-join */}
            {result.joinSummary && (
              <DatasetJoinPanel joinSummary={result.joinSummary} />
            )}

            <KPICards kpis={result.kpis} />

            <div className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <ExecutiveSummary
                  narrative={result.narrative}
                  isExpanded={isNarrativeExpanded}
                  onToggleExpand={() => setIsNarrativeExpanded(!isNarrativeExpanded)}
                />

                <ExploratoryCharts
                  charts={effectiveCharts}
                  filename={result.filename}
                  onChartReady={registerChart}
                />

                <ForecastSection
                  chartData={result.forecast?.chartData}
                  metrics={result.forecast?.metrics}
                  filename={result.filename}
                />

                <SegmentationSection
                  scatterData={result.segmentation?.scatterData}
                  radarData={result.segmentation?.radarData}
                  filename={result.filename}
                />

                <AnomaliesSection
                  chartData={result.anomalies?.chartData}
                  metrics={result.anomalies?.metrics}
                  filename={result.filename}
                />

                <FeatureImportanceSection
                  chartImportance={result.featureImportance?.chartImportance}
                  chartShap={result.featureImportance?.chartShap}
                  filename={result.filename}
                />
              </div>
            </div>

            <DashboardChat
              isAdmin={isAdmin}
              result={result}
              charts={effectiveCharts}
              messages={chatMessages}
              onMessagesChange={setChatMessages}
              onChartOverride={handleChartOverride}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafafc] flex items-center justify-center text-gray-400">
          Cargando...
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
