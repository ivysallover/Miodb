"""
core/data_cleaner.py
Wrapper retrocompatible que delega al nuevo DataCleaningPipeline modular en services/data_cleaning/.
Mantiene 100% la firma y atributos del CleaningReport para no romper ningún caller legado.
"""

from __future__ import annotations
from typing import Tuple
import pandas as pd

from services.data_cleaning import DataCleaningPipeline, CleaningConfig, CleaningReport

def clean_dataframe(df: pd.DataFrame, config: CleaningConfig | None = None) -> Tuple[pd.DataFrame, CleaningReport]:
    """
    Ejecuta el pipeline de limpieza industrial sobre un DataFrame.
    Garantiza paridad de contrato con versiones anteriores.
    """
    pipeline = DataCleaningPipeline(config=config)
    result = pipeline.run(df)
    return result.df, result.report
