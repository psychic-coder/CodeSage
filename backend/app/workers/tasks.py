import asyncio, json
from datetime import datetime
from app.workers.celery_app import celery_app
from app.database.redis import get_redis
from app.services.ingestion.ingestion_pipeline import run_ingestion_pipeline


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_repository(self, project_id: str, source_type: str, source_path: str):
    asyncio.run(_async_process(self, project_id, source_type, source_path))


async def _async_process(task, project_id: str, source_type: str, source_path: str):
    redis = get_redis()

    async def report_progress(progress: int, step: str):
        msg = json.dumps({
            "project_id": project_id,
            "progress": progress,
            "step": step,
            "current_step": step,
            "status": "done" if progress >= 100 else "running",
        })
        await redis.publish(f"job:{task.request.id}", msg)
        await _update_job_db(project_id, progress, step)

    try:
        await report_progress(5, "Preparing repository...")
        file_count = await run_ingestion_pipeline(project_id, source_type, source_path, report_progress)
        await report_progress(100, f"Complete! Processed {file_count} files.")
        await _update_project_status(project_id, "ready", file_count)
    except Exception as exc:
        await _update_project_status(project_id, "failed", error=str(exc))
        task.retry(exc=exc)


async def _update_project_status(project_id: str, status: str, file_count: int = 0, error: str = None):
    from app.database.postgres import AsyncSessionLocal
    from app.models.postgres.project import Project
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if project:
            project.status = status
            project.total_files = file_count
            project.error_message = error
            project.updated_at = datetime.utcnow()
            await db.commit()


async def _update_job_db(project_id: str, progress: int, step: str):
    from app.database.postgres import AsyncSessionLocal
    from app.models.postgres.job import ProcessingJob
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ProcessingJob).where(ProcessingJob.project_id == project_id, ProcessingJob.status == "queued")
            .order_by(ProcessingJob.created_at.desc())
        )
        job = result.scalar_one_or_none()
        if job:
            job.progress = progress
            job.current_step = step
            if progress > 0 and not job.started_at:
                job.started_at = datetime.utcnow()
            if progress == 100:
                job.status = "done"
                job.completed_at = datetime.utcnow()
            else:
                job.status = "running"
            await db.commit()