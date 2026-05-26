from __future__ import annotations

import re

from app.services.graph.graph_queries import get_graph_nodes
from app.services.llm.client import llm_complete_json
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT
import structlog

logger = structlog.get_logger()

HARDCODED_SECRET_RE = re.compile(
    r'(?:api_key|apikey|password|secret|token|auth)\s*=\s*["\'][^"\']{8,}["\']',
    re.IGNORECASE,
)


async def suggest_improvements(project_id: str, categories: list[str] | None = None) -> list[dict]:
    cats = categories or ["performance", "security", "refactoring"]
    nodes = await get_graph_nodes(project_id, limit=50)
    context_parts = [
        f"- {node['path']} (risk={node.get('risk_score', 0)}, complexity={node.get('complexity_score', 1)})"
        for node in nodes
    ]
    context = "\n".join(context_parts)

    try:
        result = await llm_complete_json(
            IMPROVEMENT_ANALYSIS_PROMPT.format(
                categories=", ".join(cats),
                context=context,
            ),
            max_tokens=3000,
            retries=2,
        )
        if isinstance(result, list):
            return result
        # if the LLM wrapped it in a dict e.g. {"improvements": [...]}
        elif isinstance(result, dict) and "improvements" in result:
            return result["improvements"]
        elif isinstance(result, dict) and "issues" in result:
            return result["issues"]
        return []
    except Exception as e:
        logger.error("llm_synthesis_failed", error=str(e), query_type="improvement_suggester")
        return []