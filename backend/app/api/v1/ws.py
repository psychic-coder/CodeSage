from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.database.redis import get_redis
import json

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
                await websocket.send_text(message["data"])
                parsed = json.loads(message["data"])
                if parsed.get("progress") == 100:
                    break
    except WebSocketDisconnect:
        pass
    finally:
        await pubsub.unsubscribe(f"job:{job_id}")
        await pubsub.aclose()