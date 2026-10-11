"""propose_create_material: prepare a new raw material for the person to confirm.

This tool never creates anything. It checks the fields, refuses a name that is
a near-duplicate of an existing material (Node does not check names, so this is
the only guard), and leaves a signed proposal in the request context. Only
POST /confirm can act on it.

`price_per_unit` is the price of ONE unit. Restock's `cost` is a total, so the
two fields have different names on purpose.
"""

from rapidfuzz import fuzz

from auth import CurrentUser
from backend_client import BackendClient
from confirm import sign_action
from tools.base import Tool, ToolContext, text
from tools.batch import MAX_COST, MAX_QUANTITY, _fmt, _number
from tools.fuzzy import normalize
from tools.lookup import _compact_material

MAX_NAME_CHARS = 80
MAX_UNIT_CHARS = 20
# A near-duplicate is a typo, a plural or the same words in another order. It is NOT
# "contains the same word": "Sugar Syrup" must be creatable next to "Sugar".
DUPLICATE_SCORE = 85


def _money(currency: str, value: float) -> str:
    return f"{currency}{value:,.2f}"


def _one_line(value) -> str:
    return " ".join(str(value or "").split())


def _optional_amount(value, limit: float) -> tuple[bool, float | None]:
    """(ok, value). Missing is fine (None); a bad or out-of-range number is not."""
    if value is None or (isinstance(value, str) and not value.strip()):
        return True, None
    n = _number(value)
    if n is None or n < 0 or n > limit:
        return False, None
    return True, round(n, 4)


def _near_duplicate(name: str, items: list[dict]) -> dict | None:
    q = normalize(name)
    best, best_score = None, 0.0
    for item in items:
        other = normalize(item["name"])
        if not other:
            continue
        score = 100.0 if other == q else float(fuzz.token_sort_ratio(q, other))
        if score > best_score:
            best, best_score = item, score
    return best if best_score >= DUPLICATE_SCORE else None


async def propose_create_material(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
    name = _one_line(args.get("name"))
    if not name:
        return {"error": "name is required. Ask what the new material is called."}
    if len(name) > MAX_NAME_CHARS:
        return {"error": f"The name is too long (more than {MAX_NAME_CHARS} characters). Ask for a shorter one."}
    unit = _one_line(args.get("unit"))
    if not unit:
        return {"error": "unit is required. Ask which unit it is measured in (for example kg, g, litres, pieces)."}
    if len(unit) > MAX_UNIT_CHARS:
        return {"error": "The unit is too long. Ask for a short unit such as kg, g, L or pieces."}

    ok, price = _optional_amount(args.get("price_per_unit"), MAX_COST)
    if not ok:
        return {"error": "price_per_unit must be a number of 0 or more (the price of ONE unit). Ask for it, or leave it out."}
    ok, stock = _optional_amount(args.get("opening_stock"), MAX_QUANTITY)
    if not ok:
        return {"error": "opening_stock must be a number of 0 or more. Ask for it, or leave it out."}
    ok, reorder = _optional_amount(args.get("reorder_level"), MAX_QUANTITY)
    if not ok:
        return {"error": "reorder_level must be a number of 0 or more. Ask for it, or leave it out."}
    price, stock, reorder = price or 0.0, stock or 0.0, reorder or 0.0
    supplier = text(args.get("supplier"), MAX_NAME_CHARS)

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

    existing = _near_duplicate(name, items)
    if existing:
        return {
            "status": "duplicate",
            "existing": {"name": existing["name"], "unit": existing["unit"], "stock": existing["stock"]},
        }

    cur = user.currency
    warnings: list[str] = []
    if stock > 0 and price == 0:
        warnings.append(
            "No price per unit was given, so the unit cost is 0 and this opening stock counts as free "
            "in cost calculations."
        )

    signed = {
        "name": name,
        "unit": unit,
        "price_per_unit": price,
        "opening_stock": stock,
        "reorder_level": reorder,
    }
    if supplier:
        signed["supplier"] = supplier
    token, payload = sign_action(
        ctx.secret,
        user_id=user.user_id,
        business_id=user.business_id,
        tool="create_material",
        args=signed,
        ttl_seconds=ctx.ttl_seconds,
    )

    summary = f"Create material {name} ({unit})"
    if stock > 0:
        summary += f", opening stock {_fmt(stock)} {unit}"
    if price > 0:
        summary += f" at {_money(cur, price)} per {unit}"
    summary += "."
    lines = [
        {"label": "Name", "value": name},
        {"label": "Unit", "value": unit},
        {"label": "Opening stock", "value": stock, "unit": unit},
        {"label": "Price per unit", "value": price, "unit": f"{cur} per {unit}"},
        {"label": "Reorder level", "value": reorder, "unit": unit},
    ]
    if supplier:
        lines.append({"label": "Supplier", "value": supplier})
    ctx.proposals.append(
        {
            "tool": "create_material",
            "undoable": True,
            "summary": summary,
            "lines": lines,
            "warnings": warnings,
            "token": token,
            "expires_at": payload["exp"],
        }
    )
    # The model sees what was prepared, never the token.
    return {"status": "proposal_ready", "summary": summary, "warnings": warnings}


PROPOSE_CREATE_MATERIAL = Tool(
    name="propose_create_material",
    description=(
        "Prepare a NEW raw material for the person to confirm. This does NOT create anything: the person must press "
        "Confirm in the app. Use it only when they want to add a material that is not in DANN yet. name and unit are "
        "required (ask if the unit is missing). Pass opening_stock only if they said how much they have now, "
        "price_per_unit only if they gave the price of ONE unit (never a total), reorder_level only if they gave one, "
        "and supplier only if they named one. Never guess any of these."
    ),
    parameters={
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "The new material's name as the person typed it."},
            "unit": {"type": "string", "description": "The unit it is measured in, for example kg, g, L, pieces."},
            "opening_stock": {"type": "number", "description": "How much they have now. Only if they said."},
            "price_per_unit": {"type": "number", "description": "The price of one unit. Only if they said."},
            "reorder_level": {"type": "number", "description": "The stock level that should trigger a low-stock alert. Only if they said."},
            "supplier": {"type": "string", "description": "The supplier's name. Only if they said."},
        },
        "required": ["name", "unit"],
    },
    modules=("inventory", "production"),
    kind="write",
    handler=propose_create_material,
)