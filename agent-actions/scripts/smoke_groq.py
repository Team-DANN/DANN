"""Checks the Groq key and both models. Run from agent-actions/ with the venv active:

    python -m scripts.smoke_groq
"""

import asyncio

from config import get_settings
from llm.groq_client import LLMError, chat_completion

PROMPT = [
    {"role": "system", "content": "Reply in one short sentence."},
    {"role": "user", "content": "Say hello to a small-business owner."},
]


async def main():
    settings = get_settings()
    for model in (settings.llm_model, settings.llm_model_fast):
        try:
            result = await chat_completion(PROMPT, model=model, max_tokens=400)
        except LLMError as exc:
            print(f"[FAIL] {model}: {exc} (status={exc.status}, retry_after={exc.retry_after})")
            continue
        print(f"[OK]   {model}")
        print("       reply:", (result["message"].get("content") or "").strip())
        print("       usage:", result["usage"])


if __name__ == "__main__":
    asyncio.run(main())