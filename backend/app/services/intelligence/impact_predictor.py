from app.services.rag.retriever import hybrid_retrieve
from app.services.rag.context_builder import build_context
from app.services.graph.impact_calculator import bfs_impact
from app.services.llm.client import llm_complete_json_with_keys
from app.services.llm.prompts import IMPACT_INTENT_PROMPT, IMPACT_SYNTHESIS_PROMPT
from app.services.llm.output_parser import sanitize_user_text
import structlog

logger = structlog.get_logger()


async def predict_impact(project_id: str, feature_description: str) -> dict:
    feature_description = sanitize_user_text(feature_description)
    if not feature_description:
        return {"error": "Feature description too vague — please be more specific"}

    intent = await llm_complete_json_with_keys(
        IMPACT_INTENT_PROMPT.format(feature_description=feature_description),
        required_keys=["confidence", "primary_domain", "entities_affected", "action_types", "keywords"],
    )
    if float(intent.get("confidence", 0.5)) < 0.4:
        return {"error": "Feature description too vague — please be more specific"}

    chunks = await hybrid_retrieve(project_id, feature_description, top_k=20)
    seed_files = list({c["file_path"] for c in chunks if c.get("file_path")})
    impacted = (await bfs_impact(project_id, seed_files, max_depth=3))[:50]

    context = build_context(chunks)
    impacted_summary = "\n".join(
        f"- {f['path']} (depth={f['depth']}, score={f['impact_score']})"
        for f in impacted
    )
    try:
        result = await llm_complete_json_with_keys(
            IMPACT_SYNTHESIS_PROMPT.format(
                feature_description=feature_description,
                context=context,
                impacted_files=impacted_summary,
            ),
            required_keys=["files_to_modify", "files_to_create", "downstream_risks", "dependencies_to_add", "estimated_complexity"],
            max_tokens=2000,
            retries=2,
        )
        return result
    except Exception as e:
        logger.error("llm_synthesis_failed", error=str(e), query_type="impact_predictor")
        return {"error": "Failed to parse impact analysis", "details": str(e)}