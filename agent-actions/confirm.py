"""Signed, single-use confirmation tokens for actions the assistant proposes.

The model can only PROPOSE an action. A proposal carries a token: the exact
arguments, the person and business it was made for, a random nonce and an
expiry, signed with ACTION_SIGNING_SECRET. Only POST /confirm turns a token
into an action, so the model cannot run anything and an edited token fails.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time

TOKEN_VERSION = 1
MIN_SECRET_CHARS = 32
MAX_TOKEN_CHARS = 4000


class ConfirmError(Exception):
    """code is "invalid" or "expired"; message is safe to show to a person."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64d(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _signature(secret: str, part: str) -> bytes:
    return hmac.new(secret.encode("utf-8"), part.encode("ascii"), hashlib.sha256).digest()


def sign_action(
    secret: str,
    *,
    user_id,
    business_id,
    tool: str,
    args: dict,
    ttl_seconds: int,
    now: float | None = None,
) -> tuple[str, dict]:
    """Returns (token, payload). The payload's nonce is the action id."""
    if len(secret) < MIN_SECRET_CHARS:
        raise ValueError("The signing secret is too short")
    issued = int(time.time() if now is None else now)
    payload = {
        "v": TOKEN_VERSION,
        "nonce": secrets.token_urlsafe(18),
        "uid": str(user_id),
        "bid": str(business_id),
        "tool": tool,
        "args": args,
        "iat": issued,
        "exp": issued + int(ttl_seconds),
    }
    body = _b64e(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    return f"{body}.{_b64e(_signature(secret, body))}", payload


def verify_action(secret: str, token, *, user_id, business_id, now: float | None = None) -> dict:
    """Returns the payload, or raises ConfirmError. Every failure that could
    help an attacker (bad signature, other person, other business) looks the same."""
    invalid = ConfirmError("invalid", "This confirmation is not valid. Please ask again.")

    if not secret or not isinstance(token, str) or len(token) > MAX_TOKEN_CHARS or token.count(".") != 1:
        raise invalid
    body, sig = token.split(".")
    try:
        given = _b64d(sig)
        if not hmac.compare_digest(given, _signature(secret, body)):
            raise invalid
        payload = json.loads(_b64d(body))
    except ConfirmError:
        raise
    except Exception:
        raise invalid

    if not isinstance(payload, dict) or payload.get("v") != TOKEN_VERSION:
        raise invalid
    if payload.get("uid") != str(user_id) or payload.get("bid") != str(business_id):
        raise invalid
    if not isinstance(payload.get("nonce"), str) or not isinstance(payload.get("exp"), int):
        raise invalid
    if not isinstance(payload.get("args"), dict) or not isinstance(payload.get("tool"), str):
        raise invalid

    current = time.time() if now is None else now
    if current >= payload["exp"]:
        raise ConfirmError("expired", "This confirmation expired. Please ask again.")
    return payload


class ConfirmationStore:
    """Remembers which tokens were used, in memory (one process).

    This is the fast guard against a double tap. Node's agent_action_log is the
    durable one: it also blocks a repeat after a restart of this service.
    """

    def __init__(self):
        self._items: dict[str, dict] = {}

    def _purge(self, now: float) -> None:
        for nonce in [n for n, item in self._items.items() if item["exp"] <= now]:
            del self._items[nonce]

    def claim(self, nonce: str, exp: int, now: float | None = None):
        """Returns ("new", None) when the caller may run the action,
        ("running", None) while another request is running it, or
        ("done", outcome) with the stored result of an earlier run."""
        current = time.time() if now is None else now
        self._purge(current)
        item = self._items.get(nonce)
        if item is None:
            self._items[nonce] = {"state": "running", "exp": exp, "outcome": None}
            return "new", None
        if item["state"] == "running":
            return "running", None
        return "done", item["outcome"]

    def finish(self, nonce: str, outcome) -> None:
        item = self._items.get(nonce)
        if item is not None:
            item["state"] = "done"
            item["outcome"] = outcome