import asyncio
from app.services.llm.client import llm_complete_json
from app.services.llm.prompts import IMPROVEMENT_ANALYSIS_PROMPT
import logging
from app.services.llm.client import logger as llm_logger

logging.basicConfig(level=logging.DEBUG)

async def main():
    try:
        res = await llm_complete_json(IMPROVEMENT_ANALYSIS_PROMPT.format(categories="security", file_metadata="None", code_context="None"), max_tokens=1000)
        print("Success:", res)
    except Exception as e:
        print("Exception:", e)

asyncio.run(main())
