from __future__ import annotations

import hashlib
import json

from app.database.neo4j import get_neo4j_driver
from app.database.redis import get_redis
from app.services.llm.client import llm_complete
from app.services.llm.prompts import PROPAGATION_ANALYSIS_PROMPT


def _cache_key(project_id: str, query_type: str, params: dict) -> str:
    params_hash = hashlib.sha256(
        json.dumps(params, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()
    return f"graph:{project_id}:{query_type}:{params_hash}"


async def _cache_get(project_id: str, query_type: str, params: dict):
    try:
        redis = get_redis()
        raw = await redis.get(_cache_key(project_id, query_type, params))
        return json.loads(raw) if raw else None
    except Exception:
        return None


async def _cache_set(
    project_id: str, query_type: str, params: dict, value, ttl: int = 3600
):
    try:
        redis = get_redis()
        await redis.setex(
            _cache_key(project_id, query_type, params),
            ttl,
            json.dumps(value, default=str),
        )
    except Exception:
        pass


async def get_graph_nodes(project_id: str, skip: int = 0, limit: int = 100):
    cached = await _cache_get(project_id, "nodes", {"skip": skip, "limit": limit})
    if cached is not None:
        return cached
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "RETURN f.path AS path, f.name AS name, f.extension AS extension, f.language AS language, "
            "f.size_bytes AS size_bytes, f.lines_of_code AS lines_of_code, f.complexity_score AS complexity_score, "
            "f.risk_score AS risk_score, f.project_id AS project_id, "
            "COUNT { (f)<-[:IMPORTS]-() } AS in_degree, COUNT { (f)-[:IMPORTS]->() } AS out_degree "
            "SKIP $skip LIMIT $limit",
            pid=project_id,
            skip=skip,
            limit=limit,
        )
        rows = [dict(r) async for r in result]
    await _cache_set(project_id, "nodes", {"skip": skip, "limit": limit}, rows)
    return rows


async def get_graph_edges(project_id: str, skip: int = 0, limit: int = 500):
    cached = await _cache_get(project_id, "edges", {"skip": skip, "limit": limit})
    if cached is not None:
        return cached
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (a:File {project_id: $pid})-[r:IMPORTS]->(b:File {project_id: $pid}) "
            "RETURN a.path AS source, b.path AS target, type(r) AS type SKIP $skip LIMIT $limit",
            pid=project_id,
            skip=skip,
            limit=limit,
        )
        rows = [
            {"source": r["source"], "target": r["target"], "type": r["type"]}
            async for r in result
        ]
    await _cache_set(project_id, "edges", {"skip": skip, "limit": limit}, rows)
    return rows


async def get_graph_stats(project_id: str):
    cached = await _cache_get(project_id, "stats", {})
    if cached is not None:
        return cached
    driver = get_neo4j_driver()
    async with driver.session() as session:
        node_count = (
            await (
                await session.run(
                    "MATCH (f:File {project_id: $pid}) RETURN count(f) AS c",
                    pid=project_id,
                )
            ).single()
        )["c"]
        edge_count = (
            await (
                await session.run(
                    "MATCH (:File {project_id: $pid})-[r:IMPORTS]->(:File {project_id: $pid}) RETURN count(r) AS c",
                    pid=project_id,
                )
            ).single()
        )["c"]
        top_files = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WITH f, COUNT { (f)<-[:IMPORTS]-() } AS in_deg "
            "ORDER BY in_deg DESC LIMIT 10 RETURN f.path AS path, in_deg",
            pid=project_id,
        )
        top = [{"path": r["path"], "in_degree": r["in_deg"]} async for r in top_files]
    result = {"node_count": node_count, "edge_count": edge_count, "top_files": top}
    await _cache_set(project_id, "stats", {}, result)
    return result


async def get_subgraph(project_id: str, file_path: str, hops: int = 2):
    params = {"file_path": file_path, "hops": hops}
    cached = await _cache_get(project_id, "subgraph", params)
    if cached is not None:
        return cached
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH path = (f:File {project_id: $pid, path: $fp})-[:IMPORTS*0..$hops]-(neighbor) "
            "RETURN DISTINCT neighbor.path AS path, neighbor.risk_score AS risk_score, neighbor.language AS language",
            pid=project_id,
            fp=file_path,
            hops=hops,
        )
        rows = [
            {
                "path": r["path"],
                "risk_score": r["risk_score"],
                "language": r.get("language"),
            }
            async for r in result
        ]
    await _cache_set(project_id, "subgraph", params, rows)
    return rows


async def get_circular_deps(project_id: str):
    cached = await _cache_get(project_id, "cycles", {})
    if cached is not None:
        return cached
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH path = (f:File {project_id: $pid})-[:IMPORTS*2..10]->(f) "
            "RETURN [n IN nodes(path) | n.path] AS cycle LIMIT 50",
            pid=project_id,
        )
        cycles = [r["cycle"] async for r in result]
    await _cache_set(project_id, "cycles", {}, cycles)
    return cycles


async def get_propagation_tree(
    project_id: str, file_path: str, change_type: str, max_depth: int = 5
):
    params = {
        "file_path": file_path,
        "change_type": change_type,
        "max_depth": max_depth,
    }
    cached = await _cache_get(project_id, "propagation", params)
    if cached is not None:
        return cached
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(
            "MATCH (f:File {project_id: $pid, path: $fp}) "
            "RETURN f.path AS path, f.risk_score AS risk_score",
            pid=project_id,
            fp=file_path,
        )
        root = await result.single()
        if not root:
            return {"error": f"File not found in project graph: {file_path}"}

    tree = await _bfs_dependents(project_id, file_path, max_depth)
    total_impacted = _count_nodes(tree)

    # Depth-weighted risk: depth-1 nodes contribute their full risk_score;
    # each additional hop is discounted by 0.5 so deeply nested dependents
    # contribute less.  Score is clamped to [0, 1].
    weighted_risk = _weighted_risk(tree, depth=1)
    risk_score = round(min(weighted_risk, 1.0), 3)

    llm_context = (
        f"File: {file_path}\nChange type: {change_type}\n"
        f"Total impacted files: {total_impacted}\nWeighted risk score: {risk_score}"
    )
    explanation = await llm_complete(
        PROPAGATION_ANALYSIS_PROMPT.format(context=llm_context), max_tokens=500
    )

    result = {
        "target_file": file_path,
        "risk_score": risk_score,
        "risk_label": "High"
        if risk_score > 0.7
        else "Medium"
        if risk_score > 0.4
        else "Low",
        "total_impacted_files": total_impacted,
        "propagation_tree": tree,
        "analysis": explanation,
    }
    await _cache_set(project_id, "propagation", params, result)
    return result


async def _bfs_dependents(project_id: str, file_path: str, max_depth: int) -> dict:
    driver = get_neo4j_driver()
    visited: set[str] = set()

    async def fetch_dependents(path: str, depth: int) -> list:
        if depth > max_depth or path in visited:
            return []
        visited.add(path)
        async with driver.session() as session:
            result = await session.run(
                "MATCH (dep:File {project_id: $pid})-[:IMPORTS]->(f:File {project_id: $pid, path: $fp}) "
                "RETURN dep.path AS path, coalesce(dep.risk_score, 0.0) AS risk_score",
                pid=project_id,
                fp=path,
            )
            deps = [
                {"path": r["path"], "risk_score": float(r["risk_score"] or 0.0)}
                async for r in result
            ]
        children = []
        for dep in deps:
            node_risk = dep["risk_score"]
            risk_label = (
                "High" if node_risk >= 0.7 else "Medium" if node_risk >= 0.4 else "Low"
            )
            children.append(
                {
                    "file": dep["path"],
                    "depth": depth,
                    "risk_score": node_risk,
                    "risk": risk_label,
                    "dependents": await fetch_dependents(dep["path"], depth + 1),
                }
            )
        return children

    dependents = await fetch_dependents(file_path, 1)
    return {"file": file_path, "dependents": dependents}


def _count_nodes(tree: dict) -> int:
    count = 0
    for dep in tree.get("dependents", []):
        count += 1 + _count_nodes(dep)
    return count


def _weighted_risk(tree: dict, depth: int) -> float:
    """Recursively sum depth-discounted risk scores across the propagation tree.

    Each depth level is discounted by 0.5 (depth-1 = 1.0x, depth-2 = 0.5x, ...).
    The root node itself is not counted (it is the change origin).
    """
    total = 0.0
    discount = 0.5 ** (depth - 1)
    for dep in tree.get("dependents", []):
        node_risk = dep.get("risk_score", 0.3)  # default 0.3 if risk not scored yet
        total += node_risk * discount
        total += _weighted_risk(dep, depth + 1)
    return total
