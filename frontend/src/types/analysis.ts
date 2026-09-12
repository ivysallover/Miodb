export interface ProfileSchema {
  nRows: number;
  nCols: number;
  qualityScore: number;
  qualityLabel: string;
  numericColumns: string[];
  dateColumns: string[];
  categoricalColumns: string[];
  suggestedTargets: string[];
}

export interface ColumnTransformationLogSchema {
  column: string;
  originalType: string;
  finalType: string;
  inferredRole: string;
  /**
   * NOTA DE CONTRATO (Decimal):
   * Si isDecimalMode es true o finalType es 'Decimal', los valores numéricos
   * viajan serializados como string (`str`) en JSON para preservar precisión contable centavo a centavo.
   * La UI / tabla interactiva debe usar formateadores seguros y no llamar a .toFixed() directamente.
   */
  isDecimalMode?: boolean;
  nullsDetected: number;
  nullsImputed: number;
  imputationStrategy?: string;
  outliersDetected: number;
  outlierActionApplied?: string;
  currencyCleaned: boolean;
  datesParsed: boolean;
  ambiguousDatesDetected: number;
}

export interface CleaningReportSchema {
  actions: string[];
  duplicatesRemoved: number;
  nullsImputed: Record<string, number>;
  columnLogs?: ColumnTransformationLogSchema[];
}

export interface ChartMetadataSchema {
  title: string;
  insightSubtitle: string;
  sourceMetric: string;
}

export interface LayoutDirectivesSchema {
  chartType: string;
  xAxisType: string;
  yAxisType: string;
  isLogScale: boolean;
  hasTimeGaps: boolean;
  highCardinality: boolean;
  showConfidenceBands: boolean;
}

export interface DatasetSchema {
  dimensions: string[];
  source: Record<string, any>[];
}

export interface ChartSchema {
  chartId: string;
  metadata: ChartMetadataSchema;
  layoutDirectives: LayoutDirectivesSchema;
  dataset: DatasetSchema;
}

export interface ForecastMetricsSchema {
  ultimoValorReal?: number;
  valorFinalForecast?: number;
  tendenciaPct?: number;
  periodos?: number;
  motor?: string;
  mae?: number;
  rmse?: number;
  mape?: number;
  precisionPct?: number;
  r2?: number;
  confianza?: string;
  validacion?: string;
  frecuencia?: string;
  error?: string;
}

export interface ForecastSchema {
  chartData?: ChartSchema;
  metrics: ForecastMetricsSchema;
}

export interface SegmentationMetricsSchema {
  k?: number;
  varianzaExplicadaPca?: number;
  distribucion?: Record<string, number>;
  perfil?: Record<string, any>[];
  error?: string;
}

export interface SegmentationSchema {
  scatterData?: ChartSchema;
  radarData?: ChartSchema;
  metrics: SegmentationMetricsSchema;
}

export interface AnomalyMetricsSchema {
  nAnomalias?: number;
  pctAnomalias?: number;
  anomaliasDetalle?: string[];
  anomalyRecords?: Record<string, any>[];
  sampleRecords?: Record<string, any>[];
  tableColumns?: string[];
  // snake_case fallbacks
  n_anomalias?: number;
  pct_anomalias?: number;
  anomalias_detalle?: string[];
  anomaly_records?: Record<string, any>[];
  sample_records?: Record<string, any>[];
  table_columns?: string[];
  error?: string;
}

export interface AnomaliesSchema {
  chartData?: ChartSchema;
  metrics: AnomalyMetricsSchema;
}

export interface FeatureImportanceMetricsSchema {
  topFeatures?: Record<string, any>[];
  shapSummary?: Record<string, number>;
  nFeatures?: number;
  shapDisponible?: boolean;
  error?: string;
}

export interface FeatureImportanceSchema {
  chartImportance?: ChartSchema;
  chartShap?: ChartSchema;
  metrics: FeatureImportanceMetricsSchema;
}

export interface NarrativeSchema {
  text?: string;
  source?: string;
}

export interface JoinStepSchema {
  left: string;
  right: string;
  key: string;
  type: string;
  rows_before: number;
  rows_after: number;
}

export interface JoinSummarySchema {
  tables_detected: string[];
  join_keys: string[];
  total_rows: number;
  total_columns?: number;
  message?: string;
  join_log: JoinStepSchema[];
}

export interface ColumnDetailSchema {
  name: string;
  inferred_type: string;
  n_unique: number;
  null_pct: number;
  sample_values: string[];
  suggested_role: string;
}

export interface ProfileDataSchema {
  filename: string;
  n_rows_estimated: number;
  n_cols: number;
  quality_score: number;
  quality_label: string;
  suggested_targets: string[];
  columns: ColumnDetailSchema[];
  preview_rows: Record<string, any>[];
  upload_id: string;
}

export interface AnalysisResponseSchema {
  filename: string;
  uploadId?: string;
  targetCol?: string;
  profile: ProfileSchema;
  cleaningReport: CleaningReportSchema;
  kpis: Record<string, any>;
  charts: ChartSchema[];
  forecast: ForecastSchema;
  segmentation: SegmentationSchema;
  anomalies: AnomaliesSchema;
  featureImportance: FeatureImportanceSchema;
  narrative: NarrativeSchema;
  joinSummary?: JoinSummarySchema;
}
