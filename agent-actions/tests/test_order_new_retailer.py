import asyncio
import json

import httpx
import pytest

import tools.order as order_module
from actions import run_confirmed_action
from auth import CurrentUser
from backend_client import BackendClient
from tools.base import ToolContext
from tools.order import propose_create_order

USER = CurrentUser(token="tok-abc", user_id="u1", business_id="b1", name="N", role="owner",
                   modules=["orders"], business_name="Biz", currency="$")

RETAILERS = {"success": True, "data": [
    {"retailer_id": "r1", "name": "Sharma Stores", "credit_terms": "30 days"},
    {"retailer_id": "r2", "name": "Patel Traders", "credit_terms": None},
]}
PRODUCTS = {"success": True, "data": [
    {"product_id": "p1", "name": "Bread", "unit": "loaf", "selling_price": 20, "current_stock": 50, "recipe": []},
]}


def make_backend():
    def handler(request):
        assert request.method == "GET"
        path = request.url.path
        if path == "/api/retailers":
            return httpx.Response(200, json=RETAILERS)
        if path == "/api/products":
            return httpx.Response(200, json=PRODUCTS)
        raise AssertionError(f"unexpected call: {path}")  # a new retailer has no order history to fetch
    return BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))


@pytest.fixture
def signed(monkeypatch):
    captured = {}

    def fake_sign(secret, **kwargs):
        captured.update(kwargs)
        return "signed-token", {"exp": 1234567890}

    monkeypatch.setattr(order_module, "sign_action", fake_sign)
    return captured


def propose(args):
    ctx = ToolContext(secret="s" * 40)
    out = asyncio.run(propose_create_order(USER, make_backend(), args, ctx))
    return out, ctx


NEW = {"retailer": "Ravi Stores", "product": "bread", "quantity": 10, "amount_paid": 60, "new_retailer": True}


def test_new_retailer_prepares_a_proposal(signed):
    out, ctx = propose({**NEW, "credit_terms": "30 days"})
    assert out["status"] == "proposal_ready" and out["new_retailer"] is True
    assert signed["args"] == {
        "retailer_name": "Ravi Stores",
        "new_retailer": {"name": "Ravi Stores", "credit_terms": "30 days"},
        "product_id": "p1", "product_name": "Bread", "unit": "loaf",
        "quantity": 10, "amount_paid": 60, "stock_before": 50,
    }
    assert "retailer_id" not in signed["args"]
    proposal = ctx.proposals[0]
    assert proposal["lines"][0] == {"label": "New retailer", "value": "Ravi Stores"}
    assert proposal["lines"][1] == {"label": "Credit terms", "value": "30 days"}
    assert "not in DANN yet" in proposal["warnings"][0]
    assert "new retailer" in proposal["summary"]
    assert "token" not in json.dumps(out)


def test_new_retailer_without_terms(signed):
    out, ctx = propose(NEW)
    assert out["status"] == "proposal_ready"
    assert signed["args"]["new_retailer"] == {"name": "Ravi Stores"}
    assert ctx.proposals[0]["lines"][0] == {"label": "New retailer", "value": "Ravi Stores"}
    assert ctx.proposals[0]["lines"][1]["label"] == "Finished stock"


def test_new_retailer_name_is_tidied(signed):
    propose({**NEW, "retailer": "  Ravi    Stores "})
    assert signed["args"]["new_retailer"]["name"] == "Ravi Stores"


@pytest.mark.parametrize("name", ["sharma stors", "SHARMA STORES", "Sharma Stores!"])
def test_a_near_duplicate_name_is_refused(signed, name):
    out, ctx = propose({**NEW, "retailer": name})
    assert out == {"status": "duplicate", "which": "retailer", "existing": {"name": "Sharma Stores"}}
    assert ctx.proposals == []


def test_a_different_name_is_allowed(signed):
    out, ctx = propose({**NEW, "retailer": "Mehta Mart"})
    assert out["status"] == "proposal_ready" and len(ctx.proposals) == 1


@pytest.mark.parametrize("name", ["!!!", "x"])
def test_unusable_names_prepare_nothing(name):
    out, ctx = propose({**NEW, "retailer": name})
    assert "error" in out and ctx.proposals == []


def test_a_non_boolean_flag_is_not_a_request(signed):
    out, ctx = propose({**NEW, "new_retailer": "yes"})
    # "yes" is not a real true, so the normal matcher runs instead of the
    # add-a-retailer path. It finds the shared word ("Stores") and asks; the
    # important part is that nothing is prepared.
    assert out["status"] == "ambiguous"
    assert out["matches"] == [{"name": "Sharma Stores"}]
    assert ctx.proposals == []


def test_a_new_retailer_still_checks_the_stock(signed):
    out, ctx = propose({**NEW, "quantity": 51})
    assert out["status"] == "shortage" and ctx.proposals == []


# ---- confirming an order for a new retailer ---------------------------------

NONCE = "nonce_1234567890abcdef"
PAYLOAD = {
    "nonce": NONCE,
    "tool": "create_order",
    "args": {"retailer_name": "Ravi Stores", "new_retailer": {"name": "Ravi Stores", "credit_terms": "30 days"},
             "product_id": "p1", "product_name": "Bread", "unit": "loaf", "quantity": 10,
             "amount_paid": 60, "stock_before": 50},
}
RETAILER_OK = (201, {"success": True, "data": {"retailer_id": "ret_new", "id": "ret_new", "name": "Ravi Stores"}})
ORDER_OK = (201, {"success": True, "data": {
    "order_id": "ord_1", "retailer_name": "Ravi Stores", "product_name": "Bread", "quantity": 10,
    "total_amount": 200, "amount_paid": 60, "status": "partial"}})


def run_confirm(retailer_response, order_response):
    calls = []

    def handler(request):
        body = json.loads(request.content) if request.content else None
        calls.append((request.method, request.url.path, body))
        if request.url.path == "/api/agent-actions":
            return httpx.Response(201, json={"success": True})
        if request.url.path == "/api/retailers":
            return httpx.Response(retailer_response[0], json=retailer_response[1])
        if request.url.path == "/api/orders":
            return httpx.Response(order_response[0], json=order_response[1])
        return httpx.Response(200, json={"success": True})

    backend = BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))
    out = asyncio.run(run_confirmed_action(PAYLOAD, user=USER, backend=backend))
    return out, calls


def test_confirm_adds_the_retailer_then_records_the_order():
    out, calls = run_confirm(RETAILER_OK, ORDER_OK)
    assert [(m, p) for m, p, _ in calls] == [
        ("POST", "/api/agent-actions"),
        ("POST", "/api/retailers"),
        ("POST", "/api/orders"),
        ("PATCH", f"/api/agent-actions/{NONCE}"),
    ]
    assert calls[1][2] == {"name": "Ravi Stores", "credit_terms": "30 days"}
    assert calls[2][2] == {"retailer_id": "ret_new", "product_id": "p1", "quantity": 10, "amount_paid": 60}
    assert calls[3][2]["status"] == "executed"
    assert calls[3][2]["result"]["retailer_created"] == "ret_new"
    assert out.status == 200
    assert out.body["reply"] == (
        "Added Ravi Stores as a new retailer. Recorded the order: 10 loaf of Bread for Ravi Stores, 140.00 still owed."
    )
    assert out.body["result"]["new_retailer"] is True


def test_confirm_stops_when_the_retailer_is_refused():
    message = "Validation Error: name: Retailer name is required"
    out, calls = run_confirm((400, {"success": False, "error": message}), ORDER_OK)
    assert out.status == 400 and out.body["detail"] == message
    assert "/api/orders" not in [p for _, p, _ in calls]
    assert calls[-1][2]["status"] == "failed"


def test_confirm_keeps_the_retailer_when_the_order_is_refused():
    message = "Insufficient finished product stock for 'Bread'. Requested: 10, Available: 4"
    out, calls = run_confirm(RETAILER_OK, (400, {"success": False, "error": message}))
    assert out.status == 400
    assert out.body["detail"] == f"Ravi Stores was added as a new retailer, but the order was not recorded: {message}"
    assert calls[-1][2]["status"] == "failed" and "setup_done" in calls[-1][2]["result"]


def test_confirm_with_no_clear_answer_on_the_order_says_the_retailer_was_added():
    out, _ = run_confirm(RETAILER_OK, (500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502
    assert "was added as a new retailer" in out.body["detail"] and "Orders page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)


def test_confirm_with_no_clear_answer_on_the_retailer_stops():
    out, calls = run_confirm((500, {"success": False, "error": "raw internal text"}), ORDER_OK)
    assert out.status == 502 and "Orders page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)
    assert "/api/orders" not in [p for _, p, _ in calls]


def test_confirm_when_the_new_retailer_comes_back_without_an_id():
    out, calls = run_confirm((201, {"success": True, "data": {}}), ORDER_OK)
    assert out.status == 502 and "was added as a new retailer" in out.body["detail"]
    assert "/api/orders" not in [p for _, p, _ in calls]