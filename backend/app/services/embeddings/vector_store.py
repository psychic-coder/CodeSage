import uuid

from qdrant_client.models import Distance, PointStruct, VectorParams

from app.database.qdrant import get_qdrant_client

VECTOR_DIM = 1536


async def ensure_collection(collection_name: str):
    client = get_qdrant_client()
    collections = await client.get_collections()
    names = [c.name for c in collections.collections]
    if collection_name not in names:
        await client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
        )


async def upsert_chunks(
    project_id: str, chunks: list[dict], vectors: list[list[float]]
):
    collection = f"project_{project_id}"
    await ensure_collection(collection)
    client = get_qdrant_client()
    points = [
        PointStruct(
            id=str(
                uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"{project_id}:{c['file_path']}:{c['start_line']}",
                )
            ),
            vector=v,
            payload={
                "project_id": project_id,
                "file_path": c["file_path"],
                "chunk_index": i,
                "start_line": c["start_line"],
                "end_line": c["end_line"],
                "language": c["language"],
                "code": c["code"],
            },
        )
        for i, (c, v) in enumerate(zip(chunks, vectors))
    ]
    await client.upsert(collection_name=collection, points=points)


async def search_similar(
    project_id: str, query_vector: list[float], top_k: int = 20
) -> list[dict]:
    collection = f"project_{project_id}"
    client = get_qdrant_client()
    results = await client.search(
        collection_name=collection, query_vector=query_vector, limit=top_k
    )
    return [{"score": r.score, **r.payload} for r in results]


async def fetch_chunks_for_files(
    project_id: str,
    file_paths: list[str],
    chunks_per_file: int = 5,
) -> list[dict]:
    """Fetch up to `chunks_per_file` code chunks for each path in `file_paths`.

    Uses Qdrant payload filtering (no vector search) since we already know
    the exact files we want.  Returns dicts compatible with ``build_context()``.
    """
    from qdrant_client.models import FieldCondition, Filter, MatchAny

    if not file_paths:
        return []

    collection = f"project_{project_id}"
    client = get_qdrant_client()

    # Check the collection exists before scrolling
    try:
        collections = await client.get_collections()
        names = [c.name for c in collections.collections]
        if collection not in names:
            return []
    except Exception:
        return []

    scroll_filter = Filter(
        must=[
            FieldCondition(
                key="file_path",
                match=MatchAny(any=file_paths),
            )
        ]
    )

    try:
        results, _ = await client.scroll(
            collection_name=collection,
            scroll_filter=scroll_filter,
            limit=len(file_paths) * chunks_per_file,
            with_payload=True,
            with_vectors=False,
        )
    except Exception:
        return []

    # Group by file and cap at chunks_per_file per file
    seen: dict[str, int] = {}
    chunks: list[dict] = []
    for point in results:
        p = point.payload or {}
        fp = p.get("file_path", "")
        if seen.get(fp, 0) >= chunks_per_file:
            continue
        seen[fp] = seen.get(fp, 0) + 1
        chunks.append({
            "file_path": fp,
            "code": p.get("code", ""),
            "start_line": p.get("start_line", 0),
            "end_line": p.get("end_line", 0),
            "score": 1.0,  # not ranked by vector similarity — included by intent
        })

    return chunks
