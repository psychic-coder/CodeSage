import hashlib
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database.postgres import get_db
from app.models.postgres.job import AnalysisCache
from app.models.schemas.analysis import (
    AnalysisResponse,
    ImpactRequest,
    OnboardingRequest,
    PropagationRequest,
)
from app.services.llm.output_parser import sanitize_user_text

router = APIRouter()


async def _cached(db, project_id, query_type, query_text, fn, ttl_hours=24):
    qhash = hashlib.sha256(f"{project_id}:{query_text}".encode()).hexdigest()

    # Only return cache if not expired
    stmt = select(AnalysisCache).where(
        AnalysisCache.project_id == project_id,
        AnalysisCache.query_hash == qhash,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()

    if row:
        if row.expires_at is None or row.expires_at > datetime.utcnow():
            return json.loads(row.result_json), True
        else:
            # Delete expired row
            await db.delete(row)
            await db.commit()

    data = await fn()
    db.add(
        AnalysisCache(
            project_id=project_id,
            query_hash=qhash,
            query_type=query_type,
            query_text=query_text,
            result_json=json.dumps(data),
            expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
        )
    )
    await db.commit()
    return data, False


@router.post("/impact", response_model=AnalysisResponse)
async def impact(
    req: ImpactRequest, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    from app.services.intelligence.impact_predictor import analyze_impact

    desc = sanitize_user_text(req.feature_description)

    # If it's a conversation session, do not cache
    if req.session_id:
        data = await analyze_impact(
            req.project_id,
            desc,
            session_id=req.session_id,
            conversation_history=req.conversation_history
        )
        return AnalysisResponse(data=data, cached=False)

    data, cached = await _cached(
        db, req.project_id, "impact", desc, lambda: analyze_impact(req.project_id, desc), ttl_hours=12
    )
    return AnalysisResponse(data=data, cached=cached)


@router.post("/propagation", response_model=AnalysisResponse)
async def propagation(req: PropagationRequest, cu=Depends(get_current_user)):
    from app.services.graph.graph_queries import get_propagation_tree

    data = await get_propagation_tree(req.project_id, req.file_path, req.change_type)
    return AnalysisResponse(data=data)


@router.get("/architecture/{project_id}", response_model=AnalysisResponse)
async def architecture(
    project_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    from app.services.intelligence.architecture_analyzer import analyze_architecture

    data, cached = await _cached(
        db,
        project_id,
        "architecture",
        "architecture",
        lambda: analyze_architecture(project_id),
        ttl_hours=48
    )
    return AnalysisResponse(data=data, cached=cached)


@router.post("/architecture/{project_id}/refresh", response_model=AnalysisResponse)
async def architecture_refresh(
    project_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    from app.services.intelligence.architecture_analyzer import analyze_architecture

    await db.execute(
        delete(AnalysisCache).where(
            AnalysisCache.project_id == project_id,
            AnalysisCache.query_type == "architecture"
        )
    )
    await db.commit()

    data = await analyze_architecture(project_id)
    # Save the fresh data to cache manually so it behaves exactly like _cached
    qhash = hashlib.sha256(f"{project_id}:architecture".encode()).hexdigest()
    db.add(
        AnalysisCache(
            project_id=project_id,
            query_type="architecture",
            query_hash=qhash,
            query_text="architecture",
            result_json=json.dumps(data),
        )
    )
    await db.commit()

    return AnalysisResponse(data=data, cached=False)


@router.get("/improvements/{project_id}", response_model=AnalysisResponse)
async def improvements(
    project_id: str,
    categories: str = "",
    cu=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # categories is used directly in the hash; the split list is not needed here
    qhash = hashlib.sha256(f"{project_id}:improvements:{categories}".encode()).hexdigest()

    stmt = select(AnalysisCache).where(
        AnalysisCache.project_id == project_id,
        AnalysisCache.query_hash == qhash,
    )
    row = (await db.execute(stmt)).scalar_one_or_none()

    if row and (row.expires_at is None or row.expires_at > datetime.utcnow()):
        return AnalysisResponse(data=json.loads(row.result_json), cached=True)

    return AnalysisResponse(data=[], cached=False)




@router.get("/improvements/{project_id}/stream")
async def improvements_stream(
    project_id: str,
    categories: str = "",
    cu=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.intelligence.improvement_suggester import (
        suggest_improvements_batched,
    )

    cats = categories.split(",") if categories else None

    async def event_generator():
        all_issues = []
        try:
            async for chunk in suggest_improvements_batched(project_id, cats):
                if chunk["type"] == "batch":
                    all_issues.extend(chunk.get("issues", []))

                # Yield SSE event
                yield f"data: {json.dumps(chunk)}\n\n"

            # After all chunks are done, cache the final aggregated result
            if all_issues:
                qhash = hashlib.sha256(f"{project_id}:improvements:{categories}".encode()).hexdigest()
                db.add(
                    AnalysisCache(
                        project_id=project_id,
                        query_hash=qhash,
                        query_type="improvements",
                        query_text=f"improvements:{categories}",
                        result_json=json.dumps(all_issues),
                        expires_at=datetime.utcnow() + timedelta(hours=24),
                    )
                )
                await db.commit()

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/recommendations/{project_id}", response_model=AnalysisResponse)
async def recommendations(
    project_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    from app.services.intelligence.feature_recommender import recommend_features

    data, cached = await _cached(
        db,
        project_id,
        "recommendations",
        "recommendations",
        lambda: recommend_features(project_id),
        ttl_hours=24
    )
    return AnalysisResponse(data=data, cached=cached)


@router.post("/onboarding", response_model=AnalysisResponse)
async def onboarding(
    req: OnboardingRequest,
    cu=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.services.intelligence.onboarding_guide import generate_onboarding

    topic = sanitize_user_text(req.topic)
    data, cached = await _cached(
        db,
        req.project_id,
        "onboarding",
        topic,
        lambda: generate_onboarding(req.project_id, topic),
        ttl_hours=6
    )
    return AnalysisResponse(data=data, cached=cached)
