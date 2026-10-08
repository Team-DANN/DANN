"""Async client for the DANN Node backend.

Every call carries the signed-in person's own JWT, so Node's module checks
apply whatever the model asks for. Nothing here stores or caches tokens.
"""

import logging

import httpx

from config import get_settings

log = logging.getLogger("agent-actions.backend")

# Covers most Render free-tier cold starts (the very first request can take
# up to about a minute).
TIMEOUT_SECONDS = 30.0


class BackendError(Exception):
    """The Node backend refused, failed, or could not be reached.

    status is Node's HTTP status, or None when there was no response at all
    (timeout, connection error). message is Node's own text: Node only means
    4xx messages for people, so use public_message for anything user-facing.
    """

    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.message = message
        self.status = status

    @property
    def is_client_error(self) -> bool:
        return self.status is not None and 400 <= self.status < 500

    @property
    def public_message(self) -> str:
        if self.is_client_error:
            return self.message
        return "The DANN server had a problem. Please try again in a moment."


def _safe_json(resp: httpx.Response):
    try:
        return resp.json()
    except ValueError:
        return None


class BackendClient:
    def __init__(
        self,
        base_url: str | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self._base_url = (base_url or get_settings().backend_url).rstrip("/")
        self._transport = transport  # tests pass httpx.MockTransport

    async def request(
        self,
        method: str,
        path: str,
        *,
        token: str,
        params: dict | None = None,
        json: dict | None = None,
    ) -> dict:
        """Returns Node's parsed JSON body ({success, data, ...}) on 2xx."""
        url = f"{self._base_url}{path}"
        headers = {"Authorization": f"Bearer {token}"}
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS, transport=self._transport) as http:
                resp = await http.request(method, url, headers=headers, params=params, json=json)
        except httpx.TimeoutException as exc:
            raise BackendError("The DANN server took too long to answer") from exc
        except httpx.HTTPError as exc:
            raise BackendError(f"Could not reach the DANN server ({exc.__class__.__name__})") from exc

        body = _safe_json(resp)

        if resp.status_code >= 400:
            message = body.get("error") if isinstance(body, dict) else None
            raise BackendError(
                str(message) if message else f"Backend error {resp.status_code}",
                status=resp.status_code,
            )
        if not isinstance(body, dict):
            raise BackendError("The DANN server sent an unexpected response", status=502)
        return body

    async def get(self, path: str, *, token: str, params: dict | None = None) -> dict:
        return await self.request("GET", path, token=token, params=params)

    async def post(self, path: str, *, token: str, json: dict | None = None) -> dict:
        return await self.request("POST", path, token=token, json=json)


def get_backend_client() -> BackendClient:
    """FastAPI dependency; tests replace it with a MockTransport-backed client."""
    return BackendClient()