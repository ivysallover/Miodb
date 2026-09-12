"""
services/data_cleaning/step13_report_builder.py
Paso 14: Construcción de la bitácora auditable de transformaciones por columna y reporte consolidado.
"""

from __future__ import annotations
from typing import Dict, List, Set
import pandas as pd
from services.data_cleaning.schemas import (
    CleaningReport,
    ColumnTransformationLog,
    CleaningConfig,
)

def build_cleaning_report(
    df_original: pd.DataFrame,
    df_clean: pd.DataFrame,
    detected_locale: str,
    duplicates_removed: int,
    nulls_detected: Dict[str, int],
    nulls_imputed: Dict[str, int],
    outliers_detected: Dict[str, int],
    dates_parsed: List[str],
    monetary_cols: Set[str],
    coerced_numeric_cols: List[str],
    ambiguous_date_counts: Dict[str, int],
    type_map: Dict[str, str],
    all_actions: List[str],
    config: CleaningConfig,
) -> CleaningReport:
    """
    Construye el CleaningReport auditable garantizando paridad de contrato con callers legacy.
    """
    column_logs: List[ColumnTransformationLog] = []

    for col in df_clean.columns:
        if col.startswith("_"):
            continue

        orig_type = str(df_original[col].dtype) if col in df_original.columns else "nuevo"
        final_type = str(df_clean[col].dtype)
        inferred_role = type_map.get(col, "desconocido")

        imputation_strategy = None
        if nulls_imputed.get(col, 0) > 0:
            if inferred_role == "numérica":
                imputation_strategy = "mediana"
            elif inferred_role == "categórica":
                imputation_strategy = "moda"
            elif inferred_role == "fecha":
                imputation_strategy = "forward-fill"
            else:
                imputation_strategy = "cadena vacía"

        log = ColumnTransformationLog(
            column=col,
            original_type=orig_type,
            final_type=final_type,
            inferred_role=inferred_role,
            nulls_detected=nulls_detected.get(col, 0),
            nulls_imputed=nulls_imputed.get(col, 0),
            imputation_strategy=imputation_strategy,
            outliers_detected=outliers_detected.get(col, 0),
            outlier_action_applied=config.outlier_policy.action.value if outliers_detected.get(col, 0) > 0 else None,
            currency_cleaned=(col in monetary_cols),
            dates_parsed=(col in dates_parsed),
            ambiguous_dates_detected=ambiguous_date_counts.get(col, 0),
        )
        column_logs.append(log)

    if not all_actions:
        all_actions.append("[OK] El dataset ya estaba en excelente estado. No se requirieron transformaciones invasivas.")

    return CleaningReport(
        original_rows=len(df_original),
        final_rows=len(df_clean),
        duplicates_removed=duplicates_removed,
        detected_locale=detected_locale,
        columns_fixed=coerced_numeric_cols,
        nulls_imputed=nulls_imputed,
        dates_parsed=dates_parsed,
        currency_cleaned=list(monetary_cols),
        outliers_flagged=outliers_detected,
        actions=all_actions,
        column_logs=column_logs,
    )
