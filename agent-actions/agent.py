"""The agent loop: model -> tool calls -> results -> model, with a hard step cap."""

import json
import logging
from dataclasses import dataclass, field

from auth import CurrentUser
from backend_client import BackendClient, BackendError
from tools.base import ToolContext
from tools.registry import tools_for

log = logging.getLogger("agent-actions.agent")

MAX_STEPS = 6
MAX_TOOL_CALLS_PER_STEP = 4
MAX_TOOL_RESULT_CHARS = 6000
FALLBACK_REPLY = "I could not finish that one. Please try asking in a simpler way."


@dataclass
class AgentResult:
    reply: str
    model: str
    usage: dict
    tools_used: list[str] = field(default_factory=list)
    proposal: dict | None = None  # set when a write tool prepared an action


def _result_json(payload: dict) -> str:
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if len(text) > MAX_TOOL_RESULT_CHARS:
        return json.dumps({"error": "The result was too long to show. Ask about one item."})
    return text


async def _run_tool_call(
    call: dict, allowed: dict, user: CurrentUser, backend: BackendClient, ctx: ToolContext, used: list
) -> str:
    fn = call.get("function") or {}
    tool = allowed.get(fn.get("name"))
    if tool is None:
        return _result_json({"error": "That tool is not available."})

    try:
        args = json.loads(fn.get("arguments") or "{}")
    except ValueError:
        args = None
    if not isinstance(args, dict):
        return _result_json({"error": "Invalid arguments. Send a JSON object."})

    used.append(tool.name)
    try:
        return _result_json(await tool.handler(user, backend, args, ctx))
    except BackendError as exc:
        # 4xx text is meant for people; anything else becomes a generic line.
        log.warning("tool %s failed: status=%s message=%s", tool.name, exc.status, exc.message)
        return _result_json({"error": exc.public_message})
    except Exception:
        log.exception("tool %s crashed", tool.name)
        return _result_json({"error": "Something went wrong looking that up."})


async def run_agent(
    messages: list[dict],
    *,
    user: CurrentUser,
    backend: BackendClient,
    llm,
    model: str,
    ctx: ToolContext | None = None,
    max_steps: int = MAX_STEPS,
) -> AgentResult:
    ctx = ctx or ToolContext()
    tools = tools_for(user, writes_enabled=bool(ctx.secret))
    specs = [t.spec() for t in tools]
    allowed = {t.name: t for t in tools}

    convo = list(messages)
    usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    used: list[str] = []
    answered_by = model

    def finish(reply: str) -> AgentResult:
        return AgentResult(reply, answered_by, usage, used, ctx.proposals[-1] if ctx.proposals else None)

    for _ in range(max_steps):
        kwargs = {"model": model}
        if specs:
            kwargs.update(tools=specs, reasoning_effort="low")
        result = await llm(convo, **kwargs)

        answered_by = result.get("model") or model
        for key in usage:
            usage[key] += int((result.get("usage") or {}).get(key) or 0)

        message = result.get("message") or {}
        calls = (message.get("tool_calls") or [])[:MAX_TOOL_CALLS_PER_STEP]
        if not calls:
            return finish((message.get("content") or "").strip())

        # Rebuild the assistant turn so only fields the API accepts go back.
        convo.append({"role": "assistant", "content": message.get("content") or "", "tool_calls": calls})
        for call in calls:
            content = await _run_tool_call(call, allowed, user, backend, ctx, used)
            convo.append({"role": "tool", "tool_call_id": call.get("id"), "content": content})

    log.warning("agent hit the step cap (%s)", max_steps)
    return finish(FALLBACK_REPLY)