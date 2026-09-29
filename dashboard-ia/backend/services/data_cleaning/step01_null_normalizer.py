"""
services/data_cleaning/step01_null_normalizer.py
Paso 1: Normalización de encabezados y celdas con mapeo estricto de nulos disfrazados a np.nan.
"""

from __future__ import annotations
import re
from typing import List, Tuple, Dict
import pandas as pd
import numpy as np
from services.data_cleaning.schemas import CleaningConfig

DEFAULT_NULL_TOKENS = {
    "n/a", "na", "n.a.", "n/d", "s/d", "s.d.", "sin dato", "sin datos",
    "null", "none", "nan", "-", "--", "---", "?", "#n/a", "#na",
    "undefined", "desconocido", "vacio", "vacío", ""
}

def normalize_headers_and_nulls(
    df: pd.DataFrame, config: CleaningConfig
) -> Tuple[pd.DataFrame, Dict[str, int], List[str]]:
    """
    1. Normaliza nombres de columnas (strip de espacios invisibles y caracteres de control).
    2. Identifica celdas de texto con strings de nulos disfrazados y las convierte en NaN real.
    """
    df = df.copy()
    actions: List[str] = []
    nulls_detected: Dict[str, int] = {}

    # 1. Normalización de encabezados
    original_cols = list(df.columns)
    cleaned_cols = [re.sub(r"[\r\n\t]+", " ", str(c)).strip() for c in original_cols]
    df.columns = cleaned_cols
    
    renamed_cols = [f"'{o}' -> '{c}'" for o, c in zip(original_cols, cleaned_cols) if o != c]
    if renamed_cols:
        actions.append(f"Se normalizaron encabezados con espacios o saltos: {', '.join(renamed_cols[:5])}")

    # 2. Armar conjunto total de tokens de nulos (lowercase para comparación uniforme)
    all_null_tokens = set(DEFAULT_NULL_TOKENS)
    if config.extra_null_tokens:
        for t in config.extra_null_tokens:
            all_null_tokens.add(str(t).strip().lower())

    # 3. Limpieza en columnas de tipo object/string
    for col in df.columns:
        if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
            s = df[col]
            # Strip en strings
            s_str = s.astype(str).str.strip()
            
            # Máscara de nulos originales vs nulos por tokens
            mask_token = s_str.str.lower().isin(all_null_tokens) | (s_str == "")
            mask_already_null = s.isna()
            
            # Celdas que eran strings no-nulos pero representaban un nulo disfrazado
            new_nulls = int((mask_token & ~mask_already_null).sum())
            if new_nulls > 0:
                nulls_detected[col] = new_nulls
                s = s.mask(mask_token, np.nan)
                df[col] = s
            else:
                # Al menos dejar los strings sin espacios en los extremos
                df[col] = s.where(s.isna(), s_str)

    total_disguised = sum(nulls_detected.values())
    if total_disguised > 0:
        actions.append(f"Se convirtieron {total_disguised} celdas con valores 'N/A', '-', 's/d' o vacíos a NaN real.")

    return df, nulls_detected, actions
