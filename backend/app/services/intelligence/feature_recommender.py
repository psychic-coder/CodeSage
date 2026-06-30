from __future__ import annotations

import structlog

from app.services.graph.graph_queries import get_graph_stats
from app.services.llm.client import llm_complete_json_with_keys
from app.services.llm.prompts import FEATURE_RECOMMENDATION_PROMPT

logger = structlog.get_logger()


_FEATURE_KEYWORDS = {
    "auth":          "authentication",
    "login":         "authentication",
    "oauth":         "oauth",
    "token":         "token_management",
    "user":          "user_management",
    "profile":       "user_profiles",
    "pay":           "payments",
    "billing":       "billing",
    "stripe":        "stripe_integration",
    "invoice":       "invoicing",
    "order":         "order_management",
    "cart":          "shopping_cart",
    "product":       "product_catalog",
    "inventory":     "inventory_management",
    "search":        "search",
    "email":         "email_notifications",
    "notif":         "notifications",
    "webhook":       "webhooks",
    "admin":         "admin_panel",
    "report":        "reporting",
    "analytic":      "analytics",
    "dashboard":     "dashboards",
    "file":          "file_management",
    "upload":        "file_uploads",
    "export":        "data_export",
    "import":        "data_import",
    "cache":         "caching",
    "queue":         "job_queues",
    "schedule":      "scheduled_jobs",
    "task":          "task_management",
    "graph":         "graph_analysis",
    "embed":         "embeddings",
    "llm":           "llm_integration",
    "ml":            "machine_learning",
    "ingest":        "data_ingestion",
    "pipeline":      "data_pipelines",
    "test":          "testing",
    "log":           "logging",
    "monitor":       "monitoring",
    "metric":        "metrics",
    "config":        "configuration_management",
    "setting":       "settings",
    "role":          "role_based_access",
    "permission":    "permissions",
    "api":           "rest_api",
    "websocket":     "websockets",
    "chat":          "chat",
    "comment":       "comments",
    "review":        "reviews",
}

async def recommend_features(project_id: str) -> dict:
    from app.services.graph.graph_queries import get_graph_nodes
    stats = await get_graph_stats(project_id)
    node_count = stats.get("node_count", 0)
    edge_count = stats.get("edge_count", 0)
    arch_summary = f"Top files: {[file_info['path'] for file_info in stats.get('top_files', [])[:5]]}. Total nodes: {node_count}, Total edges: {edge_count}."

    # Fetch more nodes for a better feature inference (up to 200 nodes, 2 pages)
    nodes = await get_graph_nodes(project_id, limit=100, skip=0)
    nodes.extend(await get_graph_nodes(project_id, limit=100, skip=100))

    existing_features = _infer_features_from_nodes(nodes)

    try:
        result = await llm_complete_json_with_keys(
            FEATURE_RECOMMENDATION_PROMPT.format(
                domain="software",
                existing_features=existing_features,
                arch_summary=arch_summary,
            ),
            required_keys=["detected_domain", "existing_features", "recommendations"],
            max_tokens=2000,
            retries=2,
        )
        return result
    except Exception as e:
        logger.error(
            "llm_synthesis_failed", error=str(e), query_type="feature_recommendation"
        )
        return {"error": "Feature recommendation failed", "details": str(e)}


def _infer_features_from_nodes(nodes: list[dict]) -> list[str]:
    features: set[str] = set()
    for node in nodes:
        path = node.get("path", "").lower()
        for kw, feature in _FEATURE_KEYWORDS.items():
            if kw in path:
                features.add(feature)
    return sorted(features)
