"""
services/data_cleaning/step07_numeric_coercion.py
Paso 8: Coerción segura de números residuales que aún persisten como tipo object.
"""

from __future__ import annotations
from typing import List, Tuple
import pandas as pd
import numpy as np

def coerce_numeric_columns(
    df: pd.DataFrame, dec_sep: str
) -> Tuple[pd.DataFrame, List[str], List[str]]:
    """
    Intenta convertir columnas object que contienen números a tipos numéricos de Pandas.
    Retorna (df, columnas_convertidas, acciones).
    """
    df = df.copy()
    converted_cols: List[str] = []
    actions: List[str] = []

    for col in df.columns:
        if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
            s = df[col]
            non_null = s.dropna()
            if len(non_null) == 0:
                continue

            # Si el separador decimal es coma, normalizar temporalmente para to_numeric
            if dec_sep == ",":
                s_test = s.astype(str).str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
            else:
                s_test = s.astype(str).str.replace(",", "", regex=False)

            converted = pd.to_numeric(s_test, errors="coerce")
            valid_ratio = converted.notna().sum() / len(non_null)

            # Umbral: si más del 75% de los valores no-nulos son números válidos
            if valid_ratio >= 0.75:
                df[col] = converted
                converted_cols.append(col)
                actions.append(f"Columna '{col}': convertida exitosamente a numérico ({valid_ratio*100:.1f}% de valores parseables).")

    return df, converted_cols, actions
