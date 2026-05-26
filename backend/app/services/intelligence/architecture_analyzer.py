from app.services.llm.client import llm_complete_json
from app.services.llm.prompts import ARCHITECTURE_ANALYSIS_PROMPT
from app.database.neo4j import get_neo4j_driver


async def analyze_architecture(project_id: str) -> dict:
    # Collect some graph statistics to pass as context
    drv = get_neo4j_driver()
    async with drv.session() as s:
        res = await s.run("MATCH (n {project_id: $pid}) RETURN count(n) as total", pid=project_id)
        r = await res.single(); total_nodes = int(r["total"] or 0)
        res = await s.run("MATCH (f:File {project_id: $pid}) RETURN count(f) as c", pid=project_id)
        r = await res.single(); file_count = int(r["c"] or 0)

    analysis_data = {
        "total_nodes": total_nodes,
        "file_count": file_count,
        "project_id": project_id
    }

    prompt = ARCHITECTURE_ANALYSIS_PROMPT.format(analysis_data=analysis_data)
    try:
        return await llm_complete_json(prompt, max_tokens=1200)
    except Exception:
        return {"overall_health_score": 0, "health_label": "unknown", "issues": [], "strengths": [], "architecture_pattern": "unknown"}
from app.database.neo4j import get_neo4j_driver
from app.services.llm.client import llm_complete
from app.services.llm.prompts import ARCHITECTURE_ANALYSIS_PROMPT
from app.services.llm.output_parser import extract_json
import json


async def analyze_architecture(project_id: str) -> dict:
    driver = get_neo4j_driver()
    findings = {}

    async with driver.session() as session:
        result = await session.run(
            "MATCH path = (a:File {project_id: $pid})-[:IMPORTS*2..8]->(a) "
            "RETURN [node in nodes(path) | node.path] AS cycle LIMIT 20",
            pid=project_id
        )
        findings["circular_deps"] = [r["cycle"] async for r in result]

        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WITH f, size((f)<-[:IMPORTS]-()) AS in_deg, size((f)-[:IMPORTS]->()) AS out_deg "
            "WHERE in_deg > 10 OR out_deg > 15 "
            "RETURN f.path AS path, in_deg, out_deg ORDER BY in_deg DESC",
            pid=project_id
        )
        findings["god_files"] = [{"path": r["path"], "in_degree": r["in_deg"], "out_degree": r["out_deg"]} async for r in result]

        result = await session.run(
            "MATCH (a:File {project_id: $pid})-[:IMPORTS]->(b:File {project_id: $pid}) "
            "MATCH (b)-[:IMPORTS]->(a) RETURN a.path AS a, b.path AS b",
            pid=project_id
        )
        findings["tight_coupling"] = [{"file_a": r["a"], "file_b": r["b"]} async for r in result]

        result = await session.run(
            "MATCH (f:File {project_id: $pid}) "
            "WHERE NOT (f)<-[:IMPORTS]-() AND NOT f.path CONTAINS 'index' "
            "AND NOT f.path CONTAINS 'main' AND NOT f.path CONTAINS 'app' "
            "RETURN f.path AS path LIMIT 20",
            pid=project_id
        )
        findings["isolated_files"] = [r["path"] async for r in result]

        result = await session.run(
            "MATCH (f:File {project_id: $pid})-[:IMPORTS]->(m:Module {is_external: true}) "
            "RETURN m.name AS name, count(f) AS usage ORDER BY usage DESC LIMIT 20",
            pid=project_id
        )
        findings["external_deps"] = [{"name": r["name"], "usage": r["usage"]} async for r in result]

    raw = await llm_complete(
        ARCHITECTURE_ANALYSIS_PROMPT.format(analysis_data=json.dumps(findings, indent=2)),
        json_mode=True, max_tokens=2000
    )
    result = extract_json(raw)
    if not result:
        return {"findings": findings, "error": "LLM synthesis failed"}
    return result