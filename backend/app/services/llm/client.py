import asyncio

import httpx
import litellm
import structlog

from app.config import settings
from app.services.llm import output_parser

logger = structlog.get_logger()

# Wire litellm to the OpenAI key for its fallback path
litellm.api_key = settings.openai_api_key


async def llm_complete(
    prompt: str,
    max_tokens: int = 2000,
    json_mode: bool = False,
    reasoning: dict | None = None,
) -> str:
    """Route completions: OpenRouter (with model fallback chain) → Ollama → LiteLLM/OpenAI.

    Raises ``RuntimeError`` if every path fails so callers always get an
    exception rather than a silent empty string.
    """
    errors: list[str] = []

    # ── 1. OpenRouter ────────────────────────────────────────────────────────
    if settings.openrouter_api_key:
        url = settings.openrouter_base_url.rstrip("/") + "/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        models_to_try = [
            getattr(settings, "openrouter_model", settings.llm_model)
        ] + list(getattr(settings, "openrouter_fallback_models", []))

        async with httpx.AsyncClient(timeout=60.0) as client:
            for model in models_to_try:
                payload: dict = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                }
                if json_mode:
                    payload["response_format"] = {"type": "json_object"}
                if reasoning is not None:
                    payload["reasoning"] = reasoning

                for attempt in range(2):
                    try:
                        r = await client.post(url, headers=headers, json=payload)
                        r.raise_for_status()
                        data = r.json()
                        choice = data.get("choices", [None])[0]
                        if not choice:
                            break
                        message = choice.get("message") or choice.get("delta") or choice
                        text = (
                            message.get("content")
                            if isinstance(message, dict)
                            else str(message)
                        ) or ""
                        if text:
                            return text
                        # empty content — treat as transient failure
                        err = f"OpenRouter/{model} returned empty content"
                        errors.append(err)
                        logger.warning(
                            "llm_empty_response", model=model, attempt=attempt
                        )
                        break
                    except Exception as exc:
                        err = f"OpenRouter/{model} attempt {attempt}: {exc}"
                        errors.append(err)
                        logger.warning(
                            "llm_request_error",
                            model=model,
                            attempt=attempt,
                            error=str(exc),
                        )
                        if attempt < 1:
                            await asyncio.sleep(2**attempt)

    # ── 2. Ollama (local, optional) ───────────────────────────────────────────
    ollama_url = getattr(settings, "ollama_url", None) or ""
    ollama_model = getattr(settings, "ollama_model", settings.llm_model)
    if ollama_url:
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "model": ollama_model,
                    "prompt": prompt,
                    "max_tokens": max_tokens,
                }
                r = await client.post(
                    ollama_url.rstrip("/") + "/api/completions", json=payload
                )
                if r.status_code == 200:
                    data = r.json()
                    choice = (data.get("choices") or [None])[0]
                    if choice:
                        message = choice.get("message") or choice
                        if isinstance(message, dict) and message.get("content"):
                            return message["content"]
                        if isinstance(choice, dict) and choice.get("text"):
                            return choice["text"]
                    if isinstance(data, dict) and data.get("text"):
                        return data["text"]
                errors.append(
                    f"Ollama/{ollama_model} returned status {r.status_code} or empty body"
                )
                logger.warning(
                    "llm_ollama_empty", model=ollama_model, status=r.status_code
                )
        except Exception as exc:
            errors.append(f"Ollama/{ollama_model}: {exc}")
            logger.warning("llm_ollama_error", error=str(exc))

    # ── 3. LiteLLM / OpenAI direct ───────────────────────────────────────────
    for attempt in range(3):
        try:
            kwargs: dict = {
                "model": settings.llm_model,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": max_tokens,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            response = await litellm.acompletion(**kwargs)
            text = response.choices[0].message.content or ""
            if text:
                return text
            errors.append(
                f"LiteLLM/{settings.llm_model} returned empty content on attempt {attempt}"
            )
        except Exception as exc:
            errors.append(f"LiteLLM/{settings.llm_model} attempt {attempt}: {exc}")
            logger.warning("llm_litellm_error", attempt=attempt, error=str(exc))
            if attempt < 2:
                await asyncio.sleep(2**attempt)

    # Every path failed — raise so callers can handle or surface the error.
    raise RuntimeError(
        f"All LLM backends failed ({len(errors)} attempts). Last errors: "
        + " | ".join(errors[-3:])
    )


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


async def llm_complete_json(
    prompt: str, max_tokens: int = 2000, retries: int = 2
) -> dict:
    """Call `llm_complete` requesting structured JSON and validate/parse the response.

    Retries a few times if parsing fails. Raises ValueError if no valid JSON returned.
    """
    return await llm_complete_json_with_keys(
        prompt, max_tokens=max_tokens, retries=retries
    )


async def llm_complete_json_with_keys(
    prompt: str,
    max_tokens: int = 2000,
    retries: int = 2,
    required_keys: list[str] | None = None,
) -> dict:
    """JSON completion helper with optional required-key validation."""
    last_exc = None
    for attempt in range(retries + 1):
        try:
            text = await llm_complete(prompt, max_tokens=max_tokens, json_mode=True)
            parsed = output_parser.extract_json(text or "")
            if output_parser.validate_required_keys(parsed, required_keys):
                return parsed
            raise ValueError("LLM returned non-JSON response")
        except Exception as exc:
            last_exc = exc
            # exponential backoff
            await asyncio.sleep(1 + attempt)
            continue
    raise last_exc or ValueError("Failed to obtain JSON from LLM")
