from __future__ import annotations

from app.services.graph.graph_queries import get_graph_stats
from app.services.llm.client import llm_complete
from app.services.llm.output_parser import extract_json
from app.services.llm.prompts import FEATURE_RECOMMENDATION_PROMPT


async def recommend_features(project_id: str) -> dict:
    stats = await get_graph_stats(project_id)
    arch_summary = f"Top files: {[file_info['path'] for file_info in stats.get('top_files', [])[:5]]}"
    existing_features = _infer_features(stats)

    raw = await llm_complete(
        FEATURE_RECOMMENDATION_PROMPT.format(
            domain="software",
            existing_features=existing_features,
            arch_summary=arch_summary,
        ),
        json_mode=True,
        max_tokens=2000,
    )
    result = extract_json(raw)
    return result or {"error": "Feature recommendation failed"}


def _infer_features(stats: dict) -> list[str]:
    features: set[str] = set()
    for file_info in stats.get("top_files", []):
        path = file_info["path"].lower()
        if "auth" in path:
            features.add("authentication")
        elif "user" in path:
            features.add("user_management")
        elif "pay" in path:
            features.add("payments")
        elif "order" in path:
            features.add("orders")
        elif "product" in path:
            features.add("product_catalog")
    return sorted(features)