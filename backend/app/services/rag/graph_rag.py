from app.services.rag.retriever import hybrid_retrieve
from app.services.rag.context_builder import build_context
from app.services.llm.client import llm_complete
from app.services.llm.prompts import GRAPH_RAG_QUERY_PROMPT


async def graph_rag_query(project_id: str, query: str) -> dict:
    chunks = await hybrid_retrieve(project_id, query)
    context = build_context(chunks)
    answer = await llm_complete(
        GRAPH_RAG_QUERY_PROMPT.format(context=context, query=query),
        max_tokens=1000
    )
    return {
        "query": query,
        "answer": answer,
        "sources": [{"file": c.get("file_path"), "score": c.get("score")} for c in chunks[:5]]
    }