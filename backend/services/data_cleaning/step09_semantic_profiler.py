"""
services/data_cleaning/step09_semantic_profiler.py
Paso 10: Inferencia semántica de tipos sobre datos limpios, normalizados y sanitizados.
"""

from __future__ import annotations
import re
from typing import Dict, List, Tuple, Set
import pandas as pd
import numpy as np

COLUMN_TYPE_NUMERIC     = "numérica"
COLUMN_TYPE_DATE        = "fecha"
COLUMN_TYPE_CATEGORICAL = "categórica"
COLUMN_TYPE_TEXT        = "texto"
COLUMN_TYPE_ID          = "identificador"


def infer_clean_semantic_type(series: pd.Series, name: str, is_monetary: bool = False) -> str:
    """Infiere el tipo semántico de una columna que ya fue normalizada."""
    if is_monetary:
        return COLUMN_TYPE_NUMERIC

    name_lower = str(name).lower()
    tokens = set(re.split(r"[\s_]+", name_lower))

    # 1. Teléfonos, códigos postales, documentos
    postal_geo_keywords = {
        "postal", "zip", "zipcode", "postcode", "cp", "cod_postal", "codigo_postal",
        "phone", "telefono", "teléfono", "celular", "fax", "dni", "ssn", "cuit", "cuil"
    }
    if any(k in name_lower for k in postal_geo_keywords) or bool(tokens & postal_geo_keywords):
        return COLUMN_TYPE_CATEGORICAL

    # 2. Identificadores
    id_keywords = {"id", "cod", "codigo", "código", "code", "key", "uuid", "hash"}
    has_id_keyword = bool(tokens & id_keywords)
    
    n_rows = len(series)
    n_unique = int(series.nunique(dropna=True))
    is_high_cardinality = (n_unique / max(n_rows, 1)) > 0.90

    if has_id_keyword and is_high_cardinality:
        return COLUMN_TYPE_ID

    # 3. Fechas
    if pd.api.types.is_datetime64_any_dtype(series):
        return COLUMN_TYPE_DATE

    # 4. Numéricas (int, float o Decimal)
    if pd.api.types.is_numeric_dtype(series):
        # Si tiene poquísimos valores únicos enteros (ej. status 0, 1, 2)
        if n_unique <= 5 and n_rows > 30:
            return COLUMN_TYPE_CATEGORICAL
        return COLUMN_TYPE_NUMERIC

    # 5. Categóricas vs Texto libre
    non_null_count = int(series.notna().sum())
    if non_null_count == 0:
        return COLUMN_TYPE_TEXT

    unique_ratio = n_unique / max(non_null_count, 1)
    if unique_ratio < 0.40 or n_unique <= 40:
        return COLUMN_TYPE_CATEGORICAL

    return COLUMN_TYPE_TEXT


def profile_semantic_types(
    df: pd.DataFrame, monetary_cols: Set[str]
) -> Dict[str, str]:
    """
    Genera un diccionario columna -> tipo_semantico.
    """
    type_map: Dict[str, str] = {}
    for col in df.columns:
        is_monetary = col in monetary_cols
        type_map[col] = infer_clean_semantic_type(df[col], col, is_monetary=is_monetary)
    return type_map
