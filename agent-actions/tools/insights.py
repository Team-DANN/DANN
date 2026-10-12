"""get_business_data: one read tool for stock, profit and similar questions.

The answer is written here, in code, from Node's own endpoints, so the model
is called once (to pick the topic) and never reads or rewrites the numbers.
"""

from tools.base import Tool, ToolContext, num, text
from tools.batch import _fmt
from tools.lookup import _compact_material, compact_product
from tools.material import _money

MAX_LINES = 12
MAX_TREND_PERCENT = 500  # a bigger trend is a tiny-base artefact, not news


def _rows(body):
    data = body.get("data")
    return [r for r in data if isinstance(r, dict)] if isinstance(data, list) else None


def _more(total: int) -> list[str]:
    return [f"- and {total - MAX_LINES} more"] if total > MAX_LINES else []


async def _stock(user, backend):
    products = _rows(await backend.get("/api/products", token=user.token))
    materials = _rows(await backend.get("/api/materials", token=user.token))
    if products is None or materials is None:
        return None
    prods = [p for p in map(compact_product, products) if p["name"]]
    mats = [m for m in map(_compact_material, materials) if m["name"]]

    lines = ["Finished goods:"]
    lines += [f"- {p['name']}: {_fmt(p['finished_stock'] or 0)} {p['unit']}" for p in prods[:MAX_LINES]]
    lines += _more(len(prods)) if prods else ["- none yet"]
    lines.append("Raw materials:")
    for m in mats[:MAX_LINES]:
        low = bool(m["reorder_threshold"]) and (m["stock"] or 0) <= m["reorder_threshold"]
        lines.append(f"- {m['name']}: {_fmt(m['stock'] or 0)} {m['unit']}" + (" (low)" if low else ""))
    lines += _more(len(mats)) if mats else ["- none yet"]
    return "\n".join(lines)


async def _low_stock(user, backend):
    rows = _rows(await backend.get("/api/materials/low-stock", token=user.token))
    if rows is None:
        return None
    mats = [m for m in map(_compact_material, rows) if m["name"]]
    if not mats:
        return "Nothing is at or below its reorder level."
    lines = [f"Low on stock ({len(mats)}):"]
    for m in mats[:MAX_LINES]:
        t = m["reorder_threshold"]
        lines.append(f"- {m['name']}: {_fmt(m['stock'] or 0)} {m['unit']}" + (f" (reorder at {_fmt(t)})" if t else ""))
    return "\n".join(lines + _more(len(mats)))


async def _profit(user, backend):
    data = (await backend.get("/api/reports/profit-summary", token=user.token)).get("data")
    if not isinstance(data, dict):
        return None
    revenue, cost, net = (num(data.get(k)) for k in ("total_revenue", "total_cost", "net_profit"))
    if revenue is None or cost is None or net is None:
        return None
    cur = user.currency
    out = [f"Revenue {_money(cur, revenue)}, costs {_money(cur, cost)}, net profit {_money(cur, net)}."]
    margin = num(data.get("profit_margin_percent"))
    if margin is not None:
        out.append(f"Profit margin: {_fmt(margin)}%.")
    orders, batches = num(data.get("total_orders")), num(data.get("total_batches"))
    if orders is not None and batches is not None:
        out.append(f"Based on {_fmt(orders)} orders and {_fmt(batches)} batches.")
    trend = num(data.get("revenue_trend_percent"))
    if trend is not None and abs(trend) <= MAX_TREND_PERCENT:
        out.append(f"Revenue trend: {_fmt(trend)}%.")
    return " ".join(out)


async def _top_products(user, backend):
    rows = _rows(await backend.get("/api/reports/profit-by-product", token=user.token))
    if rows is None:
        return None
    items = [r for r in rows if text(r.get("name")) and num(r.get("profit")) is not None]
    if not items:
        return "There are no sales or production to report on yet."
    items.sort(key=lambda r: num(r.get("profit")), reverse=True)
    cur = user.currency
    lines = ["Top products by profit:"]
    no_cost = []
    for r in items[:3]:
        name = text(r.get("name"))
        qty = num(r.get("qty")) or 0
        lines.append(f"- {name}: {_money(cur, num(r['profit']))} profit, {_fmt(qty)} sold")
        if (num(r.get("cost")) or 0) == 0 and qty > 0:
            no_cost.append(name)
    if no_cost:
        lines.append(f"No material cost is recorded for {', '.join(no_cost)}, so the profit shown looks higher than it is.")
    return "\n".join(lines)


TOPICS = {"stock": _stock, "low_stock": _low_stock, "profit": _profit, "top_products": _top_products}


async def handler(user, backend, args: dict, ctx: ToolContext) -> dict:
    topic = text(args.get("topic"), 30).lower()
    fn = TOPICS.get(topic)
    if fn is None:
        return {"error": "Unknown topic. Use one of: " + ", ".join(TOPICS) + "."}
    reply = await fn(user, backend)
    if not reply:
        return {"error": "The DANN server sent an unexpected response."}
    ctx.direct_reply = reply  # the agent returns this as is: no second model call
    return {"status": "ok", "text": reply}


GET_BUSINESS_DATA = Tool(
    name="get_business_data",
    description="Business report. Topics: stock, low_stock, profit, top_products. Use for any such question.",
    parameters={
        "type": "object",
        "properties": {"topic": {"type": "string", "enum": list(TOPICS)}},
        "required": ["topic"],
    },
    modules=("finance", "inventory", "production"),
    kind="read",
    handler=handler,
)