from app.database.neo4j import get_neo4j_driver
from app.services.parsing.call_graph_builder import build_call_graph
import uuid


async def build_graph(project_id: str, parsed_files: list[dict]):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        # Clean up existing project nodes
        await session.run("MATCH (n {project_id: $pid}) DETACH DELETE n", pid=project_id)

        # Ensure useful uniqueness constraints (no-op if already present)
        try:
            await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (f:File) REQUIRE f.id IS UNIQUE")
            await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (fn:Function) REQUIRE fn.id IS UNIQUE")
            await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (c:Class) REQUIRE c.id IS UNIQUE")
            await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (m:Module) REQUIRE m.id IS UNIQUE")
            await session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (e:Export) REQUIRE e.id IS UNIQUE")
        except Exception:
            # older Neo4j servers may have slightly different syntax; ignore failures
            pass

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

        # Create Module nodes (one per directory / module root) and link files to modules
        module_map = {}
        module_nodes = []
        file_to_module = []
        for pf in parsed_files:
            dirpath = "/".join(pf["path"].split("/")[:-1]) or "."
            if dirpath not in module_map:
                module_id = str(uuid.uuid4())
                module_map[dirpath] = module_id
                module_nodes.append({"id": module_id, "project_id": project_id, "module": dirpath})
            file_to_module.append({"pid": project_id, "file_path": pf["path"], "module_id": module_map[dirpath]})

        if module_nodes:
            await session.run(
                "UNWIND $mods AS m CREATE (:Module {id: m.id, project_id: m.project_id, module: m.module})",
                mods=module_nodes
            )
            await session.run(
                "UNWIND $rels AS r MATCH (f:File {project_id: r.pid, path: r.file_path}) "
                "MATCH (m:Module {project_id: r.pid, id: r.module_id}) MERGE (m)-[:HAS_FILE]->(f)",
                rels=file_to_module
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

        # Class nodes and relationships
        class_nodes = []
        file_class_rels = []
        for pf in parsed_files:
            for cls in pf.get("classes", []):
                class_nodes.append({
                    "id": str(uuid.uuid4()), "project_id": project_id,
                    "name": cls.get("name"), "file_path": pf["path"]
                })
                file_class_rels.append({"pid": project_id, "file_path": pf["path"], "class_name": cls.get("name")})

        if class_nodes:
            await session.run(
                "UNWIND $nodes AS n CREATE (:Class {id: n.id, project_id: n.project_id, name: n.name, file_path: n.file_path})",
                nodes=class_nodes
            )
            await session.run(
                "UNWIND $rels AS r "
                "MATCH (f:File {project_id: r.pid, path: r.file_path}) "
                "MATCH (c:Class {project_id: r.pid, name: r.class_name}) "
                "MERGE (f)-[:CONTAINS_CLASS]->(c)",
                rels=file_class_rels
            )

        # Export nodes and relationships
        export_nodes = []
        file_export_rels = []
        for pf in parsed_files:
            for ex in pf.get("exports", []):
                export_nodes.append({"id": str(uuid.uuid4()), "project_id": project_id, "name": ex, "file_path": pf["path"]})
                file_export_rels.append({"pid": project_id, "file_path": pf["path"], "export_name": ex})

        if export_nodes:
            await session.run(
                "UNWIND $nodes AS n CREATE (:Export {id: n.id, project_id: n.project_id, name: n.name, file_path: n.file_path})",
                nodes=export_nodes
            )
            await session.run(
                "UNWIND $rels AS r "
                "MATCH (f:File {project_id: r.pid, path: r.file_path}) "
                "MATCH (e:Export {project_id: r.pid, name: r.export_name}) "
                "MERGE (f)-[:EXPORTS]->(e)",
                rels=file_export_rels
            )

        # Build CALLS relationships from parsed call lists
        call_rels = build_call_graph(parsed_files)

        if call_rels:
            await session.run(
                "UNWIND $rels AS r "
                "MATCH (a:Function {project_id: $pid, file_path: r.caller_file_path, name: r.caller}) "
                "MATCH (b:Function {project_id: $pid, file_path: r.callee_file_path, name: r.callee}) "
                "MERGE (a)-[rel:CALLS]->(b) SET rel.line = r.line",
                pid=project_id,
                rels=call_rels
            )