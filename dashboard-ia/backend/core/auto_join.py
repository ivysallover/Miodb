"""
core/auto_join.py
Deteccion automatica de relaciones entre multiples DataFrames y ejecucion de joins relacionales.
"""
from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Patrones de nombre que sugieren claves foraneas / primarias
_KEY_PATTERNS = re.compile(
    r"(_id|_key|_code|_cod|id_|key_|fk_|pk_|codigo|clave|numero|number|uuid|ref)$",
    re.IGNORECASE,
)

# Cardinalidad minima para considerar una columna como clave primaria (> X% unique)
_PK_UNIQUENESS_THRESHOLD = 0.85


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class JoinStep:
    left_table: str
    right_table: str
    key: str
    join_type: str  # 'left' or 'inner'
    rows_before: int
    rows_after: int


@dataclass
class JoinResult:
    merged_df: pd.DataFrame
    join_steps: List[JoinStep] = field(default_factory=list)
    schema_summary: Dict = field(default_factory=dict)
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _is_key_like(col_name: str) -> bool:
    """True if the column name matches typical key/id patterns."""
    return bool(_KEY_PATTERNS.search(col_name.lower()))


def _uniqueness_ratio(series: pd.Series) -> float:
    """Fraction of unique values over total non-null count."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return 0.0
    return non_null.nunique() / len(non_null)


def _infer_join_type(left_df: pd.DataFrame, right_df: pd.DataFrame, key: str) -> str:
    """
    Decide join type based on null counts:
    - If key has nulls in either table -> left join (safe, preserves rows)
    - Otherwise -> inner join (cleaner cross-analysis)
    """
    left_nulls = left_df[key].isna().sum() if key in left_df.columns else 0
    right_nulls = right_df[key].isna().sum() if key in right_df.columns else 0
    return "left" if (left_nulls > 0 or right_nulls > 0) else "inner"


def _find_common_keys(
    left_df: pd.DataFrame,
    right_df: pd.DataFrame,
    left_name: str,
    right_name: str,
) -> List[Tuple[str, float]]:
    """
    Find columns shared by both DataFrames that are suitable join keys.
    Returns list of (col_name, score) sorted by relevance score descending.
    """
    left_cols = set(left_df.columns)
    right_cols = set(right_df.columns)
    common = left_cols & right_cols

    candidates: List[Tuple[str, float]] = []

    for col in common:
        # Skip pure numeric continuous columns (poor join keys)
        is_left_num = pd.api.types.is_float_dtype(left_df[col])
        is_right_num = pd.api.types.is_float_dtype(right_df[col])
        if is_left_num and is_right_num:
            continue

        score = 0.0

        # Boost for key-like name pattern
        if _is_key_like(col):
            score += 3.0

        # Boost for high uniqueness in at least one table (FK/PK candidate)
        left_uniq = _uniqueness_ratio(left_df[col])
        right_uniq = _uniqueness_ratio(right_df[col])
        max_uniq = max(left_uniq, right_uniq)
        score += max_uniq * 2.0

        # Penalty if both tables have very low uniqueness (not a useful key)
        if left_uniq < 0.05 and right_uniq < 0.05:
            continue

        # Boost if dtypes match
        if left_df[col].dtype == right_df[col].dtype:
            score += 0.5

        candidates.append((col, score))

    candidates.sort(key=lambda x: x[1], reverse=True)
    return candidates


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_and_join(
    dataframes: Dict[str, pd.DataFrame],
    max_output_rows: int = 100_000,
) -> JoinResult:
    """
    Attempt to auto-detect relationships between the provided DataFrames
    and produce a consolidated merged DataFrame.

    Parameters
    ----------
    dataframes : dict mapping table_name -> DataFrame
    max_output_rows : safety cap on output size

    Returns
    -------
    JoinResult with merged_df, join_steps log, and schema_summary
    """
    if len(dataframes) < 2:
        only_name, only_df = next(iter(dataframes.items()))
        return JoinResult(
            merged_df=only_df,
            schema_summary={
                "tables_detected": [only_name],
                "join_keys": [],
                "total_rows": len(only_df),
                "message": "Un solo archivo cargado, no se requiere union.",
            },
        )

    table_names = list(dataframes.keys())
    join_steps: List[JoinStep] = []
    all_keys_used: List[str] = []

    # Start with the largest table as the base (most rows = fact table heuristic)
    table_sizes = {name: len(df) for name, df in dataframes.items()}
    base_name = max(table_sizes, key=lambda n: table_sizes[n])
    remaining = [n for n in table_names if n != base_name]

    merged = dataframes[base_name].copy()
    joined_names = [base_name]

    for right_name in remaining:
        right_df = dataframes[right_name]
        candidates = _find_common_keys(merged, right_df, "merged", right_name)

        if not candidates:
            logger.warning("No se encontraron claves comunes entre '%s' y '%s'. Tabla omitida.", "merged", right_name)
            continue

        best_key, best_score = candidates[0]
        if best_score < 0.5:
            logger.warning("La mejor clave '%s' tiene score bajo (%.2f). Union omitida.", best_key, best_score)
            continue

        join_type = _infer_join_type(merged, right_df, best_key)
        rows_before = len(merged)

        try:
            # Avoid column collisions: suffix disambiguation
            right_cols_conflict = [c for c in right_df.columns if c in merged.columns and c != best_key]
            suffix_right = f"_{right_name}"

            merged = pd.merge(
                merged,
                right_df,
                on=best_key,
                how=join_type,
                suffixes=("", suffix_right),
            )

            # Cap output size
            if len(merged) > max_output_rows:
                merged = merged.sample(max_output_rows, random_state=42)
                logger.info("Resultado de union recortado a %d filas.", max_output_rows)

            rows_after = len(merged)
            join_steps.append(JoinStep(
                left_table=" + ".join(joined_names),
                right_table=right_name,
                key=best_key,
                join_type=join_type,
                rows_before=rows_before,
                rows_after=rows_after,
            ))
            joined_names.append(right_name)
            all_keys_used.append(best_key)

        except Exception as exc:
            logger.error("Error al unir '%s': %s", right_name, exc)
            continue

    schema_summary = {
        "tables_detected": joined_names,
        "join_keys": list(dict.fromkeys(all_keys_used)),  # unique, order preserved
        "total_rows": len(merged),
        "total_columns": len(merged.columns),
        "join_log": [
            {
                "left": s.left_table,
                "right": s.right_table,
                "key": s.key,
                "type": s.join_type,
                "rows_before": s.rows_before,
                "rows_after": s.rows_after,
            }
            for s in join_steps
        ],
    }

    return JoinResult(
        merged_df=merged,
        join_steps=join_steps,
        schema_summary=schema_summary,
    )
