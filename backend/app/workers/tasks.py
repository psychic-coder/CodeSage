import asyncio, json
from datetime import datetime
from app.workers.celery_app import celery_app
from app.database.redis import get_redis
from app.services.ingestion.ingestion_pipeline import run_ingestion_pipeline


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_repository(self, project_id: str, source_type: str, source_path: str, job_id: str = None):
    asyncio.run(_async_process(self, project_id, source_type, source_path, job_id))


async def _async_process(task, project_id: str, source_type: str, source_path: str, job_id: str = None):
    redis = get_redis()

    async def report_progress(progress: int, step: str):
        msg = json.dumps({
            "project_id": project_id,
            "progress": progress,
            "step": step,
            "current_step": step,
            "status": "done" if progress >= 100 else "running",
        })
        if job_id:
            await redis.publish(f"job:{job_id}", msg)
        else:
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

    # Pull live counts from Neo4j when the job succeeds
    node_count = 0
    edge_count = 0
    primary_language: str | None = None
    if status == "ready":
        try:
            from app.database.neo4j import get_neo4j_driver
            driver = get_neo4j_driver()
            async with driver.session() as neo_session:
                nc = await (await neo_session.run(
                    "MATCH (f:File {project_id: $pid}) RETURN count(f) AS c", pid=project_id
                )).single()
                node_count = nc["c"] if nc else 0

                ec = await (await neo_session.run(
                    "MATCH (:File {project_id: $pid})-[r:IMPORTS]->(:File {project_id: $pid}) RETURN count(r) AS c",
                    pid=project_id
                )).single()
                edge_count = ec["c"] if ec else 0

                lang_row = await (await neo_session.run(
                    "MATCH (f:File {project_id: $pid}) WHERE f.language IS NOT NULL "
                    "RETURN f.language AS lang, count(*) AS cnt ORDER BY cnt DESC LIMIT 1",
                    pid=project_id
                )).single()
                primary_language = lang_row["lang"] if lang_row else None
        except Exception:
            pass  # counts remain 0 — non-fatal, dashboard still works

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Project).where(Project.id == project_id))
        project = result.scalar_one_or_none()
        if project:
            project.status = status
            project.total_files = file_count
            project.total_nodes = node_count
            project.total_edges = edge_count
            if primary_language:
                project.primary_language = primary_language
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