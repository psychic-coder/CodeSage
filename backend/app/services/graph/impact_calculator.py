from app.database.neo4j import get_neo4j_driver


async def bfs_impact(project_id: str, seed_files: list[str], max_depth: int = 3) -> list[dict]:
    driver = get_neo4j_driver()
    visited = {}
    queue = [(f, 0) for f in seed_files]

    async with driver.session() as session:
        while queue:
            file_path, depth = queue.pop(0)
            if file_path in visited or depth > max_depth:
                continue
            impact_score = round(1.0 / (depth + 1), 3)
            visited[file_path] = {"path": file_path, "depth": depth, "impact_score": impact_score}
            result = await session.run(
                "MATCH (dep:File {project_id: $pid})-[:IMPORTS]->(f:File {project_id: $pid, path: $fp}) "
                "RETURN dep.path AS path",
                pid=project_id, fp=file_path
            )
            async for r in result:
                if r["path"] not in visited:
                    queue.append((r["path"], depth + 1))

    return sorted(visited.values(), key=lambda x: x["impact_score"], reverse=True)