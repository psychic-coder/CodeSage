from app.services.ingestion.github_ingester import clone_github_repo
from app.services.ingestion.zip_ingester import extract_zip
from app.services.ingestion.local_ingester import validate_local_path
from app.services.ingestion.file_filter import filter_files
from app.services.parsing.ast_parser import parse_file
from app.services.parsing.import_resolver import resolve_all_imports
from app.services.graph.graph_builder import build_graph
from app.services.graph.risk_scorer import score_all_nodes
from app.services.embeddings.code_embedder import embed_all_files
from pathlib import Path


async def run_ingestion_pipeline(project_id: str, source_type: str, source_path: str, report_progress):
    if source_type == "github":
        local_path = await clone_github_repo(source_path)
    elif source_type == "zip":
        local_path = await extract_zip(source_path)
    else:
        local_path = await validate_local_path(source_path)

    await report_progress(12, "Filtering files...")
    accepted = filter_files(local_path)

    parsed_data, total = [], len(accepted)
    for i, fpath in enumerate(accepted):
        try:
            parsed = parse_file(fpath, local_path)
            if parsed:
                parsed_data.append(parsed)
        except Exception:
            pass
        if i % 50 == 0 and total > 0:
            pct = 15 + int((i / total) * 30)
            await report_progress(pct, f"Parsing {Path(fpath).name}...")

    await report_progress(47, "Resolving dependencies...")
    resolved = resolve_all_imports(parsed_data, local_path)

    await report_progress(57, "Building dependency graph...")
    await build_graph(project_id, resolved)

    await report_progress(72, "Scoring architectural risks...")
    await score_all_nodes(project_id)

    await report_progress(77, "Generating semantic embeddings...")
    await embed_all_files(project_id, parsed_data)

    await report_progress(97, "Finalizing...")
    return len(parsed_data)