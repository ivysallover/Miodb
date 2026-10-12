"""
La suite corre sin sesión: el motor exige token de Firebase en producción (core/auth.py) y acá se apaga
antes de importar la app. Los tests de sesión (test_auth_and_queue.py) lo vuelven a encender a propósito.
"""
import os

os.environ.setdefault("REQUIRE_AUTH", "false")
