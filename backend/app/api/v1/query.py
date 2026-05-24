from fastapi import APIRouter, Depends
from app.models.schemas.analysis import QueryRequest, AnalysisResponse
from app.core.auth import get_current_user

router = APIRouter()


@router.post("", response_model=AnalysisResponse)
async def nl_query(req: QueryRequest, cu=Depends(get_current_user)):
    from app.services.rag.graph_rag import graph_rag_query
    data = await graph_rag_query(req.project_id, req.query[:2000])
    return AnalysisResponse(data=data)