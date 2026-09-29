from typing import Optional
import os
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from api.routes import analysis, export, chat, narrative
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

# Primary API V1 endpoints
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(export.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(narrative.router, prefix=settings.API_V1_STR)

# Legacy aliases without /v1 prefix for full compatibility
app.include_router(analysis.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(narrative.router, prefix="/api")

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

    admin_secret = os.environ.get("ADMIN_SECRET_KEY")
    is_authorized = True
    if admin_secret:
        auth_header = authorization.replace("Bearer ", "") if authorization else ""
        is_authorized = (x_admin_key == admin_secret) or (auth_header == admin_secret)

    safe_logs = get_recent_logs(limit) if is_authorized else ["[PROTEGIDO] Acceso a trazas del sistema restringido a administradores autenticados."]

    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - SERVER_BOOT_TIME, 1),
        "ram_mb": ram_mb,
        "logs": safe_logs
    }
