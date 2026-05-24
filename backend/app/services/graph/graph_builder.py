from app.database.neo4j import get_neo4j_driver
import uuid


async def build_graph(project_id: str, parsed_files: list[dict]):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        await session.run("MATCH (n {project_id: $pid}) DETACH DELETE n", pid=project_id)

        file_nodes = [{
            "id": str(uuid.uuid4()), "project_id": project_id,
            "path": pf["path"], "name": pf["path"].split("/")[-1],
            "extension": "." + pf["path"].rsplit(".", 1)[-1] if "." in pf["path"] else "",
            "language": pf["language"], "size_bytes": pf["size_bytes"],
            "lines_of_code": pf["lines_of_code"], "complexity_score": float(pf.get("complexity", 1)),
            "risk_score": 0.0
        } for pf in parsed_files]

        await session.run(
            "UNWIND $nodes AS n CREATE (:File {id: n.id, project_id: n.project_id, "
            "path: n.path, name: n.name, extension: n.extension, language: n.language, "
            "size_bytes: n.size_bytes, lines_of_code: n.lines_of_code, "
            "complexity_score: n.complexity_score, risk_score: n.risk_score})",
            nodes=file_nodes
        )

        import_rels = []
        for pf in parsed_files:
            for imp in pf.get("resolved_imports", []):
                if imp["resolved"]:
                    import_rels.append({"from": pf["path"], "to": imp["resolved"], "pid": project_id})

        if import_rels:
            await session.run(
                "UNWIND $rels AS r "
                "MATCH (a:File {project_id: r.pid, path: r.from}) "
                "MATCH (b:File {project_id: r.pid, path: r.to}) "
                "MERGE (a)-[:IMPORTS]->(b)",
                rels=import_rels
            )

        func_nodes = []
        for pf in parsed_files:
            for fn in pf.get("functions", []):
                func_nodes.append({
                    "id": str(uuid.uuid4()), "project_id": project_id,
                    "name": fn["name"], "file_path": pf["path"],
                    "is_async": fn.get("is_async", False)
                })
        if func_nodes:
            await session.run(
                "UNWIND $nodes AS n CREATE (:Function {id: n.id, project_id: n.project_id, "
                "name: n.name, file_path: n.file_path, is_async: n.is_async})",
                nodes=func_nodes
            )

        if func_nodes:
            await session.run(
                "UNWIND $nodes AS n "
                "MATCH (f:File {project_id: n.project_id, path: n.file_path}) "
                "MATCH (fn:Function {id: n.id}) "
                "MERGE (f)-[:DEFINES]->(fn)",
                nodes=func_nodes
            )