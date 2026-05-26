from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings
from app.models.postgres import (  # noqa: F401
    AnalysisCache,
    ProcessingJob,
    Project,
    User,
)


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url, echo=False, future=True, poolclass=NullPool
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def init_db():
    """Startup hook — verifies the DB is reachable.

    Schema creation is handled exclusively by Alembic migrations
    (``alembic upgrade head``).  Do NOT add create_all here.
    """
    async with engine.connect() as conn:  # noqa: F841  — just tests connectivity
        pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
