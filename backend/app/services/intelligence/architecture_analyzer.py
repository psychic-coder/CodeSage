from __future__ import annotations

import json

import structlog

from app.database.neo4j import get_neo4j_driver
from app.services.llm.client import llm_complete_json_with_keys
from app.services.llm.prompts import ARCHITECTURE_ANALYSIS_PROMPT

logger = structlog.get_logger()


async def analyze_architecture(project_id: str) -> dict:
    driver = get_neo4j_driver()
    findings: dict[str, object] = {}

    async with driver.session() as session:
        result = await session.run(
            "MATCH path = (a:File {project_id: $pid})-[:IMPORTS*2..8]->(a) "
            "RETURN [node in nodes(path) | node.path] AS cycle LIMIT 20",
            pid=project_id,
        )
        findings["circular_deps"] = [row["cycle"] async for row in result]

        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WITH f, COUNT { (f)<-[:IMPORTS]-() } AS in_deg, COUNT { (f)-[:IMPORTS]->() } AS out_deg "
            "WHERE in_deg > 10 OR out_deg > 15 "
            "RETURN f.path AS path, in_deg, out_deg ORDER BY in_deg DESC",
            pid=project_id,
        )
        findings["god_files"] = [
            {
                "path": row["path"],
                "in_degree": row["in_deg"],
                "out_degree": row["out_deg"],
            }
            async for row in result
        ]

        result = await session.run(
            "MATCH (a:File {project_id: $pid})-[:IMPORTS]->(b:File {project_id: $pid}) "
            "MATCH (b)-[:IMPORTS]->(a) RETURN a.path AS a, b.path AS b",
            pid=project_id,
        )
        findings["tight_coupling"] = [
            {"file_a": row["a"], "file_b": row["b"]} async for row in result
        ]

        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WHERE NOT (f)<-[:IMPORTS]-() AND NOT f.path CONTAINS 'index' "
            "AND NOT f.path CONTAINS 'main' AND NOT f.path CONTAINS 'app' "
            "RETURN f.path AS path LIMIT 20",
            pid=project_id,
        )
        findings["isolated_files"] = [row["path"] async for row in result]

        result = await session.run(
            "MATCH (f:File {project_id: $pid})-[:IMPORTS]->(m:Module {is_external: true}) "
            "RETURN m.name AS name, count(f) AS usage ORDER BY usage DESC LIMIT 20",
            pid=project_id,
        )
        findings["external_deps"] = [
            {"name": row["name"], "usage": row["usage"]} async for row in result
        ]

    try:
        result = await llm_complete_json_with_keys(
            ARCHITECTURE_ANALYSIS_PROMPT.format(
                analysis_data=json.dumps(findings, indent=2)
            ),
            required_keys=[
                "overall_health_score",
                "health_label",
                "issues",
                "strengths",
                "architecture_pattern",
            ],
            max_tokens=2000,
            retries=2,
        )
        result["findings"] = findings
        return result
    except Exception as e:
        logger.error("llm_synthesis_failed", error=str(e), query_type="architecture")
        return {
            "findings": findings,
            "error": "LLM synthesis failed",
            "details": str(e),
        }
