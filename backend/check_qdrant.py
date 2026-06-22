import asyncio
from app.database.qdrant import get_qdrant_client

async def main():
    client = get_qdrant_client()
    cols = await client.get_collections()
    for col in cols.collections:
        print(f"Collection: {col.name}")
        res, _ = await client.scroll(collection_name=col.name, limit=1, with_payload=True)
        if res:
            code = res[0].payload.get("code", "")
            print(f"Code length: {len(code)}")
            print(f"Code preview: {code[:200]}")

asyncio.run(main())
