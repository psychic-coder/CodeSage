"""Root conftest.py — stubs all external service dependencies.

This runs before any test module is imported, so `from app.xxx import ...`
works without a running Postgres, Neo4j, Redis, or LiteLLM connection.
"""
from __future__ import annotations

import sys
import types


# ── litellm ──────────────────────────────────────────────────────────────────
if "litellm" not in sys.modules:
    _lit = types.SimpleNamespace()

    async def _acompletion(**kwargs):
        return types.SimpleNamespace(
            choices=[types.SimpleNamespace(message=types.SimpleNamespace(content='{"ok":true}'))],
        )

    async def _aembedding(**kwargs):
        return {"data": [{"embedding": [0.0] * 8}]}

    _lit.acompletion = _acompletion
    _lit.aembedding = _aembedding
    _lit.api_key = None
    sys.modules["litellm"] = _lit


# ── app.config (settings) ─────────────────────────────────────────────────────
if "app.config" not in sys.modules:
    _cfg = types.SimpleNamespace(
        app_env="test",
        secret_key="test-secret",
        allowed_origins="*",
        database_url="postgresql+asyncpg://user:pass@localhost:5432/codesage",
        neo4j_uri="bolt://localhost:7687",
        neo4j_user="neo4j",
        neo4j_password="password",
        qdrant_url="http://localhost:6333",
        redis_url="redis://localhost:6379/0",
        minio_endpoint="localhost:9000",
        minio_access_key="minioadmin",
        minio_secret_key="minioadmin",
        minio_bucket="codesage-repos",
        openai_api_key="sk-test",
        openrouter_api_key="",
        openrouter_base_url="https://openrouter.ai",
        openrouter_model="gpt-4o-mini",
        openrouter_fallback_models=[],
        llm_model="gpt-4o",
        embedding_model="text-embedding-3-small",
        ollama_url="",
        ollama_model="llama3",
        github_client_id="",
        github_client_secret="",
        github_personal_token="",
        max_repo_size_mb=500,
        max_files_per_repo=5000,
        max_file_size_kb=500,
        embedding_batch_size=100,
    )
    _mod = types.ModuleType("app.config")
    _mod.settings = _cfg
    sys.modules["app.config"] = _mod


# ── app.database.neo4j ───────────────────────────────────────────────────────
if "app.database.neo4j" not in sys.modules:
    _neo4j = types.ModuleType("app.database.neo4j")

    class _DummyResult:
        def __init__(self, rows=None):
            self._rows = rows or []
        def __aiter__(self):
            async def _gen():
                for r in self._rows:
                    yield r
            return _gen()
        async def single(self):
            return self._rows[0] if self._rows else None

    class _DummySession:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): pass
        async def run(self, *args, **kwargs):
            return _DummyResult()

    class _DummyDriver:
        def session(self): return _DummySession()

    _neo4j.get_neo4j_driver = lambda: _DummyDriver()
    sys.modules["app.database.neo4j"] = _neo4j


# ── app.database.redis ───────────────────────────────────────────────────────
if "app.database.redis" not in sys.modules:
    _redis_mod = types.ModuleType("app.database.redis")

    class _DummyRedis:
        async def get(self, key): return None
        async def setex(self, key, ttl, val): pass
        async def exists(self, key): return 0
        async def publish(self, channel, msg): pass

    _redis_mod.get_redis = lambda: _DummyRedis()
    sys.modules["app.database.redis"] = _redis_mod


# ── app.services.llm.output_parser ───────────────────────────────────────────
if "app.services.llm.output_parser" not in sys.modules:
    _op = types.ModuleType("app.services.llm.output_parser")
    _op.extract_json = lambda text: {}
    _op.validate_required_keys = lambda d, keys: True
    _op.sanitize_user_text = lambda t: t
    _op.clean_for_prompt = lambda t: t
    sys.modules["app.services.llm.output_parser"] = _op
