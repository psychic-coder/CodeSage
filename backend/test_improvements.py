import asyncio
from app.database.postgres import AsyncSessionLocal
from app.models.postgres.project import Project
from sqlalchemy import select
from app.services.llm.client import llm_complete
from app.services.intelligence.improvement_suggester import _fetch_all_nodes, _CODE_CONTEXT_FILES, _fetch_code_context, _CONTEXT_NODES
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Project).order_by(Project.created_at.desc()).limit(1))
        p = res.scalar_one_or_none()
        project_id = p.id
    
    cats = ["security", "performance", "refactoring"]
    all_nodes = await _fetch_all_nodes(project_id)
    top_nodes = all_nodes[:_CONTEXT_NODES]

    top_code_nodes = top_nodes[:_CODE_CONTEXT_FILES]
    file_metadata_parts = [f"- {n['path']}" for n in top_code_nodes]
    file_metadata = "\n".join(file_metadata_parts)
    code_file_paths = [n["path"] for n in top_code_nodes]
    code_context = await _fetch_code_context(project_id, code_file_paths)

    prompt = IMPROVEMENT_ANALYSIS_PROMPT.format(categories=", ".join(cats), file_metadata=file_metadata, code_context=code_context)
    
    # Run WITHOUT JSON parsing to see raw output
    res = await llm_complete(prompt, max_tokens=4500)
    print("RAW LLM OUTPUT:")
    print(res[:1000])

asyncio.run(main())
