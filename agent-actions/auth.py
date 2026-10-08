"""Who is calling? Ask the Node backend, with the caller's own JWT.

This service never holds the JWT secret and never caches the answer: a person
removed in Team is rejected on their very next message.
"""

import logging
from dataclasses import dataclass, field

from fastapi import Depends, Header, HTTPException

from backend_client import BackendClient, BackendError, get_backend_client

log = logging.getLogger("agent-actions.auth")

# First version: owner and manager only (staff come later via per-tool modules).
ALLOWED_ROLES = {"owner", "manager"}

_BEARER = {"WWW-Authenticate": "Bearer"}


@dataclass(frozen=True)
class CurrentUser:
    token: str
    user_id: str | int | None
    business_id: str | int | None
    name: str
    role: str
    modules: list[str] = field(default_factory=list)
    business_name: str = ""
    currency: str = ""


def _extract_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(401, "Sign in to use the assistant.", headers=_BEARER)
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise HTTPException(401, "Sign in to use the assistant.", headers=_BEARER)
    return parts[1].strip()


async def get_current_user(
    authorization: str | None = Header(default=None),
    backend: BackendClient = Depends(get_backend_client),
) -> CurrentUser:
    token = _extract_token(authorization)

    try:
        body = await backend.get("/api/auth/me", token=token)
    except BackendError as exc:
        if exc.status == 401:
            raise HTTPException(401, "Your session has expired. Please sign in again.", headers=_BEARER)
        if exc.status == 403:
            raise HTTPException(403, "You do not have access to the assistant.")
        # Node down, slow, 5xx, or an unexpected 4xx (for example an older
        # backend with no /api/auth/me): never report that as a dead session.
        log.warning("auth check failed: status=%s message=%s", exc.status, exc.message)
        raise HTTPException(
            502, "Could not verify your session with the DANN server. Please try again in a moment."
        )

    data = body.get("data")
    if not isinstance(data, dict) or not data.get("role"):
        log.warning("auth check returned an unexpected body shape")
        raise HTTPException(
            502, "Could not verify your session with the DANN server. Please try again in a moment."
        )

    role = str(data["role"]).lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(403, "The assistant is available to owners and managers only for now.")

    modules = data.get("modules")
    return CurrentUser(
        token=token,
        user_id=data.get("user_id"),
        business_id=data.get("business_id"),
        name=str(data.get("name") or ""),
        role=role,
        modules=[str(m) for m in modules] if isinstance(modules, list) else [],
        business_name=str(data.get("business_name") or ""),
        currency=str(data.get("currency") or ""),
    )