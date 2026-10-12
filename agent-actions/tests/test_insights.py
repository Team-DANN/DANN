"""get_business_data: the answer is written in code from Node's reports."""

import asyncio
from types import SimpleNamespace

import httpx
import pytest

from backend_client import BackendClient, BackendError
from tools.base import ToolContext
from tools.insights import GET_BUSINESS_DATA, TOPICS

USER = SimpleNamespace(token="tok", currency="$")

RUNWAY = {
    "material": "Squeeze bottles",
    "daysLeft": 13,
    "details": [
        {"material": "Tomato puree", "current_stock": 14.2, "unit": "kg", "avg_daily_consumption": 0.85, "daysLeft": 16.6},
        {"material": "Squeeze bottles", "current_stock": 115, "unit": "units", "avg_daily_consumption": 9, "daysLeft": 12.8},
    ],
}


def node(routes):
    def respond(request):
        body = routes.get(request.url.path)
        if body is None:
            return httpx.Response(404, json={"success": False, "error": "Not found"})
        return httpx.Response(200, json={"success": True, "data": body})

    return BackendClient(base_url="http://node.test", transport=httpx.MockTransport(respond))


def ask(topic, routes):
    ctx = ToolContext()
    result = asyncio.run(GET_BUSINESS_DATA.handler(USER, node(routes), {"topic": topic}, ctx))
    return result, ctx


def test_every_topic_is_in_the_tool_schema():
    enum = GET_BUSINESS_DATA.parameters["properties"]["topic"]["enum"]
    assert set(enum) == set(TOPICS)


def test_unknown_topic_is_an_error_and_sets_no_reply():
    result, ctx = ask("weather", {})
    assert "error" in result and ctx.direct_reply == ""


def test_a_node_failure_reaches_the_agent_as_an_error():
    with pytest.raises(BackendError):
        ask("profit", {})


def test_profit_keeps_a_normal_trend_and_drops_a_silly_one():
    data = {"total_revenue": 230, "total_cost": 100, "net_profit": 130, "profit_margin_percent": 56.5,
            "total_orders": 2, "total_batches": 8, "revenue_trend_percent": -39}
    _, ctx = ask("profit", {"/api/reports/profit-summary": data})
    assert "Profit margin" in ctx.direct_reply and "-39" in ctx.direct_reply

    _, ctx = ask("profit", {"/api/reports/profit-summary": {**data, "revenue_trend_percent": 295798}})
    assert "295798" not in ctx.direct_reply and "too small to compare" in ctx.direct_reply


def test_weekly_margin_leaves_out_an_unusable_trend():
    data = {"amount": -5687.965, "trend": -1742, "revenue": 230, "cost": 5917.965, "margin_percent": -2473.03}
    result, ctx = ask("weekly_margin", {"/api/reports/weekly-margin": data})
    assert result["status"] == "ok"
    assert "1742" not in ctx.direct_reply and "too small to compare" in ctx.direct_reply


def test_receivables_lists_who_owes_biggest_first():
    routes = {
        "/api/reports/receivables": {"amount": 130, "overdueCount": 2},
        "/api/orders/unpaid-summary": [
            {"retailer_name": "UndoTest Retailer", "unpaid_orders_count": 1, "total_owed": 30},
            {"retailer_name": "The Plug", "unpaid_orders_count": 1, "total_owed": 100},
        ],
    }
    _, ctx = ask("receivables", routes)
    assert "2 orders are overdue" in ctx.direct_reply
    assert ctx.direct_reply.index("The Plug") < ctx.direct_reply.index("UndoTest Retailer")


def test_receivables_when_nobody_owes():
    routes = {"/api/reports/receivables": {"amount": 0, "overdueCount": 0}, "/api/orders/unpaid-summary": []}
    _, ctx = ask("receivables", routes)
    assert ctx.direct_reply == "Nobody owes you anything right now."


def test_runway_is_sorted_soonest_first_and_rounded():
    _, ctx = ask("runway", {"/api/reports/runway": RUNWAY})
    assert ctx.direct_reply.index("Squeeze bottles") < ctx.direct_reply.index("Tomato puree")
    assert "about 13 days" in ctx.direct_reply


def test_low_stock_with_nothing_low_points_at_the_soonest_to_run_out():
    routes = {"/api/materials/low-stock": [], "/api/reports/runway": RUNWAY}
    _, ctx = ask("low_stock", routes)
    assert "Nothing is at or below its reorder level" in ctx.direct_reply
    assert "Squeeze bottles will run out first" in ctx.direct_reply


def test_low_stock_still_answers_when_the_runway_hint_is_unavailable():
    _, ctx = ask("low_stock", {"/api/materials/low-stock": []})  # runway route missing: Node 404
    assert ctx.direct_reply == "Nothing is at or below its reorder level."


def test_stock_marks_a_material_at_or_below_its_own_threshold():
    routes = {
        "/api/products": [{"product_id": "p1", "name": "Granola", "unit": "piece", "current_stock": 3, "recipe": []}],
        "/api/materials": [
            {"material_id": "m1", "name": "Almonds", "unit": "kg", "current_stock": 5, "reorder_threshold": 10},
            {"material_id": "m2", "name": "Oats", "unit": "kg", "current_stock": 50, "reorder_threshold": 10},
        ],
    }
    _, ctx = ask("stock", routes)
    almonds = next(line for line in ctx.direct_reply.splitlines() if "Almonds" in line)
    oats = next(line for line in ctx.direct_reply.splitlines() if "Oats" in line)
    assert "(low)" in almonds and "(low)" not in oats
    assert "Finished goods" in ctx.direct_reply and "Granola" in ctx.direct_reply


def test_top_products_warns_when_a_product_has_no_cost():
    rows = [
        {"name": "Smokey BBQ", "qty": 20, "cost": 16.4, "profit": 283.4},
        {"name": "Fried rice", "qty": 10, "cost": 0, "profit": 200},
    ]
    _, ctx = ask("top_products", {"/api/reports/profit-by-product": rows})
    assert ctx.direct_reply.index("Smokey BBQ") < ctx.direct_reply.index("Fried rice")
    assert "No material cost is recorded for Fried rice" in ctx.direct_reply