"""CodeSage FastAPI application entry-point."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1.router import router as v1_router
from app.api.v1.ws import ws_router
from app.config import settings
from app.core.exceptions import (
    CodeSageException,
    codesage_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.core.health import health_router
from app.core.middleware import LoggingMiddleware, RateLimitMiddleware
from app.core.telemetry import instrument_fastapi, setup_telemetry
from app.database.postgres import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN001
    """Application lifespan — replaces deprecated @app.on_event."""
    # ── Startup ───────────────────────────────────────────────────────────────
    setup_telemetry()
    await init_db()
    yield
    # ── Shutdown (add cleanup here if needed) ─────────────────────────────────


# Hide API docs in production (avoids exposing schema to the public)
_docs_url = None if settings.app_env == "production" else "/docs"
_redoc_url = None if settings.app_env == "production" else "/redoc"
_openapi_url = None if settings.app_env == "production" else "/openapi.json"

app = FastAPI(
    title="CodeSage API",
    version="1.0.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    openapi_url=_openapi_url,
    lifespan=lifespan,
)

# ── Telemetry (must be called right after app creation) ───────────────────────
instrument_fastapi(app)

# ── Middleware (order matters — outermost first) ───────────────────────────────
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# CORS — explicit allowlist instead of wildcard in production
_allow_origins = [o.strip() for o in settings.allowed_origins.split(",")]
_allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
_allow_headers = [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "X-Requested-With",
    "X-Request-ID",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=_allow_methods,
    allow_headers=_allow_headers,
)

# ── Exception handlers ────────────────────────────────────────────────────────
app.add_exception_handler(CodeSageException, codesage_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)          # /health, /health/live, /health/ready
app.include_router(v1_router, prefix="/api/v1")
app.include_router(ws_router)
