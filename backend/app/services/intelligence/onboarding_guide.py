from __future__ import annotations

from app.services.llm.client import llm_complete
from app.services.llm.output_parser import extract_json, sanitize_user_text
from app.services.llm.prompts import ONBOARDING_GUIDE_PROMPT
from app.services.rag.context_builder import build_context
from app.services.rag.retriever import hybrid_retrieve


async def generate_onboarding(project_id: str, topic: str) -> dict:
    topic = sanitize_user_text(topic)
    chunks = await hybrid_retrieve(project_id, topic, top_k=15)
    context = build_context(chunks)
    raw = await llm_complete(
        ONBOARDING_GUIDE_PROMPT.format(topic=topic, context=context),
        json_mode=True,
        max_tokens=2500,
    )
    result = extract_json(raw)
    return result or {"topic": topic, "error": "Onboarding guide generation failed"}