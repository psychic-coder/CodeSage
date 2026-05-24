from app.database.neo4j import get_neo4j_driver

CRITICAL_PATH_KEYWORDS = ['auth', 'payment', 'database', 'middleware', 'config']


async def score_all_nodes(project_id: str):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WITH f, "
            "  size((f)<-[:IMPORTS]-()) AS in_deg, "
            "  size((f)-[:IMPORTS]->()) AS out_deg "
            "RETURN f.path AS path, f.complexity_score AS complexity, in_deg, out_deg",
            pid=project_id
        )
        files = [{"path": r["path"], "complexity": r["complexity"],
                  "in_deg": r["in_deg"], "out_deg": r["out_deg"]} async for r in result]

    updates = []
    for f in files:
        score = _compute_risk(f)
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
    in_deg_norm = min(f["in_deg"] / 20, 1.0)
    complexity_norm = min((f["complexity"] or 1) / 50, 1.0)
    critical_bonus = 0.2 if any(kw in f["path"].lower() for kw in CRITICAL_PATH_KEYWORDS) else 0.0
    risk = in_deg_norm * 0.35 + complexity_norm * 0.20 + critical_bonus * 0.15 + 0.30 * 0
    return round(min(risk, 1.0), 3)