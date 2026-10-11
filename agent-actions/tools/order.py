"""propose_create_order: prepare an order (a dispatch to a retailer) for the person to confirm.

This tool never records anything. It resolves the retailer and the product,
checks the finished stock, works out the order total from the product's selling
price in DANN (the same multiplication Node does) and what is still owed, and
leaves a signed proposal in the request context. Only POST /confirm can act on it.

An order deducts finished stock and has no undo, so the checks here are
strict: a payment above the total is refused, and an identical order recorded
a few minutes ago is flagged.

A retailer that is not in DANN can be added in the same action: the model passes
new_retailer true (only after the person agreed). The name is then checked
against the existing retailers with the same near-duplicate rule as new
materials, and the proposal says plainly that a retailer will be added.
"""

from datetime import datetime, timezone
from urllib.parse import quote

from auth import CurrentUser
from backend_client import BackendClient, BackendError
from confirm import sign_action
from tools.base import Tool, ToolContext, text
from tools.batch import MAX_QUANTITY, _fmt, _number, _optional_cost
from tools.fuzzy import normalize, resolve
from tools.lookup import MAX_QUERY_CHARS, _compact_retailer, compact_product
from tools.material import _near_duplicate

EPSILON = 1e-9
RECENT_ORDER_MINUTES = 10  # an identical order this recent is probably a double entry
MAX_CREDIT_TERMS_CHARS = 60


def _money(currency: str, value: float) -> str:
    return f"{currency}{value:,.2f}"


def _parse_time(value):
    """An ISO timestamp from Node as an aware datetime, or None. A naive one is taken as UTC."""
    if not isinstance(value, str):
        return None
    try:
        when = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return when if when.tzinfo else when.replace(tzinfo=timezone.utc)


async def _recent_duplicate(backend, user, retailer_id, product_id, quantity):
    try:
        body = await backend.get(f"/api/orders?retailer_id={quote(str(retailer_id), safe='')}", token=user.token)
    except BackendError:
        return None  # a warning is a courtesy; never block on it
    rows = body.get("data") if isinstance(body.get("data"), list) else []
    now = datetime.now(timezone.utc)
    for row in rows:
        if not isinstance(row, dict) or row.get("product_id") != product_id:
            continue
        q = _number(row.get("quantity"))
        when = _parse_time(row.get("dispatched_at"))
        if q is None or when is None or abs(q - quantity) > 1e-6:
            continue
        minutes = (now - when).total_seconds() / 60
        if 0 <= minutes <= RECENT_ORDER_MINUTES:
            n = max(1, round(minutes))
            return (
                f"An identical order for this retailer was recorded {n} minute{'s' if n != 1 else ''} ago. "
                "Check it is not a duplicate."
            )
    return None


async def propose_create_order(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
    retailer_mention = text(args.get("retailer"), MAX_QUERY_CHARS)
    if not retailer_mention:
        return {"error": "retailer is required. Ask which retailer the order is for."}
    product_mention = text(args.get("product"), MAX_QUERY_CHARS)
    if not product_mention:
        return {"error": "product is required. Ask which product was sold."}

    quantity = _number(args.get("quantity"))
    if quantity is None or quantity <= 0 or quantity > MAX_QUANTITY:
        return {
            "error": "quantity must be a number above 0 and at most 1,000,000, in the product's own unit. "
            "Ask how many were sold."
        }
    quantity = round(quantity, 4)

    ok, paid = _optional_cost(args.get("amount_paid"))
    if not ok:
        return {"error": "amount_paid must be a number of 0 or more. Ask for it, or leave it out."}
    paid_in_full = args.get("paid_in_full") is True
    if paid_in_full and paid is not None:
        return {"error": "Give either amount_paid or paid_in_full, not both. Ask which the person means."}

    # Only a real JSON true asks for a new retailer; "yes" or 1 does not.
    wants_new = args.get("new_retailer") is True
    new_name = " ".join(retailer_mention.split())
    credit_terms = text(args.get("credit_terms"), MAX_CREDIT_TERMS_CHARS) or None
    if wants_new and len(normalize(new_name)) < 2:
        return {"error": "That is not a usable retailer name. Ask for the retailer's name."}

    if not ctx.secret:
        return {"error": "Actions are not switched on in this version."}
    if ctx.proposals:
        return {"error": "Another action is already waiting for confirmation. Ask the person to confirm or cancel it first."}

    body = await backend.get("/api/retailers", token=user.token)
    rows = body.get("data")
    if not isinstance(rows, list):
        return {"error": "The DANN server sent an unexpected response."}
    retailers = [_compact_retailer(r) for r in rows if isinstance(r, dict)]
    retailers = [r for r in retailers if r["id"] and r["name"]]

    retailer = None  # None means "a new retailer will be added"
    if wants_new:
        existing = _near_duplicate(new_name, retailers)
        if existing:
            return {"status": "duplicate", "which": "retailer", "existing": {"name": existing["name"]}}
    else:
        found = resolve(retailer_mention, retailers)
        if found.status == "ambiguous":
            return {"status": "ambiguous", "which": "retailer", "matches": [{"name": m["name"]} for m in found.matches]}
        if found.status == "none":
            return {"status": "none", "which": "retailer"}
        retailer = found.matches[0]

    body = await backend.get("/api/products", token=user.token)
    rows = body.get("data")
    if not isinstance(rows, list):
        return {"error": "The DANN server sent an unexpected response."}
    raw_by_id = {(r.get("product_id") or r.get("id")): r for r in rows if isinstance(r, dict)}
    products = [compact_product(r) for r in rows if isinstance(r, dict)]
    products = [p for p in products if p["id"] and p["name"]]
    found = resolve(product_mention, products)
    if found.status == "ambiguous":
        return {
            "status": "ambiguous",
            "which": "product",
            "matches": [{"name": m["name"], "unit": m["unit"]} for m in found.matches],
        }
    if found.status == "none":
        return {"status": "none", "which": "product"}
    product = found.matches[0]

    # Exact figures from the raw row (the compact view rounds): Node multiplies these same numbers.
    raw = raw_by_id[product["id"]]
    price = _number(raw.get("selling_price"))
    have = _number(raw.get("current_stock"))
    if price is None or have is None:
        return {"error": "The selling price or stock of this product could not be read, so nothing was prepared."}
    unit = product["unit"]
    cur = user.currency

    if quantity > have + EPSILON:
        return {"status": "shortage", "product": product["name"], "have": have, "need": quantity, "unit": unit}

    total = quantity * price  # the same arithmetic as Node's createOrder
    if paid_in_full:
        paid = total
    paid = float(paid or 0)
    if paid > total + EPSILON:
        return {
            "error": f"The amount paid ({_money(cur, paid)}) is more than the order total ({_money(cur, total)}). "
            "Ask the person to check the amounts."
        }
    owed = round(max(total - paid, 0.0), 2)

    warnings: list[str] = []
    if retailer is None:
        warnings.append(
            f"{new_name} is not in DANN yet. Confirming will add them as a new retailer and record the order."
        )
    if price == 0:
        warnings.append(f"This product has no selling price set, so the order total is {_money(cur, 0)}.")
    if retailer is not None:  # a brand-new retailer has no order history to compare with
        duplicate = await _recent_duplicate(backend, user, retailer["id"], product["id"], quantity)
        if duplicate:
            warnings.append(duplicate)

    signed = {
        "product_id": product["id"],
        "product_name": product["name"],
        "unit": unit,
        "quantity": quantity,
        "amount_paid": paid,
        "stock_before": have,  # for the audit only; Node reads the stock itself
    }
    if retailer is not None:
        signed["retailer_id"] = retailer["id"]
        signed["retailer_name"] = retailer["name"]
    else:
        signed["retailer_name"] = new_name
        signed["new_retailer"] = {"name": new_name, **({"credit_terms": credit_terms} if credit_terms else {})}
    token, payload = sign_action(
        ctx.secret,
        user_id=user.user_id,
        business_id=user.business_id,
        tool="create_order",
        args=signed,
        ttl_seconds=ctx.ttl_seconds,
    )

    stock_after = round(have - quantity, 4)
    qty_text = f"{_fmt(quantity)} {unit}".rstrip()
    who = retailer["name"] if retailer is not None else f"{new_name} (new retailer)"
    summary = f"Order for {who}: {qty_text} of {product['name']}, total {_money(cur, total)}"
    if total > 0 and paid >= total - EPSILON:
        summary += ", paid in full"
    elif paid > 0:
        summary += f", paid {_money(cur, paid)}, owes {_money(cur, owed)}"
    elif total > 0:
        summary += f", nothing paid, owes {_money(cur, total)}"
    summary += "."
    lines = [
        {"label": "Finished stock", "before": have, "after": stock_after, "unit": unit},
        {"label": "Order total", "value": round(total, 2), "unit": cur},
        {"label": "Paid now", "value": round(paid, 2), "unit": cur},
        {"label": "Still owed", "value": owed, "unit": cur},
    ]
    if retailer is None:
        head = [{"label": "New retailer", "value": new_name}]
        if credit_terms:
            head.append({"label": "Credit terms", "value": credit_terms})
        lines = head + lines
    ctx.proposals.append(
        {
            "tool": "create_order",
            "undoable": False,
            "summary": summary,
            "lines": lines,
            "warnings": warnings,
            "token": token,
            "expires_at": payload["exp"],
        }
    )
    # The model sees what was prepared, never the token.
    result = {
        "status": "proposal_ready",
        "summary": summary,
        "total": round(total, 2),
        "paid": round(paid, 2),
        "owed": owed,
        "stock_after": stock_after,
        "warnings": warnings,
    }
    if retailer is None:
        result["new_retailer"] = True
    return result


PROPOSE_CREATE_ORDER = Tool(
    name="propose_create_order",
    description=(
        "Prepare an order (a sale or dispatch of a finished product to a retailer) for the person to confirm. "
        "This does NOT record anything: the person must press Confirm in the app. The quantity is in the product's "
        "own unit. The order total comes from the product's selling price in DANN, so never work it out yourself. "
        "Pass amount_paid only if the person said an amount was paid, or paid_in_full true only if they said the "
        "retailer paid everything; never both and never a guess. Pass neither if nothing was paid. "
        "Pass new_retailer true (with credit_terms only if they gave them) ONLY after a result said the retailer "
        "is not in DANN and the person agreed to add them."
    ),
    parameters={
        "type": "object",
        "properties": {
            "retailer": {"type": "string", "description": "The retailer name exactly as the person typed it."},
            "product": {"type": "string", "description": "The product name exactly as the person typed it."},
            "quantity": {"type": "number", "description": "How many were sold, in the product's own unit."},
            "amount_paid": {"type": "number", "description": "The amount paid now for this order. Only if the person gave one."},
            "paid_in_full": {"type": "boolean", "description": "True only if the person said the retailer paid everything."},
            "new_retailer": {"type": "boolean", "description": "True only to add this retailer to DANN with the order, after the person agreed."},
            "credit_terms": {"type": "string", "description": "The new retailer's credit terms, for example 30 days. Only if they said."},
        },
        "required": ["retailer", "product", "quantity"],
    },
    modules=("orders",),
    kind="write",
    handler=propose_create_order,
)