import asyncio
import json

import httpx

from actions import UNKNOWN_OUTCOME, run_confirmed_action
from auth import CurrentUser
from backend_client import BackendClient

USER = CurrentUser(token="tok-abc", user_id="u1", business_id="b1", name="N", role="owner",
                   modules=["production"], business_name="Biz", currency="$")
PAYLOAD = {
    "nonce": "nonce_1234567890abcdef",
    "tool": "log_batch",
    "args": {"product_id": "p1", "product_name": "Croissant", "unit": "piece", "quantity": 40, "labor_cost": 5},
}
BATCH_OK = {"success": True, "data": {
    "production_id": "batch_1", "product_name": "Croissant", "quantity_produced": 40, "total_material_cost": 12.5,
    "materials_consumed": [{"name": "Butter", "quantity_used": 2, "unit": "kg"}]}}


class Node:
    """Scripted Node: one (status, body) or an exception per route key."""

    def __init__(self, **script):
        self.script = {"reserve": (201, {"success": True}), "batch": (201, BATCH_OK), "complete": (200, {"success": True})}
        self.script.update(script)
        self.calls = []

    def client(self):
        def handler(request):
            key = {"POST /api/agent-actions": "reserve", "POST /api/batches": "batch"}.get(
                f"{request.method} {request.url.path}", "complete" if request.method == "PATCH" else None)
            body = json.loads(request.content) if request.content else None
            self.calls.append((key, body, request.headers["authorization"]))
            outcome = self.script[key]
            if isinstance(outcome, Exception):
                raise outcome
            return httpx.Response(outcome[0], json=outcome[1])
        return BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))

    def keys(self):
        return [c[0] for c in self.calls]


def run(node, payload=PAYLOAD):
    return asyncio.run(run_confirmed_action(payload, user=USER, backend=node.client()))


def test_success_reserves_then_executes_then_completes_with_the_users_token():
    node = Node()
    out = run(node)
    assert node.keys() == ["reserve", "batch", "complete"]
    assert all(c[2] == "Bearer tok-abc" for c in node.calls)
    assert node.calls[0][1] == {"action_id": "nonce_1234567890abcdef", "tool": "log_batch", "arguments": PAYLOAD["args"]}
    assert node.calls[1][1] == {"product_id": "p1", "quantity_produced": 40, "labor_cost": 5}
    assert node.calls[2][1]["status"] == "executed" and node.calls[2][1]["result"]["batch_id"] == "batch_1"
    assert out.status == 200 and out.body["ok"] is True
    assert out.body["reply"] == "Logged a batch of Croissant: 40 piece."
    assert out.body["result"]["materials_used"] == [{"material": "Butter", "amount": 2, "unit": "kg"}]


def test_manual_material_cost_is_passed_when_signed():
    payload = {**PAYLOAD, "args": {**PAYLOAD["args"], "manual_material_cost": 30}}
    node = Node()
    run(node, payload)
    assert node.calls[1][1]["manual_material_cost"] == 30


def test_already_reserved_never_executes():
    node = Node(reserve=(409, {"success": False, "error": "This action was already submitted."}))
    out = run(node)
    assert node.keys() == ["reserve"] and out.status == 409


def test_failed_reservation_fails_closed_for_5xx_and_old_backends():
    for outcome in ((500, {"success": False, "error": "boom"}), (404, {"success": False, "error": "nope"}), httpx.ConnectError("x")):
        node = Node(reserve=outcome)
        out = run(node)
        assert node.keys() == ["reserve"], outcome
        assert out.status == 502 and "nothing was logged" in out.body["detail"]
        assert "boom" not in json.dumps(out.body)


def test_node_refusal_is_relayed_and_the_audit_row_is_closed_as_failed():
    msg = "Insufficient stock for material 'Butter'. Required: 2 kg, Available: 1 kg"
    node = Node(batch=(400, {"success": False, "error": msg}))
    out = run(node)
    assert node.keys() == ["reserve", "batch", "complete"]
    assert out.status == 400 and out.body["detail"] == msg
    assert node.calls[2][1]["status"] == "failed"


def test_server_error_is_generic_and_says_to_check_the_page():
    node = Node(batch=(500, {"success": False, "error": 'relation "x" does not exist'}))
    out = run(node)
    assert out.status == 502 and out.body["detail"] == UNKNOWN_OUTCOME
    assert node.calls[2][1]["result"]["unknown_outcome"] is True


def test_no_answer_from_node_is_an_unknown_outcome():
    out = run(Node(batch=httpx.ReadTimeout("slow")))
    assert out.status == 502 and out.body["detail"] == UNKNOWN_OUTCOME


def test_a_failing_audit_completion_does_not_hide_a_success():
    out = run(Node(complete=(500, {"success": False, "error": "x"})))
    assert out.status == 200 and out.body["ok"] is True


def test_unknown_tool_runs_nothing():
    node = Node()
    out = run(node, {**PAYLOAD, "tool": "delete_everything"})
    assert node.calls == [] and out.status == 400