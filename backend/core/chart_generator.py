import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from core.data_profiler import COLUMN_TYPE_NUMERIC, COLUMN_TYPE_CATEGORICAL, COLUMN_TYPE_DATE


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _detect_skewness(series: pd.Series) -> bool:
    try:
        from scipy.stats import skew
        s = skew(series.dropna())
        return abs(s) > 1.5
    except Exception:
        return False


def _detect_time_gaps(series: pd.Series) -> bool:
    try:
        deltas = series.sort_values().diff().dropna()
        if deltas.empty:
            return False
        mode_delta = deltas.mode()[0]
        if pd.isna(mode_delta):
            return False
        return bool((deltas > mode_delta * 1.5).any())
    except Exception:
        return False


def _fmt_num_label(value: float) -> str:
    """Human-readable number label: 1.2M, 3.4K, or formatted float."""
    abs_v = abs(value)
    if abs_v >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if abs_v >= 1_000:
        return f"{value / 1_000:.1f}K"
    if abs_v >= 1:
        return f"{value:,.1f}"
    return f"{value:.3g}"


def _safe_records(source_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert DataFrame to JSON-safe list of dicts (no NaN / Timestamps)."""
    records = []
    for record in source_df.to_dict(orient="records"):
        clean: Dict[str, Any] = {}
        for k, v in record.items():
            if isinstance(v, float) and (np.isnan(v) or np.isinf(v)):
                clean[k] = None
            elif isinstance(v, (pd.Timestamp, np.datetime64)):
                clean[k] = str(pd.Timestamp(v).date())
            elif hasattr(v, "item"):  # numpy scalar
                clean[k] = v.item()
            else:
                clean[k] = v
        records.append(clean)
    return records


# ---------------------------------------------------------------------------
# build_autoviz_payload
# ---------------------------------------------------------------------------

def build_autoviz_payload(
    df: pd.DataFrame,
    chart_id: str,
    title: str,
    insight: str,
    chart_type: str,
    dimensions: List[str],
    source_df: pd.DataFrame,
    is_time: bool = False,
    trendline: Any = None,
) -> Dict[str, Any]:
    """Universal chart payload builder. Returns a normalized ChartSchema dict."""

    # 1. High cardinality: Donut -> HorizontalBar when >= 5 items
    high_cardinality = False
    if chart_type in ["Donut", "HorizontalBar"] and len(source_df) >= 5:
        high_cardinality = True
        if chart_type == "Donut":
            chart_type = "HorizontalBar"

    # 2. Log scale: only enable when skewness is detected on numeric value dimension
    #    and all values in that dimension are > 0 (log requires strictly positive values).
    is_log_scale = False
    for dim in dimensions:
        if dim in df.columns and pd.api.types.is_numeric_dtype(df[dim]):
            col_data = df[dim].dropna()
            if _detect_skewness(col_data) and col_data.min() > 0:
                is_log_scale = True
                break

    # 3. Time gaps
    has_time_gaps = False
    if is_time and dimensions and dimensions[0] in df.columns:
        has_time_gaps = _detect_time_gaps(df[dimensions[0]])

    # 4. Axis types
    x_type = "category"
    y_type = "value"
    if is_time:
        x_type = "time"
    if chart_type == "HorizontalBar":
        x_type, y_type = "value", "category"
    if chart_type == "Scatter":
        x_type, y_type = "value", "value"

    # 5. Sort HorizontalBar by value descending (guarantees readable ranking)
    if chart_type == "HorizontalBar" and len(dimensions) >= 2:
        val_dim = next((d for d in dimensions if d in source_df.columns and
                        pd.api.types.is_numeric_dtype(source_df[d])), None)
        if val_dim:
            source_df = source_df.sort_values(val_dim, ascending=False)

    source_records = _safe_records(source_df)

    layout_directives: Dict[str, Any] = {
        "chart_type": chart_type,
        "x_axis_type": x_type,
        "y_axis_type": y_type,
        "is_log_scale": is_log_scale,
        "has_time_gaps": has_time_gaps,
        "high_cardinality": high_cardinality,
        "show_confidence_bands": False,
    }

    if trendline:
        layout_directives["trendline"] = trendline

    return {
        "chart_id": chart_id,
        "metadata": {
            "title": title,
            "insight_subtitle": insight,
            "source_metric": dimensions[-1],
        },
        "layout_directives": layout_directives,
        "dataset": {
            "dimensions": dimensions,
            "source": source_records,
        },
    }


# ---------------------------------------------------------------------------
# build_boxplot_payload
# ---------------------------------------------------------------------------

def build_boxplot_payload(
    df: pd.DataFrame,
    num_col: str,
    cat_col: Optional[str] = None,
    chart_id: str = "boxplot",
) -> Optional[Dict[str, Any]]:
    """Build a BoxPlot ChartSchema payload."""
    if num_col not in df.columns:
        return None

    clean_df = df.dropna(subset=[num_col])
    if len(clean_df) < 5:
        return None

    source_records = []

    def _box_stats(series: pd.Series) -> Optional[Dict]:
        if pd.api.types.is_bool_dtype(series):
            return None
        vals = pd.to_numeric(series, errors="coerce").dropna().astype(float).values
        if len(vals) < 3:
            return None
        q1 = float(np.percentile(vals, 25))
        med = float(np.percentile(vals, 50))
        q3 = float(np.percentile(vals, 75))
        iqr = q3 - q1
        low = float(max(np.min(vals), q1 - 1.5 * iqr))
        high = float(min(np.max(vals), q3 + 1.5 * iqr))
        outliers = [round(float(v), 4) for v in vals if v < low or v > high]
        if len(outliers) > 25:
            outliers = list(np.random.choice(outliers, 25, replace=False))
        return {
            "box": [round(low, 4), round(q1, 4), round(med, 4), round(q3, 4), round(high, 4)],
            "outliers": outliers,
            "med": med,
            "q1": q1,
            "q3": q3,
        }

    if cat_col and cat_col in df.columns and clean_df[cat_col].nunique() >= 2:
        top_cats = clean_df[cat_col].value_counts().head(8).index.tolist()
        for cat in top_cats:
            stats = _box_stats(clean_df[clean_df[cat_col] == cat][num_col])
            if stats:
                source_records.append({
                    "categoria": str(cat),
                    "box": stats["box"],
                    "outliers": stats["outliers"],
                })
        title = f"Dispersion y Cuartiles: {num_col} por {cat_col}"
        if source_records:
            meds = [r["box"][2] for r in source_records]
            max_med = max(meds)
            max_cat = source_records[meds.index(max_med)]["categoria"]
            insight = (
                f"'{max_cat}' presenta la mediana mas alta ({_fmt_num_label(max_med)}). "
                f"Las cajas muestran el rango intercuartil (IQR) y los puntos rojos son valores atipicos."
            )
        else:
            insight = f"Distribucion de {num_col} por {cat_col}."
    else:
        stats = _box_stats(clean_df[num_col])
        if not stats:
            return None
        source_records.append({
            "categoria": str(num_col),
            "box": stats["box"],
            "outliers": stats["outliers"],
        })
        title = f"Dispersion y Cuartiles: {num_col}"
        insight = (
            f"Mediana en {_fmt_num_label(stats['med'])} "
            f"con rango central (IQR) de {_fmt_num_label(stats['q1'])} a {_fmt_num_label(stats['q3'])}."
        )

    if not source_records:
        return None

    return {
        "chart_id": chart_id,
        "metadata": {
            "title": title,
            "insight_subtitle": insight,
            "source_metric": num_col,
        },
        "layout_directives": {
            "chart_type": "BoxPlot",
            "x_axis_type": "category",
            "y_axis_type": "value",
            "is_log_scale": False,
            "has_time_gaps": False,
            "high_cardinality": len(source_records) > 5,
            "show_confidence_bands": False,
        },
        "dataset": {
            "dimensions": ["categoria", "box", "outliers"],
            "source": source_records,
        },
    }


# ---------------------------------------------------------------------------
# build_correlation_heatmap
# ---------------------------------------------------------------------------

def build_correlation_heatmap(
    df: pd.DataFrame,
    numeric_cols: List[str],
) -> Optional[Dict[str, Any]]:
    """
    Compute a Pearson correlation matrix and return a CorrelationHeatmap ChartSchema.
    Filters columns to those with at least one significant correlation (|r| > 0.3).
    """
    if len(numeric_cols) < 2:
        return None

    # Use at most 20 numeric columns (keep those with highest variance)
    candidates = [c for c in numeric_cols if c in df.columns and df[c].std() > 1e-6]
    if len(candidates) < 2:
        return None

    if len(candidates) > 20:
        variances = df[candidates].var().sort_values(ascending=False)
        candidates = variances.head(20).index.tolist()

    try:
        corr_matrix = df[candidates].corr(method="pearson")
    except Exception:
        return None

    # Filter: keep only columns that have at least one pair |r| > 0.3 (excluding diagonal)
    mask = (corr_matrix.abs() > 0.3)
    np.fill_diagonal(mask.values, False)
    significant_cols = [c for c in candidates if mask[c].any()]

    if len(significant_cols) < 2:
        # Fall back: keep all candidates (at most 10)
        significant_cols = candidates[:10]

    corr_matrix = corr_matrix.loc[significant_cols, significant_cols]

    # Build source: list of {x, y, value} cells
    source_records = []
    for col_x in significant_cols:
        for col_y in significant_cols:
            val = corr_matrix.loc[col_x, col_y]
            if not np.isnan(val):
                source_records.append({
                    "x": col_x,
                    "y": col_y,
                    "value": round(float(val), 3),
                })

    if not source_records:
        return None

    # Find strongest off-diagonal pair for the insight subtitle
    best_pair = ("", "", 0.0)
    for col_x in significant_cols:
        for col_y in significant_cols:
            if col_x >= col_y:
                continue
            val = corr_matrix.loc[col_x, col_y]
            if not np.isnan(val) and abs(val) > abs(best_pair[2]):
                best_pair = (col_x, col_y, float(val))

    direction = "positiva" if best_pair[2] >= 0 else "negativa"
    strength_label = "muy fuerte" if abs(best_pair[2]) >= 0.7 else "fuerte" if abs(best_pair[2]) >= 0.5 else "moderada"
    insight = (
        f"Relacion {strength_label} {direction} de {best_pair[2]:+.2f} "
        f"entre {best_pair[0]} y {best_pair[1]}."
    ) if best_pair[0] else "Matriz de correlaciones entre variables numericas."

    return {
        "chart_id": "correlation_heatmap",
        "metadata": {
            "title": "Mapa de Correlaciones",
            "insight_subtitle": insight,
            "source_metric": "correlacion",
        },
        "layout_directives": {
            "chart_type": "CorrelationHeatmap",
            "x_axis_type": "category",
            "y_axis_type": "category",
            "is_log_scale": False,
            "has_time_gaps": False,
            "high_cardinality": len(significant_cols) > 8,
            "show_confidence_bands": False,
        },
        "dataset": {
            "dimensions": ["x", "y", "value"],
            "source": source_records,
        },
    }


# ---------------------------------------------------------------------------
# _build_histogram — shared helper for readable histograms
# ---------------------------------------------------------------------------

def _build_histogram(
    series: pd.Series,
    col_name: str,
    chart_id: str,
    bins: int = 8,
) -> Optional[Dict[str, Any]]:
    """Build a HorizontalBar histogram with readable bin labels."""
    s = pd.to_numeric(series, errors="coerce").dropna()
    if len(s) < 10:
        return None
    try:
        counts, bin_edges = np.histogram(s, bins=bins)
        bin_labels = [
            f"{_fmt_num_label(float(bin_edges[i]))} - {_fmt_num_label(float(bin_edges[i + 1]))}"
            for i in range(len(counts))
        ]
        hist_df = pd.DataFrame({"Rango": bin_labels, "Frecuencia": [int(c) for c in counts]})
        max_idx = int(counts.argmax())
        top_range = hist_df.iloc[max_idx]["Rango"]
        return build_autoviz_payload(
            df=hist_df,
            chart_id=chart_id,
            title=f"Distribucion de {col_name}",
            insight=f"La mayoria de registros se concentra en el rango {top_range}.",
            chart_type="HorizontalBar",
            dimensions=["Rango", "Frecuencia"],
            source_df=hist_df,
        )
    except Exception:
        return None


# ---------------------------------------------------------------------------
# auto_charts — main chart factory
# ---------------------------------------------------------------------------

def auto_charts(df: pd.DataFrame, profile, target_col: str) -> List[Dict[str, Any]]:
    charts: List[Dict[str, Any]] = []
    seen_ids: set = set()

    def add_chart(c: Any) -> None:
        if c and c.get("chart_id") not in seen_ids:
            seen_ids.add(c["chart_id"])
            charts.append(c)

    date_cols: List[str] = profile.date_columns
    cat_cols: List[str] = profile.categorical_columns
    num_cols: List[str] = profile.numeric_columns

    # ------------------------------------------------------------------
    # 0. Correlation Heatmap (always generated when >= 3 numeric columns)
    # ------------------------------------------------------------------
    if len(num_cols) >= 3:
        add_chart(build_correlation_heatmap(df, num_cols))

    # ------------------------------------------------------------------
    # 1. Time series
    # ------------------------------------------------------------------
    if date_cols and target_col in num_cols:
        dc = date_cols[0]
        df_temp = df.copy()
        df_temp[dc] = pd.to_datetime(df_temp[dc], errors="coerce").dt.normalize()
        df_temp = df_temp.dropna(subset=[dc, target_col])
        if len(df_temp) >= 5:
            min_date = df_temp[dc].min()
            max_date = df_temp[dc].max()
            span_days = int((max_date - min_date).days) if pd.notna(min_date) and pd.notna(max_date) else 0
            n_dates = df_temp[dc].nunique()

            if span_days > 1095:
                freq, insight_desc = "MS", f"Promedio mensual de {target_col} en el tiempo."
            elif span_days > 90 or n_dates > 90:
                freq, insight_desc = "W", f"Promedio semanal de {target_col} para ver la tendencia."
            else:
                freq, insight_desc = "D", f"Valores diarios de {target_col} registrados."

            agg = df_temp.groupby(pd.Grouper(key=dc, freq=freq))[target_col].mean().reset_index().dropna()
            if len(agg) >= 3:
                agg[dc] = agg[dc].dt.strftime("%Y-%m-%d")
                agg[target_col] = agg[target_col].round(2)
                add_chart(build_autoviz_payload(
                    df=df_temp, chart_id="time_evo",
                    title=f"Evolucion Temporal de {target_col}",
                    insight=insight_desc,
                    chart_type="LineChart",
                    dimensions=[dc, target_col],
                    source_df=agg,
                    is_time=True,
                ))

    # Categorias principales
    valid_cats = [c for c in cat_cols if 2 <= df[c].nunique() <= 30]
    chosen_cat = valid_cats[0] if valid_cats else (cat_cols[0] if cat_cols else None)
    second_cat = valid_cats[1] if len(valid_cats) > 1 else (cat_cols[1] if len(cat_cols) > 1 else None)

    if target_col not in num_cols:
        # ------------------------------------------------------------------
        # CASO A — Target Categorico
        # ------------------------------------------------------------------

        # A1. Distribucion de Target (ordenado descendente)
        vc = df[target_col].value_counts().reset_index()
        vc.columns = [target_col, "Cantidad"]
        vc = vc.sort_values("Cantidad", ascending=False)
        ctype = "Donut" if len(vc) < 6 else "HorizontalBar"
        top_name = str(vc.iloc[0][target_col])
        top_count = int(vc.iloc[0]["Cantidad"])
        add_chart(build_autoviz_payload(
            df=vc, chart_id="cat_dist",
            title=f"Distribucion de {target_col}",
            insight=f"'{top_name}' es la opcion mas comun con {top_count:,} registros.",
            chart_type=ctype,
            dimensions=[target_col, "Cantidad"],
            source_df=vc.head(15),
        ))

        # A2. Promedios numericos y BoxPlots por Target
        for idx, nc in enumerate(num_cols):
            agg = df.groupby(target_col)[nc].mean().reset_index().sort_values(nc, ascending=False)
            agg[nc] = agg[nc].round(4)
            if len(agg) == 0:
                continue
            top_cat_mean = str(agg.iloc[0][target_col])
            top_val_mean = float(agg.iloc[0][nc])
            add_chart(build_autoviz_payload(
                df=df, chart_id=f"cat_num_{nc}",
                title=f"Promedio de {nc} por {target_col}",
                insight=f"'{top_cat_mean}' tiene el promedio mas alto con {_fmt_num_label(top_val_mean)}.",
                chart_type="HorizontalBar",
                dimensions=[target_col, nc],
                source_df=agg.head(15),
            ))
            if idx < 2:
                add_chart(build_boxplot_payload(df, num_col=nc, cat_col=target_col, chart_id=f"boxplot_{nc}_{target_col}"))

        # A3. Segunda categoria
        if second_cat and second_cat != target_col:
            vc2 = df[second_cat].value_counts().reset_index()
            vc2.columns = [second_cat, "Cantidad"]
            vc2 = vc2.sort_values("Cantidad", ascending=False)
            ctype2 = "Donut" if len(vc2) < 6 else "HorizontalBar"
            add_chart(build_autoviz_payload(
                df=vc2, chart_id="cat2_dist",
                title=f"Distribucion de {second_cat}",
                insight=f"Concentracion de registros por {second_cat}.",
                chart_type=ctype2,
                dimensions=[second_cat, "Cantidad"],
                source_df=vc2.head(15),
            ))

        # A4. Histograma de primera numerica (readable labels)
        if num_cols:
            add_chart(_build_histogram(df[num_cols[0]], num_cols[0], f"hist_{num_cols[0]}"))

    else:
        # ------------------------------------------------------------------
        # CASO B — Target Numerico
        # ------------------------------------------------------------------

        # B1. Target por Categoria Principal
        if chosen_cat and df[chosen_cat].nunique() >= 2:
            agg = df.groupby(chosen_cat)[target_col].mean().reset_index().sort_values(target_col, ascending=False)
            agg[target_col] = agg[target_col].round(4)
            top_group = str(agg.iloc[0][chosen_cat])
            top_val = float(agg.iloc[0][target_col])
            add_chart(build_autoviz_payload(
                df=df, chart_id="num_cat",
                title=f"Promedio de {target_col} por {chosen_cat}",
                insight=f"'{top_group}' lidera con un promedio de {_fmt_num_label(top_val)}.",
                chart_type="HorizontalBar",
                dimensions=[chosen_cat, target_col],
                source_df=agg.head(15),
            ))
            add_chart(build_boxplot_payload(df, num_col=target_col, cat_col=chosen_cat, chart_id=f"boxplot_{target_col}"))
        else:
            add_chart(build_boxplot_payload(df, num_col=target_col, cat_col=None, chart_id=f"boxplot_{target_col}"))

        # B3. Histograma del Target (readable labels)
        add_chart(_build_histogram(df[target_col], target_col, "dist_hist"))

        # B4. Scatter con trendline (mejor correlacion)
        other_nums = [c for c in num_cols if c != target_col]
        best_corr_col = None
        best_r = 0.0

        if other_nums and len(df) >= 15:
            try:
                candidate_nums = [c for c in other_nums if df[c].std() > 1e-6]
                if candidate_nums:
                    sub_corr = df[[target_col] + candidate_nums].dropna()
                    if len(sub_corr) >= 15:
                        corr_series = sub_corr.corr()[target_col].drop(target_col).dropna()
                        if not corr_series.empty:
                            best_corr_col = corr_series.abs().idxmax()
                            best_r = float(corr_series[best_corr_col])
            except Exception:
                pass

        if best_corr_col and abs(best_r) >= 0.18:
            scatter_df = df[[best_corr_col, target_col]].dropna()
            if len(scatter_df) > 300:
                scatter_df = scatter_df.sample(300, random_state=42)
            trendline_data = None
            try:
                m, b = np.polyfit(scatter_df[best_corr_col], scatter_df[target_col], 1)
                trendline_data = {
                    "slope": round(float(m), 4),
                    "intercept": round(float(b), 4),
                    "r": round(best_r, 2),
                    "min_x": round(float(scatter_df[best_corr_col].min()), 4),
                    "max_x": round(float(scatter_df[best_corr_col].max()), 4),
                }
            except Exception:
                pass
            rel_dir = "aumentar" if best_r > 0 else "disminuir"
            rel_tipo = "directa" if best_r > 0 else "inversa"
            add_chart(build_autoviz_payload(
                df=df, chart_id="scatter_corr",
                title=f"Relacion: {target_col} vs {best_corr_col}",
                insight=f"A mayor {best_corr_col}, tiende a {rel_dir} {target_col} (relacion {rel_tipo} r={best_r:+.2f}).",
                chart_type="Scatter",
                dimensions=[best_corr_col, target_col],
                source_df=scatter_df,
                trendline=trendline_data,
            ))

        # B5. Volumen de la Categoria Principal
        if chosen_cat:
            vc = df[chosen_cat].value_counts().reset_index()
            vc.columns = [chosen_cat, "Cantidad"]
            vc = vc.sort_values("Cantidad", ascending=False)
            ctype_vc = "Donut" if len(vc) < 6 else "HorizontalBar"
            add_chart(build_autoviz_payload(
                df=vc, chart_id=f"vol_{chosen_cat}",
                title=f"Volumen por {chosen_cat}",
                insight=f"Distribucion de registros por categoria en {chosen_cat}.",
                chart_type=ctype_vc,
                dimensions=[chosen_cat, "Cantidad"],
                source_df=vc.head(10),
            ))

        # B6. Target por Categoria Secundaria
        if second_cat and second_cat != chosen_cat:
            agg2 = df.groupby(second_cat)[target_col].mean().reset_index().sort_values(target_col, ascending=False)
            agg2[target_col] = agg2[target_col].round(4)
            top_group2 = str(agg2.iloc[0][second_cat])
            top_val2 = float(agg2.iloc[0][target_col])
            add_chart(build_autoviz_payload(
                df=df, chart_id="num_cat_second",
                title=f"{target_col} por {second_cat}",
                insight=f"'{top_group2}' lidera con un promedio de {_fmt_num_label(top_val2)}.",
                chart_type="HorizontalBar",
                dimensions=[second_cat, target_col],
                source_df=agg2.head(10),
            ))

        # B7. Variables numericas secundarias
        for idx, nc in enumerate(other_nums[:3]):
            if chosen_cat:
                agg_sec = df.groupby(chosen_cat)[nc].mean().reset_index().sort_values(nc, ascending=False)
                agg_sec[nc] = agg_sec[nc].round(4)
                add_chart(build_autoviz_payload(
                    df=df, chart_id=f"sec_mean_{nc}",
                    title=f"Promedio de {nc} por {chosen_cat}",
                    insight=f"Comparativa de {nc} entre los grupos de {chosen_cat}.",
                    chart_type="HorizontalBar",
                    dimensions=[chosen_cat, nc],
                    source_df=agg_sec.head(10),
                ))
            if idx == 0:
                add_chart(build_boxplot_payload(
                    df, num_col=nc,
                    cat_col=second_cat if second_cat else chosen_cat,
                    chart_id=f"boxplot_sec_{nc}",
                ))

    return charts
