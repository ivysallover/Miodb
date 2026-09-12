"""
services/data_cleaning/step04_string_normalizer.py
Paso 5: Normalización de strings (Unicode NFC, trim de espacios internos redundantes).
"""

from __future__ import annotations
import unicodedata
import re
from typing import List, Tuple
import pandas as pd

def normalize_text_strings(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    Limpia cadenas de texto:
    1. Normalización Unicode NFC (resuelve caracteres compuestos como acentos separados).
    2. Colapso de múltiples espacios internos consecutivos a uno solo.
    3. Preserva mayúsculas y minúsculas de negocio.
    """
    df = df.copy()
    actions: List[str] = []
    modified_cols = 0

    for col in df.columns:
        if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
            s = df[col]
            mask_not_na = s.notna()
            if mask_not_na.any():
                def _clean_str(val):
                    if not isinstance(val, str):
                        return val
                    # 1. NFC unicode
                    val_norm = unicodedata.normalize("NFC", val)
                    # 2. Espacios redundantes
                    val_norm = re.sub(r"[ \t]+", " ", val_norm).strip()
                    return val_norm

                df[col] = s.map(lambda x: _clean_str(x) if pd.notna(x) else x)
                modified_cols += 1

    return df, actions
