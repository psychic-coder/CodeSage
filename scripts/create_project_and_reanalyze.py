#!/usr/bin/env python3
import sys
import asyncio
import uuid
from urllib.parse import urlparse

from app.database.postgres import AsyncSessionLocal
from app.models.postgres.project import Project
from app.models.postgres.user import User


async def main(repo_url: str):
    # derive a simple name
    parsed = urlparse(repo_url)
    name = parsed.path.rstrip('/').split('/')[-1] or repo_url
    pid = str(uuid.uuid4())
    async with AsyncSessionLocal() as session:
        # ensure a system user exists (foreign key constraint)
        existing = await session.get(User, 'system')
        if existing is None:
            u = User(id='system', email='system@local', name='system')
            session.add(u)
            await session.flush()

        p = Project(id=pid, user_id='system', name=name, description='', source_type='github', source_url=repo_url)
        session.add(p)
        await session.commit()
        print('Created project:', pid)

    # enqueue reanalysis via Celery task
    from app.workers.tasks import process_repository

    task = process_repository.delay(pid, 'github', repo_url)
    print('Enqueued job id:', task.id)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: create_project_and_reanalyze.py <repo_url>')
        sys.exit(2)
    url = sys.argv[1]
    asyncio.run(main(url))
