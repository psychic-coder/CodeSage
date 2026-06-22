import asyncio
import httpx
import json
from app.config import settings

async def main():
    url = settings.openrouter_base_url.rstrip("/") + "/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    
    # Try a free model that might support JSON
    models = ["google/gemini-2.0-flash-exp:free", "meta-llama/llama-3-8b-instruct:free", "mistralai/mistral-7b-instruct:free", "openai/gpt-4o-mini"]
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in models:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": "Return a JSON object with a single key 'hello' and value 'world'"}],
                "response_format": {"type": "json_object"}
            }
            r = await client.post(url, headers=headers, json=payload)
            print(f"Model {model}: Status {r.status_code}")
            if r.status_code == 200:
                print("Response:", r.json()["choices"][0]["message"]["content"])
                break
            else:
                print("Error:", r.text)

asyncio.run(main())
