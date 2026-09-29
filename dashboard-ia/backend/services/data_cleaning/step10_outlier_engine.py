"""
services/data_cleaning/step10_outlier_engine.py
Paso 11: Detección y tratamiento de outliers con política explícita (Tukey IQR / Z-Score condicional, y acción FLAG / CAP / DROP).
"""

from __future__ import annotations
from decimal import Decimal
from typing import Dict, Tuple, List, Set
import pandas as pd
import numpy as np
from scipy import stats

from services.data_cleaning.schemas import (
    CleaningConfig,
    OutlierPolicy,
    OutlierMethod,
    OutlierAction,
    PrecisionMode,
)
from services.data_cleaning.step09_semantic_profiler import COLUMN_TYPE_NUMERIC

def _compute_bounds_tukey(series: pd.Series, k: float) -> Tuple[float, float]:
    """Calcula límites de Tukey ignorando NaNs de forma estricta."""
    s_clean = pd.to_numeric(series, errors="coerce").dropna()
    if len(s_clean) < 4:
        return -np.inf, np.inf
    q1 = float(s_clean.quantile(0.25))
    q3 = float(s_clean.quantile(0.75))
    iqr = q3 - q1
    if iqr == 0:
        return -np.inf, np.inf
    return q1 - k * iqr, q3 + k * iqr


def _compute_bounds_zscore(series: pd.Series) -> Tuple[float, float, bool]:
    """Calcula límites por 3 desvíos estándar SOLO si el test Shapiro-Wilk avala normalidad."""
    s_clean = pd.to_numeric(series, errors="coerce").dropna()
    if len(s_clean) < 20:
        return -np.inf, np.inf, False
    
    # Test de normalidad sobre submuestra para no degradar rendimiento
    sample = s_clean.sample(min(500, len(s_clean)), random_state=42)
    try:
        stat, p_val = stats.shapiro(sample)
        is_normal = (p_val > 0.05)
    except Exception:
        is_normal = False

    if not is_normal:
        return -np.inf, np.inf, False

    mean = float(s_clean.mean())
    std = float(s_clean.std())
    return mean - 3 * std, mean + 3 * std, True


def process_outliers(
    df: pd.DataFrame,
    type_map: Dict[str, str],
    config: CleaningConfig,
    monetary_cols: Set[str],
) -> Tuple[pd.DataFrame, Dict[str, int], List[str]]:
    """
    Detecta y aplica la política de outliers (Flag, Cap o Drop).
    Maneja con copia sombra las columnas Decimal.
    """
    df = df.copy()
    policy = config.outlier_policy
    actions: List[str] = []
    outliers_detected: Dict[str, int] = {}
    rows_to_drop = set()
    outlier_masks_any = pd.Series(False, index=df.index)

    numeric_cols = [c for c in df.columns if type_map.get(c) == COLUMN_TYPE_NUMERIC]

    for col in numeric_cols:
        s = df[col]
        is_decimal = (col in monetary_cols and config.precision_mode == PrecisionMode.DECIMAL)

        # 1. Proyección temporal a float64 para cálculo de límites
        s_float = pd.to_numeric(s, errors="coerce")

        if policy.method == OutlierMethod.ZSCORE:
            lower, upper, was_normal = _compute_bounds_zscore(s_float)
            if not was_normal:
                # Fallback no paramétrico si no es normal
                lower, upper = _compute_bounds_tukey(s_float, policy.iqr_multiplier)
        else:
            lower, upper = _compute_bounds_tukey(s_float, policy.iqr_multiplier)

        if np.isneginf(lower) and np.isposinf(upper):
            continue

        mask = (s_float < lower) | (s_float > upper)
        n_outliers = int(mask.sum())

        if n_outliers > 0:
            outliers_detected[col] = n_outliers
            outlier_masks_any = outlier_masks_any | mask

            if policy.action == OutlierAction.FLAG:
                # Do No Harm: solo se reporta, no se modifica la data original
                pass

            elif policy.action == OutlierAction.CAP:
                # Winsorization: acotar al límite
                if is_decimal:
                    dec_lower, dec_upper = Decimal(str(round(lower, 4))), Decimal(str(round(upper, 4)))
                    df[col] = s.map(
                        lambda v: dec_lower if (pd.notna(v) and v < dec_lower)
                        else (dec_upper if (pd.notna(v) and v > dec_upper) else v)
                    )
                else:
                    df[col] = s_float.clip(lower=lower, upper=upper)
                actions.append(f"Columna '{col}': {n_outliers} outliers acotados (Winsorization entre {lower:.2f} y {upper:.2f}).")

            elif policy.action == OutlierAction.DROP:
                outlier_indices = df[mask].index
                rows_to_drop.update(outlier_indices)
                actions.append(f"Columna '{col}': {n_outliers} filas marcadas para eliminación por outlier.")

    # Si la acción fue DROP, eliminar filas
    if policy.action == OutlierAction.DROP and rows_to_drop:
        df = df.drop(index=list(rows_to_drop))
        actions.append(f"Se eliminaron {len(rows_to_drop)} filas con outliers extremos.")

    # Si la acción es FLAG (Default), generar columna _is_outlier para auditoría
    if policy.action == OutlierAction.FLAG:
        df["_is_outlier"] = outlier_masks_any

    return df, outliers_detected, actions
