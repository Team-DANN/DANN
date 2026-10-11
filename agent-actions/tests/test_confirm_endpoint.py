"""The whole flow over HTTP: /chat proposes, /confirm acts."""

import json

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
CHAT = {"messages": [{"role": "user", "content": "we made 40 croisants today"}]}

ME = {"user_id": 1, "business_id": 7, "name": "Asha", "role": "owner",
      "modules": ["production", "orders", "inventory", "finance"], "business_name": "Biz", "currency": "$"}
PRODUCTS = [{"product_id": "p1", "name": "Croissant", "unit": "piece", "current_stock": 0, "selling_price": 2,
             "recipe": [{"material_id": "m1", "material_name": "Butter", "material_unit": "kg", "quantity_per_unit": 0.05}]}]
MATERIALS = [{"material_id": "m1", "name": "Butter", "unit": "kg", "current_stock": 10}]
BATCH_OK = {"success": True, "data": {"production_id": "batch_9", "product_name": "Croissant",
                                      "quantity_produced": 40, "total_material_cost": 4,
                                      "materials_consumed": [{"name": "Butter", "quantity_used": 2, "unit": "kg"}]}}


@pytest.fixture(autouse=True)
def state(monkeypatch):
    monkeypatch.setenv("ACTION_SIGNING_SECRET", SECRET)
    get_settings.cache_clear()
    app_module.confirmations = ConfirmationStore()
    yield
    get_settings.cache_clear()
    app_module.app.dependency_overrides.clear()


class Node:
    def __init__(self, overrides=None):
        self.requests = []
        self.routes = {
            ("GET", "/api/auth/me"): (200, {"success": True, "data": ME}),
            ("GET", "/api/products"): (200, {"success": True, "data": PRODUCTS}),
            ("GET", "/api/materials"): (200, {"success": True, "data": MATERIALS}),
            ("GET", "/api/batches"): (200, {"success": True, "data": []}),
            ("POST", "/api/agent-actions"): (201, {"success": True}),
            ("POST", "/api/batches"): (201, BATCH_OK),
        }
        self.routes.update(overrides or {})

    def __call__(self, request):
        self.requests.append(request)
        route = self.routes.get((request.method, request.url.path))
        if route is None and request.method == "PATCH":
            route = (200, {"success": True})
        return httpx.Response(route[0], json=route[1])

    def count(self, method, path):
        return sum(1 for r in self.requests if r.method == method and r.url.path == path)


def use_node(overrides=None):
    node = Node(overrides)
    app_module.app.dependency_overrides[get_backend_client] = lambda: BackendClient(
        base_url="http://node.test", transport=httpx.MockTransport(node))
    return node


class ScriptedLLM:
    def __init__(self, *messages):
        self.queue, self.calls = list(messages), []

    async def __call__(self, messages, **kwargs):
        self.calls.append({"messages": messages, **kwargs})
        return {"message": self.queue.pop(0) if len(self.queue) > 1 else self.queue[0],
                "usage": {"total_tokens": 10}, "model": "m"}


def propose_call(args):
    return {"role": "assistant", "content": None, "tool_calls": [
        {"id": "c1", "type": "function", "function": {"name": "propose_log_batch", "arguments": json.dumps(args)}}]}


def get_proposal(monkeypatch, text="Ready. Please confirm."):
    llm = ScriptedLLM(propose_call({"product": "croisants", "quantity": 40}), {"role": "assistant", "content": text})
    monkeypatch.setattr(app_module, "chat_completion", llm)
    r = client.post("/chat", json=CHAT, headers=HEADERS)
    assert r.status_code == 200, r.text
    return r.json(), llm


def test_chat_returns_a_proposal_and_the_model_never_sees_the_token(monkeypatch):
    use_node()
    body, llm = get_proposal(monkeypatch)
    prop = body["proposal"]
    assert body["reply"] == "Ready. Please confirm." and body["tools_used"] == ["propose_log_batch"]
    assert prop["summary"] == "Log a batch of Croissant: 40 piece."
    assert prop["lines"] == [{"material": "Butter", "amount": 2, "unit": "kg", "left_after": 8}]
    assert "token" in prop and prop["expires_at"] > 0
    assert prop["token"] not in json.dumps(llm.calls[1]["messages"])


def test_empty_model_reply_with_a_proposal_falls_back_to_the_summary(monkeypatch):
    use_node()
    body, _ = get_proposal(monkeypatch, text="  ")
    assert body["reply"].startswith("Log a batch of Croissant")


def test_plain_reply_has_no_proposal(monkeypatch):
    use_node()
    monkeypatch.setattr(app_module, "chat_completion", ScriptedLLM({"role": "assistant", "content": "Hi"}))
    assert "proposal" not in client.post("/chat", json=CHAT, headers=HEADERS).json()


def test_without_a_secret_the_write_tool_is_not_offered_and_confirm_is_503(monkeypatch):
    monkeypatch.setenv("ACTION_SIGNING_SECRET", "")
    get_settings.cache_clear()
    use_node()
    llm = ScriptedLLM({"role": "assistant", "content": "Hi"})
    monkeypatch.setattr(app_module, "chat_completion", llm)
    client.post("/chat", json=CHAT, headers=HEADERS)
    names = {t["function"]["name"] for t in llm.calls[0]["tools"]}
    assert "propose_log_batch" not in names and "find_product" in names
    assert client.post("/confirm", json={"token": "x" * 30}, headers=HEADERS).status_code == 503


def test_confirm_logs_the_batch_once_and_a_second_tap_returns_the_same_result(monkeypatch):
    node = use_node()
    token = get_proposal(monkeypatch)[0]["proposal"]["token"]

    r = client.post("/confirm", json={"token": token}, headers=HEADERS)
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True and r.json()["result"]["batch_id"] == "batch_9" and "repeat" not in r.json()

    again = client.post("/confirm", json={"token": token}, headers=HEADERS)
    assert again.status_code == 200 and again.json()["repeat"] is True
    assert node.count("POST", "/api/batches") == 1 and node.count("POST", "/api/agent-actions") == 1


def test_a_restart_cannot_run_it_twice_because_node_remembers(monkeypatch):
    node = use_node()
    token = get_proposal(monkeypatch)[0]["proposal"]["token"]
    client.post("/confirm", json={"token": token}, headers=HEADERS)

    app_module.confirmations = ConfirmationStore()  # as if the service restarted
    node.routes[("POST", "/api/agent-actions")] = (409, {"success": False, "error": "This action was already submitted."})
    r = client.post("/confirm", json={"token": token}, headers=HEADERS)
    assert r.status_code == 409 and node.count("POST", "/api/batches") == 1


def test_node_refusing_the_batch_is_shown_plainly_and_repeats_the_same_way(monkeypatch):
    msg = "Insufficient stock for material 'Butter'. Required: 2 kg, Available: 1 kg"
    node = use_node({("POST", "/api/batches"): (400, {"success": False, "error": msg})})
    token = get_proposal(monkeypatch)[0]["proposal"]["token"]
    for _ in range(2):
        r = client.post("/confirm", json={"token": token}, headers=HEADERS)
        assert r.status_code == 400 and r.json()["detail"] == msg
    assert node.count("POST", "/api/batches") == 1


def test_bad_expired_and_foreign_tokens_never_reach_node(monkeypatch):
    node = use_node()
    assert client.post("/confirm", json={"token": "x" * 30}, headers=HEADERS).status_code == 400

    old, _ = sign_action(SECRET, user_id=1, business_id=7, tool="log_batch", args={"product_id": "p1", "quantity": 1}, ttl_seconds=60, now=1000)
    assert client.post("/confirm", json={"token": old}, headers=HEADERS).status_code == 410

    other, _ = sign_action(SECRET, user_id=99, business_id=7, tool="log_batch", args={"product_id": "p1", "quantity": 1}, ttl_seconds=300)
    assert client.post("/confirm", json={"token": other}, headers=HEADERS).status_code == 400

    forged, _ = sign_action("q" * 48, user_id=1, business_id=7, tool="log_batch", args={"product_id": "p1", "quantity": 1}, ttl_seconds=300)
    assert client.post("/confirm", json={"token": forged}, headers=HEADERS).status_code == 400
    assert node.count("POST", "/api/batches") == 0 and node.count("POST", "/api/agent-actions") == 0


def test_confirm_needs_a_signed_in_person():
    use_node()
    assert client.post("/confirm", json={"token": "x" * 30}).status_code == 401
    assert client.post("/confirm", json={}, headers=HEADERS).status_code == 422