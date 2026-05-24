from app.database.qdrant import get_qdrant_client
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid

VECTOR_DIM = 1536


async def ensure_collection(collection_name: str):
    client = get_qdrant_client()
    collections = await client.get_collections()
    names = [c.name for c in collections.collections]
    if collection_name not in names:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE)
        )


async def upsert_chunks(project_id: str, chunks: list[dict], vectors: list[list[float]]):
    collection = f"project_{project_id}"
    await ensure_collection(collection)
    client = get_qdrant_client()
    points = [
        PointStruct(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{project_id}:{c['file_path']}:{c['start_line']}")),
            vector=v,
            payload={
                "project_id": project_id,
                "file_path": c["file_path"],
                "chunk_index": i,
                "start_line": c["start_line"],
                "end_line": c["end_line"],
                "language": c["language"],
                "code": c["code"][:500]
            }
        )
        for i, (c, v) in enumerate(zip(chunks, vectors))
    ]
    await client.upsert(collection_name=collection, points=points)


async def search_similar(project_id: str, query_vector: list[float], top_k: int = 20) -> list[dict]:
    collection = f"project_{project_id}"
    client = get_qdrant_client()
    results = await client.search(collection_name=collection, query_vector=query_vector, limit=top_k)
    return [{"score": r.score, **r.payload} for r in results]