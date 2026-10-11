"""propose_adjust_stock: prepare a stock correction for the person to confirm.

This tool never changes stock. The person says what they really have on hand;
the server compares that count with the stock Node holds, works out the
difference and leaves a signed proposal in the request context. Only
POST /confirm can act on it.

The count always comes from the person. The model never calculates it from a
loss or a change ("we lost 2 kg"): it asks for the new count instead.

Node's adjust sets the stock to the given number, logs a manual_adjustment
row for the difference and leaves the unit cost alone.
"""

from auth import CurrentUser
from backend_client import BackendClient
from confirm import sign_action
from tools.base import Tool, ToolContext, text
from tools.batch import MAX_QUANTITY, _fmt, _number
from tools.fuzzy import resolve
from tools.lookup import MAX_QUERY_CHARS, _compact_material

BIG_ADJUST_SHARE = 0.5  # warn when the count moves the stock by this share of it, or more
BIG_ADJUST_MIN = 1000  # ... or, when there is no stock to compare with, a count this big


async def propose_adjust_stock(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
    mention = text(args.get("material"), MAX_QUERY_CHARS)
    if not mention:
        return {"error": "material is required. Ask which material to correct."}

    raw = args.get("actual_stock")
    count = _number(raw) if raw is not None else None
    if count is None or count < 0 or count > MAX_QUANTITY:
        return {
            "error": "actual_stock must be a number of 0 or more, in the material's own unit. "
            "Ask the person for the real count on hand now."
        }
    count = round(count, 4)

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

    if round(count, 3) == round(have, 3):
        return {"status": "no_change", "name": name, "stock": have, "unit": unit}

    diff = round(count - have, 4)
    warnings: list[str] = []
    if count == 0:
        warnings.append(f"That sets the stock of {name} to zero.")
    elif have > 0 and abs(diff) >= BIG_ADJUST_SHARE * have:
        warnings.append(
            f"That changes the stock by {abs(diff) / have * 100:.0f}% (from {_fmt(have)} to {_fmt(count)} {unit}). "
            "Check the count."
        )
    elif have == 0 and count >= BIG_ADJUST_MIN:
        warnings.append(f"That is a very large count ({_fmt(count)} {unit}).")

    signed = {
        "material_id": material_id,
        "material_name": name,
        "unit": unit,
        "actual_stock": count,
        "stock_before": have,  # for the audit row only; Node is sent just actual_stock
    }
    token, payload = sign_action(
        ctx.secret,
        user_id=user.user_id,
        business_id=user.business_id,
        tool="adjust_stock",
        args=signed,
        ttl_seconds=ctx.ttl_seconds,
    )

    sign = "+" if diff > 0 else "-"
    summary = f"Adjust {name}: set stock to {_fmt(count)} {unit} (now {_fmt(have)}, change {sign}{_fmt(abs(diff))})."
    lines = [{"label": "Stock", "before": have, "after": count, "unit": unit}]
    ctx.proposals.append(
        {
            "tool": "adjust_stock",
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
        "stock_before": have,
        "stock_after": count,
        "change": diff,
        "warnings": warnings,
    }


PROPOSE_ADJUST_STOCK = Tool(
    name="propose_adjust_stock",
    description=(
        "Prepare a stock correction for the person to confirm: they say how much of a raw material they really have "
        "now (a stock count or a correction). This does NOT change stock: the person must press Confirm in the app. "
        "actual_stock is the real count on hand, in the material's own unit, and it must come from the person: never "
        "calculate it from a loss or a change, ask them for the new count instead. Purchases are restocks, not this."
    ),
    parameters={
        "type": "object",
        "properties": {
            "material": {"type": "string", "description": "The material name exactly as the person typed it."},
            "actual_stock": {
                "type": "number",
                "description": "The real amount on hand now, in the material's own unit, as the person said it.",
            },
        },
        "required": ["material", "actual_stock"],
    },
    modules=("inventory",),
    kind="write",
    handler=propose_adjust_stock,
)