from fastapi import APIRouter, Depends

from app.core.auth import get_current_user
from app.services.graph.graph_queries import (
    get_graph_edges,
    get_graph_nodes,
    get_graph_stats,
    get_subgraph,
    get_circular_deps,
)

router = APIRouter()


@router.get("/{project_id}/nodes")
async def nodes(
    project_id: str, skip: int = 0, limit: int = 200, cu=Depends(get_current_user)
):
    return await get_graph_nodes(project_id, skip=skip, limit=limit)


@router.get("/{project_id}/edges")
async def edges(
    project_id: str, skip: int = 0, limit: int = 500, cu=Depends(get_current_user)
):
    return await get_graph_edges(project_id, skip=skip, limit=limit)


@router.get("/{project_id}/subgraph")
async def subgraph(
    project_id: str, file_path: str, hops: int = 2, cu=Depends(get_current_user)
):
    return await get_subgraph(project_id, file_path, hops=hops)


@router.get("/{project_id}/stats")
async def stats(project_id: str, cu=Depends(get_current_user)):
    return await get_graph_stats(project_id)


@router.get("/{project_id}/cycles")
async def cycles(project_id: str, cu=Depends(get_current_user)):
    return await get_circular_deps(project_id)
