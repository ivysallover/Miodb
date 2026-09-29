"""
services/data_cleaning/step02_empty_filter.py
Paso 2 y 3: Eliminación precisa de filas y columnas 100% vacías post-normalización de nulos.
"""

from __future__ import annotations
from typing import List, Tuple
import pandas as pd

def filter_empty_rows_and_cols(df: pd.DataFrame) -> Tuple[pd.DataFrame, int, List[str], List[str]]:
    """
    Elimina filas y columnas que no contienen ningún valor válido.
    Retorna (df_filtrado, filas_eliminadas, columnas_eliminadas, acciones).
    """
    df = df.copy()
    actions: List[str] = []
    
    # 1. Filas completamente vacías
    rows_before = len(df)
    df = df.dropna(how="all")
    rows_dropped = rows_before - len(df)
    if rows_dropped > 0:
        actions.append(f"Se eliminaron {rows_dropped} filas completamente vacías.")

    # 2. Columnas completamente vacías
    cols_before = len(df.columns)
    empty_cols = [c for c in df.columns if df[c].isna().all()]
    if empty_cols:
        df = df.drop(columns=empty_cols)
        actions.append(f"Se eliminaron {len(empty_cols)} columna(s) completamente vacías: {empty_cols}.")

    return df, rows_dropped, empty_cols, actions
