"""Deep health check endpoints.

Provides two probes used by Azure Container Apps (and Kubernetes):

- ``/health/live``   — Liveness:  is the process up? (fast, no external calls)
- ``/health/ready``  — Readiness: can we serve traffic? (checks all dependencies)
- ``/health``        — Alias for liveness (backward compat with existing nginx rule)
"""
from __future__ import annotations

import time

import structlog
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import settings

logger = structlog.get_logger(__name__)

health_router = APIRouter(tags=["health"])


def _ok(**checks) -> dict:
    return {"status": "ok", "checks": checks, "timestamp": time.time()}


def _degraded(reason: str, **checks) -> dict:
    return {"status": "degraded", "reason": reason, "checks": checks, "timestamp": time.time()}


# ── Liveness ──────────────────────────────────────────────────────────────────

@health_router.get("/health/live", include_in_schema=False)
@health_router.get("/health", include_in_schema=False)
async def liveness():
    """Process is alive — no dependency checks."""
    return {"status": "ok"}


# ── Readiness ─────────────────────────────────────────────────────────────────

@health_router.get("/health/ready", include_in_schema=False)
async def readiness():
    """All critical dependencies reachable."""
    checks: dict[str, str] = {}
    failed: list[str] = []

    # Postgres
    try:
        from app.database.postgres import engine
        from sqlalchemy import text

        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as exc:
        checks["postgres"] = f"error: {exc}"
        failed.append("postgres")
        logger.warning("health.postgres_failed", error=str(exc))

    # Redis
    try:
        from app.database.redis import get_redis

        redis = get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"
        failed.append("redis")
        logger.warning("health.redis_failed", error=str(exc))

    # Neo4j (via AuraDB — we check connectivity only, no heavy query)
    try:
        from app.database.neo4j import get_neo4j_driver

        driver = get_neo4j_driver()
        driver.verify_connectivity()
        checks["neo4j"] = "ok"
    except Exception as exc:
        checks["neo4j"] = f"error: {exc}"
        # Neo4j degraded but not fatal — mark as warning, not failure
        logger.warning("health.neo4j_degraded", error=str(exc))

    # Qdrant (HEAD request to cluster endpoint)
    try:
        import httpx

        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{settings.qdrant_url}/healthz")
            if r.status_code < 500:
                checks["qdrant"] = "ok"
            else:
                raise RuntimeError(f"status {r.status_code}")
    except Exception as exc:
        checks["qdrant"] = f"error: {exc}"
        logger.warning("health.qdrant_degraded", error=str(exc))

    if failed:
        return JSONResponse(
            status_code=503,
            content=_degraded(f"dependencies unavailable: {', '.join(failed)}", **checks),
        )

    return _ok(**checks)
