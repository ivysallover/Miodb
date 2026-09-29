"""
services/data_cleaning/step12_memory_downcaster.py
Paso 13: Downcasting selectivo de memoria EXCLUYENDO explícitamente columnas monetarias e identificadores.
"""

from __future__ import annotations
from typing import Set, Dict, List, Tuple
import pandas as pd
from services.data_cleaning.schemas import CleaningConfig
from services.data_cleaning.step09_semantic_profiler import COLUMN_TYPE_ID

def downcast_memory_selective(
    df: pd.DataFrame,
    type_map: Dict[str, str],
    monetary_cols: Set[str],
    config: CleaningConfig,
) -> Tuple[pd.DataFrame, List[str]]:
    """
    Optimiza el consumo de memoria en tipos numéricos continuos NO sensibles.
    Protege al 100% las columnas monetarias e identificadores en float64/Decimal.
    """
    df = df.copy()
    actions: List[str] = []

    if not config.enable_downcast:
        return df, actions

    downcasted_cols = 0
    for col in df.columns:
        # Blindaje absoluto: NO downcastear columnas monetarias ni IDs
        if col in monetary_cols or type_map.get(col) == COLUMN_TYPE_ID:
            continue

        try:
            if pd.api.types.is_float_dtype(df[col]):
                df[col] = pd.to_numeric(df[col], downcast="float")
                downcasted_cols += 1
            elif pd.api.types.is_integer_dtype(df[col]):
                df[col] = pd.to_numeric(df[col], downcast="integer")
                downcasted_cols += 1
        except Exception:
            pass

    if downcasted_cols > 0:
        actions.append(f"Se optimizó memoria mediante downcasting selectivo en {downcasted_cols} columnas continuas no-sensibles (columnas monetarias e IDs blindadas en float64).")

    return df, actions
