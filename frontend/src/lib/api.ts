import { AnalysisResponseSchema, NarrativeSchema, ChartSchema } from '@/types/analysis';
import { apiClient } from './apiClient';
import { normalizeChartPayload } from '@/components/DynamicChartRenderer';

// ---------------------------------------------------------------------------
// Response normalizer — camelCase + snake_case adapter
// ---------------------------------------------------------------------------

function normalizeAnalysisResponse(raw: any): AnalysisResponseSchema {
  if (!raw) return raw;
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

  return {
    filename: data.filename || '',
    uploadId: data.uploadId || data.upload_id || '',
    targetCol: data.targetCol || data.target_col || '',
    profile: {
      nRows: data.profile?.nRows ?? data.profile?.n_rows ?? 0,
      nCols: data.profile?.nCols ?? data.profile?.n_cols ?? 0,
      qualityScore: data.profile?.qualityScore ?? data.profile?.quality_score ?? 0,
      qualityLabel: data.profile?.qualityLabel ?? data.profile?.quality_label ?? 'Media',
      numericColumns: data.profile?.numericColumns || data.profile?.numeric_columns || [],
      dateColumns: data.profile?.dateColumns || data.profile?.date_columns || [],
      categoricalColumns: data.profile?.categoricalColumns || data.profile?.categorical_columns || [],
      suggestedTargets: data.profile?.suggestedTargets || data.profile?.suggested_targets || [],
    },
    cleaningReport: data.cleaningReport || data.cleaning_report || { actions: [], duplicatesRemoved: 0, nullsImputed: {} },
    kpis: data.kpis || {},
    charts: (data.charts || []).map((c: any) => normalizeChartPayload(c)).filter(Boolean) as ChartSchema[],
    forecast: {
      chartData: (normalizeChartPayload(data.forecast?.chartData || data.forecast?.chart_data) || undefined) as ChartSchema | undefined,
      metrics: data.forecast?.metrics || {},
    },
    segmentation: {
      scatterData: (normalizeChartPayload(data.segmentation?.scatterData || data.segmentation?.scatter_data) || undefined) as ChartSchema | undefined,
      radarData: (normalizeChartPayload(data.segmentation?.radarData || data.segmentation?.radar_data) || undefined) as ChartSchema | undefined,
      metrics: data.segmentation?.metrics || {},
    },
    anomalies: {
      chartData: (normalizeChartPayload(data.anomalies?.chartData || data.anomalies?.chart_data) || undefined) as ChartSchema | undefined,
      metrics: data.anomalies?.metrics || {},
    },
    featureImportance: {
      chartImportance: (normalizeChartPayload(data.featureImportance?.chartImportance || data.feature_importance?.chart_importance) || undefined) as ChartSchema | undefined,
      chartShap: (normalizeChartPayload(data.featureImportance?.chartShap || data.feature_importance?.chart_shap) || undefined) as ChartSchema | undefined,
      metrics: data.featureImportance?.metrics || data.feature_importance?.metrics || {},
    },
    narrative: data.narrative || { text: '', source: '' },
    joinSummary: data.joinSummary || data.join_summary || undefined,
  };
}

// ---------------------------------------------------------------------------
// Single-file analysis
// ---------------------------------------------------------------------------

export async function analyzeFile(
  file: File | null,
  fileUrl?: string,
  filenameOverride?: string,
  targetCol?: string,
  uploadId?: string,
  columnRoles?: Record<string, string>
): Promise<AnalysisResponseSchema> {
  const formData = new FormData();

  if (file) {
    formData.append('file', file);
  } else if (uploadId) {
    formData.append('upload_id', uploadId);
    if (filenameOverride) formData.append('display_name', filenameOverride);
  } else if (fileUrl) {
    formData.append('file_url', fileUrl);
    if (filenameOverride) formData.append('filename_override', filenameOverride);
  } else {
    throw new Error('Debe proveer un archivo o un identificador de carga.');
  }

  if (targetCol) formData.append('target_col', targetCol);
  if (columnRoles && Object.keys(columnRoles).length > 0) {
    formData.append('column_roles', JSON.stringify(columnRoles));
  }

  const res = await apiClient.post<any>('/analyze', formData);
  return normalizeAnalysisResponse(res);
}

// ---------------------------------------------------------------------------
// Fast profile (no ML) — used by ColumnRoleSelector
// ---------------------------------------------------------------------------

export async function profileFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post<any>('/profile', formData);
}

// ---------------------------------------------------------------------------
// Multi-file analysis with auto-join
// ---------------------------------------------------------------------------

export async function analyzeMultiFile(
  files: File[],
  targetCol?: string,
  columnRoles?: Record<string, string>
): Promise<AnalysisResponseSchema> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  if (targetCol) formData.append('target_col', targetCol);
  if (columnRoles && Object.keys(columnRoles).length > 0) {
    formData.append('column_roles', JSON.stringify(columnRoles));
  }
  const res = await apiClient.post<any>('/analyze/multi', formData);
  return normalizeAnalysisResponse(res);
}

// ---------------------------------------------------------------------------
// AI narrative
// ---------------------------------------------------------------------------

export async function generateNarrative(data: any): Promise<NarrativeSchema> {
  return apiClient.post<NarrativeSchema>('/narrative', data);
}

// ---------------------------------------------------------------------------
// AI chatbot
// ---------------------------------------------------------------------------

export async function askGemini(
  message: string,
  context: any,
  charts?: any[]
): Promise<{ response: string; chart_override?: { index: number; chart_data: any } | null }> {
  return apiClient.post('/chat', { message, context, charts: charts || [] });
}

// ---------------------------------------------------------------------------
// Export endpoints
// ---------------------------------------------------------------------------

export async function exportPDF(data: any): Promise<Blob> {
  return apiClient.postBlob('/export/pdf', data);
}

export async function exportPPTX(data: any): Promise<Blob> {
  return apiClient.postBlob('/export/pptx', data);
}

export async function exportCleanedDataset(params: {
  file?: File;
  uploadId?: string;
  format?: 'csv' | 'xlsx';
  locale?: string;
  outlierAction?: 'flag' | 'cap' | 'drop';
  precisionMode?: 'float64' | 'decimal';
}): Promise<Blob> {
  const formData = new FormData();
  if (params.file) formData.append('file', params.file);
  if (params.uploadId) formData.append('upload_id', params.uploadId);
  formData.append('export_format', params.format || 'csv');
  formData.append('locale', params.locale || 'auto');
  formData.append('outlier_action', params.outlierAction || 'flag');
  formData.append('precision_mode', params.precisionMode || 'float64');
  return apiClient.postBlob('/export/cleaned-dataset', formData);
}

