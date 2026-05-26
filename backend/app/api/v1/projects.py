import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database.postgres import get_db
from app.models.postgres.job import AnalysisCache
from app.models.postgres.project import Project
from app.models.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    rows = (
        (await db.execute(select(Project).where(Project.user_id == cu["user_id"])))
        .scalars()
        .all()
    )
    return rows


@router.post("", response_model=ProjectResponse)
async def create_project(
    req: ProjectCreate, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = Project(id=str(uuid.uuid4()), user_id=cu["user_id"], **req.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = (
        await db.execute(
            select(Project).where(
                Project.id == project_id, Project.user_id == cu["user_id"]
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    req: ProjectUpdate,
    cu=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    p = (
        await db.execute(
            select(Project).where(
                Project.id == project_id, Project.user_id == cu["user_id"]
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    for k, v in req.model_dump(exclude_none=True).items():
        setattr(p, k, v)
    await db.commit()
    await db.refresh(p)
    return p


@router.delete("/{project_id}")
async def delete_project(
    project_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = (
        await db.execute(
            select(Project).where(
                Project.id == project_id, Project.user_id == cu["user_id"]
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    await db.delete(p)
    await db.commit()
    return {"message": "Deleted"}


@router.post("/{project_id}/reanalyze")
async def reanalyze(
    project_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    p = (
        await db.execute(
            select(Project).where(
                Project.id == project_id, Project.user_id == cu["user_id"]
            )
        )
    ).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    await db.execute(
        delete(AnalysisCache).where(AnalysisCache.project_id == project_id)
    )

    from app.models.postgres.job import ProcessingJob

    job = ProcessingJob(
        id=str(uuid.uuid4()), project_id=project_id, job_type="reanalysis"
    )
    db.add(job)
    await db.commit()

    from app.workers.tasks import process_repository

    task = process_repository.delay(
        project_id, p.source_type, p.source_url or "", job.id
    )

    job.celery_task_id = task.id
    await db.commit()

    return {"job_id": job.id}
