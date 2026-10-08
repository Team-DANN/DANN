import logging
import math
import re
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

from agent import run_agent
from auth import CurrentUser, get_current_user
from backend_client import BackendClient, get_backend_client
from config import get_settings
from llm.groq_client import LLMError, chat_completion
from prompts import build_system_prompt

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


@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-actions"}


@app.post("/chat")
async def chat(
    req: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    backend: BackendClient = Depends(get_backend_client),
):
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

    try:
        result = await run_agent(
            messages,
            user=user,
            backend=backend,
            llm=chat_completion,
            model=get_settings().llm_model,
        )
    except LLMError as exc:
        if exc.status == 429:
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
    if not reply:
        log.error("LLM returned an empty reply (usage=%s)", result.usage)
        raise HTTPException(502, "The assistant could not answer right now. Please try again.")

    return {"reply": reply, "model": result.model, "usage": result.usage, "tools_used": result.tools_used}