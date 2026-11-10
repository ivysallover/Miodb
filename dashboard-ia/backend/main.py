from typing import Optional
import hmac
import os
from fastapi import Depends, FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from api.routes import analysis, export, chat, narrative
from core.auth import per_user_limit, require_user
from core.config import get_settings
from core.exceptions import setup_exception_handlers
from core.logging import logger

settings = get_settings()

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Set up global exception handlers
setup_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=settings.BACKEND_CORS_ORIGIN_REGEX or None,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# Every endpoint that analyses, exports or chats needs the Firebase session of whoever is signed in
# (core/auth.py), with a per-account limit: the engine is shared and every Gemini call costs money.
# /health stays open; /logs asks for the admin key.
_engine = [Depends(require_user), Depends(per_user_limit("motor", 60, 3600))]
_ai = [Depends(require_user), Depends(per_user_limit("ia", 40, 3600))]

# Primary API V1 endpoints, and the legacy aliases without /v1. One limit per kind, shared by both prefixes.
for _prefix in (settings.API_V1_STR, "/api"):
    app.include_router(analysis.router, prefix=_prefix, dependencies=_engine)
    app.include_router(export.router, prefix=_prefix, dependencies=_engine)
    app.include_router(chat.router, prefix=_prefix, dependencies=_ai)
    app.include_router(narrative.router, prefix=_prefix, dependencies=_ai)

import time
import sys
try:
    import resource
except ImportError:
    resource = None
from core.logging import get_recent_logs

SERVER_BOOT_TIME = time.time()

@app.get("/api/health")
@app.get(f"{settings.API_V1_STR}/health")
@app.get("/health")
def health():
    return {"status": "ok", "service": settings.PROJECT_NAME}

@app.get("/api/logs")
@app.get(f"{settings.API_V1_STR}/logs")
def logs(
    limit: int = 50,
    authorization: Optional[str] = Header(None),
    x_admin_key: Optional[str] = Header(None)
):
    try:
        if resource:
            max_rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
            ram_mb = round(max_rss / 1024 if sys.platform.startswith("linux") else max_rss / (1024 * 1024), 2)
        else:
            ram_mb = None
    except Exception:
        ram_mb = None

    # The logs carry file names and engine errors: only with the admin key, and without a key set, nobody.
    admin_secret = os.environ.get("ADMIN_SECRET_KEY") or ""
    auth_header = authorization.replace("Bearer ", "") if authorization else ""
    is_authorized = bool(admin_secret) and any(
        hmac.compare_digest(given.encode(), admin_secret.encode()) for given in (x_admin_key or "", auth_header)
    )

    safe_logs = get_recent_logs(limit) if is_authorized else ["[PROTEGIDO] Acceso a trazas del sistema restringido a administradores autenticados."]

    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - SERVER_BOOT_TIME, 1),
        "ram_mb": ram_mb,
        "logs": safe_logs
    }
