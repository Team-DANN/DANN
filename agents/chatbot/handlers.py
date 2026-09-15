"""
Maps a classified intent to a live data lookup + templated response.
Reuses the same BusinessSnapshot insights/engine.py consumes, so the
chatbot and the insight digest never disagree on the underlying numbers.

Each handler checks for a matched entity (a specific material/product/
retailer the message named) and answers about that item specifically —
falling back to a general summary only when nothing specific was named.
Never assumes particular items exist; entities always come from this
business's own live snapshot data.
"""

from insights.engine import generate_insights
from insights.snapshot import BusinessSnapshot, build_snapshot
from nlg.templates import format_currency, format_days, FALLBACK_RESPONSE


def _find_material(snapshot: BusinessSnapshot, entity_id) -> dict | None:
    return next(
        (m for m in snapshot.materials if m.get("material_id", m.get("id")) == entity_id),
        None,
    )


def _find_product(snapshot: BusinessSnapshot, entity_id) -> dict | None:
    return next(
        (p for p in snapshot.products if p.get("product_id", p.get("id")) == entity_id),
        None,
    )


def _find_product_profit(snapshot: BusinessSnapshot, entity_id) -> dict | None:
    return next(
        (p for p in snapshot.profit_by_product if p.get("productId") == entity_id),
        None,
    )


def handle_runway_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    material_entities = [e for e in (entities or []) if e["type"] == "material"]
    if material_entities:
        lines = []
        for e in material_entities:
            m = _find_material(snapshot, e["id"])
            if not m:
                continue
            stock = m.get("qtyOnHand", m.get("current_stock", 0))
            unit = m.get("unit", "")
            avg_daily = m.get("avgDailyConsumption") or 0
            if avg_daily > 0:
                days = stock / avg_daily
                lines.append(f"{m['name']}: {stock} {unit} on hand — about {format_days(days)} left at current usage.")
            else:
                lines.append(f"{m['name']}: {stock} {unit} on hand — not enough usage history yet to estimate runway.")
        if lines:
            return "\n".join(lines)

    low = []
    for m in snapshot.materials:
        avg_daily = m.get("avgDailyConsumption") or 0
        stock = m.get("qtyOnHand", m.get("current_stock", 0))
        if avg_daily > 0:
            days = stock / avg_daily
            if days <= 7:
                low.append((m["name"], days))
    if not low:
        return "Nothing is running critically low right now — all materials look healthy."
    low.sort(key=lambda x: x[1])
    lines = [f"{name}: about {format_days(days)} left" for name, days in low[:5]]
    return "Here's what's running low:\n" + "\n".join(lines)


def handle_reorder_suggestions(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    below_threshold = [
        m for m in snapshot.materials
        if m.get("qtyOnHand", m.get("current_stock", 0)) <= m.get("reorder_threshold", 0)
    ]
    if not below_threshold:
        return "Nothing needs reordering right now — all materials are above their reorder threshold."
    lines = [
        f"{m['name']}: {m.get('qtyOnHand', m.get('current_stock', 0))} {m.get('unit', '')} on hand "
        f"(threshold: {m.get('reorder_threshold', 0)} {m.get('unit', '')})"
        for m in below_threshold[:8]
    ]
    return "You should consider reordering:\n" + "\n".join(lines)


def handle_product_stock_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    product_entities = [e for e in (entities or []) if e["type"] == "product"]
    if product_entities:
        lines = []
        for e in product_entities:
            p = _find_product(snapshot, e["id"])
            if not p:
                continue
            stock = p.get("current_stock", 0)
            unit = p.get("unit", "piece")
            lines.append(f"{p['name']}: {stock} {unit} in stock.")
        if lines:
            return "\n".join(lines)

    active_products = [p for p in snapshot.products if p.get("active", True)]
    if not active_products:
        return "No products found."
    low_stock = sorted(active_products, key=lambda p: p.get("current_stock", 0))[:5]
    lines = [f"{p['name']}: {p.get('current_stock', 0)} {p.get('unit', 'piece')}" for p in low_stock]
    return "Finished goods stock:\n" + "\n".join(lines)


def handle_production_status(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    product_entities = [e for e in (entities or []) if e["type"] == "product"]
    batches = snapshot.batches
    if product_entities:
        wanted_ids = {e["id"] for e in product_entities}
        batches = [b for b in batches if b.get("product_id") in wanted_ids]
        if not batches:
            names = ", ".join(e["name"] for e in product_entities)
            return f"No production batches logged yet for {names}."

    if not batches:
        return "No production batches logged yet."
    recent = batches[:5]
    lines = [
        f"{b.get('product_name', 'Unknown product')}: {b.get('quantity_produced')} units on "
        f"{str(b.get('produced_at'))[:10]}"
        for b in recent
    ]
    return "Recent production:\n" + "\n".join(lines)


def handle_recipe_cost_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    product_entities = [e for e in (entities or []) if e["type"] == "product"]
    if product_entities:
        lines = []
        for e in product_entities:
            p = _find_product(snapshot, e["id"])
            if not p:
                continue
            cost = p.get("cost_per_unit", 0)
            price = p.get("selling_price", 0)
            lines.append(
                f"{p['name']}: costs {format_currency(cost, snapshot.currency)} per unit to make, "
                f"sells for {format_currency(price, snapshot.currency)}."
            )
        if lines:
            return "\n".join(lines)
    return "Tell me which product you'd like a cost breakdown for."


def handle_dispatch_status(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    retailer_entities = [e for e in (entities or []) if e["type"] == "retailer"]
    if retailer_entities:
        wanted_ids = {e["id"] for e in retailer_entities}
        matches = [r for r in snapshot.unpaid_by_retailer if r.get("retailer_id") in wanted_ids]
        if matches:
            lines = [
                f"{r['retailer_name']}: owes {format_currency(r['total_owed'], snapshot.currency)} "
                f"across {r['unpaid_orders_count']} order(s)"
                for r in matches
            ]
            return "\n".join(lines)
        names = ", ".join(e["name"] for e in retailer_entities)
        return f"{names} has no outstanding balance right now."

    if snapshot.overdue_orders:
        total = sum(o["total_amount"] - o["amount_paid"] for o in snapshot.overdue_orders)
        return f"{len(snapshot.overdue_orders)} order(s) are overdue, totaling {format_currency(total, snapshot.currency)}."
    total_owed = snapshot.receivables_total.get("amount", 0)
    if total_owed > 0:
        return f"No overdue orders, but {format_currency(total_owed, snapshot.currency)} is still outstanding overall."
    return "All dispatches are paid up — nothing outstanding."


def handle_revenue_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    revenue = snapshot.profit_summary.get("total_revenue", 0)
    orders = snapshot.profit_summary.get("total_orders", 0)
    if revenue == 0:
        return "No revenue recorded yet for this period."
    return f"Total revenue: {format_currency(revenue, snapshot.currency)} across {orders} order(s)."


def handle_profitability_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    product_entities = [e for e in (entities or []) if e["type"] == "product"]
    if product_entities:
        lines = []
        for e in product_entities:
            p = _find_product_profit(snapshot, e["id"])
            if not p:
                lines.append(f"{e['name']}: no sales recorded in this period.")
                continue
            lines.append(
                f"{p['name']}: {format_currency(p['profit'], snapshot.currency)} gross material profit "
                f"on {p['qty']} units sold."
            )
        if lines:
            return "\n".join(lines)

    products = [p for p in snapshot.profit_by_product if p.get("revenue", 0) > 0]
    if not products:
        return "No sales recorded in this period yet to calculate profitability."
    best = max(products, key=lambda p: p["profit"])
    worst = min(products, key=lambda p: p["profit"])
    if best is worst:
        return f"{best['name']} is your only product with sales this period, at {format_currency(best['profit'], snapshot.currency)} profit."
    return (
        f"{best['name']} is your top performer ({format_currency(best['profit'], snapshot.currency)} profit). "
        f"{worst['name']} is your weakest ({format_currency(worst['profit'], snapshot.currency)} profit)."
    )


def handle_alerts_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    insights = generate_insights(snapshot)
    if not insights:
        return "Nothing needs your attention right now — everything looks healthy."
    lines = [f"[{i.severity.upper()}] {i.message}" for i in insights[:5]]
    return "Here's what needs attention:\n" + "\n".join(lines)


def handle_capability_check(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    return (
        "I can help with: material runway and what's running low, what to reorder, "
        "finished product stock, production batches and costs, dispatch and overdue "
        "payments, revenue, and profitability by product. Just ask, and name a specific "
        "product or material if you want details on that one."
    )


def handle_greeting(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    return "Hey! Ask me about your material runway, production, dispatches, or profit."


def handle_farewell(snapshot: BusinessSnapshot, entities: list[dict] | None = None) -> str:
    return "You're welcome — let me know if you need anything else."


HANDLERS = {
    "runway_check": handle_runway_check,
    "reorder_suggestions": handle_reorder_suggestions,
    "product_stock_check": handle_product_stock_check,
    "production_status": handle_production_status,
    "recipe_cost_check": handle_recipe_cost_check,
    "dispatch_status": handle_dispatch_status,
    "revenue_check": handle_revenue_check,
    "profitability_check": handle_profitability_check,
    "alerts_check": handle_alerts_check,
    "capability_check": handle_capability_check,
    "greeting": handle_greeting,
    "farewell": handle_farewell,
}


async def get_chatbot_response(message: str, token: str) -> str:
    from chatbot.classifier import classify
    from chatbot.entities import build_entity_index, match_entities

    intent, score = classify(message)
    if intent is None:
        return FALLBACK_RESPONSE

    snapshot = await build_snapshot(token)
    handler = HANDLERS.get(intent)
    if handler is None:
        return FALLBACK_RESPONSE

    index = build_entity_index(snapshot)
    entities = match_entities(message, index)

    return handler(snapshot, entities)