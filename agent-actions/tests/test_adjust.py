import asyncio
import json

import httpx
import pytest

import tools.adjust as adjust_module
from actions import run_confirmed_action
from auth import CurrentUser
from backend_client import BackendClient
from tools.adjust import propose_adjust_stock
from tools.base import ToolContext

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
    _mat("m5", "Cocoa", 0, 0, threshold=0),
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

    monkeypatch.setattr(adjust_module, "sign_action", fake_sign)
    return captured


def propose(args, *, secret="s" * 40, ctx=None):
    ctx = ctx or ToolContext(secret=secret)
    out = asyncio.run(propose_adjust_stock(USER, make_backend(), args, ctx))
    return out, ctx


def test_a_lower_count_gives_a_before_and_after_preview(signed):
    out, ctx = propose({"material": "flour", "actual_stock": 10})
    assert out["status"] == "proposal_ready"
    assert out["change"] == -2.5
    assert signed["tool"] == "adjust_stock"
    assert signed["args"] == {"material_id": "m1", "material_name": "Flour", "unit": "kg",
                              "actual_stock": 10, "stock_before": 12.5}
    proposal = ctx.proposals[0]
    assert proposal["tool"] == "adjust_stock" and proposal["undoable"] is False
    assert proposal["lines"] == [{"label": "Stock", "before": 12.5, "after": 10, "unit": "kg"}]
    assert proposal["warnings"] == []
    assert "Flour" in proposal["summary"]
    assert "token" not in json.dumps(out)


def test_a_higher_count_is_fine_too(signed):
    out, ctx = propose({"material": "flour", "actual_stock": 14})
    assert out["status"] == "proposal_ready" and out["change"] == 1.5
    assert ctx.proposals[0]["warnings"] == []


def test_a_count_of_zero_is_allowed_with_a_warning(signed):
    out, ctx = propose({"material": "flour", "actual_stock": 0})
    assert out["status"] == "proposal_ready"
    assert signed["args"]["actual_stock"] == 0
    assert any("zero" in w for w in ctx.proposals[0]["warnings"])


def test_the_same_count_prepares_nothing(signed):
    out, ctx = propose({"material": "flour", "actual_stock": 12.5})
    assert out["status"] == "no_change" and out["stock"] == 12.5
    assert ctx.proposals == [] and signed == {}


def test_a_big_change_is_flagged(signed):
    _, ctx = propose({"material": "flour", "actual_stock": 5})  # 12.5 -> 5 is 60%
    assert any("60%" in w for w in ctx.proposals[0]["warnings"])


def test_a_huge_count_on_empty_stock_is_flagged(signed):
    _, ctx = propose({"material": "cocoa", "actual_stock": 2000})
    assert any("very large" in w for w in ctx.proposals[0]["warnings"])
    _, ctx = propose({"material": "cocoa", "actual_stock": 5})
    assert ctx.proposals[0]["warnings"] == []


@pytest.mark.parametrize("count", [-1, "lots", 2_000_000])
def test_bad_counts_prepare_nothing(count):
    out, ctx = propose({"material": "flour", "actual_stock": count})
    assert "error" in out and ctx.proposals == []


def test_a_missing_count_is_a_question():
    out, ctx = propose({"material": "flour"})
    assert "error" in out and ctx.proposals == []


def test_ambiguous_and_unknown_materials_prepare_nothing():
    out, ctx = propose({"material": "sugar", "actual_stock": 5})
    assert out["status"] == "ambiguous" and len(out["matches"]) == 2 and ctx.proposals == []
    out, ctx = propose({"material": "unobtainium", "actual_stock": 5})
    assert out["status"] == "none" and ctx.proposals == []


def test_actions_off_or_a_proposal_already_waiting():
    out, _ = propose({"material": "flour", "actual_stock": 5}, secret="")
    assert "error" in out
    ctx = ToolContext(secret="s" * 40)
    ctx.proposals.append({"summary": "x"})
    out, ctx = propose({"material": "flour", "actual_stock": 5}, ctx=ctx)
    assert "error" in out and len(ctx.proposals) == 1


# ---- confirming an adjustment -----------------------------------------------

PAYLOAD = {
    "nonce": "nonce_1234567890abcdef",
    "tool": "adjust_stock",
    "args": {"material_id": "m1", "material_name": "Flour", "unit": "kg", "actual_stock": 10, "stock_before": 12.5},
}


def run_confirm(adjust_response):
    calls = []

    def handler(request):
        body = json.loads(request.content) if request.content else None
        calls.append((request.method, request.url.path, body))
        if request.url.path == "/api/agent-actions":
            return httpx.Response(201, json={"success": True})
        if request.url.path == "/api/materials/m1/adjust":
            return httpx.Response(adjust_response[0], json=adjust_response[1])
        return httpx.Response(200, json={"success": True})

    backend = BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))
    out = asyncio.run(run_confirmed_action(PAYLOAD, user=USER, backend=backend))
    return out, calls


def test_confirm_reserves_adjusts_and_completes():
    out, calls = run_confirm((200, {"success": True, "data": {"current_stock": 10}}))
    assert [(m, p) for m, p, _ in calls] == [
        ("POST", "/api/agent-actions"),
        ("POST", "/api/materials/m1/adjust"),
        ("PATCH", "/api/agent-actions/nonce_1234567890abcdef"),
    ]
    assert calls[1][2] == {"actual_stock": 10}  # Node gets only the count
    assert calls[2][2]["status"] == "executed"
    assert calls[2][2]["result"] == {"material_id": "m1", "stock_before": 12.5, "stock_after": 10}
    assert out.status == 200 and out.body["reply"] == "Adjusted Flour: stock is now 10 kg."
    assert out.body["result"]["stock_before"] == 12.5


def test_confirm_relays_a_node_refusal():
    out, calls = run_confirm((403, {"success": False, "error": "You do not have access to this module."}))
    assert out.status == 403 and out.body["detail"] == "You do not have access to this module."
    assert calls[-1][2]["status"] == "failed"


def test_confirm_with_no_clear_answer_points_to_inventory():
    out, _ = run_confirm((500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502 and "Inventory page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)