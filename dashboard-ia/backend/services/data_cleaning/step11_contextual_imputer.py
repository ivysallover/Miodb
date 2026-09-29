"""
services/data_cleaning/step11_contextual_imputer.py
Paso 12: Imputación contextual de nulos (mediana/moda; forward-fill SOLO en series temporales ordenadas comprobadas).
"""

from __future__ import annotations
from decimal import Decimal
from typing import Dict, Tuple, List, Set
import pandas as pd
import numpy as np

from services.data_cleaning.schemas import CleaningConfig, PrecisionMode
from services.data_cleaning.step09_semantic_profiler import (
    COLUMN_TYPE_NUMERIC,
    COLUMN_TYPE_DATE,
    COLUMN_TYPE_CATEGORICAL,
    COLUMN_TYPE_TEXT,
    COLUMN_TYPE_ID,
)


def _is_monotonic_timeseries(df: pd.DataFrame, date_col: str) -> bool:
    """Verifica si el dataset está explícitamente ordenado de forma cronológica."""
    s = df[date_col].dropna()
    if len(s) < 5:
        return False
    return bool(s.is_monotonic_increasing)


def impute_contextual_nulls(
    df: pd.DataFrame,
    type_map: Dict[str, str],
    config: CleaningConfig,
    monetary_cols: Set[str],
) -> Tuple[pd.DataFrame, Dict[str, int], List[str]]:
    """
    Imputa nulos según la semántica de la columna y el orden real del dataset.
    """
    df = df.copy()
    actions: List[str] = []
    nulls_imputed: Dict[str, int] = {}

    if not config.enable_imputation:
        return df, nulls_imputed, actions

    # Verificar si hay serie temporal ordenada comprobada
    date_cols = [c for c in df.columns if type_map.get(c) == COLUMN_TYPE_DATE]
    has_valid_timeseries = False
    if date_cols:
        primary_date = date_cols[0]
        has_valid_timeseries = _is_monotonic_timeseries(df, primary_date)

    for col in df.columns:
        if col.startswith("_"):  # Ignorar columnas internas del sistema
            continue

        s = df[col]
        null_count = int(s.isna().sum())
        if null_count == 0:
            continue

        itype = type_map.get(col, COLUMN_TYPE_TEXT)
        is_decimal = (col in monetary_cols and config.precision_mode == PrecisionMode.DECIMAL)

        if itype == COLUMN_TYPE_NUMERIC:
            # Imputar con la mediana (más robusta que la media)
            if is_decimal:
                s_float = pd.to_numeric(s, errors="coerce")
                med_val = float(s_float.median())
                fill_val = Decimal(str(round(med_val, 4)))
            else:
                fill_val = s.median()

            df[col] = s.fillna(fill_val)
            nulls_imputed[col] = null_count
            actions.append(f"Columna '{col}': {null_count} nulos imputados con la mediana ({fill_val}).")

        elif itype == COLUMN_TYPE_CATEGORICAL:
            # Imputar con la moda (valor más frecuente)
            mode_s = s.dropna().mode()
            if len(mode_s) > 0:
                fill_val = mode_s[0]
            else:
                fill_val = "Desconocido"

            df[col] = s.fillna(fill_val)
            nulls_imputed[col] = null_count
            actions.append(f"Columna '{col}': {null_count} nulos imputados con la moda ('{fill_val}').")

        elif itype == COLUMN_TYPE_DATE:
            # Forward-fill SOLO si hay serie temporal comprobada
            if has_valid_timeseries:
                df[col] = s.ffill().bfill()
                nulls_imputed[col] = null_count
                actions.append(f"Columna '{col}': {null_count} fechas nulas imputadas mediante forward-fill (serie temporal cronológica confirmada).")
            else:
                # No hacer forward fill a ciegas
                actions.append(f"Columna '{col}': {null_count} fechas nulas preservadas (dataset no cronológico / sin orden temporal comprobado).")

        elif itype in (COLUMN_TYPE_TEXT, COLUMN_TYPE_ID):
            df[col] = s.fillna("")
            nulls_imputed[col] = null_count

    return df, nulls_imputed, actions
