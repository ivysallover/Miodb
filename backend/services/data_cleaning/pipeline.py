"""
services/data_cleaning/pipeline.py
Orquestador maestro DataCleaningPipeline: ejecuta los 14 pasos determinísticos en el orden estricto corregido.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Optional, Dict, Any, Tuple
import pandas as pd

from services.data_cleaning.schemas import CleaningConfig, CleaningReport
from services.data_cleaning.step01_null_normalizer import normalize_headers_and_nulls
from services.data_cleaning.step02_empty_filter import filter_empty_rows_and_cols
from services.data_cleaning.step03_locale_detector import detect_dataset_locale
from services.data_cleaning.step04_string_normalizer import normalize_text_strings
from services.data_cleaning.step05_deduplicator import deduplicate_dataframe
from services.data_cleaning.step06_currency_sanitizer import sanitize_currencies
from services.data_cleaning.step07_numeric_coercion import coerce_numeric_columns
from services.data_cleaning.step08_temporal_parser import parse_temporal_columns
from services.data_cleaning.step09_semantic_profiler import profile_semantic_types
from services.data_cleaning.step10_outlier_engine import process_outliers
from services.data_cleaning.step11_contextual_imputer import impute_contextual_nulls
from services.data_cleaning.step12_memory_downcaster import downcast_memory_selective
from services.data_cleaning.step13_report_builder import build_cleaning_report


@dataclass
class DataCleaningResult:
    df: pd.DataFrame
    report: CleaningReport
    type_map: Dict[str, str]

    def __iter__(self):
        # Permite desempaquetar directamente: df, report = result
        yield self.df
        yield self.report


class DataCleaningPipeline:
    """
    Pipeline de limpieza industrial modular para MIO.
    Garantiza:
    - Neutralización de strings antes de inferir.
    - Detección de locale para números y fechas.
    - Deduplicación post-normalización.
    - Seguridad por default ("Do No Harm").
    - Protección absoluta de precisión monetaria.
    """

    def __init__(self, config: Optional[CleaningConfig] = None):
        self.config = config or CleaningConfig()

    def run(self, df_raw: pd.DataFrame) -> DataCleaningResult:
        if df_raw is None or df_raw.empty:
            empty_report = CleaningReport(original_rows=0, final_rows=0, actions=["Dataset vacío."])
            return DataCleaningResult(df=pd.DataFrame(), report=empty_report, type_map={})

        df_orig = df_raw.copy()
        all_actions = []

        # Paso 1: Normalización de encabezados y mapeo de nulos disfrazados
        df, nulls_detected, a1 = normalize_headers_and_nulls(df_orig, self.config)
        all_actions.extend(a1)

        # Paso 2 y 3: Filtrado de filas y columnas 100% vacías
        df, rows_dropped, empty_cols, a2 = filter_empty_rows_and_cols(df)
        all_actions.extend(a2)

        if df.empty:
            empty_report = CleaningReport(original_rows=len(df_orig), final_rows=0, actions=all_actions)
            return DataCleaningResult(df=df, report=empty_report, type_map={})

        # Paso 4: Detección de Locale
        detected_locale, dec_sep, tho_sep, dayfirst = detect_dataset_locale(df, self.config)
        all_actions.append(f"Locale detectado: {detected_locale} (decimal: '{dec_sep}', miles: '{tho_sep}', dayfirst: {dayfirst}).")

        # Paso 5: Normalización de texto (NFC, espacios internos)
        df, a4 = normalize_text_strings(df)
        all_actions.extend(a4)

        # Paso 6: Deduplicación exacta post-normalización
        df, duplicates_removed, a5 = deduplicate_dataframe(df, self.config)
        all_actions.extend(a5)

        # Paso 7: Sanitización monetaria y porcentajes con locale
        df, monetary_cols, a6 = sanitize_currencies(df, self.config, dec_sep, tho_sep)
        all_actions.extend(a6)

        # Paso 8: Coerción de numéricos residuales en columnas object
        df, coerced_numeric_cols, a7 = coerce_numeric_columns(df, dec_sep)
        all_actions.extend(a7)

        # Paso 9: Parseo temporal con dayfirst y conteo de ambigüedades
        df, dates_parsed, ambiguous_date_counts, a8 = parse_temporal_columns(df, dayfirst)
        all_actions.extend(a8)

        # Paso 10: Inferencia semántica de tipos sobre data limpia
        type_map = profile_semantic_types(df, monetary_cols)

        # Paso 11: Detección y tratamiento de outliers (con política explícita)
        df, outliers_detected, a10 = process_outliers(df, type_map, self.config, monetary_cols)
        all_actions.extend(a10)

        # Paso 12: Imputación contextual de nulos
        df, nulls_imputed, a11 = impute_contextual_nulls(df, type_map, self.config, monetary_cols)
        all_actions.extend(a11)

        # Paso 13: Downcasting selectivo (monetarias e IDs blindadas)
        df, a12 = downcast_memory_selective(df, type_map, monetary_cols, self.config)
        all_actions.extend(a12)

        # Paso 14: Construcción de reporte final auditable
        report = build_cleaning_report(
            df_original=df_orig,
            df_clean=df,
            detected_locale=detected_locale,
            duplicates_removed=duplicates_removed,
            nulls_detected=nulls_detected,
            nulls_imputed=nulls_imputed,
            outliers_detected=outliers_detected,
            dates_parsed=dates_parsed,
            monetary_cols=monetary_cols,
            coerced_numeric_cols=coerced_numeric_cols,
            ambiguous_date_counts=ambiguous_date_counts,
            type_map=type_map,
            all_actions=all_actions,
            config=self.config,
        )

        return DataCleaningResult(df=df, report=report, type_map=type_map)
