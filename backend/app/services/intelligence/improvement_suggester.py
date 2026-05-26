from app.services.llm.client import llm_complete_json
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT
from app.services.rag.retriever import hybrid_retrieve


async def suggest_improvements(project_id: str, categories: list[str] | None = None) -> list:
    # Small context from retrieval
    chunks = await hybrid_retrieve(project_id, "improvement suggestions", top_k=10)
    context = "\n\n".join([c.get("code", c.get("file_path", "")) for c in chunks[:5]])
    cats = ",".join(categories) if categories else "all"
    prompt = IMPROVEMENT_ANALYSIS_PROMPT.format(categories=cats, context=context)
    try:
        return await llm_complete_json(prompt, max_tokens=1000)
    except Exception:
        return []
from app.services.graph.graph_queries import get_graph_nodes
from app.services.llm.client import llm_complete
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT
from app.services.llm.output_parser import extract_json
import re

HARDCODED_SECRET_RE = re.compile(
    r'(?:api_key|apikey|password|secret|token|auth)\s*=\s*["\'][^"\']{8,}["\']',
    re.IGNORECASE
)


async def suggest_improvements(project_id: str, categories: list[str] | None = None) -> list[dict]:
    cats = categories or ["performance", "security", "refactoring"]
    nodes = await get_graph_nodes(project_id, limit=50)
    context_parts = [f"- {n['path']} (risk={n.get('risk_score', 0)}, complexity={n.get('complexity_score', 1)})" for n in nodes]
    context = "\n".join(context_parts)

    raw = await llm_complete(
        IMPROVEMENT_ANALYSIS_PROMPT.format(
            categories=", ".join(cats),
            context=context
        ),
        json_mode=True, max_tokens=3000
    )
    result = extract_json(raw)
    if isinstance(result, list):
        return result
    return []