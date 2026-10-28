"""
Las planillas de `golden/csv_analisis/` en los otros formatos que lee la app (Parquet, JSON y SQLite),
escritas con pandas a partir de lo que lee el motor de Python (`_read_dataframe`). La prueba
`formatos_igual_que_csv.rs` exige que cada una dé el mismo análisis que su CSV.

    desktop/.venv-referencia/bin/python desktop/engine/tests/golden/make_golden_formats.py

Necesita pandas y pyarrow.
"""
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / "dashboard-ia" / "backend"))
import logging  # noqa: E402
logging.disable(logging.CRITICAL)
from services.analysis_pipeline import _read_dataframe  # noqa: E402

SOURCE = Path(__file__).with_name("csv_analisis")
OUT = Path(__file__).with_name("formatos")
OUT.mkdir(exist_ok=True)

for csv in sorted(SOURCE.glob("*.csv")):
    df = _read_dataframe(str(csv))
    df.to_parquet(OUT / f"{csv.stem}.parquet", index=False)
    df.to_json(OUT / f"{csv.stem}.json", orient="records", force_ascii=False)
    db = OUT / f"{csv.stem}.sqlite"
    db.unlink(missing_ok=True)
    with sqlite3.connect(db) as con:
        df.to_sql("datos", con, index=False)
    print(csv.stem, df.shape)
