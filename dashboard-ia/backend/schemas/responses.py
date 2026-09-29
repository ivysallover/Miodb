"""
schemas/responses.py
Modelos Pydantic para las respuestas de la API.
"""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Dict, Any, Optional

class BaseSchema(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        arbitrary_types_allowed=True
    )

class ProfileSchema(BaseSchema):
    n_rows: int
    n_cols: int
    quality_score: int
    quality_label: str
    numeric_columns: List[str]
    date_columns: List[str]
    categorical_columns: List[str]
    suggested_targets: List[str]

class CleaningReportSchema(BaseSchema):
    actions: List[str]
    duplicates_removed: int
    nulls_imputed: Dict[str, int]

class ChartMetadataSchema(BaseSchema):
    title: str
    insight_subtitle: str
    source_metric: str

class LayoutDirectivesSchema(BaseSchema):
    chart_type: str
    x_axis_type: str
    y_axis_type: str
    is_log_scale: bool
    has_time_gaps: bool
    high_cardinality: bool
    show_confidence_bands: bool
    trendline: Optional[Dict[str, Any]] = None

class DatasetSchema(BaseSchema):
    dimensions: List[str]
    source: List[Dict[str, Any]]

class ChartSchema(BaseSchema):
    chart_id: str
    metadata: ChartMetadataSchema
    layout_directives: LayoutDirectivesSchema
    dataset: DatasetSchema

class ForecastMetricsSchema(BaseSchema):
    ultimo_valor_real: Optional[float] = None
    valor_final_forecast: Optional[float] = None
    tendencia_pct: Optional[float] = None
    periodos: Optional[int] = None
    motor: Optional[str] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    mape: Optional[float] = None
    precision_pct: Optional[float] = None
    r2: Optional[float] = None
    confianza: Optional[str] = None
    validacion: Optional[str] = None
    frecuencia: Optional[str] = None
    error: Optional[str] = None

class ForecastSchema(BaseSchema):
    chart_data: Optional[ChartSchema] = None
    metrics: ForecastMetricsSchema

class SegmentationMetricsSchema(BaseSchema):
    k: Optional[int] = None
    varianza_explicada_pca: Optional[float] = None
    distribucion: Optional[Dict[str, int]] = None
    perfil: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

class SegmentationSchema(BaseSchema):
    scatter_data: Optional[ChartSchema] = None
    radar_data: Optional[ChartSchema] = None
    metrics: SegmentationMetricsSchema

class AnomalyMetricsSchema(BaseSchema):
    n_anomalias: Optional[int] = None
    pct_anomalias: Optional[float] = None
    anomalias_detalle: Optional[List[str]] = None
    anomaly_records: Optional[List[Dict[str, Any]]] = None
    sample_records: Optional[List[Dict[str, Any]]] = None
    table_columns: Optional[List[str]] = None
    column_roles: Optional[Dict[str, str]] = None
    error: Optional[str] = None

class AnomaliesSchema(BaseSchema):
    chart_data: Optional[ChartSchema] = None
    metrics: AnomalyMetricsSchema

class FeatureImportanceMetricsSchema(BaseSchema):
    top_features: Optional[List[Dict[str, Any]]] = None
    shap_summary: Optional[Dict[str, float]] = None
    n_features: Optional[int] = None
    shap_disponible: Optional[bool] = None
    error: Optional[str] = None

class FeatureImportanceSchema(BaseSchema):
    chart_importance: Optional[ChartSchema] = None
    chart_shap: Optional[ChartSchema] = None
    metrics: FeatureImportanceMetricsSchema

class NarrativeSchema(BaseSchema):
    text: Optional[str] = None
    source: Optional[str] = None

class JoinStepSchema(BaseSchema):
    left: str
    right: str
    key: str
    type: str
    rows_before: int
    rows_after: int

class JoinSummarySchema(BaseSchema):
    tables_detected: List[str]
    join_keys: List[str]
    total_rows: int
    total_columns: Optional[int] = None
    message: Optional[str] = None
    join_log: List[JoinStepSchema] = []

class ColumnDetailSchema(BaseSchema):
    name: str
    inferred_type: str
    n_unique: int
    null_pct: float
    sample_values: List[str]
    suggested_role: str

class ProfileResponseSchema(BaseSchema):
    filename: str
    upload_id: Optional[str] = None
    n_rows_estimated: int
    n_cols: int
    quality_score: int
    quality_label: str
    suggested_targets: List[str]
    columns: List[ColumnDetailSchema]
    preview_rows: List[Dict[str, Any]]

class ChartImageSchema(BaseSchema):
    chart_id: str
    title: str
    base64: str

class AnalysisResponseSchema(BaseSchema):
    filename: str
    upload_id: Optional[str] = None
    target_col: Optional[str] = None
    profile: ProfileSchema
    cleaning_report: CleaningReportSchema
    kpis: Dict[str, Any]
    charts: List[ChartSchema]
    forecast: ForecastSchema
    segmentation: SegmentationSchema
    anomalies: AnomaliesSchema
    feature_importance: FeatureImportanceSchema
    narrative: NarrativeSchema
    join_summary: Optional[JoinSummarySchema] = None
