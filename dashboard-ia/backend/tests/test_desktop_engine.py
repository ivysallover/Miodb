"""
Motor local de la app de escritorio: un proceso que recibe pedidos por el tubo (una línea JSON cada
uno), lee la planilla del disco y responde sin abrir ningún puerto. Un pedido malo no lo tira.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

BACKEND = Path(__file__).resolve().parents[1]


def test_the_local_engine_answers_through_the_pipe(tmp_path):
    rng = np.random.default_rng(1)
    sheet = tmp_path / "ventas.csv"
    pd.DataFrame({
        "fecha": pd.date_range("2024-01-01", periods=150).strftime("%d/%m/%Y"),
        "ventas": (200 + np.arange(150) + rng.normal(0, 5, 150)).round(2),
    }).to_csv(sheet, index=False)
    proc = subprocess.Popen([sys.executable, "desktop_engine.py"], cwd=BACKEND, stdin=subprocess.PIPE,
                            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)

    def ask(req):
        proc.stdin.write(json.dumps(req) + "\n")
        proc.stdin.flush()
        return json.loads(proc.stdout.readline())

    try:
        assert ask({"id": "a", "cmd": "ping"})["ok"]
        bad = ask({"id": "b", "cmd": "analyze", "path": str(tmp_path / "no_existe.csv")})
        assert bad == {"id": "b", "ok": False, "status": 400, "error": "No encontramos el archivo: no_existe.csv"}
        good = ask({"id": "c", "cmd": "analyze", "path": str(sheet), "target_col": "ventas"})
        assert good["ok"] and good["id"] == "c"
        assert good["result"]["profile"]["n_rows"] == 150
        assert good["result"]["forecast"]["metrics"].get("competencia")
    finally:
        proc.stdin.close()
        proc.wait(timeout=30)
    assert proc.returncode == 0
