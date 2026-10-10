"""propose_restock: prepare a raw-material purchase for the person to confirm.

This tool never changes stock. It checks the numbers, resolves the material,
works out the stock and unit cost after the purchase (the same weighted
average Node uses), and leaves a signed proposal in the request context.
Only POST /confirm can act on it.

Node's `cost` is the TOTAL paid for the quantity added, not a price per unit.
The model may pass either figure; the server does the arithmetic.
"""

from auth import CurrentUser
from backend_client import BackendClient
from confirm import sign_action
from tools.base import Tool, ToolContext, text
from tools.batch import MAX_COST, MAX_QUANTITY, _fmt, _number, _optional_cost
from tools.fuzzy import resolve
from tools.lookup import MAX_QUERY_CHARS, _compact_material

BIG_RESTOCK_FACTOR = 10  # warn when a purchase is this many times current stock or reorder level
BIG_RESTOCK_MIN = 1000  # ... or this big when there is nothing to compare with
PRICE_SWING = 3  # warn when the implied price is this many times above or below the average


def _money(currency: str, value: float) -> str:
    return f"{currency}{value:,.2f}"


async def propose_restock(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
    mention = text(args.get("material"), MAX_QUERY_CHARS)
    if not mention:
        return {"error": "material is required. Ask which material was bought."}

    quantity = _number(args.get("quantity"))
    if quantity is None or quantity <= 0 or quantity > MAX_QUANTITY:
        return {
            "error": "quantity must be a number above 0 and at most 1,000,000, in the material's own unit. "
            "Ask how much was bought."
        }
    quantity = round(quantity, 4)

    ok, total = _optional_cost(args.get("total_cost"))
    if not ok:
        return {"error": "total_cost must be a number of 0 or more. Ask for it, or leave it out."}
    ok, price = _optional_cost(args.get("unit_price"))
    if not ok:
        return {"error": "unit_price must be a number of 0 or more. Ask for it, or leave it out."}
    if total is not None and price is not None:
        return {"error": "Give either total_cost or unit_price, not both. Ask which one the person means."}
    if price is not None:
        total = round(quantity * price, 2)
    total = float(total or 0)
    if total > MAX_COST:
        return {"error": "That cost is too large to be right. Ask the person to check the amount."}

    if not ctx.secret:
        return {"error": "Actions are not switched on in this version."}
    if ctx.proposals:
        return {"error": "Another action is already waiting for confirmation. Ask the person to confirm or cancel it first."}

    body = await backend.get("/api/materials", token=user.token)
    rows = body.get("data")
    if not isinstance(rows, list):
        return {"error": "The DANN server sent an unexpected response."}
    items = [_compact_material(r) for r in rows if isinstance(r, dict)]
    items = [i for i in items if i["id"] and i["name"]]

    found = resolve(mention, items)
    if found.status == "ambiguous":
        return {
            "status": "ambiguous",
            "matches": [{"name": m["name"], "unit": m["unit"]} for m in found.matches],
        }
    if found.status == "none":
        return {"status": "none"}

    material = found.matches[0]
    material_id, name, unit = material["id"], material["name"], material["unit"]
    have = material["stock"]
    if have is None:
        return {"error": "The current stock of this material could not be read, so nothing was prepared."}
    current_cost = float(material["unit_cost"] or 0)
    reorder = float(material["reorder_threshold"] or 0)
    cur = user.currency

    # Same formula as Node's recordRestock: a weighted average, only when a cost is given.
    new_stock = have + quantity
    if total > 0 and new_stock > 0:
        new_cost = (have * current_cost + total) / new_stock
    else:
        new_cost = current_cost

    warnings: list[str] = []
    if total <= 0:
        warnings.append(f"No cost was given, so the unit cost stays at {_money(cur, current_cost)} per {unit}.")
    elif current_cost > 0:
        implied = total / quantity
        if implied >= PRICE_SWING * current_cost or implied <= current_cost / PRICE_SWING:
            warnings.append(
                f"That works out to {_money(cur, implied)} per {unit}, against your current average of "
                f"{_money(cur, current_cost)}. Check the amount."
            )
    reference = max(have, reorder)
    if reference > 0:
        if quantity >= BIG_RESTOCK_FACTOR * reference:
            warnings.append(
                f"That is {quantity / reference:.0f} times your current stock or reorder level "
                f"({_fmt(reference)} {unit})."
            )
    elif quantity >= BIG_RESTOCK_MIN:
        warnings.append(f"That is a very large purchase ({_fmt(quantity)} {unit}).")

    signed = {
        "material_id": material_id,
        "material_name": name,
        "unit": unit,
        "quantity": quantity,
        "cost": total,
    }
    token, payload = sign_action(
        ctx.secret,
        user_id=user.user_id,
        business_id=user.business_id,
        tool="restock",
        args=signed,
        ttl_seconds=ctx.ttl_seconds,
    )

    summary = f"Restock {name}: add {_fmt(quantity)} {unit}".rstrip()
    if total > 0:
        summary += f" for {_money(cur, total)}"
    summary += "."
    lines = [
        {"label": "Stock", "before": have, "after": round(new_stock, 4), "unit": unit},
        {"label": "Unit cost", "before": round(current_cost, 4), "after": round(new_cost, 4), "unit": f"{cur} per {unit}"},
    ]
    ctx.proposals.append(
        {
            "tool": "restock",
            "undoable": False,
            "summary": summary,
            "lines": lines,
            "warnings": warnings,
            "token": token,
            "expires_at": payload["exp"],
        }
    )
    # The model sees what was prepared, never the token.
    return {
        "status": "proposal_ready",
        "summary": summary,
        "stock_after": round(new_stock, 4),
        "unit_cost_after": round(new_cost, 4),
        "warnings": warnings,
    }


PROPOSE_RESTOCK = Tool(
    name="propose_restock",
    description=(
        "Prepare a restock (a purchase of raw material) for the person to confirm. This does NOT change stock: "
        "the person must press Confirm in the app. Use it when they say they bought, received or restocked a material. "
        "The quantity is in the material's own unit; if they use another unit (bags, sacks, boxes), ask how many of the "
        "material's unit that is. Pass total_cost if they gave the total paid, or unit_price if they gave a price per "
        "unit, never both, and never guess a cost."
    ),
    parameters={
        "type": "object",
        "properties": {
            "material": {"type": "string", "description": "The material name exactly as the person typed it."},
            "quantity": {"type": "number", "description": "How much was bought, in the material's own unit."},
            "total_cost": {"type": "number", "description": "The total paid for the whole quantity. Only if the person gave it."},
            "unit_price": {"type": "number", "description": "The price per unit. Only if the person gave it."},
        },
        "required": ["material", "quantity"],
    },
    modules=("inventory",),
    kind="write",
    handler=propose_restock,
)