#!/usr/bin/env python3
"""
Exports the daily series behind the benchmark so the landing can draw it.

Same data and same rules as scripts/benchmark_retail.py (it imports them): the 1.826 daily totals,
which days the robust MAD rule flags as out of the ordinary, and the four backtest folds (14 days
the engine never saw each time: what it predicted, what the "repeat last week" baseline predicted;
what actually happened is in the series itself). Nothing here is invented or smoothed.

Usage: python3 scripts/export_daily_series.py [path/to/ecommerce_sales_customer_analytics_150k.csv]
"""
import json
import sys
import numpy as np
import benchmark_retail as bench

OUT = "./public/data/daily_series.json"


def fold(ts, k, num_folds=4, horizon=14, seasonal_lag=7):
    """Fold k of bench.run_rolling_origin_benchmark, returning the predictions themselves."""
    n = len(ts)
    train_end = n - (num_folds * horizon) + k * horizon
    train_y = ts[:train_end]
    naive = [float(ts[train_end - seasonal_lag + (h % seasonal_lag)]) for h in range(horizon)]

    max_lag = 14
    X, y = [], []
    for i in range(max_lag, len(train_y)):
        lags = [train_y[i - 1], train_y[i - 2], train_y[i - 7], train_y[i - 14]]
        X.append([1.0] + lags + [np.mean(train_y[i - 7:i]), (i % 7) / 7.0])
        y.append(train_y[i])
    X, y = np.array(X), np.array(y)
    eye = np.eye(X.shape[1])
    eye[0, 0] = 0.0
    w = np.linalg.solve(X.T @ X + 10.0 * eye, X.T @ y)

    hist, mio = list(train_y), []
    for _ in range(horizon):
        i = len(hist)
        lags = [hist[i - 1], hist[i - 2], hist[i - 7], hist[i - 14]]
        p = float(np.array([1.0] + lags + [np.mean(hist[i - 7:i]), (i % 7) / 7.0]) @ w)
        mio.append(max(0.0, p))
        hist.append(p)
    return train_end, mio, naive


def main():
    if len(sys.argv) > 1:
        bench.DATASET_PATH = sys.argv[1]
    dates, values, total_rows = bench.load_and_aggregate()

    med = np.median(values)
    mad = np.median(np.abs(values - med))
    thresh = 3.0 * 1.4826 * mad
    odd = [int(i) for i in np.nonzero(np.abs(values - med) > thresh)[0]]

    folds = []
    for k in range(4):
        start, mio, naive = fold(values, k)
        actual = values[start:start + 14]
        folds.append({
            "from_index": int(start),
            "mio": [int(round(v)) for v in mio],
            "naive": [int(round(v)) for v in naive],
            "mio_smape": round(bench.smape(actual, np.array(mio)), 2),
            "naive_smape": round(bench.smape(actual, np.array(naive)), 2),
        })
    out = {
        "source": "ecommerce_sales_customer_analytics_150k.csv",
        "transactions": int(total_rows),
        "first_day": dates[0],
        "last_day": dates[-1],
        "values": [int(round(v)) for v in values],
        "median": int(round(med)),
        "odd_threshold": int(round(thresh)),
        "odd_days": odd,
        # The four tests of the benchmark, oldest first; "backtest" is the last one (kept for the finale).
        "folds": folds,
        "backtest": folds[-1],
        "mean_mio_smape": round(float(np.mean([f["mio_smape"] for f in folds])), 2),
        "mean_naive_smape": round(float(np.mean([f["naive_smape"] for f in folds])), 2),
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"days={len(values)} odd={len(odd)} folds mio={[f['mio_smape'] for f in folds]} naive={[f['naive_smape'] for f in folds]}")
    print(f"mean mio={out['mean_mio_smape']} naive={out['mean_naive_smape']}")
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
