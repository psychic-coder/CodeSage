from app.services.llm.client import get_embeddings
from app.services.embeddings.vector_store import search_similar
from app.database.neo4j import get_neo4j_driver


async def hybrid_retrieve(project_id: str, query: str, top_k: int = 20) -> list[dict]:
    vectors = await get_embeddings([query])
    vector_results = await search_similar(project_id, vectors[0], top_k=top_k)
    seed_paths = list({r["file_path"] for r in vector_results})
    graph_results = await _graph_expand(project_id, seed_paths)
    all_paths = {r["file_path"] for r in vector_results}
    for g in graph_results:
        if g["path"] not in all_paths:
            vector_results.append({"file_path": g["path"], "score": 0.3, "code": ""})
            all_paths.add(g["path"])
    return vector_results


async def _graph_expand(project_id: str, seed_paths: list[str]) -> list[dict]:
    driver = get_neo4j_driver()
    results = []
    async with driver.session() as session:
        for path in seed_paths[:5]:
            result = await session.run(
                "MATCH (f:File {project_id: $pid, path: $fp})-[:IMPORTS|IMPORTS*2]-(neighbor:File) "
                "RETURN DISTINCT neighbor.path AS path LIMIT 10",
                pid=project_id, fp=path
            )
            async for r in result:
                results.append({"path": r["path"]})
    return results