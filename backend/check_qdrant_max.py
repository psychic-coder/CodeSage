import asyncio
from app.database.qdrant import get_qdrant_client

async def main():
    client = get_qdrant_client()
    cols = await client.get_collections()
    for col in cols.collections:
        print(f"Collection: {col.name}")
        res, _ = await client.scroll(collection_name=col.name, limit=1000, with_payload=True)
        max_len = 0
        for r in res:
            code = r.payload.get("code", "")
            if len(code) > max_len:
                max_len = len(code)
        print(f"Max Code length: {max_len}")

asyncio.run(main())
