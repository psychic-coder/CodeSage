from app.services.llm.client import get_embeddings
from app.services.embeddings.vector_store import search_similar
from app.database.neo4j import get_neo4j_driver


async def hybrid_retrieve(project_id: str, query: str, top_k: int = 20) -> list[dict]:
    vectors = await get_embeddings([query])
    vector_results = await search_similar(project_id, vectors[0], top_k=top_k)
    seed_paths = list({r["file_path"] for r in vector_results})
    graph_results = await _graph_expand(project_id, seed_paths)

    # Merge vector results and graph results into a single list
    merged = {r["file_path"]: {"file_path": r["file_path"], "score": r.get("score", 0), "code": r.get("code", "")} for r in vector_results}
    for g in graph_results:
        if g["path"] not in merged:
            merged[g["path"]] = {"file_path": g["path"], "score": 0.0, "code": ""}

    # Fetch centrality (betweenness) and risk for all candidates
    paths = list(merged.keys())
    meta = await _fetch_graph_meta(project_id, paths)

    # Rank using vector_score * 0.4 + centrality * 0.3 + risk * 0.3
    results = []
    for p, entry in merged.items():
        vscore = float(entry.get("score") or 0)
        centrality = float(meta.get(p, {}).get("betweenness", 0.0))
        risk = float(meta.get(p, {}).get("risk", 0.0))
        rank = vscore * 0.4 + centrality * 0.3 + risk * 0.3
        results.append({**entry, "rank": rank, "centrality": centrality, "risk": risk})

    # Return sorted by rank desc
    return sorted(results, key=lambda x: x["rank"], reverse=True)[:top_k]


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


async def _fetch_graph_meta(project_id: str, paths: list[str]) -> dict:
    if not paths:
        return {}
    driver = get_neo4j_driver()
    meta = {}
    async with driver.session() as session:
        result = await session.run(
            "UNWIND $paths AS p "
            "MATCH (f:File {project_id: $pid, path: p}) "
            "RETURN f.path AS path, f.risk_score AS risk, f.complexity_score AS complexity",
            paths=paths, pid=project_id
        )
        async for r in result:
            meta[r["path"]] = {"risk": float(r.get("risk") or 0.0), "betweenness": 0.0, "complexity": float(r.get("complexity") or 0.0)}

        # Try to compute normalized betweenness via GDS streaming for the provided paths
        try:
            # Project temporary graph name
            gname = f'proj_graph_{project_id.replace("-", "_")}'
            await session.run(f"CALL gds.graph.project('{gname}', 'File', 'IMPORTS')")
            res = await session.run(f"CALL gds.betweenness.stream('{gname}') YIELD nodeId, score RETURN gds.util.asNode(nodeId).path AS path, score")
            rows = [r async for r in res]
            if rows:
                max_score = max((r['score'] for r in rows), default=1)
                for r in rows:
                    p = r['path']
                    if p in meta:
                        meta[p]['betweenness'] = float(r['score']) / float(max_score) if max_score else 0.0
            await session.run(f"CALL gds.graph.drop('{gname}') YIELD graphName")
        except Exception:
            # ignore if GDS not available
            pass

    return meta