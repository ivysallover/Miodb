"""
core/auth.py
Sesión obligatoria para usar el motor: cada pedido trae el ID token de Firebase de quien está ingresado
(`Authorization: Bearer <token>`) y se verifica acá, con las claves públicas de Google. Sin dependencias
extra de Firebase Admin ni credenciales de servicio: solo se lee un token firmado.

Interruptor: REQUIRE_AUTH=false lo apaga (desarrollo, o mientras el sitio publicado todavía no manda token).
"""
from __future__ import annotations

import threading
import time
from typing import Any, Dict, Optional

import requests
from fastapi import Header, HTTPException
from google.auth import jwt as google_jwt
from starlette.concurrency import run_in_threadpool

from core.config import get_settings
from core.logging import logger

_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
_CERTS_TTL_SECONDS = 3600
# A token signed with a key we do not know may just mean the keys rotated; refresh, but never faster
# than this, so junk tokens cannot make the server hammer Google.
_FORCED_REFRESH_EVERY_SECONDS = 60

_lock = threading.Lock()
_certs: Dict[str, str] = {}
_certs_at = 0.0
_forced_at = 0.0


class CertsUnavailable(Exception):
    """Google's public keys could not be fetched and none are cached."""


def _fetch_certs(force: bool = False) -> Dict[str, str]:
    global _certs, _certs_at, _forced_at
    with _lock:
        now = time.time()
        fresh = bool(_certs) and (now - _certs_at) < _CERTS_TTL_SECONDS
        if force and (now - _forced_at) < _FORCED_REFRESH_EVERY_SECONDS:
            force = False
        if fresh and not force:
            return _certs
        if force:
            _forced_at = now
        try:
            resp = requests.get(_CERTS_URL, timeout=5)
            resp.raise_for_status()
            _certs = resp.json()
            _certs_at = now
        except Exception as exc:  # network down, Google unreachable...
            if _certs:
                logger.warning("No se pudieron refrescar las claves de Google, se usan las guardadas: %s", exc)
                return _certs
            raise CertsUnavailable(str(exc)) from exc
        return _certs


def verify_firebase_token(token: str, project_id: str) -> Dict[str, Any]:
    """Devuelve los claims del token o lanza ValueError si no es un token válido de este proyecto."""
    certs = _fetch_certs()
    try:
        claims = google_jwt.decode(token, certs=certs, audience=project_id)
    except ValueError:
        # Maybe a rotated key: one rate-limited refresh, then give up.
        certs = _fetch_certs(force=True)
        claims = google_jwt.decode(token, certs=certs, audience=project_id)
    if claims.get("iss") != f"https://securetoken.google.com/{project_id}":
        raise ValueError("Emisor del token no válido.")
    if not claims.get("sub"):
        raise ValueError("Token sin usuario.")
    return claims


def _bearer(authorization: Optional[str]) -> str:
    if not authorization:
        return ""
    scheme, _, value = authorization.partition(" ")
    return value.strip() if scheme.lower() == "bearer" else ""


async def require_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Dependencia de FastAPI: deja pasar solo pedidos de una sesión válida."""
    settings = get_settings()
    if not settings.REQUIRE_AUTH:
        return {"uid": "anonymous"}

    token = _bearer(authorization)
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Necesitás iniciar sesión para usar el análisis.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        claims = await run_in_threadpool(verify_firebase_token, token, settings.FIREBASE_PROJECT_ID)
    except CertsUnavailable:
        raise HTTPException(status_code=503, detail="No pudimos validar tu sesión en este momento. Probá de nuevo en un minuto.")
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Tu sesión venció o no es válida. Volvé a ingresar.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {"uid": claims.get("sub"), "email": claims.get("email")}
