"""
services/data_cleaning/step08_temporal_parser.py
Paso 9: Parseo temporal con dayfirst calibrado por locale y detección explícita de fechas ambiguas.
"""

from __future__ import annotations
import re
from typing import List, Tuple, Dict
import pandas as pd

def parse_temporal_columns(
    df: pd.DataFrame, dayfirst: bool
) -> Tuple[pd.DataFrame, List[str], Dict[str, int], List[str]]:
    """
    Parsea columnas de fechas con el parámetro dayfirst según el locale.
    Cuenta fechas ambiguas (donde día y mes son <= 12).
    Retorna (df, fechas_parseadas, conteo_ambiguas_por_columna, acciones).
    """
    df = df.copy()
    dates_parsed: List[str] = []
    ambiguous_counts: Dict[str, int] = {}
    actions: List[str] = []

    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            dates_parsed.append(col)
            continue

        if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_string_dtype(df[col]):
            s = df[col]
            non_null = s.dropna()
            if len(non_null) == 0:
                continue

            sample = non_null.head(30).astype(str).str.strip()
            
            # Buscar patrones de fecha típicos: YYYY-MM-DD, DD/MM/YYYY, etc.
            date_matches = sample.str.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}").sum()
            if date_matches / len(sample) < 0.6:
                continue

            try:
                # 1. Contar fechas ambiguas en la columna
                ambiguous_mask = sample.map(
                    lambda x: bool(re.match(r"^(0?[1-9]|1[0-2])[/-](0?[1-9]|1[0-2])[/-]\d{2,4}", str(x)))
                )
                n_ambiguous = int(ambiguous_mask.sum())
                if n_ambiguous > 0:
                    ambiguous_counts[col] = n_ambiguous

                # 2. Parseo determinístico
                parsed = pd.to_datetime(s, errors="coerce", dayfirst=dayfirst)
                valid_ratio = parsed.notna().sum() / len(non_null)

                if valid_ratio >= 0.7:
                    df[col] = parsed
                    dates_parsed.append(col)
                    amb_msg = f" ({n_ambiguous} fechas potencialmente ambiguas tratadas con dayfirst={dayfirst})" if n_ambiguous > 0 else ""
                    actions.append(f"Columna '{col}': parseada como fecha con dayfirst={dayfirst}{amb_msg}.")
            except Exception:
                pass

    return df, dates_parsed, ambiguous_counts, actions
