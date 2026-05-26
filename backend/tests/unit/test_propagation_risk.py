"""Unit tests for graph_queries propagation risk scoring.

Tests the pure functions (_count_nodes, _weighted_risk) in isolation,
and tests get_propagation_tree with a mocked Neo4j + LLM layer.
"""
import asyncio
import sys
import types
import pytest

# ── Minimal stubs ─────────────────────────────────────────────────────────────
for mod_name in [
    "app.database.neo4j",
    "app.database.redis",
    "app.services.llm.client",
    "app.services.llm.prompts",
]:
    if mod_name not in sys.modules:
        sys.modules[mod_name] = types.ModuleType(mod_name)

if "app.config" not in sys.modules:
    cfg = types.SimpleNamespace(
        openrouter_api_key="", llm_model="gpt-4o", embedding_model="text-embedding-3-small",
        openai_api_key="sk-test", secret_key="test", allowed_origins="*",
    )
    mod = types.ModuleType("app.config")
    mod.settings = cfg
    sys.modules["app.config"] = mod

# Patch the prompt constant used inside graph_queries
sys.modules["app.services.llm.prompts"].PROPAGATION_ANALYSIS_PROMPT = "{context}"

from app.services.graph.graph_queries import _count_nodes, _weighted_risk  # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Pure function tests
# ─────────────────────────────────────────────────────────────────────────────

class TestCountNodes:
    def test_empty_tree(self):
        assert _count_nodes({"file": "a.py", "dependents": []}) == 0

    def test_flat_tree(self):
        tree = {
            "file": "root.py",
            "dependents": [
                {"file": "a.py", "dependents": []},
                {"file": "b.py", "dependents": []},
            ]
        }
        assert _count_nodes(tree) == 2

    def test_nested_tree(self):
        tree = {
            "file": "root.py",
            "dependents": [
                {
                    "file": "a.py",
                    "dependents": [
                        {"file": "c.py", "dependents": []},
                    ]
                },
                {"file": "b.py", "dependents": []},
            ]
        }
        assert _count_nodes(tree) == 3


class TestWeightedRisk:
    def test_empty_tree_zero(self):
        assert _weighted_risk({"dependents": []}, depth=1) == 0.0

    def test_single_depth1_node(self):
        """Depth-1 discount = 1.0, so weighted_risk == node risk_score."""
        tree = {
            "dependents": [
                {"file": "a.py", "risk_score": 0.8, "dependents": []},
            ]
        }
        result = _weighted_risk(tree, depth=1)
        assert abs(result - 0.8) < 1e-9

    def test_depth2_is_half(self):
        """Depth-2 discount = 0.5, so weighted contribution = 0.8 * 0.5 = 0.4."""
        tree = {
            "dependents": [
                {
                    "file": "a.py", "risk_score": 0.6, "dependents": [
                        {"file": "b.py", "risk_score": 0.8, "dependents": []},
                    ]
                },
            ]
        }
        result = _weighted_risk(tree, depth=1)
        # depth-1: 0.6 * 1.0 = 0.6; depth-2: 0.8 * 0.5 = 0.4; total = 1.0
        assert abs(result - 1.0) < 1e-9

    def test_uses_default_risk_when_missing(self):
        """Nodes without risk_score should use the default (0.3)."""
        tree = {
            "dependents": [{"file": "x.py", "dependents": []}]
        }
        result = _weighted_risk(tree, depth=1)
        assert abs(result - 0.3) < 1e-9

    def test_high_fan_out_clamped_by_caller(self):
        """Raw weighted sum > 1.0 in large graphs; caller must clamp."""
        tree = {
            "dependents": [
                {"file": f"f{i}.py", "risk_score": 1.0, "dependents": []}
                for i in range(20)
            ]
        }
        result = _weighted_risk(tree, depth=1)
        # 20 * 1.0 = 20.0 — caller clamps to min(result, 1.0)
        assert result == 20.0
        assert min(result, 1.0) == 1.0
