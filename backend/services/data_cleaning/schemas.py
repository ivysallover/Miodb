"""
services/data_cleaning/schemas.py
Contratos estrictos y esquemas Pydantic para el pipeline de limpieza y perfilado de datos.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class LocaleEnum(str, Enum):
    AUTO = "auto"
    ES_AR = "es-AR"  # 1.200,50 (coma decimal, punto miles, dayfirst=True)
    ES_ES = "es-ES"  # 1.200,50 (coma decimal, punto miles, dayfirst=True)
    EN_US = "en-US"  # 1,200.50 (punto decimal, coma miles, dayfirst=False)


class PrecisionMode(str, Enum):
    FLOAT64 = "float64"  # Default (15-17 dígitos significativos, compatible con ML y vectorización rápida)
    DECIMAL = "decimal"  # Conciliación contable estricta centavo a centavo (con proyección sombra en ML)


class OutlierAction(str, Enum):
    FLAG = "flag"  # Añade columna booleana _is_outlier sin alterar los datos (Default Do No Harm)
    CAP = "cap"    # Winsorization (acota al límite inferior/superior de Tukey)
    DROP = "drop"  # Elimina filas con outliers (solo bajo opt-in explícito)


class OutlierMethod(str, Enum):
    TUKEY_IQR = "tukey_iqr"  # No paramétrico por default (Q1 - k*IQR, Q3 + k*IQR)
    ZSCORE = "zscore"        # Paramétrico (solo si test Shapiro-Wilk avala normalidad)
    AUTO = "auto"


class OutlierPolicy(BaseModel):
    method: OutlierMethod = OutlierMethod.TUKEY_IQR
    action: OutlierAction = OutlierAction.FLAG
    iqr_multiplier: float = 1.5  # 1.5 para outliers moderados, 3.0 para extremos


class ColumnTransformationLog(BaseModel):
    column: str
    original_type: str
    final_type: str
    inferred_role: str
    nulls_detected: int = 0
    nulls_imputed: int = 0
    imputation_strategy: Optional[str] = None
    outliers_detected: int = 0
    outlier_action_applied: Optional[str] = None
    currency_cleaned: bool = False
    dates_parsed: bool = False
    ambiguous_dates_detected: int = 0


class CleaningConfig(BaseModel):
    locale: LocaleEnum = LocaleEnum.AUTO
    precision_mode: PrecisionMode = PrecisionMode.FLOAT64
    outlier_policy: OutlierPolicy = Field(default_factory=OutlierPolicy)
    extra_null_tokens: List[str] = Field(default_factory=list)
    enable_deduplication: bool = True
    enable_imputation: bool = True
    enable_downcast: bool = True


class CleaningReport(BaseModel):
    original_rows: int
    final_rows: int
    duplicates_removed: int = 0
    detected_locale: str = "es-AR"
    columns_fixed: List[str] = Field(default_factory=list)
    nulls_imputed: Dict[str, int] = Field(default_factory=dict)
    dates_parsed: List[str] = Field(default_factory=list)
    currency_cleaned: List[str] = Field(default_factory=list)
    outliers_flagged: Dict[str, int] = Field(default_factory=dict)
    actions: List[str] = Field(default_factory=list)
    column_logs: List[ColumnTransformationLog] = Field(default_factory=list)
