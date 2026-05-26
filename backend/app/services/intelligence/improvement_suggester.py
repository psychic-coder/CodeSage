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

# Maximum nodes to inspect.  We fetch in pages and keep the riskiest ones so
# that large repos with thousands of files still surface real issues.
_PAGE_SIZE = 100
_MAX_PAGES = 5          # fetch at most 500 nodes total
_CONTEXT_NODES = 60     # pass the top-N riskiest nodes to the LLM


async def _fetch_all_nodes(project_id: str) -> list[dict]:
    """Fetch nodes across pages and return them sorted by risk_score desc."""
    all_nodes: list[dict] = []
    for page in range(_MAX_PAGES):
        batch = await get_graph_nodes(project_id, skip=page * _PAGE_SIZE, limit=_PAGE_SIZE)
        if not batch:
            break
        all_nodes.extend(batch)
        if len(batch) < _PAGE_SIZE:
            break   # last page
    # sort descending by risk so the LLM sees the most dangerous files first
    all_nodes.sort(key=lambda n: float(n.get("risk_score") or 0), reverse=True)
    return all_nodes


async def suggest_improvements(project_id: str, categories: list[str] | None = None) -> list[dict]:
    cats = categories or ["performance", "security", "refactoring"]
    all_nodes = await _fetch_all_nodes(project_id)
    top_nodes = all_nodes[:_CONTEXT_NODES]

    context_parts = [
        f"- {node['path']} (risk={node.get('risk_score', 0):.3f}, complexity={node.get('complexity_score', 1)})"
        for node in top_nodes
    ]
    context = (
        f"Analysing top {len(top_nodes)} highest-risk files out of {len(all_nodes)} total:\n"
        + "\n".join(context_parts)
    )

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
        if isinstance(result, dict) and "improvements" in result:
            return result["improvements"]
        if isinstance(result, dict) and "issues" in result:
            return result["issues"]
        return []
    except Exception as e:
        logger.error("llm_synthesis_failed", error=str(e), query_type="improvement_suggester")
        return []