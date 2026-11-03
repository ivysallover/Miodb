"""Arma las series de ventas para medir MIO Predict con datos reales que no vio (M5, de Walmart).

Lee la carpeta de M5 (`sales_train_evaluation.csv`, `sell_prices.csv`, `calendar.csv`) y escribe
`m5_series.csv` (serie, dia, valor): la plata vendida por día (unidades × precio) por tienda, estado,
tienda y categoría, tienda y departamento, el total, y 200 productos de una tienda elegidos al azar
(con semilla fija), que venden de a poco y a veces nada. Uso: python3 scripts/m5_series.py ~/Downloads/m5
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

folder = Path(sys.argv[1]).expanduser()
sales = pd.read_csv(folder / 'sales_train_evaluation.csv')
calendar = pd.read_csv(folder / 'calendar.csv')
prices = pd.read_csv(folder / 'sell_prices.csv')

days = [c for c in sales.columns if c.startswith('d_')]
dates = calendar['date'].iloc[: len(days)].to_numpy()
weeks = calendar['wm_yr_wk'].iloc[: len(days)].to_numpy()

# Precio de cada producto en cada tienda, por día (el de su semana); sin precio, no se vendió.
key = sales['store_id'] + '|' + sales['item_id']
table = prices.assign(key=prices['store_id'] + '|' + prices['item_id']).pivot(index='key', columns='wm_yr_wk', values='sell_price')
table = table.reindex(index=key, columns=sorted(set(weeks))).fillna(0).to_numpy(np.float32)
week_at = {w: i for i, w in enumerate(sorted(set(weeks)))}
money = sales[days].to_numpy(np.float32) * table[:, [week_at[w] for w in weeks]]

out = []
def add(name, rows):
    out.append(pd.DataFrame({'serie': name, 'dia': dates, 'valor': money[rows].sum(axis=0).round(2)}))

add('total', np.arange(len(sales)))
for level in (['state_id'], ['store_id'], ['store_id', 'cat_id'], ['store_id', 'dept_id']):
    for name, rows in sales.groupby(level).indices.items():
        add('/'.join(np.atleast_1d(name)), rows)
for i in np.random.default_rng(7).choice(np.flatnonzero(sales['store_id'] == 'CA_3'), 200, replace=False):
    add(f"CA_3/{sales['item_id'][i]}", [i])

pd.concat(out).to_csv(folder / 'm5_series.csv', index=False)
print(len(out), 'series')
