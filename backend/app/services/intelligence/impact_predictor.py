import uuid
import structlog

from app.services.graph.impact_calculator import bfs_impact
from app.services.llm.client import llm_complete_json_with_keys
from app.services.llm.output_parser import sanitize_user_text, clean_for_prompt
from app.services.llm.prompts import (
    IMPACT_CLASSIFIER_PROMPT,
    IMPACT_SYNTHESIS_PROMPT,
    TECH_INTEGRATION_PROMPT,
    ARCHITECTURE_QUESTION_PROMPT,
    CLARIFICATION_SYNTHESIS_PROMPT
)
from app.services.rag.context_builder import build_context
from app.services.rag.retriever import hybrid_retrieve

logger = structlog.get_logger()

# In-memory fallback store for sessions (used if Redis is unavailable)
_FALLBACK_STORE: dict[str, bool] = {}
_SESSION_TTL = 1800  # 30 minutes

async def _session_create(session_id: str) -> None:
    try:
        from app.database.redis import get_redis
        redis = get_redis()
        await redis.setex(f"session:{session_id}", _SESSION_TTL, "1")
    except Exception as e:
        logger.warning("redis_session_create_failed_fallback_to_memory", error=str(e))
        _FALLBACK_STORE[session_id] = True

async def _session_exists(session_id: str) -> bool:
    try:
        from app.database.redis import get_redis
        redis = get_redis()
        return bool(await redis.exists(f"session:{session_id}"))
    except Exception as e:
        logger.warning("redis_session_exists_failed_fallback_to_memory", error=str(e))
        return session_id in _FALLBACK_STORE

async def _session_delete(session_id: str) -> None:
    try:
        from app.database.redis import get_redis
        redis = get_redis()
        await redis.delete(f"session:{session_id}")
    except Exception as e:
        logger.warning("redis_session_delete_failed_fallback_to_memory", error=str(e))
        _FALLBACK_STORE.pop(session_id, None)

async def analyze_impact(
    project_id: str, 
    feature_description: str,
    session_id: str | None = None,
    conversation_history: list[dict] | None = None
) -> dict:
    feature_description = sanitize_user_text(feature_description)
    if not feature_description:
        return {"error": "Feature description is empty"}

    # If it's an ongoing session
    if session_id and conversation_history:
        return await _handle_clarification_synthesis(
            project_id, 
            feature_description, 
            session_id, 
            conversation_history
        )

    clean_query = clean_for_prompt(feature_description)

    classification = await llm_complete_json_with_keys(
        IMPACT_CLASSIFIER_PROMPT.format(query=clean_query),
        required_keys=["type"]
    )
    
    query_type = classification.get("type", "code_change")
    logger.info("impact_classification", query_type=query_type, confidence=classification.get("confidence"))

    if query_type == "needs_clarification":
        return await _handle_needs_clarification(classification)
    elif query_type == "tech_integration":
        return await _handle_tech_integration(project_id, clean_query)
    elif query_type in ("architecture_question", "process_question"):
        return await _handle_architecture_question(project_id, clean_query)
    else:
        return await _handle_code_change(project_id, clean_query)


async def _handle_needs_clarification(classification: dict) -> dict:
    new_session_id = str(uuid.uuid4())
    await _session_create(new_session_id)
    
    questions = classification.get("clarification_questions", [
        "Could you provide a bit more detail about what you want to achieve?",
        "Are there specific files or modules you want to modify?"
    ])
    
    return {
        "type": "clarification",
        "session_id": new_session_id,
        "questions": [{"id": f"q_{i}", "question": q} for i, q in enumerate(questions)]
    }

async def _handle_clarification_synthesis(project_id: str, current_query: str, session_id: str, conversation_history: list[dict]) -> dict:
    if not await _session_exists(session_id):
        # Just in case session is lost, default to standard prediction
        return await _handle_code_change(project_id, current_query)
        
    # Format history
    history_text = "\n".join([f"Q: {msg.get('question')}\nA: {msg.get('answer')}" for msg in conversation_history])
    
    chunks = await hybrid_retrieve(project_id, current_query, top_k=20)
    context = build_context(chunks)
    
    try:
        result = await llm_complete_json_with_keys(
            CLARIFICATION_SYNTHESIS_PROMPT.format(
                original_query=current_query,
                conversation_history=history_text,
                context=context
            ),
            required_keys=["answer"],
            max_tokens=2000,
        )
        result["type"] = "architecture_question" # Render it like an architecture answer
        
        # Cleanup session
        await _session_delete(session_id)
        
        return result
    except Exception as e:
        logger.error("clarification_synthesis_failed", error=str(e))
        return {"error": "Failed to synthesize answer", "details": str(e)}

async def _handle_tech_integration(project_id: str, query: str) -> dict:
    chunks = await hybrid_retrieve(project_id, query, top_k=20)
    context = build_context(chunks)
    
    try:
        result = await llm_complete_json_with_keys(
            TECH_INTEGRATION_PROMPT.format(
                feature_description=query,
                context=context
            ),
            required_keys=[
                "technology",
                "summary",
                "integration_steps",
                "files_to_modify",
                "files_to_create",
                "dependencies_to_add",
                "estimated_complexity"
            ],
            max_tokens=2500,
            retries=2
        )
        result["type"] = "tech_integration"
        return result
    except Exception as e:
        logger.error("tech_integration_failed", error=str(e))
        return {"error": "Failed to analyze technology integration", "details": str(e)}

async def _handle_architecture_question(project_id: str, query: str) -> dict:
    chunks = await hybrid_retrieve(project_id, query, top_k=20)
    context = build_context(chunks)
    
    try:
        result = await llm_complete_json_with_keys(
            ARCHITECTURE_QUESTION_PROMPT.format(
                query=query,
                context=context
            ),
            required_keys=["answer", "relevant_files"],
            max_tokens=2000,
            retries=2
        )
        result["type"] = "architecture_question"
        return result
    except Exception as e:
        logger.error("architecture_question_failed", error=str(e))
        return {"error": "Failed to answer architecture question", "details": str(e)}

async def _handle_code_change(project_id: str, feature_description: str) -> dict:
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
            required_keys=[
                "files_to_modify",
                "files_to_create",
                "downstream_risks",
                "dependencies_to_add",
                "estimated_complexity",
            ],
            max_tokens=2000,
            retries=2,
        )
        result["type"] = "code_change"
        return result
    except Exception as e:
        logger.error(
            "llm_synthesis_failed", error=str(e), query_type="impact_predictor"
        )
        return {"error": "Failed to parse impact analysis", "details": str(e)}
