"""Unit tests for graph_queries propagation risk scoring.

Pure-function tests for _count_nodes and _weighted_risk.
Conftest stubs all external services so no live infra is needed.
"""
import pytest
from app.services.graph.graph_queries import _count_nodes, _weighted_risk


class TestCountNodes:
    def test_empty_tree(self):
        assert _count_nodes({"file": "a.py", "dependents": []}) == 0

    def test_flat_tree(self):
        tree = {
            "file": "root.py",
            "dependents": [
                {"file": "a.py", "dependents": []},
                {"file": "b.py", "dependents": []},
            ],
        }
        assert _count_nodes(tree) == 2

    def test_nested_tree(self):
        tree = {
            "file": "root.py",
            "dependents": [
                {
                    "file": "a.py",
                    "dependents": [{"file": "c.py", "dependents": []}],
                },
                {"file": "b.py", "dependents": []},
            ],
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
        assert abs(_weighted_risk(tree, depth=1) - 0.8) < 1e-9

    def test_depth2_is_half(self):
        """depth-1: 0.6*1.0; depth-2: 0.8*0.5 → total=1.0"""
        tree = {
            "dependents": [
                {
                    "file": "a.py",
                    "risk_score": 0.6,
                    "dependents": [
                        {"file": "b.py", "risk_score": 0.8, "dependents": []},
                    ],
                },
            ]
        }
        assert abs(_weighted_risk(tree, depth=1) - 1.0) < 1e-9

    def test_uses_default_risk_when_missing(self):
        tree = {"dependents": [{"file": "x.py", "dependents": []}]}
        assert abs(_weighted_risk(tree, depth=1) - 0.3) < 1e-9

    def test_high_fan_out_caller_must_clamp(self):
        tree = {
            "dependents": [
                {"file": f"f{i}.py", "risk_score": 1.0, "dependents": []}
                for i in range(20)
            ]
        }
        result = _weighted_risk(tree, depth=1)
        assert result == 20.0          # raw sum > 1
        assert min(result, 1.0) == 1.0  # caller clamps

