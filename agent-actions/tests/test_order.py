import asyncio
import json
from datetime import datetime, timedelta, timezone

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
    {"retailer_id": "r3", "name": "Patel Brothers", "credit_terms": None},
]}


def _prod(pid, name, price, stock):
    return {"product_id": pid, "name": name, "unit": "loaf", "selling_price": price,
            "current_stock": stock, "recipe": []}


PRODUCTS = {"success": True, "data": [
    _prod("p1", "Bread", 20, 50),
    _prod("p2", "Butter Biscuit", 15, 30),
    _prod("p3", "Butter Cookie", 18, 30),
    _prod("p4", "Free Sample", 0, 10),
    _prod("p5", "Odd Cake", 33.333, 20),
]}


def make_backend(orders=None, orders_error=False):
    def handler(request):
        assert request.method == "GET"
        path = request.url.path
        if path == "/api/retailers":
            return httpx.Response(200, json=RETAILERS)
        if path == "/api/products":
            return httpx.Response(200, json=PRODUCTS)
        if path == "/api/orders":
            if orders_error:
                return httpx.Response(500, json={"success": False, "error": "boom"})
            return httpx.Response(200, json={"success": True, "data": orders or []})
        raise AssertionError(path)
    return BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))


@pytest.fixture
def signed(monkeypatch):
    captured = {}

    def fake_sign(secret, **kwargs):
        captured.update(kwargs)
        return "signed-token", {"exp": 1234567890}

    monkeypatch.setattr(order_module, "sign_action", fake_sign)
    return captured


def propose(args, *, secret="s" * 40, ctx=None, **backend_kwargs):
    ctx = ctx or ToolContext(secret=secret)
    out = asyncio.run(propose_create_order(USER, make_backend(**backend_kwargs), args, ctx))
    return out, ctx


def _stamp(minutes_ago, kind="aware"):
    when = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    if kind == "naive":
        return when.replace(tzinfo=None).isoformat()
    if kind == "z":
        return when.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"
    return when.isoformat()


def _order(minutes_ago=3, product_id="p1", quantity=10, kind="aware"):
    return {"order_id": "o1", "product_id": product_id, "quantity": quantity,
            "dispatched_at": _stamp(minutes_ago, kind)}


BASE = {"retailer": "sharma stores", "product": "bread", "quantity": 10}


def test_a_part_paid_order(signed):
    out, ctx = propose({**BASE, "amount_paid": 60})
    assert out["status"] == "proposal_ready"
    assert signed["tool"] == "create_order"
    assert signed["args"] == {"retailer_id": "r1", "retailer_name": "Sharma Stores", "product_id": "p1",
                              "product_name": "Bread", "unit": "loaf", "quantity": 10, "amount_paid": 60,
                              "stock_before": 50}
    proposal = ctx.proposals[0]
    assert proposal["tool"] == "create_order" and proposal["undoable"] is False
    stock, total, paid, owed = proposal["lines"]
    assert stock == {"label": "Finished stock", "before": 50, "after": 40, "unit": "loaf"}
    assert total["value"] == 200 and paid["value"] == 60 and owed["value"] == 140
    assert proposal["warnings"] == []
    assert "Sharma Stores" in proposal["summary"]
    assert "token" not in json.dumps(out)


def test_paid_in_full_uses_the_exact_total(signed):
    out, ctx = propose({"retailer": "sharma stores", "product": "odd cake", "quantity": 3, "paid_in_full": True})
    assert out["status"] == "proposal_ready"
    assert signed["args"]["amount_paid"] == 3 * 33.333  # the same arithmetic Node uses
    assert ctx.proposals[0]["lines"][3]["value"] == 0
    assert "paid in full" in ctx.proposals[0]["summary"]


def test_an_unpaid_order_shows_the_full_amount_owed(signed):
    out, ctx = propose(BASE)
    assert out["status"] == "proposal_ready"
    assert signed["args"]["amount_paid"] == 0
    assert ctx.proposals[0]["lines"][3]["value"] == 200
    assert ctx.proposals[0]["warnings"] == []


def test_both_payment_forms_is_a_question(signed):
    out, ctx = propose({**BASE, "amount_paid": 60, "paid_in_full": True})
    assert "error" in out and ctx.proposals == []


def test_a_payment_above_the_total_prepares_nothing(signed):
    out, ctx = propose({**BASE, "amount_paid": 500})  # the total is 200
    assert "error" in out and ctx.proposals == []


def test_a_negative_payment_prepares_nothing(signed):
    out, ctx = propose({**BASE, "amount_paid": -5})
    assert "error" in out and ctx.proposals == []


@pytest.mark.parametrize("quantity", [0, -2, "lots", 2_000_000])
def test_bad_quantities_prepare_nothing(quantity):
    out, ctx = propose({**BASE, "quantity": quantity})
    assert "error" in out and ctx.proposals == []


def test_more_than_the_finished_stock_is_a_shortage(signed):
    out, ctx = propose({**BASE, "quantity": 51})
    assert out == {"status": "shortage", "product": "Bread", "have": 50, "need": 51, "unit": "loaf"}
    assert ctx.proposals == []


def test_unknown_or_ambiguous_retailer_prepares_nothing(signed):
    out, ctx = propose({**BASE, "retailer": "patel"})
    names = {m["name"] for m in out["matches"]}
    assert out["status"] == "ambiguous" and out["which"] == "retailer"
    assert {"Patel Traders", "Patel Brothers"} <= names and ctx.proposals == []
    out, ctx = propose({**BASE, "retailer": "unobtainium"})
    assert out == {"status": "none", "which": "retailer"} and ctx.proposals == []


def test_unknown_or_ambiguous_product_prepares_nothing(signed):
    out, ctx = propose({**BASE, "product": "butter"})
    names = {m["name"] for m in out["matches"]}
    assert out["status"] == "ambiguous" and out["which"] == "product"
    assert {"Butter Biscuit", "Butter Cookie"} <= names and ctx.proposals == []
    out, ctx = propose({**BASE, "product": "unobtainium"})
    assert out == {"status": "none", "which": "product"} and ctx.proposals == []


def test_a_product_with_no_selling_price_warns(signed):
    out, ctx = propose({**BASE, "product": "free sample", "quantity": 2})
    assert out["status"] == "proposal_ready"
    assert any("no selling price" in w for w in ctx.proposals[0]["warnings"])


@pytest.mark.parametrize("kind", ["aware", "naive", "z"])
def test_a_recent_identical_order_is_flagged(signed, kind):
    _, ctx = propose(BASE, orders=[_order(3, kind=kind)])
    assert any("identical order" in w for w in ctx.proposals[0]["warnings"])


@pytest.mark.parametrize("change", [{"minutes_ago": 60}, {"quantity": 5}, {"product_id": "p2"}])
def test_other_orders_are_not_flagged(signed, change):
    _, ctx = propose(BASE, orders=[_order(**change)])
    assert ctx.proposals[0]["warnings"] == []


def test_a_failing_orders_lookup_does_not_block(signed):
    out, ctx = propose(BASE, orders_error=True)
    assert out["status"] == "proposal_ready" and ctx.proposals[0]["warnings"] == []


def test_actions_off_or_a_proposal_already_waiting():
    out, _ = propose(BASE, secret="")
    assert "error" in out
    ctx = ToolContext(secret="s" * 40)
    ctx.proposals.append({"summary": "x"})
    out, ctx = propose(BASE, ctx=ctx)
    assert "error" in out and len(ctx.proposals) == 1


@pytest.mark.parametrize("args", [{"product": "bread", "quantity": 1}, {"retailer": "sharma stores", "quantity": 1}])
def test_missing_names_are_questions(args):
    out, ctx = propose(args)
    assert "error" in out and ctx.proposals == []


# ---- confirming an order ----------------------------------------------------

PAYLOAD = {
    "nonce": "nonce_1234567890abcdef",
    "tool": "create_order",
    "args": {"retailer_id": "r1", "retailer_name": "Sharma Stores", "product_id": "p1", "product_name": "Bread",
             "unit": "loaf", "quantity": 10, "amount_paid": 60, "stock_before": 50},
}


def run_confirm(order_response):
    calls = []

    def handler(request):
        body = json.loads(request.content) if request.content else None
        calls.append((request.method, request.url.path, body))
        if request.url.path == "/api/agent-actions":
            return httpx.Response(201, json={"success": True})
        if request.url.path == "/api/orders":
            return httpx.Response(order_response[0], json=order_response[1])
        return httpx.Response(200, json={"success": True})

    backend = BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))
    out = asyncio.run(run_confirmed_action(PAYLOAD, user=USER, backend=backend))
    return out, calls


def _created(status, paid):
    return (201, {"success": True, "data": {
        "order_id": "ord_1", "retailer_name": "Sharma Stores", "product_name": "Bread", "quantity": 10,
        "total_amount": 200, "amount_paid": paid, "status": status}})


def test_confirm_reserves_creates_the_order_and_completes():
    out, calls = run_confirm(_created("partial", 60))
    assert [(m, p) for m, p, _ in calls] == [
        ("POST", "/api/agent-actions"),
        ("POST", "/api/orders"),
        ("PATCH", "/api/agent-actions/nonce_1234567890abcdef"),
    ]
    assert calls[1][2] == {"retailer_id": "r1", "product_id": "p1", "quantity": 10, "amount_paid": 60}
    assert calls[2][2]["status"] == "executed"
    assert calls[2][2]["result"] == {"order_id": "ord_1", "stock_before": 50, "total_amount": 200,
                                     "amount_paid": 60, "status": "partial"}
    assert out.status == 200
    assert out.body["reply"] == "Recorded the order: 10 loaf of Bread for Sharma Stores, 140.00 still owed."
    assert out.body["result"]["owed"] == 140 and out.body["result"]["status"] == "partial"


def test_confirm_says_paid_in_full():
    out, _ = run_confirm(_created("paid", 200))
    assert out.body["reply"] == "Recorded the order: 10 loaf of Bread for Sharma Stores, paid in full."


def test_confirm_relays_a_node_refusal():
    message = "Insufficient finished product stock for 'Bread'. Requested: 10, Available: 4"
    out, calls = run_confirm((400, {"success": False, "error": message}))
    assert out.status == 400 and out.body["detail"] == message
    assert calls[-1][2]["status"] == "failed"


def test_confirm_with_no_clear_answer_points_to_orders():
    out, _ = run_confirm((500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502 and "Orders page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)