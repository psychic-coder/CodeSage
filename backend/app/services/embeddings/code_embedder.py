import hashlib
import json

from app.config import settings
from app.database.redis import get_redis
from app.services.embeddings.chunk_splitter import split_into_chunks
from app.services.embeddings.vector_store import upsert_chunks
from app.services.llm.client import get_embeddings


async def embed_all_files(project_id: str, parsed_files: list[dict]):
    all_chunks = []
    for pf in parsed_files:
        try:
            chunks = split_into_chunks(pf)
            all_chunks.extend(chunks)
        except Exception:
            pass

    batch_size = settings.embedding_batch_size
    redis = get_redis()
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i : i + batch_size]
        texts = [c["code"] for c in batch]

        # Check cache for existing embeddings
        cached_vectors = {}
        to_query = []
        idx_map = []
        for idx, t in enumerate(texts):
            sha = hashlib.sha256(t.encode("utf-8")).hexdigest()
            cached = await redis.get(f"embed:{sha}")
            if cached:
                try:
                    cached_vectors[idx] = json.loads(cached)
                except Exception:
                    to_query.append(t)
                    idx_map.append(idx)
            else:
                to_query.append(t)
                idx_map.append(idx)

        vectors = [None] * len(texts)
        # Fill cached
        for k, v in cached_vectors.items():
            vectors[k] = v

        if to_query:
            new_vecs = await get_embeddings(to_query)
            for i2, vec in enumerate(new_vecs):
                pos = idx_map[i2]
                vectors[pos] = vec
                # store in redis cache
                sha = hashlib.sha256(texts[pos].encode("utf-8")).hexdigest()
                try:
                    await redis.set(f"embed:{sha}", json.dumps(vec))
                except Exception:
                    pass

        # Upsert into vector store
        await upsert_chunks(project_id, batch, vectors)
