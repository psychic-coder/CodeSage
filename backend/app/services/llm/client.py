import asyncio
import httpx
import litellm
from app.config import settings

# Default to older litellm/OpenAI key for backward compatibility
litellm.api_key = settings.openai_api_key


async def llm_complete(prompt: str, max_tokens: int = 2000, json_mode: bool = False, reasoning: dict | None = None) -> str:
    """Complete using OpenRouter if configured, otherwise fall back to litellm.

    `reasoning` is an optional dict forwarded to OpenRouter (e.g. {"enabled": True}).
    """
    # Prefer OpenRouter when API key is present
    if settings.openrouter_api_key:
        url = settings.openrouter_base_url.rstrip("/") + "/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.llm_model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        if reasoning is not None:
            payload["reasoning"] = reasoning

        async with httpx.AsyncClient(timeout=30.0) as client:
            for attempt in range(3):
                try:
                    r = await client.post(url, headers=headers, json=payload)
                    r.raise_for_status()
                    data = r.json()
                    # OpenRouter mirrors OpenAI/Anthropic response shapes; try to extract message
                    choice = data.get("choices", [None])[0]
                    if not choice:
                        return ""
                    # Support both chat-style and direct message shapes
                    message = choice.get("message") or choice.get("delta") or choice
                    return (message.get("content") if isinstance(message, dict) else str(message)) or ""
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 ** attempt)
        return ""

    # Fallback: use litellm async completion as before
    for attempt in range(3):
        try:
            kwargs = {
                "model": settings.llm_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            response = await litellm.acompletion(**kwargs)
            return response.choices[0].message.content or ""
        except Exception:
            if attempt == 2:
                raise
            await asyncio.sleep(2 ** attempt)
    return ""


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    # Prefer OpenRouter embeddings endpoint when configured
    if settings.openrouter_api_key:
        url = settings.openrouter_base_url.rstrip("/") + "/api/v1/embeddings"
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": settings.embedding_model, "input": texts}
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
            # Expect data like OpenAI: { data: [{ embedding: [...] }, ...] }
            return [item.get("embedding") for item in data.get("data", [])]

    # Fallback to litellm embedding
    response = await litellm.aembedding(model=settings.embedding_model, input=texts)
    return [item["embedding"] for item in response["data"]]