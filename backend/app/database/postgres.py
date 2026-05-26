from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


class Base(DeclarativeBase):
    pass


# Import models so that Base.metadata is populated (needed by Alembic env.py and
# any code that inspects the schema, but NOT for create_all which is removed).
from app.models.postgres import User, Project, ProcessingJob, AnalysisCache  # noqa: F401


engine = create_async_engine(settings.database_url, echo=False, future=True)
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