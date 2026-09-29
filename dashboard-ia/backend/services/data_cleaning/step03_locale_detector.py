"""
services/data_cleaning/step03_locale_detector.py
Paso 4: Detección heurística de locale numérico y temporal por columna y a nivel dataset.
"""

from __future__ import annotations
import re
from typing import Dict, Any, Tuple, Optional
import pandas as pd
from services.data_cleaning.schemas import CleaningConfig, LocaleEnum

# Regex para detectar formato latino/europeo: 1.200,50 o 1200,50
RE_LATAM_NUM = re.compile(r"^[\$\€\£\¥]?\s*-?\d{1,3}(\.\d{3})*,\d{1,4}\s*\%?$|^[\$\€\£\¥]?\s*-?\d+,\d{1,4}\s*\%?$")

# Regex para detectar formato anglosajón/US: 1,200.50 o 1200.50
RE_US_NUM = re.compile(r"^[\$\€\£\¥]?\s*-?\d{1,3}(,\d{3})*\.\d{1,4}\s*\%?$|^[\$\€\£\¥]?\s*-?\d+\.\d{1,4}\s*\%?$")


def detect_dataset_locale(
    df: pd.DataFrame, config: CleaningConfig
) -> Tuple[str, str, str, bool]:
    """
    Determina el locale del dataset.
    Retorna: (locale_name, decimal_sep, thousands_sep, dayfirst)
    """
    if config.locale == LocaleEnum.ES_AR:
        return "es-AR", ",", ".", True
    elif config.locale == LocaleEnum.ES_ES:
        return "es-ES", ",", ".", True
    elif config.locale == LocaleEnum.EN_US:
        return "en-US", ".", ",", False

    # Heurística automática basada en conteo de patrones en columnas de tipo object
    latam_hits = 0
    us_hits = 0
    dayfirst_evidence = 0
    monthfirst_evidence = 0

    sample_size = min(len(df), 200)
    sample_df = df.head(sample_size)

    for col in sample_df.columns:
        if pd.api.types.is_object_dtype(sample_df[col]) or pd.api.types.is_string_dtype(sample_df[col]):
            s = sample_df[col].dropna().astype(str).str.strip()
            for val in s.head(30):
                if RE_LATAM_NUM.match(val):
                    latam_hits += 1
                elif RE_US_NUM.match(val):
                    us_hits += 1

                # Detección de fechas numéricas tipo DD/MM/YYYY vs MM/DD/YYYY
                date_match = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})", val)
                if date_match:
                    p1, p2 = int(date_match.group(1)), int(date_match.group(2))
                    if p1 > 12 and p2 <= 12:
                        dayfirst_evidence += 1
                    elif p2 > 12 and p1 <= 12:
                        monthfirst_evidence += 1

    # Decidir locale numérico
    if us_hits > latam_hits:
        detected_locale = "en-US"
        dec_sep = "."
        tho_sep = ","
    else:
        # Por default en la región y MIO (Latam)
        detected_locale = "es-AR"
        dec_sep = ","
        tho_sep = "."

    # Decidir dayfirst
    if monthfirst_evidence > dayfirst_evidence:
        dayfirst = False
    else:
        # Si es es-AR o hay evidencia de día primero
        dayfirst = True if detected_locale in ("es-AR", "es-ES") else False

    return detected_locale, dec_sep, tho_sep, dayfirst
