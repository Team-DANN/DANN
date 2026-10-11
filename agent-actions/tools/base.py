"""Shared pieces for the assistant's tools."""

import math
from dataclasses import dataclass, field
from typing import Awaitable, Callable

from auth import CurrentUser
from backend_client import BackendClient


@dataclass
class ToolContext:
    """Per-request state. A write tool cannot run anything: it can only add
    a proposal here, which travels to the app next to the model's reply."""

    secret: str = ""  # empty means actions are switched off
    ttl_seconds: int = 300
    proposals: list[dict] = field(default_factory=list)


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    parameters: dict
    modules: tuple[str, ...]  # the person needs at least one of these
    kind: str  # "read" or "write"
    handler: Callable[[CurrentUser, BackendClient, dict, ToolContext], Awaitable[dict]]

    def spec(self) -> dict:
        return {
            "type": "function",
            "function": {"name": self.name, "description": self.description, "parameters": self.parameters},
        }


def text(value, limit: int = 80) -> str:
    """One trimmed line: names are user-typed data."""
    return " ".join(str(value or "").split())[:limit]


def num(value):
    """Postgres NUMERIC can arrive as a string ("12.500"); return a number or None."""
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n):
        return None
    n = round(n, 3)
    return int(n) if n == int(n) else n