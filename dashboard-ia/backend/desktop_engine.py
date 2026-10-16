"""
desktop_engine.py
El motor de MIO como programa local, para la app de escritorio.

No abre ningún puerto ni servidor: la ventana lo arranca como proceso hijo y le habla por un tubo
(entrada y salida estándar), una línea JSON por pedido y una por respuesta. Lee la planilla directo
del disco de la persona (nunca se sube) y usa la RAM de su compu: sin límite de tamaño de subida, sin
fila y sin el tope de 512 MB del servidor.

Pedidos (una línea cada uno):
  {"id": "1", "cmd": "ping"}
  {"id": "2", "cmd": "analyze", "path": "/ruta/ventas.csv", "target_col": "ventas", "column_roles": {...}}
  {"id": "3", "cmd": "analyze", "paths": ["/ruta/a.csv", "/ruta/b.csv"]}      # varias tablas, se unen
  {"id": "4", "cmd": "profile", "path": "/ruta/ventas.csv"}

Respuestas:
  {"id": "2", "ok": true, "result": {...}, "seconds": 3.1}
  {"id": "2", "ok": false, "status": 400, "error": "El archivo está vacío: ..."}
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

# La salida estándar es el canal de respuestas: todo lo que el motor imprima (avisos, registros)
# va a la salida de errores, para que nunca se mezcle con una respuesta.
_CHANNEL = sys.stdout
sys.stdout = sys.stderr

os.environ.setdefault("REQUIRE_AUTH", "false")  # la sesión la verifica la app, no este proceso


def _send(msg: Dict[str, Any]) -> None:
    _CHANNEL.write(json.dumps(msg, ensure_ascii=False, default=str) + "\n")
    _CHANNEL.flush()


def _check_path(raw: Any) -> str:
    if not isinstance(raw, str) or not raw:
        raise ValueError("Falta la ruta del archivo.")
    p = Path(raw).expanduser()
    if not p.is_file():
        raise FileNotFoundError(f"No encontramos el archivo: {p.name}")
    return str(p)


def handle(req: Dict[str, Any]) -> Dict[str, Any]:
    from fastapi import HTTPException

    cmd = req.get("cmd")
    if cmd == "ping":
        return {"pong": True, "pid": os.getpid()}

    from services.analysis_pipeline import _analyze_sync, _profile_only

    if cmd == "profile":
        path = _check_path(req.get("path"))
        return _profile_only(path, Path(path).name)

    if cmd == "analyze":
        roles = req.get("column_roles") or {}
        target = req.get("target_col") or None
        paths = req.get("paths")
        if paths:
            from api.routes.analysis import _run_multi_analysis

            files = [_check_path(p) for p in paths]
            saved = [(Path(f).read_bytes(), Path(f).name) for f in files]
            return _run_multi_analysis(saved, target, roles)
        path = _check_path(req.get("path"))
        return _analyze_sync(path, Path(path).name, target, roles)

    raise HTTPException(status_code=400, detail=f"Pedido desconocido: {cmd!r}")


def main() -> None:
    from fastapi import HTTPException

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        rid = None
        started = time.time()
        try:
            req = json.loads(line)
            rid = req.get("id")
            result = handle(req)
            _send({"id": rid, "ok": True, "result": result, "seconds": round(time.time() - started, 2)})
        except HTTPException as ex:
            _send({"id": rid, "ok": False, "status": ex.status_code, "error": ex.detail})
        except (FileNotFoundError, ValueError) as ex:
            _send({"id": rid, "ok": False, "status": 400, "error": str(ex)})
        except Exception as ex:  # el proceso nunca se cae por un pedido: responde y sigue esperando
            print(f"Fallo del motor local: {ex!r}", file=sys.stderr)
            _send({"id": rid, "ok": False, "status": 500, "error": "El análisis falló por un error nuestro, no de tu planilla."})


if __name__ == "__main__":
    main()
