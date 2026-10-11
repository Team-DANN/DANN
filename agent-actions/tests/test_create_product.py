import asyncio
import json

import httpx
import pytest

import tools.product as product_module
from actions import run_confirmed_action
from auth import CurrentUser
from backend_client import BackendClient
from tools.base import ToolContext
from tools.product import propose_create_product

USER = CurrentUser(token="tok-abc", user_id="u1", business_id="b1", name="N", role="owner",
                   modules=["production"], business_name="Biz", currency="$")


def _mat(mid, name, stock, unit_cost, unit="kg"):
    return {"material_id": mid, "name": name, "unit": unit, "current_stock": stock,
            "reorder_threshold": 5, "unit_cost": unit_cost}


MATERIALS = {"success": True, "data": [
    _mat("m1", "Flour", 12.5, 40),
    _mat("m2", "Butter", 3, 500),
    _mat("m3", "Brown Sugar", 8, 60),
    _mat("m4", "White Sugar", 9, 55),
]}
PRODUCTS = {"success": True, "data": [
    {"product_id": "p1", "name": "Bread", "unit": "loaf", "selling_price": 20, "current_stock": 50, "recipe": []},
    {"product_id": "p2", "name": "Croissant", "unit": "piece", "selling_price": 50, "current_stock": 10, "recipe": []},
]}


def make_backend(materials=MATERIALS, products=PRODUCTS):
    """materials=None means the materials list must not be fetched at all."""
    def handler(request):
        assert request.method == "GET"
        path = request.url.path
        if path == "/api/products":
            return httpx.Response(200, json=products)
        if path == "/api/materials" and materials is not None:
            return httpx.Response(200, json=materials)
        raise AssertionError(f"unexpected call: {path}")
    return BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))


@pytest.fixture
def signed(monkeypatch):
    captured = {}

    def fake_sign(secret, **kwargs):
        captured.update(kwargs)
        return "signed-token", {"exp": 1234567890}

    monkeypatch.setattr(product_module, "sign_action", fake_sign)
    return captured


def propose(args, *, secret="s" * 40, ctx=None, materials=MATERIALS):
    ctx = ctx or ToolContext(secret=secret)
    out = asyncio.run(propose_create_product(USER, make_backend(materials=materials), args, ctx))
    return out, ctx


COCOA = {"name": "Cocoa Powder", "quantity_per_unit": 0.2, "new": True, "unit": "kg", "stock": 5, "price_per_unit": 300}


# ---- proposing --------------------------------------------------------------


def test_a_full_proposal_with_existing_ingredients(signed):
    out, ctx = propose({
        "name": "Cake", "selling_price": 50, "unit": "piece", "category": "Bakery", "opening_stock": 4,
        "ingredients": [{"name": "flour", "quantity_per_unit": 0.5}, {"name": "butter", "quantity_per_unit": 0.25}],
    })
    assert out["status"] == "proposal_ready"
    assert signed["tool"] == "create_product"
    assert signed["args"] == {
        "name": "Cake", "unit": "piece", "category": "Bakery", "selling_price": 50, "opening_stock": 4,
        "ingredients": [
            {"material_id": "m1", "material_name": "Flour", "unit": "kg", "quantity_per_unit": 0.5},
            {"material_id": "m2", "material_name": "Butter", "unit": "kg", "quantity_per_unit": 0.25},
        ],
    }
    proposal = ctx.proposals[0]
    assert proposal["tool"] == "create_product" and proposal["undoable"] is False
    assert [line["label"] for line in proposal["lines"]] == [
        "Name", "Selling price", "Unit", "Category", "Opening stock", "Flour", "Butter"]
    assert proposal["lines"][1] == {"label": "Selling price", "value": 50, "unit": "$ per piece"}
    assert proposal["lines"][5] == {"label": "Flour", "value": 0.5, "unit": "kg per piece"}
    assert len(proposal["warnings"]) == 1 and "does not use up any materials" in proposal["warnings"][0]
    assert "token" not in json.dumps(out)


def test_no_opening_stock_means_no_warning(signed):
    out, ctx = propose({"name": "Cake", "selling_price": 50,
                        "ingredients": [{"name": "flour", "quantity_per_unit": 0.5}]})
    assert out["status"] == "proposal_ready" and ctx.proposals[0]["warnings"] == []


def test_name_and_price_alone_make_a_product_without_a_recipe(signed):
    out, ctx = propose({"name": "  Cake  ", "selling_price": "50"}, materials=None)  # no materials fetch
    assert out["status"] == "proposal_ready"
    assert signed["args"] == {"name": "Cake", "unit": "piece", "selling_price": 50, "opening_stock": 0,
                              "ingredients": []}
    assert any("no recipe" in w for w in ctx.proposals[0]["warnings"])


def test_a_price_of_zero_is_allowed_with_a_warning(signed):
    out, ctx = propose({"name": "Cake", "selling_price": 0}, materials=None)
    assert out["status"] == "proposal_ready"
    assert any("selling price is" in w for w in ctx.proposals[0]["warnings"])


@pytest.mark.parametrize("price", [None, "", "   ", -1, "abc", True])
def test_a_missing_or_bad_price_prepares_nothing(price):
    args = {"name": "Cake"} if price is None else {"name": "Cake", "selling_price": price}
    out, ctx = propose(args, materials=None)
    assert "error" in out and ctx.proposals == []


def test_missing_or_oversized_fields_prepare_nothing():
    for args in (
        {"selling_price": 5},
        {"name": "x" * 81, "selling_price": 5},
        {"name": "Cake", "selling_price": 5, "unit": "kilograms of the very best"},
        {"name": "Cake", "selling_price": 5, "opening_stock": -1},
    ):
        out, ctx = propose(args, materials=None)
        assert "error" in out and ctx.proposals == []


@pytest.mark.parametrize("name", ["Bred", "Croissants", "bread"])
def test_a_near_duplicate_product_is_refused(signed, name):
    out, ctx = propose({"name": name, "selling_price": 5}, materials=None)
    assert out["status"] == "duplicate" and out["which"] == "product" and out["existing"]["name"]
    assert ctx.proposals == [] and signed == {}


@pytest.mark.parametrize("name", ["Sourdough Bread", "Cake"])
def test_a_different_product_that_shares_a_word_is_allowed(signed, name):
    out, ctx = propose({"name": name, "selling_price": 5}, materials=None)
    assert out["status"] == "proposal_ready" and len(ctx.proposals) == 1


def test_a_new_ingredient_is_created_in_the_same_action(signed):
    out, ctx = propose({"name": "Cake", "selling_price": 50,
                        "ingredients": [COCOA, {"name": "flour", "quantity_per_unit": 0.5}]})
    assert out["status"] == "proposal_ready"
    assert signed["args"]["ingredients"][0] == {
        "material_name": "Cocoa Powder", "unit": "kg", "quantity_per_unit": 0.2,
        "new_material": {"name": "Cocoa Powder", "unit": "kg", "stock": 5, "price_per_unit": 300},
    }
    assert "material_id" not in signed["args"]["ingredients"][0]
    proposal = ctx.proposals[0]
    assert proposal["lines"][0] == {"label": "New material", "value": "Cocoa Powder: 5 kg in stock, $300.00 per kg"}
    assert proposal["lines"][1]["label"] == "Name"
    assert len(proposal["warnings"]) == 1 and "also adds 1 new material" in proposal["warnings"][0]
    assert "Cocoa Powder" in proposal["warnings"][0]


def test_a_new_ingredient_without_a_price_warns(signed):
    ingredient = {k: v for k, v in COCOA.items() if k != "price_per_unit"}
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [ingredient]})
    assert out["status"] == "proposal_ready"
    assert signed["args"]["ingredients"][0]["new_material"]["price_per_unit"] == 0
    assert any("No price per unit is set for Cocoa Powder" in w for w in ctx.proposals[0]["warnings"])
    assert "no price" in ctx.proposals[0]["lines"][0]["value"]


def test_an_existing_material_with_no_cost_warns(signed):
    materials = {"success": True, "data": [_mat("m9", "Sprinkles", 4, 0)]}
    out, ctx = propose({"name": "Cake", "selling_price": 50,
                        "ingredients": [{"name": "sprinkles", "quantity_per_unit": 0.01}]}, materials=materials)
    assert out["status"] == "proposal_ready"
    assert any("No price per unit is set for Sprinkles" in w for w in ctx.proposals[0]["warnings"])


def test_a_new_ingredient_needs_a_unit_and_a_stock():
    for drop in ("unit", "stock"):
        ingredient = {k: v for k, v in COCOA.items() if k != drop}
        out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [ingredient]})
        assert "error" in out and ctx.proposals == []
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [{**COCOA, "stock": 0}]})
    assert out["status"] == "proposal_ready"  # 0 is a valid stock


def test_new_must_be_a_real_true():
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [{**COCOA, "new": "yes"}]})
    assert out["status"] == "ingredient_problems" and ctx.proposals == []  # matched as an existing name instead


def test_an_ingredient_that_is_not_in_dann_is_a_problem(signed):
    out, ctx = propose({"name": "Cake", "selling_price": 50,
                        "ingredients": [{"name": "unobtainium", "quantity_per_unit": 1}]})
    assert out == {"status": "ingredient_problems", "problems": [{"ingredient": "unobtainium", "status": "none"}]}
    assert ctx.proposals == [] and signed == {}


def test_an_ambiguous_ingredient_lists_the_close_materials():
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [{"name": "sugar", "quantity_per_unit": 1}]})
    problem = out["problems"][0]
    assert out["status"] == "ingredient_problems" and problem["status"] == "ambiguous"
    assert {m["name"] for m in problem["matches"]} >= {"Brown Sugar", "White Sugar"}
    assert ctx.proposals == []


def test_a_new_ingredient_that_is_a_near_duplicate_is_a_problem():
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [{**COCOA, "name": "Flours"}]})
    assert out["problems"] == [{"ingredient": "Flours", "status": "duplicate", "existing": {"name": "Flour", "unit": "kg"}}]
    assert ctx.proposals == []


def test_all_the_problems_come_back_together():
    out, _ = propose({"name": "Cake", "selling_price": 50, "ingredients": [
        {"name": "flour", "quantity_per_unit": 0.5},
        {"name": "unobtainium", "quantity_per_unit": 1},
        {"name": "sugar", "quantity_per_unit": 1},
    ]})
    assert [p["ingredient"] for p in out["problems"]] == ["unobtainium", "sugar"]


def test_the_same_material_twice_is_refused():
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [
        {"name": "flour", "quantity_per_unit": 0.5}, {"name": "Flours", "quantity_per_unit": 0.2}]})
    assert "error" in out and ctx.proposals == []


def test_the_same_new_material_twice_is_refused():
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": [
        COCOA, {**COCOA, "name": "cocoa powders"}]})
    assert "error" in out and ctx.proposals == []


@pytest.mark.parametrize("ingredients", [
    "flour",
    ["flour"],
    [{"quantity_per_unit": 1}],
    [{"name": "flour"}],
    [{"name": "flour", "quantity_per_unit": 0}],
    [{"name": "flour", "quantity_per_unit": -1}],
    [{"name": "flour", "quantity_per_unit": "lots"}],
    [{"name": "flour", "quantity_per_unit": 1}] * 16,
])
def test_bad_ingredient_shapes_prepare_nothing(ingredients):
    out, ctx = propose({"name": "Cake", "selling_price": 50, "ingredients": ingredients})
    assert "error" in out and ctx.proposals == []


def test_actions_off_or_a_proposal_already_waiting():
    out, _ = propose({"name": "Cake", "selling_price": 50}, secret="", materials=None)
    assert "error" in out
    ctx = ToolContext(secret="s" * 40)
    ctx.proposals.append({"summary": "x"})
    out, ctx = propose({"name": "Cake", "selling_price": 50}, ctx=ctx, materials=None)
    assert "error" in out and len(ctx.proposals) == 1


# ---- confirming a new product -----------------------------------------------

NONCE = "nonce_1234567890abcdef"
EXISTING = {"material_id": "m1", "material_name": "Flour", "unit": "kg", "quantity_per_unit": 0.5}
PRODUCT_OK = (201, {"success": True, "data": {"product_id": "prod_1", "id": "prod_1", "name": "Cake", "unit": "piece",
                                              "current_stock": 4, "cost_per_unit": 22.5}})


def new_material(name):
    return {"material_name": name, "unit": "kg", "quantity_per_unit": 0.2,
            "new_material": {"name": name, "unit": "kg", "stock": 5, "price_per_unit": 300}}


def payload(*ingredients, **extra):
    args = {"name": "Cake", "unit": "piece", "selling_price": 50, "opening_stock": 4, "ingredients": list(ingredients)}
    args.update(extra)
    return {"nonce": NONCE, "tool": "create_product", "args": args}


def run_confirm(pl, *, material_responses=None, product=PRODUCT_OK):
    """material_responses: new material name -> (status, body); the rest are created with id mat_<name>."""
    responses = material_responses or {}
    calls = []

    def handler(request):
        body = json.loads(request.content) if request.content else None
        calls.append((request.method, request.url.path, body))
        if request.url.path == "/api/agent-actions":
            return httpx.Response(201, json={"success": True})
        if request.url.path == "/api/materials":
            default = (201, {"success": True, "data": {"material_id": f"mat_{body['name']}", "name": body["name"]}})
            status, reply = responses.get(body["name"], default)
            return httpx.Response(status, json=reply)
        if request.url.path == "/api/products":
            return httpx.Response(product[0], json=product[1])
        return httpx.Response(200, json={"success": True})

    backend = BackendClient(base_url="http://node", transport=httpx.MockTransport(handler))
    out = asyncio.run(run_confirmed_action(pl, user=USER, backend=backend))
    return out, calls


def paths(calls):
    return [(m, p) for m, p, _ in calls]


def test_confirm_creates_the_product_with_its_recipe():
    out, calls = run_confirm(payload(EXISTING))
    assert paths(calls) == [
        ("POST", "/api/agent-actions"), ("POST", "/api/products"), ("PATCH", f"/api/agent-actions/{NONCE}")]
    assert calls[1][2] == {"name": "Cake", "unit": "piece", "selling_price": 50, "current_stock": 4,
                           "recipe": [{"material_id": "m1", "quantity_per_unit": 0.5}]}
    assert calls[2][2]["status"] == "executed"
    assert calls[2][2]["result"]["product_id"] == "prod_1" and calls[2][2]["result"]["materials_created"] == []
    assert out.status == 200 and out.body["reply"] == "Added the product Cake (piece) with 1 ingredient."
    assert out.body["result"]["product_id"] == "prod_1" and out.body["result"]["new_materials"] == []


def test_confirm_sends_no_recipe_when_there_are_no_ingredients():
    _, calls = run_confirm(payload())
    assert "recipe" not in calls[1][2] and "category" not in calls[1][2]


def test_confirm_sends_the_category_when_signed():
    _, calls = run_confirm(payload(category="Bakery"))
    assert calls[1][2]["category"] == "Bakery"


def test_confirm_adds_the_new_material_first_then_the_product():
    out, calls = run_confirm(payload(new_material("Cocoa Powder"), EXISTING))
    assert paths(calls) == [
        ("POST", "/api/agent-actions"), ("POST", "/api/materials"), ("POST", "/api/products"),
        ("PATCH", f"/api/agent-actions/{NONCE}")]
    assert calls[1][2] == {"name": "Cocoa Powder", "unit": "kg", "unit_cost": 300, "current_stock": 5,
                           "reorder_threshold": 0}
    assert calls[2][2]["recipe"] == [
        {"material_id": "mat_Cocoa Powder", "quantity_per_unit": 0.2},
        {"material_id": "m1", "quantity_per_unit": 0.5}]
    assert calls[3][2]["result"]["materials_created"] == ["mat_Cocoa Powder"]
    assert out.body["reply"] == "Added the new material Cocoa Powder. Added the product Cake (piece) with 2 ingredients."
    assert out.body["result"]["new_materials"] == ["Cocoa Powder"]


def test_each_new_material_id_lands_on_its_own_ingredient():
    out, calls = run_confirm(payload(new_material("A"), EXISTING, new_material("B")))
    assert [p for _, p in paths(calls)] == [
        "/api/agent-actions", "/api/materials", "/api/materials", "/api/products", f"/api/agent-actions/{NONCE}"]
    assert [c[2]["name"] for c in calls[1:3]] == ["A", "B"]
    assert [r["material_id"] for r in calls[3][2]["recipe"]] == ["mat_A", "m1", "mat_B"]
    assert calls[4][2]["result"]["materials_created"] == ["mat_A", "mat_B"]
    assert out.body["reply"].startswith("Added the new materials A and B. Added the product Cake (piece) with 3 ingredients")


def test_confirm_stops_when_the_first_material_is_refused():
    message = "Validation Error: name: Material name is required"
    out, calls = run_confirm(payload(new_material("A")), material_responses={"A": (400, {"success": False, "error": message})})
    assert out.status == 400 and out.body["detail"] == message
    assert "/api/products" not in [p for _, p in paths(calls)]
    assert calls[-1][2]["status"] == "failed"


def test_confirm_names_what_was_added_when_a_later_material_is_refused():
    message = "Validation Error: unit: Unit of measure is required"
    out, calls = run_confirm(payload(new_material("A"), new_material("B")),
                             material_responses={"B": (400, {"success": False, "error": message})})
    assert out.status == 400
    assert out.body["detail"] == f"A was added as a new material, but the product was not created: {message}"
    assert "/api/products" not in [p for _, p in paths(calls)]
    assert calls[-1][2]["status"] == "failed" and calls[-1][2]["result"]["setup_done"] == "A was added as a new material"


def test_confirm_keeps_the_materials_when_the_product_is_refused():
    message = "Validation Error: selling_price: Required"
    out, calls = run_confirm(payload(new_material("A"), new_material("B")),
                             product=(400, {"success": False, "error": message}))
    assert out.status == 400
    assert out.body["detail"] == (
        f"A was added as a new material and B was added as a new material, but the product was not created: {message}")
    assert calls[-1][2]["status"] == "failed"
    assert calls[-1][2]["result"]["setup_done"] == "A was added as a new material and B was added as a new material"


def test_a_refused_product_with_no_new_materials_is_relayed_as_it_is():
    message = "A product with ID 'x' already exists"
    out, _ = run_confirm(payload(EXISTING), product=(409, {"success": False, "error": message}))
    assert out.status == 409 and out.body["detail"] == message


def test_no_clear_answer_on_the_product_says_the_materials_were_added():
    out, _ = run_confirm(payload(new_material("A")), product=(500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502
    assert "A was added as a new material" in out.body["detail"] and "Production page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)


def test_no_clear_answer_on_the_product_without_setup_points_to_production():
    out, _ = run_confirm(payload(EXISTING), product=(500, {"success": False, "error": "raw internal text"}))
    assert out.status == 502 and "Production page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)


def test_no_clear_answer_on_the_first_material_stops():
    out, calls = run_confirm(payload(new_material("A")),
                             material_responses={"A": (500, {"success": False, "error": "raw internal text"})})
    assert out.status == 502 and "Production page" in out.body["detail"]
    assert "raw internal text" not in json.dumps(out.body)
    assert "/api/products" not in [p for _, p in paths(calls)]


def test_no_clear_answer_on_a_later_material_names_the_first():
    out, calls = run_confirm(payload(new_material("A"), new_material("B")),
                             material_responses={"B": (500, {"success": False, "error": "raw internal text"})})
    assert out.status == 502
    assert "A was added as a new material" in out.body["detail"] and "Production page" in out.body["detail"]
    assert "/api/products" not in [p for _, p in paths(calls)]


def test_a_new_material_that_comes_back_without_an_id_stops():
    out, calls = run_confirm(payload(new_material("A")),
                             material_responses={"A": (201, {"success": True, "data": {}})})
    assert out.status == 502 and "A was added as a new material" in out.body["detail"]
    assert "/api/products" not in [p for _, p in paths(calls)]