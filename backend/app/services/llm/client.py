import asyncio
import httpx
import litellm
from app.config import settings
from app.services.llm import output_parser

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
    # Next fallback: try a local Ollama instance if available
    ollama_url = getattr(settings, "ollama_url", None)
    ollama_model = getattr(settings, "ollama_model", settings.llm_model)
    if ollama_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {"model": ollama_model, "prompt": prompt, "max_tokens": max_tokens}
                # Try the common Ollama completions endpoint
                r = await client.post(ollama_url.rstrip('/') + "/api/completions", json=payload)
                if r.status_code == 200:
                    data = r.json()
                    # Support multiple possible shapes: {choices:[{message:{content:...}}]} or {choices:[{text: "..."}]} or {text: "..."}
                    choice = (data.get("choices") or [None])[0]
                    if choice:
                        message = choice.get("message") or choice
                        if isinstance(message, dict) and message.get("content"):
                            return message.get("content")
                        if isinstance(choice, dict) and choice.get("text"):
                            return choice.get("text")
                    if isinstance(data, dict) and data.get("text"):
                        return data.get("text")
        except Exception:
            # ignore and fall through to litellm
            pass

    # Final fallback: use litellm async completion as before
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


async def llm_complete_json(prompt: str, max_tokens: int = 2000, retries: int = 2) -> dict:
    """Call `llm_complete` requesting structured JSON and validate/parse the response.

    Retries a few times if parsing fails. Raises ValueError if no valid JSON returned.
    """
    last_exc = None
    for attempt in range(retries + 1):
        try:
            text = await llm_complete(prompt, max_tokens=max_tokens, json_mode=True)
            parsed = output_parser.extract_json(text or "")
            if parsed is not None:
                return parsed
            raise ValueError("LLM returned non-JSON response")
        except Exception as exc:
            last_exc = exc
            # exponential backoff
            await asyncio.sleep(1 + attempt)
            continue
    raise last_exc or ValueError("Failed to obtain JSON from LLM")