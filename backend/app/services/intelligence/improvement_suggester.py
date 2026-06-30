from __future__ import annotations

import re

import structlog

from app.services.graph.graph_queries import get_graph_nodes
from app.services.llm.client import llm_complete_json
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT
from app.services.rag.context_builder import build_context

logger = structlog.get_logger()

HARDCODED_SECRET_RE = re.compile(
    r'(?:api_key|apikey|password|secret|token|auth)\s*=\s*["\'][^"\']{8,}["\']',
    re.IGNORECASE,
)

# Maximum nodes to inspect.  We fetch in pages and keep the riskiest ones so
# that large repos with thousands of files still surface real issues.
_PAGE_SIZE = 100
_MAX_PAGES = 5  # fetch at most 500 nodes total
_CONTEXT_NODES = 60  # pass the top-N riskiest nodes as metadata to the LLM

# Quality uplift: fetch real code for the top riskiest files via Qdrant.
# 20 files × 5 chunks × ~500 chars/chunk = ~50 000 chars raw;
# context_builder caps at MAX_CONTEXT_CHARS (10 000 chars) so we stay safe
# even on large codebases while giving the LLM as much signal as possible.
_CODE_CONTEXT_FILES = 20   # number of files to fetch actual code for
_CODE_CHUNKS_PER_FILE = 5  # Qdrant chunks fetched per file


async def _fetch_all_nodes(project_id: str) -> list[dict]:
    """Fetch nodes across pages and return them sorted by risk_score desc."""
    all_nodes: list[dict] = []
    for page in range(_MAX_PAGES):
        batch = await get_graph_nodes(
            project_id, skip=page * _PAGE_SIZE, limit=_PAGE_SIZE
        )
        if not batch:
            break
        all_nodes.extend(batch)
        if len(batch) < _PAGE_SIZE:
            break  # last page
    # sort descending by risk so the LLM sees the most dangerous files first
    all_nodes.sort(key=lambda n: float(n.get("risk_score") or 0), reverse=True)
    return all_nodes


async def _fetch_code_context(project_id: str, file_paths: list[str]) -> str:
    """Retrieve actual source chunks from Qdrant for the given file paths.

    Returns an empty string on any failure so the caller can degrade
    gracefully to the metadata-only approach.
    """
    try:
        from app.services.embeddings.vector_store import fetch_chunks_for_files

        chunks = await fetch_chunks_for_files(
            project_id,
            file_paths,
            chunks_per_file=_CODE_CHUNKS_PER_FILE,
        )
        if not chunks:
            logger.warning(
                "code_context_empty",
                project_id=project_id,
                n_files=len(file_paths),
            )
            return ""
        return build_context(chunks)
    except Exception as exc:
        logger.warning(
            "code_context_fetch_failed",
            project_id=project_id,
            error=str(exc),
        )
        return ""


BATCH_SIZE = 3
MAX_ISSUES_PER_BATCH = 3

async def suggest_improvements_batched(
    project_id: str, categories: list[str] | None = None
):
    """Async generator that yields improvement batches as they complete."""
    cats = categories or ["performance", "security", "refactoring"]
    all_nodes = await _fetch_all_nodes(project_id)
    top_nodes = all_nodes[:_CONTEXT_NODES]

    # We only process the top _CODE_CONTEXT_FILES nodes
    top_code_nodes = top_nodes[:_CODE_CONTEXT_FILES]

    # Split into batches
    batches = [
        top_code_nodes[i : i + BATCH_SIZE]
        for i in range(0, len(top_code_nodes), BATCH_SIZE)
    ]
    total_batches = len(batches)

    seen_issues = set()
    total_found = 0

    for batch_idx, batch_nodes in enumerate(batches):
        batch_num = batch_idx + 1
        file_metadata_parts = [
            f"- {node['path']} "
            f"(risk={float(node.get('risk_score') or 0):.3f}, "
            f"complexity={node.get('complexity_score', 1)}, "
            f"in_degree={node.get('in_degree', 0)}, "
            f"out_degree={node.get('out_degree', 0)})"
            for node in batch_nodes
        ]
        file_metadata = (
            f"Analysing batch {batch_num}/{total_batches} ({len(batch_nodes)} files):\n"
            + "\n".join(file_metadata_parts)
        )

        code_file_paths = [n["path"] for n in batch_nodes]
        code_context = await _fetch_code_context(project_id, code_file_paths)

        if not code_context:
            code_context = "(Source code unavailable — embeddings may not have been generated yet.)"

        try:
            result = await llm_complete_json(
                IMPROVEMENT_ANALYSIS_PROMPT.format(
                    categories=", ".join(cats),
                    file_metadata=file_metadata,
                    code_context=code_context,
                    batch_num=batch_num,
                    total_batches=total_batches,
                    max_issues=MAX_ISSUES_PER_BATCH,
                ),
                max_tokens=800,  # much smaller response limit
                retries=2,
            )

            issues = []
            if isinstance(result, list):
                issues = result
            elif isinstance(result, dict):
                issues = result.get("improvements") or result.get("issues") or []

            # Deduplicate by file + title
            new_issues = []
            for issue in issues:
                dedup_key = (issue.get("file"), issue.get("title"))
                if dedup_key not in seen_issues:
                    seen_issues.add(dedup_key)
                    new_issues.append(issue)
                    total_found += 1

            yield {
                "type": "batch",
                "batch": batch_num,
                "total_batches": total_batches,
                "issues": new_issues,
            }

        except Exception as e:
            logger.error(
                "llm_batch_synthesis_failed",
                error=str(e),
                batch=batch_num,
                project_id=project_id
            )
            yield {
                "type": "batch",
                "batch": batch_num,
                "total_batches": total_batches,
                "issues": [],
            }

    yield {
        "type": "done",
        "total": total_found
    }


async def suggest_improvements(
    project_id: str, categories: list[str] | None = None
) -> list[dict]:
    """Fallback for non-streaming usage."""
    all_issues = []
    async for chunk in suggest_improvements_batched(project_id, categories):
        if chunk["type"] == "batch":
            all_issues.extend(chunk.get("issues", []))
    return all_issues
