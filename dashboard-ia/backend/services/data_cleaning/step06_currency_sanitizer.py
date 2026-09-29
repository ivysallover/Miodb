"""
services/data_cleaning/step06_currency_sanitizer.py
Paso 7: Sanitización monetaria y porcentual usando el locale detectado y respetando el modo de precisión.
"""

from __future__ import annotations
import re
from decimal import Decimal
from typing import List, Tuple, Set
import pandas as pd
import numpy as np
from services.data_cleaning.schemas import CleaningConfig, PrecisionMode

RE_CURRENCY_SYMBOL = re.compile(r"[\$\€\£\¥\s]")

def _detect_currency_like(series: pd.Series, dec_sep: str, tho_sep: str) -> bool:
    """Detecta si una columna object contiene valores monetarios o porcentajes."""
    if not (pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series)):
        return False
        
    sample = series.dropna().head(40).astype(str).str.strip()
    if len(sample) == 0:
        return False

    has_symbol = sample.str.contains(r"[\$\€\£\¥]").any()
    has_pct = sample.str.contains(r"%").any()

    # Patrón con separadores de miles y decimales
    if dec_sep == ",":
        # Formato Latam/ES: 1.200,50 o 1200,50
        matches = sample.str.match(r"^[\$\€\£\¥]?\s*-?\d{1,3}(\.\d{3})*,\d{1,4}\s*\%?$|^[\$\€\£\¥]?\s*-?\d+,\d{1,4}\s*\%?$").mean()
    else:
        # Formato US: 1,200.50 o 1200.50
        matches = sample.str.match(r"^[\$\€\£\¥]?\s*-?\d{1,3}(,\d{3})*\.\d{1,4}\s*\%?$|^[\$\€\£\¥]?\s*-?\d+\.\d{1,4}\s*\%?$").mean()

    return has_symbol or has_pct or (matches > 0.6)


def _clean_currency_value(val: str, dec_sep: str, tho_sep: str, as_decimal: bool):
    if pd.isna(val) or val is None:
        return np.nan
    s = str(val).strip()
    if not s:
        return np.nan

    # Quitar símbolos monetarios y %
    s = RE_CURRENCY_SYMBOL.sub("", s)
    s = s.replace("%", "")

    if dec_sep == ",":
        # Eliminar punto de miles, cambiar coma a punto
        s = s.replace(".", "").replace(",", ".")
    else:
        # Eliminar coma de miles
        s = s.replace(",", "")

    try:
        if as_decimal:
            return Decimal(s)
        return float(s)
    except Exception:
        return np.nan


def sanitize_currencies(
    df: pd.DataFrame, config: CleaningConfig, dec_sep: str, tho_sep: str
) -> Tuple[pd.DataFrame, Set[str], List[str]]:
    """
    Convierte columnas de texto con formato monetario o porcentaje a números reales (float64 o Decimal).
    Retorna: (df, monetary_columns, actions)
    """
    df = df.copy()
    actions: List[str] = []
    monetary_cols: Set[str] = set()
    as_decimal = (config.precision_mode == PrecisionMode.DECIMAL)

    for col in df.columns:
        if _detect_currency_like(df[col], dec_sep, tho_sep):
            try:
                converted = df[col].map(
                    lambda v: _clean_currency_value(v, dec_sep, tho_sep, as_decimal) if pd.notna(v) else np.nan
                )
                valid_ratio = converted.notna().sum() / max(df[col].notna().sum(), 1)
                if valid_ratio > 0.6:
                    df[col] = converted
                    monetary_cols.add(col)
                    actions.append(
                        f"Columna '{col}': convertida de moneda/porcentaje a {'Decimal' if as_decimal else 'float64'} usando separador decimal '{dec_sep}'."
                    )
            except Exception:
                pass

    return df, monetary_cols, actions
