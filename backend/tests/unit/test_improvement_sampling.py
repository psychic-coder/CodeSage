"""Unit tests for improvement_suggester risk-sorted node sampling.

Conftest stubs all external services so no live infra is needed.
"""
import asyncio
import pytest

from app.services.intelligence import improvement_suggester
from app.services.intelligence.improvement_suggester import (
    _fetch_all_nodes, _PAGE_SIZE, _MAX_PAGES, _CONTEXT_NODES,
)


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


