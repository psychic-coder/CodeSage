import uuid
from fastapi import Request
from fastapi.responses import JSONResponse


class CodeSageException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400, details: dict = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}


async def codesage_exception_handler(request: Request, exc: CodeSageException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {
            "code": exc.code,
            "message": exc.message,
            "details": exc.details,
            "request_id": str(uuid.uuid4())
        }}
    )


async def validation_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=422,
        content={"error": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid request parameters",
            "details": exc.errors(),
            "request_id": str(uuid.uuid4())
        }}
    )


async def http_exception_handler(request: Request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {
            "code": "HTTP_ERROR",
            "message": exc.detail,
            "details": {},
            "request_id": str(uuid.uuid4())
        }}
    )