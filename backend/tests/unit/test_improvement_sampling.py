"""Unit tests for improvement_suggester risk-sorted node sampling and RAG enrichment.

Conftest stubs all external services so no live infra is needed.
"""
import asyncio

from app.services.intelligence import improvement_suggester
from app.services.intelligence.improvement_suggester import (
    _fetch_all_nodes,
    _fetch_code_context,
    _PAGE_SIZE,
    _MAX_PAGES,
    _CONTEXT_NODES,
    _CODE_CONTEXT_FILES,
    _CODE_CHUNKS_PER_FILE,
)


# ─────────────────────────────────────────────────────────────────────────────
# Existing node-sampling tests (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class TestFetchAllNodes:
    def test_single_page_sorted_by_risk(self, monkeypatch):
        nodes = [
            {"path": "a.py", "risk_score": 0.2},
            {"path": "b.py", "risk_score": 0.9},
            {"path": "c.py", "risk_score": 0.5},
        ]

        async def fake_get_nodes(project_id, skip=0, limit=100):
            return nodes if skip == 0 else []

        monkeypatch.setattr(improvement_suggester, "get_graph_nodes", fake_get_nodes)
        result = asyncio.run(_fetch_all_nodes("proj-1"))
        assert [n["path"] for n in result] == ["b.py", "c.py", "a.py"]

    def test_stops_after_max_pages(self, monkeypatch):
        call_log = []

        async def fake_get_nodes(project_id, skip=0, limit=100):
            call_log.append(skip)
            return [{"path": f"f{skip}.py", "risk_score": 0.5}] * limit

        monkeypatch.setattr(improvement_suggester, "get_graph_nodes", fake_get_nodes)
        result = asyncio.run(_fetch_all_nodes("proj-1"))
        assert len(call_log) == _MAX_PAGES
        assert len(result) == _MAX_PAGES * _PAGE_SIZE

    def test_stops_on_partial_page(self, monkeypatch):
        pages = [
            [{"path": f"f{i}.py", "risk_score": 0.5} for i in range(100)],
            [{"path": f"g{i}.py", "risk_score": 0.3} for i in range(40)],
        ]
        call_count = 0

        async def fake_get_nodes(project_id, skip=0, limit=100):
            nonlocal call_count
            idx = call_count
            call_count += 1
            return pages[idx] if idx < len(pages) else []

        monkeypatch.setattr(improvement_suggester, "get_graph_nodes", fake_get_nodes)
        result = asyncio.run(_fetch_all_nodes("proj-1"))
        assert len(result) == 140
        assert call_count == 2

    def test_constants(self):
        assert _CONTEXT_NODES == 60
        assert _PAGE_SIZE == 100
        assert _MAX_PAGES == 5


# ─────────────────────────────────────────────────────────────────────────────
# New RAG enrichment tests
# ─────────────────────────────────────────────────────────────────────────────

class TestFetchCodeContext:
    def test_returns_context_string_from_chunks(self, monkeypatch):
        """Happy path: Qdrant returns chunks → build_context produces a string."""
        fake_chunks = [
            {"file_path": "auth.py", "code": "def login(): pass", "start_line": 1, "end_line": 5, "score": 1.0},
            {"file_path": "db.py",   "code": "def query(): pass", "start_line": 10, "end_line": 15, "score": 1.0},
        ]

        async def fake_fetch(project_id, file_paths, chunks_per_file=5):
            return fake_chunks

        import app.services.embeddings.vector_store as vs
        monkeypatch.setattr(vs, "fetch_chunks_for_files", fake_fetch)

        result = asyncio.run(_fetch_code_context("proj-1", ["auth.py", "db.py"]))
        assert "auth.py" in result
        assert "def login(): pass" in result

    def test_graceful_degradation_on_qdrant_failure(self, monkeypatch):
        """If fetch_chunks_for_files raises, _fetch_code_context returns empty string."""
        async def boom(project_id, file_paths, chunks_per_file=5):
            raise ConnectionError("Qdrant down")

        import app.services.embeddings.vector_store as vs
        monkeypatch.setattr(vs, "fetch_chunks_for_files", boom)

        result = asyncio.run(_fetch_code_context("proj-1", ["some.py"]))
        assert result == ""

    def test_empty_when_no_chunks_returned(self, monkeypatch):
        """If Qdrant returns no chunks (unembedded project), returns empty string."""
        async def no_chunks(project_id, file_paths, chunks_per_file=5):
            return []

        import app.services.embeddings.vector_store as vs
        monkeypatch.setattr(vs, "fetch_chunks_for_files", no_chunks)

        result = asyncio.run(_fetch_code_context("proj-1", ["some.py"]))
        assert result == ""


class TestSuggestImprovementsCodeEnrichment:
    """Verify suggest_improvements calls code enrichment and falls back cleanly."""

    def _fake_nodes(self, n=25):
        return [{"path": f"file{i}.py", "risk_score": 1.0 - i * 0.01, "complexity_score": 1, "in_degree": 0, "out_degree": 0} for i in range(n)]

    def test_code_context_fetched_for_top_files_only(self, monkeypatch):
        """Only the top _CODE_CONTEXT_FILES paths are passed to fetch_chunks_for_files."""
        captured_paths = []

        async def fake_get_nodes(project_id, skip=0, limit=100):
            return self._fake_nodes(25) if skip == 0 else []

        async def fake_fetch(project_id, file_paths, chunks_per_file=5):
            captured_paths.extend(file_paths)
            return []

        async def fake_llm(*args, **kwargs):
            return []

        monkeypatch.setattr(improvement_suggester, "get_graph_nodes", fake_get_nodes)
        import app.services.embeddings.vector_store as vs
        monkeypatch.setattr(vs, "fetch_chunks_for_files", fake_fetch)
        monkeypatch.setattr(improvement_suggester, "llm_complete_json", fake_llm)

        asyncio.run(improvement_suggester.suggest_improvements("proj-1"))

        # Should only ask for the top _CODE_CONTEXT_FILES (or all nodes if fewer)
        assert len(captured_paths) <= _CODE_CONTEXT_FILES

    def test_llm_prompt_includes_code_context(self, monkeypatch):
        """The prompt passed to the LLM contains actual code, not just paths."""
        captured_prompts = []

        async def fake_get_nodes(project_id, skip=0, limit=100):
            return self._fake_nodes(5) if skip == 0 else []

        async def fake_fetch(project_id, file_paths, chunks_per_file=5):
            return [{"file_path": "file0.py", "code": "SECRET_KEY = 'abc123'", "start_line": 1, "end_line": 1, "score": 1.0}]

        async def fake_llm(prompt, **kwargs):
            captured_prompts.append(prompt)
            return []

        monkeypatch.setattr(improvement_suggester, "get_graph_nodes", fake_get_nodes)
        import app.services.embeddings.vector_store as vs
        monkeypatch.setattr(vs, "fetch_chunks_for_files", fake_fetch)
        monkeypatch.setattr(improvement_suggester, "llm_complete_json", fake_llm)

        asyncio.run(improvement_suggester.suggest_improvements("proj-1"))

        assert captured_prompts, "LLM was never called"
        assert "SECRET_KEY" in captured_prompts[0], "Prompt does not contain real code"

    def test_fallback_message_used_when_qdrant_unavailable(self, monkeypatch):
        """When Qdrant is unavailable, the fallback note appears in the prompt."""
        captured_prompts = []

        async def fake_get_nodes(project_id, skip=0, limit=100):
            return self._fake_nodes(3) if skip == 0 else []

        async def boom(project_id, file_paths, chunks_per_file=5):
            raise ConnectionError("Qdrant down")

        async def fake_llm(prompt, **kwargs):
            captured_prompts.append(prompt)
            return []

        monkeypatch.setattr(improvement_suggester, "get_graph_nodes", fake_get_nodes)
        import app.services.embeddings.vector_store as vs
        monkeypatch.setattr(vs, "fetch_chunks_for_files", boom)
        monkeypatch.setattr(improvement_suggester, "llm_complete_json", fake_llm)

        asyncio.run(improvement_suggester.suggest_improvements("proj-1"))

        assert captured_prompts
        assert "embeddings may not have been generated" in captured_prompts[0]

    def test_new_quality_constants(self):
        assert _CODE_CONTEXT_FILES == 20
        assert _CODE_CHUNKS_PER_FILE == 5
