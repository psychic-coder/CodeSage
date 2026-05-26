from app.services.rag.retriever import hybrid_retrieve
from app.services.rag.context_builder import build_context
from app.services.llm.client import llm_complete, llm_complete_json
from app.services.llm.prompts import GRAPH_RAG_QUERY_PROMPT


async def graph_rag_query(project_id: str, query: str) -> dict:
    """Run a graph-augmented RAG query.

    Attempts to get a structured JSON response via `llm_complete_json` using a
    small wrapper that enforces a JSON schema. Falls back to plain-text
    `llm_complete` if structured JSON cannot be obtained.
    """
    chunks = await hybrid_retrieve(project_id, query)
    context = build_context(chunks)
    base_prompt = GRAPH_RAG_QUERY_PROMPT.format(context=context, query=query)

    # Ask the model to return only valid JSON with a predictable shape.
    json_prompt = (
        "Return ONLY valid JSON with the following schema:\n"
        '{"answer": "<string>", "rationale": "<string, optional>", "sources": [{"file": "<path>", "score": 0.0}] }\n\n'
        + base_prompt
    )

    try:
        parsed = await llm_complete_json(json_prompt, max_tokens=1000)
        if isinstance(parsed, dict):
            answer = parsed.get("answer") or parsed.get("answer_text") or str(parsed)
            sources_from_llm = parsed.get("sources")
        else:
            answer = str(parsed)
            sources_from_llm = None
    except Exception:
        # Fallback: plain text completion
        answer = await llm_complete(base_prompt, max_tokens=1000)
        sources_from_llm = None

    default_sources = [{"file": c.get("file_path"), "score": c.get("score")} for c in chunks[:5]]
    sources = sources_from_llm if isinstance(sources_from_llm, list) else default_sources

    return {
        "query": query,
        "answer": answer,
        "sources": sources,
    }