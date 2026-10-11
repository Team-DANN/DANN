import asyncio

import httpx
import pytest

from config import get_settings
from llm.groq_client import LLMError, chat_completion

MESSAGES = [{"role": "user", "content": "hi"}]


@pytest.fixture(autouse=True)
def fresh_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _call(handler):
    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await chat_completion(MESSAGES, client=client)

    return asyncio.run(go())


def test_success_returns_message_and_usage(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")

    def handler(request):
        assert request.headers["authorization"] == "Bearer test-key"
        return httpx.Response(
            200,
            json={
                "model": "openai/gpt-oss-120b",
                "choices": [{"message": {"role": "assistant", "content": "hello"}}],
                "usage": {"total_tokens": 12},
            },
        )

    result = _call(handler)
    assert result["message"]["content"] == "hello"
    assert result["usage"]["total_tokens"] == 12


def test_rate_limit_maps_to_llm_error(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "test-key")

    def handler(request):
        return httpx.Response(429, headers={"retry-after": "7"})

    with pytest.raises(LLMError) as err:
        _call(handler)
    assert err.value.status == 429
    assert err.value.retry_after == 7.0


def test_missing_key_is_rejected(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(LLMError):
        _call(lambda request: httpx.Response(200, json={}))