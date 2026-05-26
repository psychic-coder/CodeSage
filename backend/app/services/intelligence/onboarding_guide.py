from __future__ import annotations

import structlog

from app.services.llm.client import llm_complete_json_with_keys
from app.services.llm.output_parser import sanitize_user_text
from app.services.llm.prompts import ONBOARDING_GUIDE_PROMPT
from app.services.rag.context_builder import build_context
from app.services.rag.retriever import hybrid_retrieve

logger = structlog.get_logger()


async def generate_onboarding(project_id: str, topic: str) -> dict:
    topic = sanitize_user_text(topic)
    chunks = await hybrid_retrieve(project_id, topic, top_k=15)
    context = build_context(chunks)
    try:
        result = await llm_complete_json_with_keys(
            ONBOARDING_GUIDE_PROMPT.format(topic=topic, context=context),
            required_keys=[
                "topic",
                "summary",
                "entry_points",
                "execution_flow",
                "key_files",
            ],
            max_tokens=2500,
            retries=2,
        )
        return result
    except Exception as e:
        logger.error(
            "llm_synthesis_failed", error=str(e), query_type="onboarding_guide"
        )
        return {
            "topic": topic,
            "error": "Onboarding guide generation failed",
            "details": str(e),
        }
