import logging
import math
import re
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

from actions import ACTIONS, ActionOutcome, run_confirmed_action
from agent import run_agent
from auth import CurrentUser, get_current_user
from backend_client import BackendClient, get_backend_client
from config import get_settings
from confirm import ConfirmationStore, ConfirmError, verify_action
from llm.groq_client import LLMError, chat_completion
from prompts import build_system_prompt
from ratelimit import RateLimiter
from tools.base import ToolContext

log = logging.getLogger("agent-actions")

settings = get_settings()

app = FastAPI(title="DANN agent-actions")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,  # Bearer header, not cookies
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)

MAX_MESSAGE_CHARS = 2000
MAX_MESSAGES_ACCEPTED = 40  # hard ceiling on what a request may carry
MAX_HISTORY_MESSAGES = 10  # how many of the latest ones the model sees

# One process, in memory. Node's agent_action_log is the durable guard.
confirmations = ConfirmationStore()

# Per-person and global request limits (numbers come from config.py).
limiter = RateLimiter()

# The model sometimes emits no-break and narrow spaces; some screens show them
# as nothing, which glues words together. Turn them into plain spaces.
_ODD_SPACES = re.compile("[\u00a0\u2007\u2009\u202f]")


def _tidy(text: str) -> str:
    return _ODD_SPACES.sub(" ", text).strip()


class ChatMessage(BaseModel):
    # No "system" role on purpose: the client cannot inject its own rules.
    role: Literal["user", "assistant"]
    content: str = Field(max_length=MAX_MESSAGE_CHARS)

    @field_validator("content")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message is empty")
        return value


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES_ACCEPTED)

    @model_validator(mode="after")
    def last_message_is_from_user(self):
        if self.messages[-1].role != "user":
            raise ValueError("The last message must be from the user")
        return self


class ConfirmRequest(BaseModel):
    token: str = Field(min_length=20, max_length=4000)


def _enforce(rules, *, user_id, own_text: str) -> None:
    """Raise a 429 when a rule is full. Runs after sign-in, so the key is the person."""
    blocked = limiter.check(rules)
    if blocked is None:
        return
    name, wait = blocked
    seconds = max(1, math.ceil(wait))
    unit = "second" if seconds == 1 else "seconds"
    log.warning("rate limit: scope=%s user=%s wait=%ss", name, user_id, seconds)
    text = own_text if name == "user" else "The assistant is busy right now."
    raise HTTPException(
        429, f"{text} Try again in {seconds} {unit}.", headers={"Retry-After": str(seconds)}
    )


async def limit_chat(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    current = get_settings()
    window = current.rate_window_seconds
    _enforce(
        [
            ("user", f"chat:user:{user.user_id}", current.chat_per_user, window),
            ("global", "chat:global", current.chat_global, window),
        ],
        user_id=user.user_id,
        own_text="You are sending messages too quickly.",
    )
    return user


async def limit_confirm(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    current = get_settings()
    _enforce(
        [("user", f"confirm:user:{user.user_id}", current.confirm_per_user, current.rate_window_seconds)],
        user_id=user.user_id,
        own_text="Too many confirmations in a short time.",
    )
    return user


@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-actions"}


@app.post("/chat")
async def chat(
    req: ChatRequest,
    user: CurrentUser = Depends(limit_chat),
    backend: BackendClient = Depends(get_backend_client),
):
    current = get_settings()
    history = [m.model_dump() for m in req.messages[-MAX_HISTORY_MESSAGES:]]
    messages = [
        {
            "role": "system",
            "content": build_system_prompt(
                business_name=user.business_name, currency=user.currency, role=user.role
            ),
        },
        *history,
    ]
    ctx = ToolContext(
        secret=current.action_signing_secret if current.writes_enabled else "",
        ttl_seconds=current.confirm_ttl_seconds,
    )

    try:
        result = await run_agent(
            messages,
            user=user,
            backend=backend,
            llm=chat_completion,
            model=current.llm_model,
            ctx=ctx,
        )
    except LLMError as exc:
        if exc.status == 429:
            # Groq's own text says which limit was hit (per minute or per day,
            # tokens or requests). Log it; never relay it.
            log.warning("Groq 429: retry_after=%s message=%s", exc.retry_after, exc)
            wait = math.ceil(exc.retry_after) if exc.retry_after else None
            if wait:
                unit = "second" if wait == 1 else "seconds"
                detail = f"The assistant is busy right now. Try again in {wait} {unit}."
            else:
                detail = "The assistant is busy right now. Try again in a minute."
            raise HTTPException(429, detail, headers={"Retry-After": str(wait)} if wait else None)
        # Never relay Groq's text; it can contain internals. The log has it.
        log.error("LLM call failed: status=%s message=%s", exc.status, exc)
        raise HTTPException(502, "The assistant could not answer right now. Please try again.")

    reply = _tidy(result.reply)
    if not reply and result.proposal:
        reply = f"{result.proposal['summary']} Please check it and confirm."
    if not reply:
        log.error("LLM returned an empty reply (usage=%s)", result.usage)
        raise HTTPException(502, "The assistant could not answer right now. Please try again.")

    response = {"reply": reply, "model": result.model, "usage": result.usage, "tools_used": result.tools_used}
    if result.proposal:
        response["proposal"] = result.proposal
    return response


def _respond(outcome: ActionOutcome, *, repeat: bool):
    if outcome.status >= 400:
        raise HTTPException(outcome.status, outcome.body.get("detail") or "The action could not be completed.")
    return JSONResponse({**outcome.body, "repeat": True} if repeat else outcome.body)


@app.post("/confirm")
async def confirm(
    req: ConfirmRequest,
    user: CurrentUser = Depends(limit_confirm),
    backend: BackendClient = Depends(get_backend_client),
):
    current = get_settings()
    if not current.writes_enabled:
        raise HTTPException(503, "Actions are not available right now.")

    try:
        payload = verify_action(
            current.action_signing_secret, req.token, user_id=user.user_id, business_id=user.business_id
        )
    except ConfirmError as exc:
        raise HTTPException(410 if exc.code == "expired" else 400, exc.message)

    nonce = payload["nonce"]
    state, stored = confirmations.claim(nonce, payload["exp"])
    if state == "running":
        raise HTTPException(409, "This action is already being confirmed.")
    if state == "done":
        return _respond(stored, repeat=True)

    try:
        outcome = await run_confirmed_action(payload, user=user, backend=backend)
    except Exception:
        log.exception("confirmed action %s crashed", nonce)
        page = getattr(ACTIONS.get(payload.get("tool")), "page", None)
        where = f"the {page} page" if page else "your DANN pages"
        outcome = ActionOutcome(500, {"detail": f"Something went wrong. Check {where} before trying again."})
    confirmations.finish(nonce, outcome)
    return _respond(outcome, repeat=False)