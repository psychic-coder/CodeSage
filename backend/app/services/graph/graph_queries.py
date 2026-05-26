from app.database.neo4j import get_neo4j_driver
from app.services.llm.client import llm_complete
from app.services.llm.prompts import PROPAGATION_ANALYSIS_PROMPT


async def get_graph_nodes(project_id: str, skip: int = 0, limit: int = 100):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "RETURN f.path AS path, f.name AS name, f.extension AS extension, f.language AS language, "
            "f.size_bytes AS size_bytes, f.lines_of_code AS lines_of_code, f.complexity_score AS complexity_score, "
            "f.risk_score AS risk_score, f.project_id AS project_id "
            "SKIP $skip LIMIT $limit",
            pid=project_id, skip=skip, limit=limit
        )
        return [dict(r) async for r in result]


async def get_graph_edges(project_id: str, skip: int = 0, limit: int = 500):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (a:File {project_id: $pid})-[r:IMPORTS]->(b:File {project_id: $pid}) "
            "RETURN a.path AS source, b.path AS target, type(r) AS type SKIP $skip LIMIT $limit",
            pid=project_id, skip=skip, limit=limit
        )
        return [{"source": r["source"], "target": r["target"], "type": r["type"]} async for r in result]


async def get_graph_stats(project_id: str):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        node_count = (await (await session.run(
            "MATCH (f:File {project_id: $pid}) RETURN count(f) AS c", pid=project_id
        )).single())["c"]
        edge_count = (await (await session.run(
            "MATCH (:File {project_id: $pid})-[r:IMPORTS]->(:File {project_id: $pid}) RETURN count(r) AS c",
            pid=project_id
        )).single())["c"]
        top_files = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WITH f, size((f)<-[:IMPORTS]-()) AS in_deg "
            "ORDER BY in_deg DESC LIMIT 10 RETURN f.path AS path, in_deg",
            pid=project_id
        )
        top = [{"path": r["path"], "in_degree": r["in_deg"]} async for r in top_files]
    return {"node_count": node_count, "edge_count": edge_count, "top_files": top}


async def get_subgraph(project_id: str, file_path: str, hops: int = 2):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH path = (f:File {project_id: $pid, path: $fp})-[:IMPORTS*0..$hops]-(neighbor) "
            "RETURN DISTINCT neighbor.path AS path, neighbor.risk_score AS risk_score, neighbor.language AS language",
            pid=project_id, fp=file_path, hops=hops
        )
        return [{"path": r["path"], "risk_score": r["risk_score"], "language": r.get("language")} async for r in result]


async def get_propagation_tree(project_id: str, file_path: str, change_type: str, max_depth: int = 5):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (f:File {project_id: $pid, path: $fp}) "
            "RETURN f.path AS path, f.risk_score AS risk_score",
            pid=project_id, fp=file_path
        )
        root = await result.single()
        if not root:
            return {"error": f"File not found in project graph: {file_path}"}

    tree = await _bfs_dependents(project_id, file_path, max_depth)
    total_impacted = _count_nodes(tree)
    risk_score = min(0.1 * total_impacted, 1.0)

    llm_context = f"File: {file_path}\nChange type: {change_type}\nImpacted files: {total_impacted}"
    explanation = await llm_complete(
        PROPAGATION_ANALYSIS_PROMPT.format(context=llm_context), max_tokens=500
    )

    return {
        "target_file": file_path,
        "risk_score": round(risk_score, 2),
        "risk_label": "High" if risk_score > 0.7 else "Medium" if risk_score > 0.4 else "Low",
        "total_impacted_files": total_impacted,
        "propagation_tree": tree,
        "analysis": explanation
    }


async def _bfs_dependents(project_id: str, file_path: str, max_depth: int) -> dict:
    driver = get_neo4j_driver()
    visited = set()

    async def fetch_dependents(path: str, depth: int) -> list:
        if depth > max_depth or path in visited:
            return []
        visited.add(path)
        async with driver.session() as session:
            result = await session.run(
                "MATCH (dep:File {project_id: $pid})-[:IMPORTS]->(f:File {project_id: $pid, path: $fp}) "
                "RETURN dep.path AS path",
                pid=project_id, fp=path
            )
            deps = [r["path"] async for r in result]
        children = []
        for dep in deps:
            risk = "high" if depth == 1 else "medium" if depth == 2 else "low"
            children.append({
                "file": dep, "depth": depth, "risk": risk,
                "dependents": await fetch_dependents(dep, depth + 1)
            })
        return children

    dependents = await fetch_dependents(file_path, 1)
    return {"file": file_path, "dependents": dependents}


def _count_nodes(tree: dict) -> int:
    count = 0
    for dep in tree.get("dependents", []):
        count += 1 + _count_nodes(dep)
    return count