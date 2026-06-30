"""PostgreSQL async engine and session factory.

Pool configuration:
- Development / test: NullPool (no idle connections, simpler for testing)
- Production: AsyncAdaptedQueuePool with tuned limits

Pool size is controlled via environment variables:
  DB_POOL_SIZE        (default: 10)
  DB_MAX_OVERFLOW     (default: 20)
  DB_POOL_TIMEOUT     (default: 30)
  DB_POOL_RECYCLE     (default: 1800)
"""
from __future__ import annotations

import os
from importlib import import_module

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import AsyncAdaptedQueuePool, NullPool

from app.config import settings


class Base(DeclarativeBase):
    pass


import_module("app.models.postgres")

# Choose pool strategy based on environment
_IS_PROD = settings.app_env == "production"
_IS_TEST = settings.app_env == "test" or "pytest" in os.environ.get("_", "")

if _IS_TEST or not _IS_PROD:
    # No pooling — avoids "cannot run event loop" errors in tests
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
        poolclass=NullPool,
    )
else:
    # Production: connection pool for throughput + resource reuse
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
        poolclass=AsyncAdaptedQueuePool,
        pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
        pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
        pool_recycle=int(os.getenv("DB_POOL_RECYCLE", "1800")),
        pool_pre_ping=True,  # Automatically reconnect stale connections
    )

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db() -> None:
    """Startup hook — verifies the DB is reachable.

    Schema creation is handled exclusively by Alembic migrations
    (``alembic upgrade head``).  Do NOT add create_all here.
    """
    async with engine.connect() as conn:  # noqa: F841  — just tests connectivity
        pass


async def get_db():
    """FastAPI dependency — yields an async SQLAlchemy session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
