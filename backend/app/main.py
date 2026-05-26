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
from app.core.middleware import LoggingMiddleware, RateLimitMiddleware
from app.database.postgres import init_db

app = FastAPI(title="CodeSage API", version="1.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging and rate limiting
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

app.add_exception_handler(CodeSageException, codesage_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.include_router(v1_router, prefix="/api/v1")
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/health")
async def health():
    return {"status": "ok"}
