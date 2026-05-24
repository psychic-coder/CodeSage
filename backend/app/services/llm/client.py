import litellm, asyncio
from app.config import settings

litellm.api_key = settings.openai_api_key


async def llm_complete(prompt: str, max_tokens: int = 2000, json_mode: bool = False) -> str:
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
    response = await litellm.aembedding(
        model=settings.embedding_model,
        input=texts
    )
    return [item["embedding"] for item in response["data"]]