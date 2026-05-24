import time, structlog
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        ms = round((time.time() - start) * 1000, 2)
        logger.info("request", method=request.method, path=request.url.path,
                    status=response.status_code, duration_ms=ms)
        return response