"""
core/data_profiler.py
Análisis exploratorio automático del dataset subido.
Detecta tipos de columnas, valores nulos, estadísticas y sugiere columnas objetivo.
"""

from __future__ import annotations

import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


# ─────────────────────────────────────────────────────────────
# Tipos de columna inferidos
# ─────────────────────────────────────────────────────────────
COLUMN_TYPE_NUMERIC     = "numérica"
COLUMN_TYPE_DATE        = "fecha"
COLUMN_TYPE_CATEGORICAL = "categórica"
COLUMN_TYPE_TEXT        = "texto"
COLUMN_TYPE_ID          = "identificador"


@dataclass
class ColumnProfile:
    name: str
    dtype: str
    inferred_type: str
    n_unique: int
    null_count: int
    null_pct: float
    sample_values: List
    stats: Dict = field(default_factory=dict)   # solo para numéricas


@dataclass
class DataProfile:
    n_rows: int
    n_cols: int
    columns: List[ColumnProfile]
    quality_score: int          # 0-100
    quality_label: str          # "Alta", "Media", "Baja"
    suggested_targets: List[str]
    date_columns: List[str]
    numeric_columns: List[str]
    categorical_columns: List[str]
    duplicate_rows: int


# ─────────────────────────────────────────────────────────────
# Detección de tipo
# ─────────────────────────────────────────────────────────────

def _infer_column_type(series: pd.Series, n_unique: Optional[int] = None) -> str:
    """Infiere el tipo semántico de una columna de forma rápida y determinística."""
    name_lower = str(series.name).lower()

    # Identificadores: columnas con tokens típicos de ID (palabras separadas por _ o espacios)
    import re
    tokens = set(re.split(r"[\s_]+", name_lower))

    # Códigos geográficos, postales, teléfonos o documentos que no deben ser tratados como métricas numéricas
    postal_geo_keywords = {
        "postal", "zip", "zipcode", "postcode", "cp", "cod_postal", "codigo_postal",
        "phone", "telefono", "teléfono", "celular", "fax", "dni", "ssn", "cuit", "cuil"
    }
    if any(k in name_lower for k in postal_geo_keywords) or bool(tokens & postal_geo_keywords):
        return COLUMN_TYPE_CATEGORICAL

    id_keywords = {"id", "cod", "codigo", "código", "code", "key", "uuid", "numero", "número"}
    has_id_keyword = bool(tokens & id_keywords)

    n_rows = len(series)
    if n_unique is None:
        if n_rows > 50000:
            sample = series.dropna().head(5000)
            is_high_cardinality = sample.nunique() / max(len(sample), 1) > 0.95
        else:
            n_unique = int(series.nunique())
            is_high_cardinality = n_unique / max(n_rows, 1) > 0.95
    else:
        is_high_cardinality = n_unique / max(n_rows, 1) > 0.95

    is_integer = pd.api.types.is_integer_dtype(series)
    if not is_integer and pd.api.types.is_numeric_dtype(series):
        sample_vals = series.dropna().head(500)
        is_integer = len(sample_vals) > 0 and (sample_vals % 1 == 0).all()

    if (has_id_keyword and is_high_cardinality) or (is_high_cardinality and is_integer and has_id_keyword):
        return COLUMN_TYPE_ID

    # Fechas
    if pd.api.types.is_datetime64_any_dtype(series):
        return COLUMN_TYPE_DATE

    # Intentar parsear como fecha si es object
    if series.dtype == object:
        sample = series.dropna().head(20)
        try:
            try:
                parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
            except ValueError:
                parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().sum() / max(len(sample), 1) > 0.8:
                return COLUMN_TYPE_DATE
        except Exception:
            pass

    # Booleanos (en pandas is_numeric_dtype devuelve True para bool, por lo que debe evaluarse antes)
    if pd.api.types.is_bool_dtype(series):
        return COLUMN_TYPE_CATEGORICAL

    # Numéricas
    if pd.api.types.is_numeric_dtype(series):
        if n_unique is None:
            sample_u = series.dropna().head(1000).nunique()
            if sample_u <= 5:
                n_unique = int(series.nunique())
                if n_unique <= 10 and n_unique < n_rows * 0.05:
                    return COLUMN_TYPE_CATEGORICAL
            return COLUMN_TYPE_NUMERIC
        else:
            if n_unique <= 10 and n_unique < n_rows * 0.05:
                return COLUMN_TYPE_CATEGORICAL
            return COLUMN_TYPE_NUMERIC

    # Categóricas vs Texto libre
    if n_unique is None:
        sample_u = series.dropna().head(1000).nunique()
        ratio = sample_u / max(1, min(1000, n_rows))
        if ratio < 0.4 or sample_u <= 30:
            return COLUMN_TYPE_CATEGORICAL
        return COLUMN_TYPE_TEXT
    else:
        n_non_null = n_rows - int(series.isna().sum())
        if n_unique == 0 or n_non_null == 0:
            return COLUMN_TYPE_TEXT
        ratio = n_unique / n_non_null
        if ratio < 0.4 or n_unique <= 30:
            return COLUMN_TYPE_CATEGORICAL
        return COLUMN_TYPE_TEXT


# ─────────────────────────────────────────────────────────────
# Perfil de columna individual
# ─────────────────────────────────────────────────────────────

def _profile_column(series: pd.Series) -> ColumnProfile:
    n_unique = int(series.nunique())
    inferred = _infer_column_type(series, n_unique=n_unique)
    null_count = int(series.isna().sum())
    null_pct   = round(null_count / max(len(series), 1) * 100, 1)
    sample_vals = series.dropna().head(50).drop_duplicates().head(5).tolist()

    stats: Dict = {}
    if inferred == COLUMN_TYPE_NUMERIC:
        desc = series.describe()
        def _safe_float(v):
            import math
            import pandas as pd
            if pd.isna(v) or math.isnan(v) or math.isinf(v):
                return None
            return round(float(v), 2)
            
        stats = {
            "min":    _safe_float(desc.get("min")),
            "max":    _safe_float(desc.get("max")),
            "mean":   _safe_float(desc.get("mean")),
            "median": _safe_float(desc.get("50%")),
            "std":    _safe_float(desc.get("std")),
        }

    return ColumnProfile(
        name=series.name,
        dtype=str(series.dtype),
        inferred_type=inferred,
        n_unique=n_unique,
        null_count=null_count,
        null_pct=null_pct,
        sample_values=sample_vals,
        stats=stats,
    )


# ─────────────────────────────────────────────────────────────
# Score de calidad
# ─────────────────────────────────────────────────────────────

def _compute_quality_score(df: pd.DataFrame, cols: List[ColumnProfile]) -> Tuple[int, str]:
    """Calcula un puntaje de calidad del dataset de 0 a 100."""
    penalties = 0

    # Penalizar por nulos
    avg_null_pct = np.mean([c.null_pct for c in cols])
    penalties += min(avg_null_pct * 1.5, 30)

    # Penalizar por duplicados
    dup_pct = len(df[df.duplicated()]) / max(len(df), 1) * 100
    penalties += min(dup_pct * 2, 20)

    # Penalizar si hay pocas columnas numéricas (menos útil para ML)
    num_numerics = sum(1 for c in cols if c.inferred_type == COLUMN_TYPE_NUMERIC)
    if num_numerics == 0:
        penalties += 20
    elif num_numerics == 1:
        penalties += 10

    # Penalizar si el dataset es muy pequeño
    if len(df) < 50:
        penalties += 20
    elif len(df) < 100:
        penalties += 10

    score = max(0, min(100, round(100 - penalties)))

    if score >= 80:
        label = "Alta"
    elif score >= 55:
        label = "Media"
    else:
        label = "Baja"

    return score, label


# ─────────────────────────────────────────────────────────────
# Sugerencia de columnas objetivo
# ─────────────────────────────────────────────────────────────

def _suggest_targets(cols: List[ColumnProfile]) -> List[str]:
    """Sugiere columnas objetivo determinísticamente usando scoring (keywords + estadísticos)."""
    target_keywords = [
        "venta", "ingreso", "revenue", "monto", "total", "precio",
        "margen", "ganancia", "beneficio", "cantidad", "units",
        "churn", "baja", "cancelacion", "score", "valor",
    ]
    
    scored_cols = []
    
    for col in cols:
        if col.inferred_type != COLUMN_TYPE_NUMERIC:
            continue
            
        score = 0
        name_lower = col.name.lower()
        
        # Priority 1: Keywords (+100 points)
        if any(kw in name_lower for kw in target_keywords):
            score += 100
            
        # Priority 2: High cardinality/variance (proxy using unique values vs missing)
        # We give a slight boost based on unique values so it's deterministic and prefers continuous variables
        unique_ratio = col.n_unique / max(1, (col.n_unique + col.null_count))
        score += unique_ratio
        
        # Priority 3: Alphabetical fallback for absolute determinism if everything is equal
        # Handled by sorting tuple
        scored_cols.append((score, col.name))
        
    # Sort by score descending, then by name ascending (for ties)
    scored_cols.sort(key=lambda x: (-x[0], x[1]))

    return [c[1] for c in scored_cols][:5]


# ─────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────

def profile_dataframe(df: pd.DataFrame, duplicate_rows: Optional[int] = None) -> DataProfile:
    """
    Genera un perfil completo del DataFrame.

    Args:
        df: DataFrame a analizar.
        duplicate_rows: Cantidad de duplicados si ya fue calculada previamente.

    Returns:
        DataProfile con toda la información del dataset.
    """
    cols = [_profile_column(df[col]) for col in df.columns]

    date_cols        = [c.name for c in cols if c.inferred_type == COLUMN_TYPE_DATE and not c.name.startswith("_")]
    numeric_cols     = [c.name for c in cols if c.inferred_type == COLUMN_TYPE_NUMERIC and not c.name.startswith("_")]
    categorical_cols = [c.name for c in cols if c.inferred_type == COLUMN_TYPE_CATEGORICAL and not c.name.startswith("_")]
    
    if duplicate_rows is not None:
        dup_rows = duplicate_rows
    else:
        dup_rows = int(df.duplicated().sum())

    quality_score, quality_label = _compute_quality_score(df, cols)
    suggested_targets = _suggest_targets(cols)

    return DataProfile(
        n_rows=len(df),
        n_cols=len(df.columns),
        columns=cols,
        quality_score=quality_score,
        quality_label=quality_label,
        suggested_targets=suggested_targets,
        date_columns=date_cols,
        numeric_columns=numeric_cols,
        categorical_columns=categorical_cols,
        duplicate_rows=dup_rows,
    )
