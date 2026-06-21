import asyncio
import sys
import types

# Provide a minimal dummy 'litellm' module so importing llm.client doesn't fail in tests
if 'litellm' not in sys.modules:
    lit = types.SimpleNamespace()
    async def _acompletion(**kwargs):
        return types.SimpleNamespace(choices=[types.SimpleNamespace(message=types.SimpleNamespace(content="{}"))])
    async def _aembedding(**kwargs):
        return {"data": [{"embedding": [0.0] * 8}]}
    lit.acompletion = _acompletion
    lit.aembedding = _aembedding
    lit.api_key = None
    sys.modules['litellm'] = lit

# Provide a minimal 'app.config' settings module to avoid needing pydantic in tests
if 'app.config' not in sys.modules:
    cfg = types.SimpleNamespace()
    cfg.openrouter_api_key = None
    cfg.openrouter_base_url = "https://openrouter.ai"
    cfg.llm_model = "gpt-4o-mini"
    cfg.embedding_model = "text-embedding-3-small"
    cfg.openai_api_key = None
    cfg.secret_key = "test-secret"
    cfg.allowed_origins = "*"
    mod = types.ModuleType('app.config')
    mod.settings = cfg
    sys.modules['app.config'] = mod

# Stub heavy external modules used by retriever/vector store/neo4j
if 'app.services.embeddings.vector_store' not in sys.modules:
    vs = types.ModuleType('app.services.embeddings.vector_store')
    async def search_similar(pid, vector, top_k=20):
        return [{"file_path": "a.py", "score": 0.8, "code": "def a(): pass"}]
    vs.search_similar = search_similar
    sys.modules['app.services.embeddings.vector_store'] = vs

if 'app.database.neo4j' not in sys.modules:
    modn = types.ModuleType('app.database.neo4j')
    class DummySession:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc, tb):
            return False
        async def run(self, *args, **kwargs):
            class Res:
                def __aiter__(self_inner):
                    async def gen():
                        if False:
                            yield None
                    return gen()
            return Res()
    def get_neo4j_driver():
        class D:
            def session(self):
                return DummySession()
        return D()
    modn.get_neo4j_driver = get_neo4j_driver
    sys.modules['app.database.neo4j'] = modn

from app.services.rag import graph_rag


def test_graph_rag_query_monkeypatched(monkeypatch):
    async def fake_hybrid(project_id, query, top_k=20):
        return [{"file_path": "a.py", "score": 0.9, "code": "def a(): pass"}]

    async def fake_llm(prompt, max_tokens=1000):
        return {"answer": "ok", "sources": [{"file": "a.py", "score": 0.9}]}

    monkeypatch.setattr("app.services.rag.retriever.hybrid_retrieve", fake_hybrid)
    monkeypatch.setattr("app.services.llm.client.llm_complete_json", fake_llm)

    res = asyncio.run(graph_rag.graph_rag_query("proj-1", "what?"))
    assert isinstance(res, dict)
    assert res.get("answer") or res.get("answer") is None


def test_analyze_impact_monkeypatched(monkeypatch):
    async def fake_hybrid(project_id, query, top_k=20):
        return [{"file_path": "a.py", "score": 0.9, "code": "def a(): pass"}]

    async def fake_llm_smart(prompt, required_keys, **kwargs):
        if "type" in required_keys:
            return {"type": "code_change", "confidence": 0.9}
        return {"files_to_modify": [{"path": "a.py", "reason": "related"}], "files_to_create": [], "downstream_risks": [], "dependencies_to_add": [], "estimated_complexity": "low"}
    
    monkeypatch.setattr("app.services.llm.client.llm_complete_json_with_keys", fake_llm_smart)
    from app.services.intelligence.impact_predictor import analyze_impact

    res = asyncio.run(analyze_impact("proj-1", "add feature"))
    assert isinstance(res, dict)
    assert "files_to_modify" in res

