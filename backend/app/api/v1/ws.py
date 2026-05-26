import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.database.redis import get_redis

ws_router = APIRouter()


@ws_router.websocket("/ws/jobs/{job_id}")
async def job_ws(websocket: WebSocket, job_id: str):
    await websocket.accept()
    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"job:{job_id}")
    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                payload = message["data"]
                await websocket.send_text(payload)
                try:
                    parsed = json.loads(payload)
                except Exception:
                    parsed = {}
                if parsed.get("progress") == 100:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"job:{job_id}")
        await pubsub.aclose()
