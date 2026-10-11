import asyncio
import json

import httpx
import pytest

import tools.material as material_module
from actions import run_confirmed_action
from auth import CurrentUser
from backend_client import BackendClient
from tools.base import ToolContext
from tools.material import propose_create_material

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

    monkeypatch.setattr(material_module, "sign_action", fake_sign)
    return captured


def propose(args, *, secret="s" * 40, ctx=None):
    ctx = ctx or ToolContext(secret=secret)
    out = asyncio.run(propose_create_material(USER, make_backend(), args, ctx))
    return out, ctx


def test_a_full_proposal(signed):
    out, ctx = propose({"name": "Cocoa Powder", "unit": "kg", "opening_stock": 5,
                        "price_per_unit": 300, "reorder_level": 2})
    assert out["status"] == "proposal_ready"
    assert signed["tool"] == "create_material"
    assert signed["args"] == {"name": "Cocoa Powder", "unit": "kg", "price_per_unit": 300,
                              "opening_stock": 5, "reorder_level": 2}
    proposal = ctx.proposals[0]
    assert proposal["tool"] == "create_material" and proposal["undoable"] is True
    labels = [line["label"] for line in proposal["lines"]]
    assert labels == ["Name", "Unit", "Opening stock", "Price per unit", "Reorder level"]
    assert proposal["warnings"] == []
    assert "token" not in json.dumps(out)


def test_name_and_unit_alone_are_enough(signed):
    out, ctx = propose({"name": "  Cocoa   Powder ", "unit": "kg"})
    assert out["status"] == "proposal_ready"
    assert signed["args"] == {"name": "Cocoa Powder", "unit": "kg", "price_per_unit": 0,
                              "opening_stock": 0, "reorder_level": 0}
    assert ctx.proposals[0]["warnings"] == []


def test_opening_stock_without_a_price_warns(signed):
    _, ctx = propose({"name": "Cocoa Powder", "unit": "kg", "opening_stock": 5})
    assert any("No price per unit" in w for w in ctx.proposals[0]["warnings"])


def test_a_supplier_is_carried_only_when_given(signed):
    propose({"name": "Cocoa Powder", "unit": "kg", "supplier": "Acme Foods"})
    assert signed["args"]["supplier"] == "Acme Foods"
    signed.clear()
    propose({"name": "Cocoa Powder", "unit": "kg"})
    assert "supplier" not in signed["args"]


@pytest.mark.parametrize("name", ["flour", "Flours", "sugar brown", "Brown Sugar", "Buttr"])
def test_near_duplicates_are_refused(signed, name):
    out, ctx = propose({"name": name, "unit": "kg"})
    assert out["status"] == "duplicate" and out["existing"]["name"]
    assert ctx.proposals == [] and signed == {}


@pytest.mark.parametrize("name", ["Sugar Syrup", "Wholemeal Flour", "Cocoa Powder"])
def test_a_different_material_that_shares_a_word_is_allowed(signed, name):
    out, ctx = propose({"name": name, "unit": "kg"})
    assert out["status"] == "proposal_ready" and len(ctx.proposals) == 1


def test_the_duplicate_answer_names_the_existing_material(signed):
    out, _ = propose({"name": "flour", "unit": "kg"})
    assert out["existing"] == {"name": "Flour", "unit": "kg", "stock": 12.5}


def test_missing_or_oversized_fields_prepare_nothing():
    for args in (
        {"unit": "kg"},
        {"name": "Cocoa"},
        {"name": "x" * 81, "unit": "kg"},
        {"name": "Cocoa", "unit": "kilograms of the very best"},
    ):
        out, ctx = propose(args)
        assert "error" in out and ctx.proposals == []


@pytest.mark.parametrize("field", ["price_per_unit", "opening_stock", "reorder_level"])
@pytest.mark.parametrize("value", [-1, "lots"])
def test_bad_numbers_prepare_nothing(field, value):
    out, ctx = propose({"name": "Cocoa", "unit": "kg", field: value})
    assert "error" in out and ctx.proposals == []


def test_actions_off_or_a_proposal_already_waiting():
    out, _ = propose({"name": "Cocoa", "unit": "kg"}, secret="")
    assert "error" in out
    ctx = ToolContext(secret="s" * 40)
    ctx.proposals.append({"summary": "x"})
    out, ctx = propose({"name": "Cocoa", "unit": "kg"}, ctx=ctx)
    assert "error" in out and len(ctx.proposals) == 1


# ---- confirming a new material ----------------------------------------------

PAYLOAD = {
    "nonce": "nonce_1234567890abcdef",
    "tool": "create_material",
    "args": {"name": "Cocoa Powder", "unit": "kg", "price_per_unit": 300,
             "opening_stock": 5, "reorder_level": 2, "supplier": "Acme Foods"},
}


def run_confirm(create_response, payload=PAYLOAD):
    calls = []

    def handler(request):
        body = json.loads(request.content) if request.content else None
        calls.append((request.method, request.url.path, body))
        if request.url.path == "/api/agent-actions":
            return httpx.Response(201, json={"success": True})
        if request.url.path == "/api/materials":
            return httpx.Response(create_response[0], json=create_response[1])
        return httpx.Response(200, json={"success": True})

    backend = BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))
    out = asyncio.run(run_confirmed_action(payload, user=USER, backend=backend))
    return out, calls


CREATED = (201, {"success": True, "data": {"material_id": "mat_1", "name": "Cocoa Powder", "unit": "kg",
                                           "current_stock": 5, "unit_cost": 300}})


def test_confirm_reserves_creates_and_completes():
    out, calls = run_confirm(CREATED)
    assert [(m, p) for m, p, _ in calls] == [
        ("POST", "/api/agent-actions"),
        ("POST", "/api/materials"),
        ("PATCH", "/api/agent-actions/nonce_1234567890abcdef"),
    ]
    assert calls[1][2] == {"name": "Cocoa Powder", "unit": "kg", "unit_cost": 300, "current_stock": 5,
                           "reorder_threshold": 2, "supplier_name": "Acme Foods"}
    assert calls[2][2]["status"] == "executed" and calls[2][2]["result"]["material_id"] == "mat_1"
    assert out.status == 200 and out.body["reply"] == "Added the material Cocoa Powder (kg)."
    assert out.body["result"]["material_id"] == "mat_1"  # the app needs it for Undo


def test_confirm_sends_no_supplier_when_none_was_given():
    payload = {**PAYLOAD, "args": {"name": "Cocoa Powder", "unit": "kg", "price_per_unit": 0,
                                   "opening_stock": 0, "reorder_level": 0}}
    _, calls = run_confirm(CREATED, payload)
    assert "supplier_name" not in calls[1][2]
    assert calls[1][2]["unit_cost"] == 0 and calls[1][2]["current_stock"] == 0


def test_confirm_relays_a_node_refusal():
    out, calls = run_confirm((400, {"success": False, "error": "Validation Error: name: Required"}))
    assert out.status == 400 and "Validation Error" in out.body["detail"]
    assert calls[-1][2]["status"] == "failed"


def test_confirm_with_no_clear_answer_points_to_inventory():
    out, _ = run_confirm((500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502 and "Inventory page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)