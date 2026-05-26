from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.database.postgres import get_db
from app.models.postgres.job import ProcessingJob

router = APIRouter()


@router.get("/{job_id}")
async def get_job(
    job_id: str, cu=Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ProcessingJob).where(ProcessingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job.id,
        "project_id": job.project_id,
        "status": job.status,
        "progress": job.progress,
        "current_step": job.current_step,
        "error_message": job.error_message,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "created_at": job.created_at,
    }
