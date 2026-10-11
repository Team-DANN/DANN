"""propose_log_batch: prepare a production batch for the person to confirm.

This tool never logs anything. It checks the numbers, resolves the product,
works out what the batch would use, and (if all is well) leaves a signed
proposal in the request context. Only POST /confirm can act on it.
"""

from auth import CurrentUser
from backend_client import BackendClient, BackendError
from confirm import sign_action
from tools.base import Tool, ToolContext, num, text
from tools.fuzzy import resolve
from tools.lookup import MAX_QUERY_CHARS, compact_product

MAX_QUANTITY = 1_000_000
MAX_COST = 1_000_000_000
BIG_BATCH_FACTOR = 5  # warn when a batch is this many times the largest recent one
BIG_BATCH_MIN = 1000  # ... or this big when there is no history to compare with
EPSILON = 1e-9


def _number(value):
    """A real number, or a numeric string such as "40" or "1,200". Not a bool."""
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        value = value.replace(",", "").strip()
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if n == n and n not in (float("inf"), float("-inf")) else None


def _fmt(value) -> str:
    n = float(value)
    return str(int(n)) if n == int(n) else f"{n:g}"


def _optional_cost(value):
    """(ok, number or None). Missing or blank is fine and means None."""
    if value is None or value == "":
        return True, None
    n = _number(value)
    if n is None or n < 0 or n > MAX_COST:
        return False, None
    return True, round(n, 4)


async def _large_batch_warning(backend, user, product_id, quantity, unit):
    try:
        body = await backend.get("/api/batches", token=user.token)
    except BackendError:
        return None  # a warning is a courtesy; never block on it
    rows = body.get("data") if isinstance(body.get("data"), list) else []
    previous = [
        q
        for r in rows
        if isinstance(r, dict) and r.get("product_id") == product_id
        for q in [_number(r.get("quantity_produced"))]
        if q
    ]
    if previous:
        largest = max(previous)
        if quantity >= BIG_BATCH_FACTOR * largest:
            return f"That is {quantity / largest:.0f} times your largest recent batch ({_fmt(largest)} {unit})."
        return None
    if quantity >= BIG_BATCH_MIN:
        return f"That is a very large batch ({_fmt(quantity)} {unit})."
    return None


async def propose_log_batch(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
    mention = text(args.get("product"), MAX_QUERY_CHARS)
    if not mention:
        return {"error": "product is required. Ask which product was made."}

    quantity = _number(args.get("quantity"))
    if quantity is None or quantity <= 0 or quantity > MAX_QUANTITY:
        return {"error": "quantity must be a number above 0 and at most 1,000,000. Ask how many were made."}
    quantity = round(quantity, 4)

    ok, labor = _optional_cost(args.get("labor_cost"))
    if not ok:
        return {"error": "labor_cost must be a number of 0 or more. Ask for it, or leave it out."}
    ok, manual = _optional_cost(args.get("manual_material_cost"))
    if not ok:
        return {"error": "manual_material_cost must be a number of 0 or more."}

    if not ctx.secret:
        return {"error": "Actions are not switched on in this version."}
    if ctx.proposals:
        return {"error": "Another action is already waiting for confirmation. Ask the person to confirm or cancel it first."}

    body = await backend.get("/api/products", token=user.token)
    rows = body.get("data")
    if not isinstance(rows, list):
        return {"error": "The DANN server sent an unexpected response."}
    raw_by_id = {(r.get("product_id") or r.get("id")): r for r in rows if isinstance(r, dict)}
    items = [compact_product(r) for r in rows if isinstance(r, dict)]
    items = [i for i in items if i["id"] and i["name"]]

    found = resolve(mention, items)
    if found.status == "ambiguous":
        return {
            "status": "ambiguous",
            "matches": [{"name": m["name"], "unit": m["unit"]} for m in found.matches],
        }
    if found.status == "none":
        return {"status": "none"}

    product = found.matches[0]
    product_id, name, unit = product["id"], product["name"], product["unit"]
    recipe = [line for line in (raw_by_id[product_id].get("recipe") or []) if isinstance(line, dict)]

    uses: list[dict] = []
    shortages: list[dict] = []
    if recipe:
        mats = await backend.get("/api/materials", token=user.token)
        mat_rows = mats.get("data") if isinstance(mats.get("data"), list) else []
        stock = {(m.get("material_id") or m.get("id")): m for m in mat_rows if isinstance(m, dict)}
        for line in recipe:
            per_unit = _number(line.get("quantity_per_unit"))
            material = stock.get(line.get("material_id"))
            have = _number(material.get("current_stock")) if material else None
            if per_unit is None or have is None:
                return {"error": "A material in this recipe could not be read, so nothing was prepared."}
            need = per_unit * quantity
            m_name, m_unit = text(line.get("material_name")), text(line.get("material_unit"), 20)
            uses.append(
                {"material": m_name, "amount": round(need, 4), "unit": m_unit, "left_after": round(have - need, 4)}
            )
            if need > have + EPSILON:
                shortages.append({"material": m_name, "need": round(need, 4), "have": round(have, 4), "unit": m_unit})
        if shortages:
            return {"status": "shortage", "shortages": shortages}
        manual = None  # Node ignores a manual cost when there is a recipe

    warnings: list[str] = []
    if not recipe:
        warnings.append("This product has no recipe, so no materials will be deducted from stock.")
    big = await _large_batch_warning(backend, user, product_id, quantity, unit)
    if big:
        warnings.append(big)

    signed = {
        "product_id": product_id,
        "product_name": name,
        "unit": unit,
        "quantity": quantity,
        "labor_cost": labor or 0,
    }
    if manual is not None:
        signed["manual_material_cost"] = manual
    token, payload = sign_action(
        ctx.secret,
        user_id=user.user_id,
        business_id=user.business_id,
        tool="log_batch",
        args=signed,
        ttl_seconds=ctx.ttl_seconds,
    )

    summary = f"Log a batch of {name}: {_fmt(quantity)} {unit}".rstrip()
    if labor:
        summary += f", labor {user.currency}{_fmt(labor)}"
    summary += "."
    ctx.proposals.append(
        {
            "summary": summary,
            "lines": uses,
            "warnings": warnings,
            "token": token,
            "expires_at": payload["exp"],
        }
    )
    # The model sees what was prepared, never the token.
    return {
        "status": "proposal_ready",
        "summary": summary,
        "uses": [{"material": u["material"], "amount": u["amount"], "unit": u["unit"]} for u in uses],
        "warnings": warnings,
    }


PROPOSE_LOG_BATCH = Tool(
    name="propose_log_batch",
    description=(
        "Prepare a production batch for the person to confirm. This does NOT log anything: "
        "the person must press Confirm in the app. Use it when they say they made or produced something."
    ),
    parameters={
        "type": "object",
        "properties": {
            "product": {"type": "string", "description": "The product name exactly as the person typed it."},
            "quantity": {"type": "number", "description": "How many were made, as a number."},
            "labor_cost": {"type": "number", "description": "Labor cost for the batch. Only if the person gave it."},
            "manual_material_cost": {
                "type": "number",
                "description": "Material cost, only for a product with no recipe and only if the person gave it.",
            },
        },
        "required": ["product", "quantity"],
    },
    modules=("production",),
    kind="write",
    handler=propose_log_batch,
)