from __future__ import annotations

import re

from app.services.graph.graph_queries import get_graph_nodes
from app.services.llm.client import llm_complete
from app.services.llm.output_parser import extract_json
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT

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

    raw = await llm_complete(
        IMPROVEMENT_ANALYSIS_PROMPT.format(
            categories=", ".join(cats),
            context=context,
        ),
        json_mode=True,
        max_tokens=3000,
    )
    result = extract_json(raw)
    if isinstance(result, list):
        return result
    return []