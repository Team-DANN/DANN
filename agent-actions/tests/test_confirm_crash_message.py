"""A crashed /confirm names the page of the tool that was running."""

import httpx
import pytest
from fastapi.testclient import TestClient

import app as app_module
from backend_client import BackendClient, get_backend_client
from config import get_settings
from confirm import ConfirmationStore, sign_action

client = TestClient(app_module.app)
SECRET = "z" * 48
HEADERS = {"Authorization": "Bearer tok123"}
ME = {"user_id": 1, "business_id": 7, "name": "Asha", "role": "owner",
      "modules": ["production", "orders", "inventory", "finance"], "business_name": "Biz", "currency": "$"}


@pytest.fixture(autouse=True)
def state(monkeypatch):
    monkeypatch.setenv("ACTION_SIGNING_SECRET", SECRET)
    get_settings.cache_clear()
    app_module.confirmations = ConfirmationStore()

    def handler(request):
        return httpx.Response(200, json={"success": True, "data": ME})

    app_module.app.dependency_overrides[get_backend_client] = lambda: BackendClient(
        base_url="http://node.test", transport=httpx.MockTransport(handler))

    async def boom(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(app_module, "run_confirmed_action", boom)
    yield
    get_settings.cache_clear()
    app_module.app.dependency_overrides.clear()


@pytest.mark.parametrize("tool, where", [
    ("log_batch", "the Production page"),
    ("restock", "the Inventory page"),
    ("create_order", "the Orders page"),
    ("not_a_tool", "your DANN pages"),
])
def test_the_crash_message_names_the_right_page(tool, where):
    token, _ = sign_action(SECRET, user_id=1, business_id=7, tool=tool, args={"x": 1}, ttl_seconds=300)
    r = client.post("/confirm", json={"token": token}, headers=HEADERS)
    assert r.status_code == 500
    assert r.json()["detail"] == f"Something went wrong. Check {where} before trying again."