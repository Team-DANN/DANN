"""propose_create_product: prepare a new product, with its recipe, for the person to confirm.

This tool never creates anything. It checks the fields, refuses a name that is
a near-duplicate of an existing product (Node does not check product names, so
this is the only guard), resolves every ingredient against the business's own
materials, and leaves a signed proposal in the request context. Only
POST /confirm can act on it.

An ingredient is { name, quantity_per_unit }: how much of that material goes
into ONE unit of the product, in the material's own unit. A material that is
not in DANN can be created in the same action: the model passes new true plus
unit and stock (and the price per unit if the person gave it), but only after
the person agreed. Problems with ingredients (not found, several close
matches, a near-duplicate of an existing material) all come back together as
one `ingredient_problems` result so the model asks once.

An opening stock of the finished product only records what is on the shelf.
It does not use up any materials.
"""

from auth import CurrentUser
from backend_client import BackendClient
from confirm import sign_action
from tools.base import Tool, ToolContext, text
from tools.batch import MAX_COST, MAX_QUANTITY, _fmt, _number
from tools.fuzzy import resolve
from tools.lookup import _compact_material, compact_product
from tools.material import MAX_NAME_CHARS, MAX_UNIT_CHARS, _money, _near_duplicate, _one_line, _optional_amount

MAX_CATEGORY_CHARS = 40
MAX_INGREDIENTS = 15


def _and(parts) -> str:
    parts = list(parts)
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def _parse_ingredients(raw) -> tuple[str | None, list[dict]]:
    """(error, ingredients). Checks the shape only; matching names comes later."""
    if raw is None:
        return None, []
    if not isinstance(raw, list):
        return "ingredients must be a list. Ask which materials the product uses.", []
    if len(raw) > MAX_INGREDIENTS:
        return f"Too many ingredients (more than {MAX_INGREDIENTS}). Ask the person to add the rest later.", []
    parsed: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            return "Each ingredient needs a name and quantity_per_unit.", []
        name = _one_line(item.get("name"))
        if not name:
            return "Each ingredient needs a name. Ask which material is meant.", []
        if len(name) > MAX_NAME_CHARS:
            return f"The ingredient name '{name[:20]}...' is too long. Ask for a shorter one.", []
        qty = _number(item.get("quantity_per_unit"))
        if qty is None or qty <= 0 or qty > MAX_QUANTITY:
            return (
                f"quantity_per_unit for '{name}' must be a number above 0: how much of it goes into ONE unit "
                "of the product. Ask for it.",
                [],
            )
        entry = {"name": name, "quantity": round(qty, 6)}
        if item.get("new") is True:
            unit = _one_line(item.get("unit"))
            if not unit:
                return f"'{name}' is a new material, so its unit is required. Ask which unit it is measured in.", []
            if len(unit) > MAX_UNIT_CHARS:
                return f"The unit of '{name}' is too long. Ask for a short unit such as kg, g, L or pieces.", []
            ok, stock = _optional_amount(item.get("stock"), MAX_QUANTITY)
            if not ok:
                return f"stock for '{name}' must be a number of 0 or more. Ask for it.", []
            if stock is None:
                return f"'{name}' is a new material, so stock is required. Ask how much they have now (0 is fine).", []
            ok, price = _optional_amount(item.get("price_per_unit"), MAX_COST)
            if not ok:
                return f"price_per_unit for '{name}' must be a number of 0 or more (the price of ONE unit).", []
            entry.update(new=True, unit=unit, stock=stock, price=price or 0.0)
        parsed.append(entry)
    return None, parsed


def _new_material_text(currency: str, new: dict) -> str:
    out = f"{new['name']}: {_fmt(new['stock'])} {new['unit']} in stock"
    if new["price_per_unit"] > 0:
        return out + f", {_money(currency, new['price_per_unit'])} per {new['unit']}"
    return out + ", no price"


async def propose_create_product(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
    name = _one_line(args.get("name"))
    if not name:
        return {"error": "name is required. Ask what the new product is called."}
    if len(name) > MAX_NAME_CHARS:
        return {"error": f"The name is too long (more than {MAX_NAME_CHARS} characters). Ask for a shorter one."}

    raw_price = args.get("selling_price")
    if raw_price is None or (isinstance(raw_price, str) and not raw_price.strip()):
        return {"error": "selling_price is required: the price of ONE unit. Ask what it sells for; never guess it."}
    price = _number(raw_price)
    if price is None or price < 0 or price > MAX_COST:
        return {"error": "selling_price must be a number of 0 or more (the price of ONE unit). Ask for it."}
    price = round(price, 4)

    unit = _one_line(args.get("unit")) or "piece"  # Node's own default
    if len(unit) > MAX_UNIT_CHARS:
        return {"error": "The unit is too long. Ask for a short unit such as piece, kg, loaf or box."}
    category = text(args.get("category"), MAX_CATEGORY_CHARS)
    ok, stock = _optional_amount(args.get("opening_stock"), MAX_QUANTITY)
    if not ok:
        return {"error": "opening_stock must be a number of 0 or more. Ask for it, or leave it out."}
    stock = stock or 0.0

    error, wanted = _parse_ingredients(args.get("ingredients"))
    if error:
        return {"error": error}

    if not ctx.secret:
        return {"error": "Actions are not switched on in this version."}
    if ctx.proposals:
        return {"error": "Another action is already waiting for confirmation. Ask the person to confirm or cancel it first."}

    body = await backend.get("/api/products", token=user.token)
    rows = body.get("data")
    if not isinstance(rows, list):
        return {"error": "The DANN server sent an unexpected response."}
    products = [compact_product(r) for r in rows if isinstance(r, dict)]
    products = [p for p in products if p["id"] and p["name"]]
    existing = _near_duplicate(name, products)
    if existing:
        return {
            "status": "duplicate",
            "which": "product",
            "existing": {"name": existing["name"], "unit": existing["unit"]},
        }

    materials: list[dict] = []
    if wanted:
        body = await backend.get("/api/materials", token=user.token)
        rows = body.get("data")
        if not isinstance(rows, list):
            return {"error": "The DANN server sent an unexpected response."}
        materials = [_compact_material(r) for r in rows if isinstance(r, dict)]
        materials = [m for m in materials if m["id"] and m["name"]]

    signed_ingredients: list[dict] = []
    unpriced: list[str] = []  # materials that will have no cost, so the product's cost is too low
    problems: list[dict] = []
    used_ids: set = set()
    new_seen: list[dict] = []
    for item in wanted:
        if item.get("new"):
            twin = _near_duplicate(item["name"], materials)
            if twin:
                problems.append(
                    {
                        "ingredient": item["name"],
                        "status": "duplicate",
                        "existing": {"name": twin["name"], "unit": twin["unit"]},
                    }
                )
                continue
            if _near_duplicate(item["name"], new_seen):
                return {"error": f"'{item['name']}' is listed twice as a new material. Ask the person to check the ingredients."}
            new_seen.append({"name": item["name"]})
            if item["price"] == 0:
                unpriced.append(item["name"])
            signed_ingredients.append(
                {
                    "material_name": item["name"],
                    "unit": item["unit"],
                    "quantity_per_unit": item["quantity"],
                    "new_material": {
                        "name": item["name"],
                        "unit": item["unit"],
                        "stock": item["stock"],
                        "price_per_unit": item["price"],
                    },
                }
            )
            continue

        found = resolve(item["name"], materials)
        if found.status == "ambiguous":
            problems.append(
                {
                    "ingredient": item["name"],
                    "status": "ambiguous",
                    "matches": [{"name": m["name"], "unit": m["unit"]} for m in found.matches],
                }
            )
        elif found.status == "none":
            problems.append({"ingredient": item["name"], "status": "none"})
        else:
            material = found.matches[0]
            if material["id"] in used_ids:
                return {"error": f"{material['name']} is listed twice. Ask the person to check the ingredients."}
            used_ids.add(material["id"])
            if not material["unit_cost"]:
                unpriced.append(material["name"])
            signed_ingredients.append(
                {
                    "material_id": material["id"],
                    "material_name": material["name"],
                    "unit": material["unit"],
                    "quantity_per_unit": item["quantity"],
                }
            )
    if problems:
        return {"status": "ingredient_problems", "problems": problems}

    cur = user.currency
    new_items = [i for i in signed_ingredients if "new_material" in i]
    warnings: list[str] = []
    if new_items:
        names = [i["material_name"] for i in new_items]
        warnings.append(
            f"Confirming also adds {len(names)} new material{'s' if len(names) != 1 else ''} to DANN: {_and(names)}."
        )
    if unpriced:
        warnings.append(
            f"No price per unit is set for {_and(unpriced)}, so the cost of {name} will be too low until "
            f"{'that material is' if len(unpriced) == 1 else 'those materials are'} restocked with a price."
        )
    if not signed_ingredients:
        warnings.append(
            "This product has no recipe, so logging a batch of it deducts no materials, "
            "and its cost is whatever you enter as material cost."
        )
    if stock > 0 and signed_ingredients:
        warnings.append(
            "The opening stock only records what is on the shelf. It does not use up any materials."
        )
    if price == 0:
        warnings.append(f"The selling price is {_money(cur, 0)}, so orders for this product will total {_money(cur, 0)}.")

    signed = {
        "name": name,
        "unit": unit,
        "selling_price": price,
        "opening_stock": stock,
        "ingredients": signed_ingredients,
    }
    if category:
        signed["category"] = category
    token, payload = sign_action(
        ctx.secret,
        user_id=user.user_id,
        business_id=user.business_id,
        tool="create_product",
        args=signed,
        ttl_seconds=ctx.ttl_seconds,
    )

    n = len(signed_ingredients)
    summary = f"Create product {name} ({unit}), selling at {_money(cur, price)} per {unit}"
    if n:
        summary += f", with {n} ingredient{'s' if n != 1 else ''}"
        if new_items:
            summary += f" ({len(new_items)} new material{'s' if len(new_items) != 1 else ''})"
    summary += "."

    lines: list[dict] = [{"label": "New material", "value": _new_material_text(cur, i["new_material"])} for i in new_items]
    lines += [
        {"label": "Name", "value": name},
        {"label": "Selling price", "value": price, "unit": f"{cur} per {unit}"},
        {"label": "Unit", "value": unit},
    ]
    if category:
        lines.append({"label": "Category", "value": category})
    lines.append({"label": "Opening stock", "value": stock, "unit": unit})
    for i in signed_ingredients:
        lines.append({"label": i["material_name"], "value": i["quantity_per_unit"], "unit": f"{i['unit']} per {unit}"})

    ctx.proposals.append(
        {
            "tool": "create_product",
            "undoable": False,
            "summary": summary,
            "lines": lines,
            "warnings": warnings,
            "token": token,
            "expires_at": payload["exp"],
        }
    )
    # The model sees what was prepared, never the token.
    return {"status": "proposal_ready", "summary": summary, "warnings": warnings}


PROPOSE_CREATE_PRODUCT = Tool(
    name="propose_create_product",
    description=(
        "Prepare a NEW finished product, with its recipe, for the person to confirm. This does NOT create anything: "
        "the person must press the Confirm button on the card. name and selling_price (the price of ONE unit) are "
        "required: ask if the price is missing, never guess it. Pass unit, category and opening_stock only if they "
        "said them. List ingredients only if they named them. Set new true on an ingredient ONLY after a result said "
        "it is not in DANN and the person agreed to add it."
    ),
    parameters={
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "The new product's name as the person typed it."},
            "selling_price": {"type": "number", "description": "The price of ONE unit of the product."},
            "unit": {"type": "string", "description": "For example piece, loaf, kg, box. Only if they said."},
            "category": {"type": "string", "description": "Only if they said."},
            "opening_stock": {"type": "number", "description": "Finished units on the shelf now. Only if they said."},
            "ingredients": {
                "type": "array",
                "description": "Materials that ONE unit of the product uses.",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "The material as the person typed it."},
                        "quantity_per_unit": {
                            "type": "number",
                            "description": "Amount for ONE unit of the product, in the material's own unit.",
                        },
                        "new": {"type": "boolean", "description": "True only for a material not in DANN that they agreed to add."},
                        "unit": {"type": "string", "description": "New material only: its unit."},
                        "stock": {"type": "number", "description": "New material only: how much they have now."},
                        "price_per_unit": {"type": "number", "description": "New material only: price of one unit, if given."},
                    },
                    "required": ["name", "quantity_per_unit"],
                },
            },
        },
        "required": ["name", "selling_price"],
    },
    modules=("production",),
    kind="write",
    handler=propose_create_product,
)