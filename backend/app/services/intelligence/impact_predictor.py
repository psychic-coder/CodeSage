from app.services.rag.retriever import hybrid_retrieve
from app.services.rag.context_builder import build_context
from app.services.graph.impact_calculator import bfs_impact
from app.services.llm.client import llm_complete
from app.services.llm.prompts import IMPACT_INTENT_PROMPT, IMPACT_SYNTHESIS_PROMPT
from app.services.llm.output_parser import extract_json


async def predict_impact(project_id: str, feature_description: str) -> dict:
    intent_raw = await llm_complete(
        IMPACT_INTENT_PROMPT.format(feature_description=feature_description),
        json_mode=True
    )
    intent = extract_json(intent_raw) or {}
    confidence = intent.get("confidence", 0.5)
    if confidence < 0.4:
        return {"error": "Feature description too vague — please be more specific"}

    chunks = await hybrid_retrieve(project_id, feature_description, top_k=20)
    seed_files = list({c["file_path"] for c in chunks if c.get("file_path")})
    impacted = await bfs_impact(project_id, seed_files, max_depth=3)
    impacted = impacted[:50]

    context = build_context(chunks)
    impacted_summary = "\n".join(
        f"- {f['path']} (depth={f['depth']}, score={f['impact_score']})"
        for f in impacted
    )
    raw = await llm_complete(
        IMPACT_SYNTHESIS_PROMPT.format(
            feature_description=feature_description,
            context=context,
            impacted_files=impacted_summary
        ),
        json_mode=True, max_tokens=2000
    )
    result = extract_json(raw)
    if not result:
        return {"error": "Failed to parse impact analysis", "raw": raw[:500]}
    return result