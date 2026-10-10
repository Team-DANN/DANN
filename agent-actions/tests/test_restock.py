import asyncio
import json

import httpx
import pytest

import tools.restock as restock_module
from actions import run_confirmed_action
from auth import CurrentUser
from backend_client import BackendClient
from tools.base import ToolContext
from tools.restock import propose_restock

USER = CurrentUser(token="tok-abc", user_id="u1", business_id="b1", name="N", role="owner",
                   modules=["inventory"], business_name="Biz", currency="$")


def _mat(mid, name, stock, unit_cost, threshold=5):
    return {"material_id": mid, "name": name, "unit": "kg", "current_stock": stock,
            "reorder_threshold": threshold, "unit_cost": unit_cost}


MATERIALS = {"success": True, "data": [
    _mat("m1", "Flour", 12.5, 40),
    _mat("m2", "Butter", 3, 500, threshold=2),
    _mat("m3", "Brown Sugar", 8, 60),
    _mat("m4", "White Sugar", 9, 55),
]}


def make_backend():
    def handler(request):
        assert request.method == "GET" and request.url.path == "/api/materials"
        return httpx.Response(200, json=MATERIALS)
    return BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))


@pytest.fixture
def signed(monkeypatch):
    captured = {}

    def fake_sign(secret, **kwargs):
        captured.update(kwargs)
        return "signed-token", {"exp": 1234567890}

    monkeypatch.setattr(restock_module, "sign_action", fake_sign)
    return captured


def propose(args, *, secret="s" * 40, ctx=None):
    ctx = ctx or ToolContext(secret=secret)
    out = asyncio.run(propose_restock(USER, make_backend(), args, ctx))
    return out, ctx


def test_total_cost_gives_the_weighted_average_preview(signed):
    out, ctx = propose({"material": "flour", "quantity": 10, "total_cost": 500})
    assert out["status"] == "proposal_ready"
    assert signed["tool"] == "restock"
    assert signed["args"] == {"material_id": "m1", "material_name": "Flour", "unit": "kg", "quantity": 10, "cost": 500}
    proposal = ctx.proposals[0]
    assert proposal["undoable"] is False and proposal["tool"] == "restock"
    stock, cost = proposal["lines"]
    assert stock["before"] == 12.5 and stock["after"] == 22.5
    assert cost["before"] == 40 and cost["after"] == pytest.approx(44.4444, abs=1e-3)
    assert proposal["warnings"] == []
    assert "token" not in json.dumps(out)


def test_unit_price_becomes_a_total(signed):
    out, _ = propose({"material": "flour", "quantity": 10, "unit_price": 50})
    assert out["status"] == "proposal_ready"
    assert signed["args"]["cost"] == 500


def test_both_cost_figures_is_a_question(signed):
    out, ctx = propose({"material": "flour", "quantity": 10, "total_cost": 500, "unit_price": 50})
    assert "error" in out and ctx.proposals == []


def test_no_cost_keeps_the_unit_cost_and_warns(signed):
    out, ctx = propose({"material": "flour", "quantity": 10})
    assert signed["args"]["cost"] == 0
    cost = ctx.proposals[0]["lines"][1]
    assert cost["before"] == cost["after"] == 40
    assert any("No cost" in w for w in ctx.proposals[0]["warnings"])


def test_a_price_far_from_the_average_is_flagged(signed):
    _, ctx = propose({"material": "flour", "quantity": 10, "total_cost": 5})
    assert any("per kg" in w for w in ctx.proposals[0]["warnings"])


def test_a_much_bigger_purchase_than_usual_is_flagged(signed):
    _, ctx = propose({"material": "flour", "quantity": 400, "total_cost": 16000})
    warnings = ctx.proposals[0]["warnings"]
    assert any("times" in w for w in warnings)
    assert not any("per kg" in w for w in warnings)


@pytest.mark.parametrize("quantity", [0, -2, "lots", 2_000_000])
def test_bad_quantities_prepare_nothing(quantity):
    out, ctx = propose({"material": "flour", "quantity": quantity})
    assert "error" in out and ctx.proposals == []


def test_negative_cost_prepares_nothing():
    out, ctx = propose({"material": "flour", "quantity": 5, "total_cost": -5})
    assert "error" in out and ctx.proposals == []


def test_ambiguous_and_unknown_materials_prepare_nothing():
    out, ctx = propose({"material": "sugar", "quantity": 5})
    assert out["status"] == "ambiguous" and len(out["matches"]) == 2 and ctx.proposals == []
    out, ctx = propose({"material": "unobtainium", "quantity": 5})
    assert out["status"] == "none" and ctx.proposals == []


def test_actions_off_or_a_proposal_already_waiting():
    out, _ = propose({"material": "flour", "quantity": 5}, secret="")
    assert "error" in out
    ctx = ToolContext(secret="s" * 40)
    ctx.proposals.append({"summary": "x"})
    out, ctx = propose({"material": "flour", "quantity": 5}, ctx=ctx)
    assert "error" in out and len(ctx.proposals) == 1


# ---- confirming a restock ---------------------------------------------------

PAYLOAD = {
    "nonce": "nonce_1234567890abcdef",
    "tool": "restock",
    "args": {"material_id": "m1", "material_name": "Flour", "unit": "kg", "quantity": 10, "cost": 500},
}


def run_confirm(restock_response):
    calls = []

    def handler(request):
        body = json.loads(request.content) if request.content else None
        calls.append((request.method, request.url.path, body))
        if request.url.path == "/api/agent-actions":
            return httpx.Response(201, json={"success": True})
        if request.url.path == "/api/materials/m1/restock":
            if isinstance(restock_response, Exception):
                raise restock_response
            return httpx.Response(restock_response[0], json=restock_response[1])
        return httpx.Response(200, json={"success": True})

    backend = BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))
    out = asyncio.run(run_confirmed_action(PAYLOAD, user=USER, backend=backend))
    return out, calls


def test_confirm_reserves_restocks_and_completes():
    out, calls = run_confirm((200, {"success": True, "data": {"current_stock": 22.5, "unit_cost": 44.44}}))
    assert [(m, p) for m, p, _ in calls] == [
        ("POST", "/api/agent-actions"),
        ("POST", "/api/materials/m1/restock"),
        ("PATCH", "/api/agent-actions/nonce_1234567890abcdef"),
    ]
    assert calls[1][2] == {"quantity_added": 10, "cost": 500}
    assert calls[2][2]["status"] == "executed" and calls[2][2]["result"]["stock_after"] == 22.5
    assert out.status == 200 and out.body["reply"] == "Restocked Flour: added 10 kg, stock is now 22.5 kg."


def test_confirm_relays_a_node_refusal():
    out, calls = run_confirm((403, {"success": False, "error": "You do not have access to this module."}))
    assert out.status == 403 and out.body["detail"] == "You do not have access to this module."
    assert calls[-1][2]["status"] == "failed"


def test_confirm_with_no_clear_answer_points_to_inventory():
    out, _ = run_confirm((500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502 and "Inventory page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)