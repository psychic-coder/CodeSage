"""Unit tests for improvement_suggester risk-sorted node sampling."""
import asyncio
import sys
import types
import pytest

# ── Stubs ─────────────────────────────────────────────────────────────────────
if "app.config" not in sys.modules:
    cfg = types.SimpleNamespace(
        openrouter_api_key="", llm_model="gpt-4o", embedding_model="text-embedding-3-small",
        openai_api_key="sk-test", secret_key="test", allowed_origins="*",
        ollama_url="", ollama_model="llama3",
    )
    mod = types.ModuleType("app.config")
    mod.settings = cfg
    sys.modules["app.config"] = mod

for mod_name in ["app.database.neo4j", "app.database.redis",
                 "app.services.llm.client", "app.services.llm.output_parser"]:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = types.ModuleType(mod_name)


from app.services.intelligence.improvement_suggester import (  # noqa: E402
    _fetch_all_nodes, _PAGE_SIZE, _MAX_PAGES, _CONTEXT_NODES,
)
from app.services.graph import graph_queries  # noqa: E402


class TestFetchAllNodes:
    def test_single_page_returned_unsorted(self, monkeypatch):
        nodes = [
            {"path": "a.py", "risk_score": 0.2},
            {"path": "b.py", "risk_score": 0.9},
            {"path": "c.py", "risk_score": 0.5},
        ]

        async def fake_get_nodes(project_id, skip=0, limit=100):
            if skip == 0:
                return nodes
            return []

        monkeypatch.setattr(graph_queries, "get_graph_nodes", fake_get_nodes)
        result = asyncio.run(_fetch_all_nodes("proj-1"))
        # Should be sorted by risk_score descending
        assert [n["path"] for n in result] == ["b.py", "c.py", "a.py"]

    def test_stops_after_max_pages(self, monkeypatch):
        """Should stop fetching after _MAX_PAGES pages even if data remains."""
        call_log = []

        async def fake_get_nodes(project_id, skip=0, limit=100):
            call_log.append(skip)
            return [{"path": f"f{skip}.py", "risk_score": 0.5}] * limit  # always full page

        monkeypatch.setattr(graph_queries, "get_graph_nodes", fake_get_nodes)
        result = asyncio.run(_fetch_all_nodes("proj-1"))
        assert len(call_log) == _MAX_PAGES
        assert len(result) == _MAX_PAGES * _PAGE_SIZE

    def test_stops_on_partial_page(self, monkeypatch):
        """Should stop fetching when a page returns fewer rows than PAGE_SIZE."""
        pages = [
            [{"path": f"f{i}.py", "risk_score": 0.5} for i in range(100)],
            [{"path": f"g{i}.py", "risk_score": 0.3} for i in range(40)],   # partial
        ]
        call_count = 0

        async def fake_get_nodes(project_id, skip=0, limit=100):
            nonlocal call_count
            idx = call_count
            call_count += 1
            return pages[idx] if idx < len(pages) else []

        monkeypatch.setattr(graph_queries, "get_graph_nodes", fake_get_nodes)
        result = asyncio.run(_fetch_all_nodes("proj-1"))
        assert len(result) == 140
        assert call_count == 2  # stopped after partial page

    def test_context_nodes_constant_at_most_60(self):
        assert _CONTEXT_NODES == 60
