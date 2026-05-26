from fastapi import APIRouter
from app.api.v1 import auth, projects, ingest, analysis, query, graph, jobs

router = APIRouter()
router.include_router(auth.router,     prefix="/auth",     tags=["auth"])
router.include_router(projects.router, prefix="/projects", tags=["projects"])
router.include_router(ingest.router,   prefix="/ingest",   tags=["ingest"])
router.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
router.include_router(query.router,    prefix="/query",    tags=["query"])
router.include_router(graph.router,    prefix="/graph",    tags=["graph"])
router.include_router(jobs.router,     prefix="/jobs",     tags=["jobs"])