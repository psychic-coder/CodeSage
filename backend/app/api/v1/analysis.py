import hashlib
import json

from fastapi import APIRouter, Depends
from sqlalchemy import select, delete
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


async def _cached(db, project_id, query_type, query_text, fn):
    qhash = hashlib.sha256(f"{project_id}:{query_text}".encode()).hexdigest()
    row = (
        await db.execute(
            select(AnalysisCache).where(
                AnalysisCache.project_id == project_id,
                AnalysisCache.query_hash == qhash,
            )
        )
    ).scalar_one_or_none()
    if row:
        return json.loads(row.result_json), True
    data = await fn()
    db.add(
        AnalysisCache(
            project_id=project_id,
            query_hash=qhash,
            query_type=query_type,
            query_text=query_text,
            result_json=json.dumps(data),
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
        db, req.project_id, "impact", desc, lambda: analyze_impact(req.project_id, desc)
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
            result=data,
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
    from app.services.intelligence.improvement_suggester import suggest_improvements

    cats = categories.split(",") if categories else None
    data, cached = await _cached(
        db,
        project_id,
        "improvements",
        f"improvements:{categories}",
        lambda: suggest_improvements(project_id, cats),
    )
    return AnalysisResponse(data=data, cached=cached)


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
    )
    return AnalysisResponse(data=data, cached=cached)
