import time, structlog
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from app.database.redis import get_redis
import time

logger = structlog.get_logger()


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.time()
        response = await call_next(request)
        ms = round((time.time() - start) * 1000, 2)
        logger.info("request", method=request.method, path=request.url.path,
                    status=response.status_code, duration_ms=ms)
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple sliding-window rate limiter using Redis ZSETs.

    Per-route-category limits:
      - analysis/query: 20 req/min per user
      - ingest: 5 req/hour per user
      - default: 60 req/min per user

    Keying: Prefer Authorization header value (Bearer token) else client host.
    """

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        # Skip docs and ws
        if path.startswith('/docs') or path.startswith('/openapi') or path.startswith('/ws'):
            return await call_next(request)

        if path.startswith('/api/v1/analysis') or path.startswith('/api/v1/query'):
            limit, window = 20, 60
        elif path.startswith('/api/v1/ingest'):
            limit, window = 5, 3600
        else:
            limit, window = 60, 60

        # derive key
        auth = request.headers.get('authorization', '')
        if auth:
            key_id = auth.split()[-1]
        else:
            client = request.client.host if request.client else 'anon'
            key_id = client

        redis = get_redis()
        rkey = f"rl:{path.split('/')[3] if len(path.split('/'))>3 else 'global'}:{key_id}"
        now = int(time.time() * 1000)
        window_ms = window * 1000

        try:
            # add current timestamp
            await redis.zadd(rkey, {str(now): now})
            # remove old
            await redis.zremrangebyscore(rkey, 0, now - window_ms)
            cnt = await redis.zcard(rkey)
            await redis.expire(rkey, window + 5)
            if cnt > limit:
                return JSONResponse({"error": {"code": "RATE_LIMIT_EXCEEDED", "message": "Rate limit exceeded"}}, status_code=429)
        except Exception:
            # On Redis failure, allow request to avoid outage
            pass

        return await call_next(request)