"""Read-only lookup tools. The model never sees internal ids: it passes the
name the person typed and the server resolves it (see fuzzy.py)."""

from auth import CurrentUser
from backend_client import BackendClient
from tools.base import Tool, ToolContext, num, text
from tools.fuzzy import resolve

LIST_LIMIT = 20
MAX_RECIPE_LINES = 12
MAX_QUERY_CHARS = 80


def compact_product(row: dict) -> dict:
    recipe = []
    for line in (row.get("recipe") or [])[:MAX_RECIPE_LINES]:
        if isinstance(line, dict):
            recipe.append(
                {
                    "material": text(line.get("material_name")),
                    "per_unit": num(line.get("quantity_per_unit")),
                    "unit": text(line.get("material_unit"), 20),
                }
            )
    return {
        "id": row.get("product_id") or row.get("id"),
        "name": text(row.get("name")),
        "unit": text(row.get("unit"), 20),
        "finished_stock": num(row.get("current_stock")),
        "selling_price": num(row.get("selling_price")),
        "recipe": recipe,
    }


def _compact_material(row: dict) -> dict:
    return {
        "id": row.get("material_id") or row.get("id"),
        "name": text(row.get("name")),
        "unit": text(row.get("unit"), 20),
        "stock": num(row.get("current_stock")),
        "reorder_threshold": num(row.get("reorder_threshold")),
        "unit_cost": num(row.get("unit_cost")),
    }


def _compact_retailer(row: dict) -> dict:
    return {
        "id": row.get("retailer_id") or row.get("id"),
        "name": text(row.get("name")),
        "credit_terms": text(row.get("credit_terms"), 60) or None,
    }


def model_view(item: dict, keys: tuple[str, ...] | None = None) -> dict:
    """What the model sees: never the id."""
    return {k: v for k, v in item.items() if k != "id" and (keys is None or k in keys)}


def _finder(*, name, description, path, compact, list_keys, modules) -> Tool:
    async def handler(user: CurrentUser, backend: BackendClient, args: dict, ctx: ToolContext) -> dict:
        query = text(args.get("query"), MAX_QUERY_CHARS)
        body = await backend.get(path, token=user.token)
        rows = body.get("data")
        if not isinstance(rows, list):
            return {"error": "The DANN server sent an unexpected response."}
        items = [compact(r) for r in rows if isinstance(r, dict)]
        items = [i for i in items if i["id"] and i["name"]]

        if not query:
            return {
                "status": "list",
                "total": len(items),
                "items": [model_view(i, list_keys) for i in items[:LIST_LIMIT]],
            }

        found = resolve(query, items)
        if found.status == "resolved":
            return {"status": "resolved", "match": model_view(found.matches[0])}
        if found.status == "ambiguous":
            return {"status": "ambiguous", "matches": [model_view(m) for m in found.matches]}
        return {"status": "none"}

    return Tool(
        name=name,
        description=description,
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The name exactly as the person typed it. Leave empty to list items.",
                }
            },
            "required": [],
        },
        modules=modules,
        kind="read",
        handler=handler,
    )


LOOKUP_TOOLS: tuple[Tool, ...] = (
    _finder(
        name="find_product",
        description="Look up a product (finished good): finished stock, selling price and the recipe it uses.",
        path="/api/products",
        compact=compact_product,
        list_keys=("name", "unit", "finished_stock"),
        modules=("production", "orders", "inventory"),
    ),
    _finder(
        name="find_material",
        description="Look up a raw material: stock on hand, unit, reorder threshold and unit cost.",
        path="/api/materials",
        compact=_compact_material,
        list_keys=("name", "unit", "stock"),
        modules=("inventory", "production"),
    ),
    _finder(
        name="find_retailer",
        description="Look up a retailer (customer) by name.",
        path="/api/retailers",
        compact=_compact_retailer,
        list_keys=("name", "credit_terms"),
        modules=("orders", "finance"),
    ),
)