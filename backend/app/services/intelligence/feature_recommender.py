from app.services.llm.client import llm_complete_json
from app.services.llm.prompts import FEATURE_RECOMMENDATION_PROMPT


async def recommend_features(project_id: str) -> dict:
    # Minimal context: project_id (could be extended)
    prompt = FEATURE_RECOMMENDATION_PROMPT.format(domain="codebase", existing_features=[], arch_summary="")
    try:
        return await llm_complete_json(prompt, max_tokens=800)
    except Exception:
        return {"detected_domain": "unknown", "recommendations": []}
from app.services.graph.graph_queries import get_graph_stats
from app.services.llm.client import llm_complete
from app.services.llm.prompts import FEATURE_RECOMMENDATION_PROMPT
from app.services.llm.output_parser import extract_json


async def recommend_features(project_id: str) -> dict:
    stats = await get_graph_stats(project_id)
    arch_summary = f"Top files: {[f['path'] for f in stats['top_files'][:5]]}"
    existing_features = _infer_features(stats)

    raw = await llm_complete(
        FEATURE_RECOMMENDATION_PROMPT.format(
            domain="software",
            existing_features=existing_features,
            arch_summary=arch_summary
        ),
        json_mode=True, max_tokens=2000
    )
    result = extract_json(raw)
    return result or {"error": "Feature recommendation failed"}


def _infer_features(stats: dict) -> list[str]:
    features = []
    for f in stats.get("top_files", []):
        path = f["path"].lower()
        if "auth" in path: features.append("authentication")
        elif "user" in path: features.append("user_management")
        elif "pay" in path: features.append("payments")
        elif "order" in path: features.append("orders")
        elif "product" in path: features.append("product_catalog")
    return list(set(features))