import asyncio
import httpx
from app.database.postgres import AsyncSessionLocal
from app.models.postgres.project import Project
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Project).order_by(Project.created_at.desc()).limit(1))
        p = res.scalar_one_or_none()
        project_id = p.id

    url = f"http://localhost:8000/api/v1/analysis/improvements/{project_id}/stream"
    
    # We'll just test if it returns a 200 and yields something
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            async with client.stream("GET", url) as response:
                print("Status:", response.status_code)
                async for line in response.aiter_lines():
                    print("LINE:", line)
                    if line: 
                        break  # just read one line to prove it streams
    except Exception as e:
        print("Error:", e)

asyncio.run(main())
