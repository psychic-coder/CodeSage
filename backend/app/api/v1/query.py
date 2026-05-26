from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.models.schemas.analysis import AnalysisResponse, QueryRequest
from app.services.llm.output_parser import sanitize_user_text

router = APIRouter()


@router.post("", response_model=AnalysisResponse)
async def nl_query(req: QueryRequest, cu=Depends(get_current_user)):
    from app.services.rag.graph_rag import graph_rag_query

    data = await graph_rag_query(req.project_id, sanitize_user_text(req.query))
    return AnalysisResponse(data=data)
