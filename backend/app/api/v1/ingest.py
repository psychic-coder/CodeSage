import uuid, re
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database.postgres import get_db
from app.models.postgres.project import Project
from app.models.postgres.job import ProcessingJob
from app.core.auth import get_current_user
from app.workers.tasks import process_repository

router = APIRouter()
GITHUB_RE = re.compile(r'^https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+')


class GitHubIngestRequest(BaseModel):
    project_id: str
    url: str
    github_token: str | None = None


class LocalIngestRequest(BaseModel):
    project_id: str
    local_path: str


async def _get_project(project_id: str, user_id: str, db):
    p = (await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id))).scalar_one_or_none()
    if not p: raise HTTPException(404, "Project not found")
    return p


async def _create_job(project_id: str, db) -> ProcessingJob:
    job = ProcessingJob(id=str(uuid.uuid4()), project_id=project_id, job_type="ingestion")
    db.add(job); await db.commit()
    return job


@router.post("/github")
async def ingest_github(req: GitHubIngestRequest, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not GITHUB_RE.match(req.url):
        raise HTTPException(400, "Invalid GitHub URL")
    p = await _get_project(req.project_id, cu["user_id"], db)
    p.source_url = req.url; p.status = "processing"
    job = await _create_job(req.project_id, db)
    task = process_repository.delay(req.project_id, "github", req.url)
    job.celery_task_id = task.id; await db.commit()
    return {"job_id": job.id}


@router.post("/zip")
async def ingest_zip(project_id: str, file: UploadFile = File(...), cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if file.content_type not in ("application/zip", "application/x-tar", "application/gzip", "application/x-gzip"):
        raise HTTPException(400, "Only zip/tar.gz accepted")
    p = await _get_project(project_id, cu["user_id"], db)
    import tempfile, aiofiles
    suffix = ".zip" if "zip" in (file.content_type or "") else ".tar.gz"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    async with aiofiles.open(tmp.name, "wb") as out:
        await out.write(await file.read())
    p.status = "processing"
    job = await _create_job(project_id, db)
    task = process_repository.delay(project_id, "zip", tmp.name)
    job.celery_task_id = task.id; await db.commit()
    return {"job_id": job.id}


@router.post("/local")
async def ingest_local(req: LocalIngestRequest, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    p = await _get_project(req.project_id, cu["user_id"], db)
    p.status = "processing"
    job = await _create_job(req.project_id, db)
    task = process_repository.delay(req.project_id, "local", req.local_path)
    job.celery_task_id = task.id; await db.commit()
    return {"job_id": job.id}