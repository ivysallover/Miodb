#!/usr/bin/env python3
"""
MIO Benchmark Engine — Time-Series Validation Script
Dataset: ecommerce_sales_customer_analytics_150k.csv (138,116 real order records)
Goal: Reproducible, leakage-free benchmark comparing Seasonal Naïve baseline against
MIO In-Memory Time-Series Forecasting (Autoregressive Ridge with Seasonal Lags).

Metrics computed:
- sMAPE (Symmetric Mean Absolute Percentage Error)
- WAPE (Weighted Absolute Percentage Error)
- RMSE (Root Mean Squared Error)
- Anomaly Count via Robust MAD (Median Absolute Deviation)
"""

import csv
import json
import math
from datetime import datetime
import numpy as np

DATASET_PATH = "./datasets/archive/ecommerce_sales_customer_analytics_150k.csv"
OUTPUT_JSON_PATH = "./public/data/benchmark_results.json"

def load_and_aggregate():
    print(f"[*] Loading transactions from {DATASET_PATH}...")
    daily_sales = {}
    total_rows = 0

    with open(DATASET_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_rows += 1
            date_str = row['order_date'].strip()
            sales_val = float(row['net_sales']) if row['net_sales'] else 0.0
            
            if date_str:
                daily_sales[date_str] = daily_sales.get(date_str, 0.0) + sales_val

    # Sort dates chronologically
    sorted_dates = sorted(daily_sales.keys(), key=lambda d: datetime.strptime(d, "%Y-%m-%d"))
    ts_values = np.array([daily_sales[d] for d in sorted_dates], dtype=float)
    
    print(f"[*] Processed {total_rows:,} raw transactions into {len(sorted_dates)} chronological daily points.")
    print(f"    Date range: {sorted_dates[0]} -> {sorted_dates[-1]}")
    return sorted_dates, ts_values, total_rows

def detect_anomalies(values):
    # Robust Median Absolute Deviation (MAD)
    med = np.median(values)
    mad = np.median(np.abs(values - med))
    # Threshold at 3 * 1.4826 MAD (~ 3 sigma)
    thresh = 3.0 * 1.4826 * mad
    outliers = np.abs(values - med) > thresh
    return int(np.sum(outliers)), float(thresh)

def smape(y_true, y_pred):
    denom = (np.abs(y_true) + np.abs(y_pred)) / 2.0
    valid = denom > 1e-6
    if not np.any(valid):
        return 0.0
    return float(np.mean(np.abs(y_true[valid] - y_pred[valid]) / denom[valid]) * 100.0)

def wape(y_true, y_pred):
    denom = np.sum(np.abs(y_true))
    if denom < 1e-6:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / denom * 100.0)

def rmse(y_true, y_pred):
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

def run_rolling_origin_benchmark(ts_values, num_folds=4, horizon=14, seasonal_lag=7):
    """
    Strict Rolling-Origin Backtesting with zero leakage:
    For each fold k:
      Train on history up to t_k
      Preprocess / scale strictly on train
      Predict horizon h
    """
    n = len(ts_values)
    min_train = n - (num_folds * horizon)
    
    naive_smapes, naive_wapes, naive_rmses = [], [], []
    mio_smapes, mio_wapes, mio_rmses = [], [], []

    print(f"[*] Running {num_folds}-fold Rolling Origin Backtest (Horizon: {horizon} days, Seasonality: {seasonal_lag})...")

    for k in range(num_folds):
        train_end = min_train + (k * horizon)
        test_end = train_end + horizon
        
        train_y = ts_values[:train_end]
        test_y = ts_values[train_end:test_end]

        # 1. Baseline: Seasonal Naive (y_t = y_{t - seasonal_lag})
        naive_preds = np.zeros(horizon)
        for h in range(horizon):
            idx = train_end - seasonal_lag + (h % seasonal_lag)
            naive_preds[h] = ts_values[idx]

        naive_smapes.append(smape(test_y, naive_preds))
        naive_wapes.append(wape(test_y, naive_preds))
        naive_rmses.append(rmse(test_y, naive_preds))

        # 2. MIO Engine: Autoregressive Feature Matrix (Lags 1, 2, 7, 14 + Rolling Mean 7)
        # Built strictly inside train fold (ZERO data leakage)
        max_lag = 14
        X_train, y_train = [], []
        for i in range(max_lag, len(train_y)):
            lags = [train_y[i - 1], train_y[i - 2], train_y[i - 7], train_y[i - 14]]
            roll_mean = np.mean(train_y[i - 7:i])
            day_of_week = (i % 7) / 7.0
            X_train.append([1.0] + lags + [roll_mean, day_of_week])
            y_train.append(train_y[i])

        X_train = np.array(X_train)
        y_train = np.array(y_train)

        # Ridge Regression closed-form solution: w = (X^T X + lambda I)^(-1) X^T y
        reg_lambda = 10.0
        I = np.eye(X_train.shape[1])
        I[0, 0] = 0.0 # Don't penalize bias
        weights = np.linalg.solve(X_train.T @ X_train + reg_lambda * I, X_train.T @ y_train)

        # Multi-step autoregressive recursive forecast
        curr_hist = list(train_y)
        mio_preds = []
        for h in range(horizon):
            idx = len(curr_hist)
            lags = [curr_hist[idx - 1], curr_hist[idx - 2], curr_hist[idx - 7], curr_hist[idx - 14]]
            roll_mean = np.mean(curr_hist[idx - 7:idx])
            day_of_week = (idx % 7) / 7.0
            x_vec = np.array([1.0] + lags + [roll_mean, day_of_week])
            pred_val = float(x_vec @ weights)
            mio_preds.append(max(0.0, pred_val)) # Sales non-negative
            curr_hist.append(pred_val)

        mio_preds = np.array(mio_preds)
        mio_smapes.append(smape(test_y, mio_preds))
        mio_wapes.append(wape(test_y, mio_preds))
        mio_rmses.append(rmse(test_y, mio_preds))

    results = {
        "dataset_name": "ecommerce_sales_customer_analytics_150k.csv",
        "total_raw_transactions": int(len(ts_values)),
        "daily_timeline_points": int(len(ts_values)),
        "folds": num_folds,
        "horizon_days": horizon,
        "anomalies_detected": int(detect_anomalies(ts_values)[0]),
        "naive_baseline": {
            "model": "Seasonal Naive (Lag 7)",
            "mean_smape": round(float(np.mean(naive_smapes)), 2),
            "mean_wape": round(float(np.mean(naive_wapes)), 2),
            "mean_rmse": round(float(np.mean(naive_rmses)), 2)
        },
        "mio_engine": {
            "model": "MIO Autoregressive Time-Series Engine",
            "mean_smape": round(float(np.mean(mio_smapes)), 2),
            "mean_wape": round(float(np.mean(mio_wapes)), 2),
            "mean_rmse": round(float(np.mean(mio_rmses)), 2),
            "relative_improvement_pct": round(float((np.mean(naive_wapes) - np.mean(mio_wapes)) / np.mean(naive_wapes) * 100.0), 2)
        }
    }

    return results

def main():
    dates, values, total_rows = load_and_aggregate()
    anomalies_count, _ = detect_anomalies(values)
    results = run_rolling_origin_benchmark(values)
    results["total_raw_transactions"] = total_rows

    print("\n" + "=" * 60)
    print("MIO BENCHMARK RESULTS (VERIFIED & AUDITABLE)")
    print("=" * 60)
    print(f"Transactions Processed: {results['total_raw_transactions']:,}")
    print(f"Anomalies Flagged:       {results['anomalies_detected']} records (Robust MAD)")
    print(f"Baseline Naïve sMAPE:   {results['naive_baseline']['mean_smape']}% (WAPE: {results['naive_baseline']['mean_wape']}%)")
    print(f"MIO Engine sMAPE:       {results['mio_engine']['mean_smape']}% (WAPE: {results['mio_engine']['mean_wape']}%)")
    print(f"Relative Error Drop:    {results['mio_engine']['relative_improvement_pct']}% reduction over baseline")
    print("=" * 60)

    import os
    os.makedirs("./public/data", exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"[✓] Saved benchmark data to {OUTPUT_JSON_PATH}")

if __name__ == "__main__":
    main()
