"""
services/data_cleaning/step05_deduplicator.py
Paso 6: Deduplicación exacta post-normalización de strings y nulos.
"""

from __future__ import annotations
from typing import Tuple, List
import pandas as pd
from services.data_cleaning.schemas import CleaningConfig

def deduplicate_dataframe(
    df: pd.DataFrame, config: CleaningConfig
) -> Tuple[pd.DataFrame, int, List[str]]:
    """
    Elimina filas duplicadas exactas luego de que espacios y strings han sido normalizados.
    """
    df = df.copy()
    actions: List[str] = []
    
    if not config.enable_deduplication:
        return df, 0, actions

    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        df = df.drop_duplicates()
        actions.append(f"Se eliminaron {dup_count} filas duplicadas exactas.")

    return df, dup_count, actions
