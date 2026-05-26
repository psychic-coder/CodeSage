"""Unit tests for the LLM client routing and error behaviour.

Conftest stubs all external services so no live infra is needed.
"""
import asyncio
import types

import pytest

import app.services.llm.client as llm_client


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_response(content: str):
    return types.SimpleNamespace(
        choices=[types.SimpleNamespace(message=types.SimpleNamespace(content=content))]
    )


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestLlmComplete:
    """LiteLLM fallback path (no OpenRouter key configured)."""

    def test_litellm_success(self, monkeypatch):
        async def fake_completion(**kwargs):
            return _make_response("hello world")

        monkeypatch.setattr(llm_client.litellm, "acompletion", fake_completion)
        result = asyncio.run(llm_client.llm_complete("test prompt"))
        assert result == "hello world"

    def test_litellm_raises_on_all_empty(self, monkeypatch):
        """When litellm returns empty content every time, RuntimeError must be raised."""
        async def fake_completion(**kwargs):
            return _make_response("")

        monkeypatch.setattr(llm_client.litellm, "acompletion", fake_completion)
        with pytest.raises(RuntimeError, match="All LLM backends failed"):
            asyncio.run(llm_client.llm_complete("test prompt"))

    def test_litellm_retries_on_exception(self, monkeypatch):
        call_count = 0

        async def fake_completion(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("transient")
            return _make_response("recovered")

        # Speed up sleep for tests
        async def fast_sleep(_):
            pass

        monkeypatch.setattr(llm_client.asyncio, "sleep", fast_sleep)
        monkeypatch.setattr(llm_client.litellm, "acompletion", fake_completion)
        result = asyncio.run(llm_client.llm_complete("test"))
        assert result == "recovered"
        assert call_count == 3

    def test_openrouter_preferred_when_key_set(self, monkeypatch):
        """When openrouter_api_key is set the client should POST to OpenRouter."""
        import sys
        cfg = sys.modules["app.config"].settings
        original_key = cfg.openrouter_api_key
        cfg.openrouter_api_key = "or-test-key"

        posted_urls = []

        class FakeResponse:
            status_code = 200
            def raise_for_status(self): pass
            def json(self):
                return {"choices": [{"message": {"content": "from openrouter"}}]}

        class FakeClient:
            async def __aenter__(self): return self
            async def __aexit__(self, *_): pass
            async def post(self, url, **kwargs):
                posted_urls.append(url)
                return FakeResponse()

        import httpx
        monkeypatch.setattr(httpx, "AsyncClient", lambda **kw: FakeClient())
        result = asyncio.run(llm_client.llm_complete("test"))

        cfg.openrouter_api_key = original_key  # restore
        assert result == "from openrouter"
        assert any("openrouter.ai" in u for u in posted_urls)
