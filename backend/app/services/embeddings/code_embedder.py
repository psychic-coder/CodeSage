from app.services.embeddings.chunk_splitter import split_into_chunks
from app.services.embeddings.vector_store import upsert_chunks
from app.services.llm.client import get_embeddings
from app.config import settings


async def embed_all_files(project_id: str, parsed_files: list[dict]):
    all_chunks = []
    for pf in parsed_files:
        try:
            chunks = split_into_chunks(pf)
            all_chunks.extend(chunks)
        except Exception:
            pass

    batch_size = settings.embedding_batch_size
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i + batch_size]
        texts = [c["code"] for c in batch]
        vectors = await get_embeddings(texts)
        await upsert_chunks(project_id, batch, vectors)