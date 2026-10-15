"""
RAM del servidor: las copias de archivos subidos que quedan en memoria tienen un tope en MB, y el
motor lee el archivo del mismo buffer en vez de copiarlo entero.
"""
import io

import pandas as pd
import pytest

import api.routes.analysis as routes
from services.analysis_pipeline import _analyze_sync


@pytest.fixture(autouse=True)
def clean_store(monkeypatch):
    routes._EPHEMERAL_MEMORY_STORE.clear()
    monkeypatch.setattr(routes.settings, "EPHEMERAL_STORE_MAX_MB", 1)
    yield
    routes._EPHEMERAL_MEMORY_STORE.clear()


def test_store_keeps_the_newest_files_within_the_budget():
    half = b"x" * (600 * 1024)
    routes._remember_upload("a" * 32 + ".csv", half, "a.csv")
    routes._remember_upload("b" * 32 + ".csv", half, "b.csv")
    assert list(routes._EPHEMERAL_MEMORY_STORE) == ["b" * 32 + ".csv"]
    assert sum(len(v[0]) for v in routes._EPHEMERAL_MEMORY_STORE.values()) <= 1024 * 1024


def test_a_file_bigger_than_the_budget_is_not_kept():
    routes._remember_upload("c" * 32 + ".csv", b"x" * (2 * 1024 * 1024), "c.csv")
    assert routes._EPHEMERAL_MEMORY_STORE == {}


def test_engine_reads_the_upload_without_copying_it():
    rows = "\n".join(f"2024-01-{d:02d},{100 + d}" for d in range(1, 29))
    buf = io.BytesIO(("fecha,ventas\n" + rows).encode())
    res = _analyze_sync(buf, "ventas.csv", "ventas")
    assert res["profile"]["n_rows"] == 28 or res["profile"].get("nRows") == 28
    assert buf.getvalue().startswith(b"fecha,ventas")  # el buffer sigue intacto
