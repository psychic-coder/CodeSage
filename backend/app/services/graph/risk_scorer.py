from app.database.neo4j import get_neo4j_driver

CRITICAL_PATH_KEYWORDS = ['auth', 'payment', 'database', 'middleware', 'config']


async def score_all_nodes(project_id: str):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WITH f, "
            "  COUNT { (f)<-[:IMPORTS]-() } AS in_deg, "
            "  COUNT { (f)-[:IMPORTS]->() } AS out_deg "
            "RETURN f.path AS path, f.complexity_score AS complexity, in_deg, out_deg",
            pid=project_id
        )
        files = [{"path": r["path"], "complexity": r["complexity"],
                  "in_deg": r["in_deg"], "out_deg": r["out_deg"]} async for r in result]

    # Attempt to compute betweenness centrality via GDS, with graceful fallback
    betweenness = {}
    gname = f'proj_graph_{project_id.replace("-", "_")}'
    try:
        # Project a lightweight graph to GDS (idempotent if already exists)
        await session.run(f"CALL gds.graph.exists('{gname}') YIELD exists")
        await session.run(f"CALL gds.graph.project('{gname}', 'File', 'IMPORTS')")
        res = await session.run(f"CALL gds.betweenness.stream('{gname}') YIELD nodeId, score RETURN gds.util.asNode(nodeId).path AS path, score")
        rows = [r async for r in res]
        if rows:
            max_score = max((r['score'] for r in rows), default=1)
            for r in rows:
                betweenness[r['path']] = float(r['score']) / float(max_score) if max_score else 0.0
        # drop the graph projection to avoid long-lived memory usage
        await session.run(f"CALL gds.graph.drop('{gname}') YIELD graphName")
    except Exception:
        # GDS not available or failed — fall back to zero betweenness
        betweenness = {}

    updates = []
    for f in files:
        f_copy = dict(f)
        f_copy['betweenness'] = betweenness.get(f['path'], 0.0)
        score = _compute_risk(f_copy)
        updates.append({"path": f["path"], "risk": score})

    if updates:
        async with driver.session() as session:
            await session.run(
                "UNWIND $updates AS u "
                "MATCH (f:File {project_id: $pid, path: u.path}) "
                "SET f.risk_score = u.risk",
                updates=updates, pid=project_id
            )


def _compute_risk(f: dict) -> float:
    in_deg_norm = min(f.get("in_deg", 0) / 20, 1.0)
    betweenness = min(f.get("betweenness", 0.0), 1.0)
    complexity_norm = min((f.get("complexity") or 1) / 50, 1.0)
    critical_bonus = 0.2 if any(kw in f.get("path", "").lower() for kw in CRITICAL_PATH_KEYWORDS) else 0.0
    risk = (
        in_deg_norm * 0.35 +
        betweenness * 0.30 +
        complexity_norm * 0.20 +
        critical_bonus * 0.15
    )
    return round(min(risk, 1.0), 3)