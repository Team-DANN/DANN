"""Thin async client for Groq's OpenAI-compatible chat endpoint (no SDK)."""

import httpx

from config import get_settings

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMError(Exception):
    """Groq could not give us a usable answer."""

    def __init__(self, message: str, status: int | None = None, retry_after: float | None = None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


def _parse_retry_after(value: str | None) -> float | None:
    try:
        return float(value) if value else None
    except ValueError:
        return None


async def chat_completion(
    messages: list[dict],
    *,
    model: str | None = None,
    tools: list[dict] | None = None,
    temperature: float = 0.2,
    max_tokens: int = 1024,
    reasoning_effort: str = "low",
    client: httpx.AsyncClient | None = None,
) -> dict:
    """Returns {"message": {...}, "usage": {...}, "model": "..."}.

    max_tokens is a ceiling on output INCLUDING the model's hidden reasoning,
    so keep it generous or the visible reply can come back empty.
    """
    settings = get_settings()
    if not settings.groq_api_key:
        raise LLMError("GROQ_API_KEY is not set")

    payload = {
        "model": model or settings.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_completion_tokens": max_tokens,
        "reasoning_effort": reasoning_effort,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}

    own_client = client is None
    http = client or httpx.AsyncClient(timeout=30.0)
    try:
        resp = await http.post(GROQ_CHAT_URL, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise LLMError("The model took too long to answer") from exc
    except httpx.HTTPError as exc:
        raise LLMError(f"Could not reach Groq ({exc.__class__.__name__})") from exc
    finally:
        if own_client:
            await http.aclose()

    if resp.status_code == 429:
        raise LLMError(
            "Rate limited by Groq",
            status=429,
            retry_after=_parse_retry_after(resp.headers.get("retry-after")),
        )
    if resp.status_code in (401, 403):
        raise LLMError("Groq rejected the API key", status=resp.status_code)
    if resp.status_code >= 400:
        raise LLMError(f"Groq error {resp.status_code}: {resp.text[:300]}", status=resp.status_code)

    data = resp.json()
    try:
        message = data["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError("Unexpected response shape from Groq") from exc

    return {
        "message": message,
        "usage": data.get("usage", {}),
        "model": data.get("model", payload["model"]),
    }