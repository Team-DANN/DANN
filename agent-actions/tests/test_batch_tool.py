import asyncio
import json

import httpx

from auth import CurrentUser
from backend_client import BackendClient
from confirm import verify_action
from tools.base import ToolContext
from tools.batch import propose_log_batch
from tools.registry import tools_for

SECRET = "k" * 40

PRODUCTS = [
    {"product_id": "p_croissant", "name": "Croissant", "unit": "piece", "current_stock": 3, "selling_price": 2.5,
     "recipe": [
         {"material_id": "m_butter", "material_name": "Butter", "material_unit": "kg", "quantity_per_unit": 0.05},
         {"material_id": "m_flour", "material_name": "Flour", "material_unit": "kg", "quantity_per_unit": 0.2},
     ]},
    {"product_id": "p_jam", "name": "Charred Lemon Marmalade", "unit": "jar", "current_stock": 0, "selling_price": 5, "recipe": []},
    {"product_id": "p_bbq", "name": "Smokey BBQ Sauce", "unit": "bottle", "current_stock": 0, "selling_price": 5, "recipe": []},
    {"product_id": "p_bbq2", "name": "Smokey BBQ Rub", "unit": "jar", "current_stock": 0, "selling_price": 5, "recipe": []},
]
MATERIALS = [
    {"material_id": "m_butter", "name": "Butter", "unit": "kg", "current_stock": 10},
    {"material_id": "m_flour", "name": "Flour", "unit": "kg", "current_stock": 30},
]


def make_user(modules=("production",)):
    return CurrentUser(token="tok", user_id="u1", business_id="b1", name="N", role="owner",
                       modules=list(modules), business_name="Biz", currency="$")


class Node:
    def __init__(self, products=PRODUCTS, materials=MATERIALS, batches=(), batches_status=200):
        self.paths = []
        self.routes = {
            "/api/products": (200, {"success": True, "data": list(products)}),
            "/api/materials": (200, {"success": True, "data": list(materials)}),
            "/api/batches": (batches_status, {"success": True, "data": list(batches)} if batches_status == 200 else {"success": False, "error": "x"}),
        }

    def client(self):
        def handler(request):
            self.paths.append(request.url.path)
            status, body = self.routes[request.url.path]
            return httpx.Response(status, json=body)
        return BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))


def propose(args, node=None, user=None, ctx=None):
    node = node or Node()
    ctx = ctx or ToolContext(secret=SECRET, ttl_seconds=300)
    result = asyncio.run(propose_log_batch(user or make_user(), node.client(), args, ctx))
    return result, ctx, node


def test_happy_path_prepares_a_signed_proposal_and_hides_it_from_the_model():
    result, ctx, _ = propose({"product": "croisant", "quantity": 40})
    assert result["status"] == "proposal_ready"
    assert result["uses"] == [
        {"material": "Butter", "amount": 2, "unit": "kg"},
        {"material": "Flour", "amount": 8, "unit": "kg"},
    ]
    raw = json.dumps(result)
    assert "token" not in raw and "p_croissant" not in raw
    assert len(ctx.proposals) == 1
    prop = ctx.proposals[0]
    assert prop["summary"] == "Log a batch of Croissant: 40 piece."
    assert prop["lines"][0]["left_after"] == 8
    payload = verify_action(SECRET, prop["token"], user_id="u1", business_id="b1", now=prop["expires_at"] - 10)
    assert payload["args"] == {"product_id": "p_croissant", "product_name": "Croissant", "unit": "piece",
                               "quantity": 40, "labor_cost": 0}
    assert payload["tool"] == "log_batch"


def test_numeric_strings_and_labor_cost_are_accepted():
    result, ctx, _ = propose({"product": "croissant", "quantity": "1,000", "labor_cost": "12.5"},
                             node=Node(materials=[{"material_id": "m_butter", "current_stock": 999}, {"material_id": "m_flour", "current_stock": 9999}]))
    assert result["status"] == "proposal_ready"
    assert ctx.proposals[0]["summary"] == "Log a batch of Croissant: 1000 piece, labor $12.5."
    assert any("very large" in w for w in ctx.proposals[0]["warnings"])


def test_shortage_prepares_nothing_and_names_what_is_short():
    result, ctx, _ = propose({"product": "croissant", "quantity": 200})
    assert result["status"] == "shortage"
    assert result["shortages"] == [{"material": "Flour", "need": 40, "have": 30, "unit": "kg"}]
    assert ctx.proposals == []


def test_exactly_enough_stock_is_allowed():
    result, ctx, _ = propose({"product": "croissant", "quantity": 150})  # flour 30, butter 7.5
    assert result["status"] == "proposal_ready"


def test_ambiguous_product_asks_instead_of_guessing():
    result, ctx, _ = propose({"product": "smokey bbq", "quantity": 5})
    assert result["status"] == "ambiguous"
    assert {m["name"] for m in result["matches"]} == {"Smokey BBQ Sauce", "Smokey BBQ Rub"}
    assert ctx.proposals == []


def test_unknown_product_is_none():
    result, ctx, _ = propose({"product": "zzzzzz", "quantity": 5})
    assert result == {"status": "none"} and ctx.proposals == []


def test_bad_numbers_and_missing_product_do_not_touch_node():
    for args in (
        {"product": "croissant", "quantity": 0},
        {"product": "croissant", "quantity": -3},
        {"product": "croissant", "quantity": "abc"},
        {"product": "croissant", "quantity": True},
        {"product": "croissant", "quantity": None},
        {"product": "croissant", "quantity": 1_000_001},
        {"product": "croissant", "quantity": float("nan")},
        {"product": "croissant", "quantity": 5, "labor_cost": -1},
        {"product": "croissant", "quantity": 5, "labor_cost": "lots"},
        {"product": "", "quantity": 5},
        {"quantity": 5},
    ):
        result, ctx, node = propose(args)
        assert "error" in result, args
        assert ctx.proposals == [] and node.paths == [], args


def test_only_one_proposal_per_turn():
    first, ctx, node = propose({"product": "croissant", "quantity": 4})
    assert first["status"] == "proposal_ready"
    second, ctx, _ = propose({"product": "croissant", "quantity": 5}, node=node, ctx=ctx)
    assert "already waiting" in second["error"] and len(ctx.proposals) == 1


def test_product_without_a_recipe_warns_and_skips_materials():
    result, ctx, node = propose({"product": "marmalade", "quantity": 12, "manual_material_cost": 30})
    assert result["status"] == "proposal_ready" and result["uses"] == []
    assert any("no recipe" in w for w in result["warnings"])
    assert "/api/materials" not in node.paths
    payload = verify_action(SECRET, ctx.proposals[0]["token"], user_id="u1", business_id="b1")
    assert payload["args"]["manual_material_cost"] == 30


def test_manual_cost_is_dropped_when_there_is_a_recipe():
    _, ctx, _ = propose({"product": "croissant", "quantity": 4, "manual_material_cost": 99})
    payload = verify_action(SECRET, ctx.proposals[0]["token"], user_id="u1", business_id="b1")
    assert "manual_material_cost" not in payload["args"]


def test_much_bigger_than_the_usual_batch_gets_a_warning():
    node = Node(batches=[{"product_id": "p_croissant", "quantity_produced": 10}, {"product_id": "p_jam", "quantity_produced": 500}])
    result, ctx, _ = propose({"product": "croissant", "quantity": 60}, node=node)
    assert result["status"] == "proposal_ready"
    assert any("6 times" in w for w in result["warnings"])
    result, ctx, _ = propose({"product": "croissant", "quantity": 20}, node=node)
    assert result["warnings"] == []


def test_a_failing_batches_call_never_blocks_the_proposal():
    result, ctx, _ = propose({"product": "croissant", "quantity": 4}, node=Node(batches_status=500))
    assert result["status"] == "proposal_ready" and result["warnings"] == []


def test_unreadable_recipe_material_prepares_nothing():
    result, ctx, _ = propose({"product": "croissant", "quantity": 4}, node=Node(materials=[]))
    assert "error" in result and ctx.proposals == []


def test_switched_off_without_a_secret():
    result, ctx, node = propose({"product": "croissant", "quantity": 4}, ctx=ToolContext(secret=""))
    assert "error" in result and ctx.proposals == [] and node.paths == []


def test_write_tool_is_offered_only_when_enabled_and_with_the_production_module():
    on = {t.name for t in tools_for(make_user(), writes_enabled=True)}
    off = {t.name for t in tools_for(make_user(), writes_enabled=False)}
    other = {t.name for t in tools_for(make_user(["finance"]), writes_enabled=True)}
    assert "propose_log_batch" in on
    assert "propose_log_batch" not in off
    assert "propose_log_batch" not in other