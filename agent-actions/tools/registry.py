"""The tools the model may call, and who may see them.

Every tool is a small wrapper around an existing Node endpoint, called with the
person's own JWT, so Node's module checks apply whatever the model tries.
The model sees only the tools that match the person's modules.

The model never sees internal ids: it passes the name the person typed and the
server resolves it (see fuzzy.py). Step 3 keeps the ids on the server side.
"""

import math
from dataclasses import dataclass
from typing import Awaitable, Callable

from auth import CurrentUser
from backend_client import BackendClient
from tools.fuzzy import resolve

LIST_LIMIT = 20
MAX_RECIPE_LINES = 12
MAX_QUERY_CHARS = 80


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    parameters: dict
    modules: tuple[str, ...]  # the person needs at least one of these
    kind: str  # "read" or "write"
    handler: Callable[[CurrentUser, BackendClient, dict], Awaitable[dict]]

    def spec(self) -> dict:
        return {
            "type": "function",
            "function": {"name": self.name, "description": self.description, "parameters": self.parameters},
        }


# ---- compacting rows (short, safe for the model) ---------------------------


def _text(value, limit: int = 80) -> str:
    return " ".join(str(value or "").split())[:limit]


def _num(value):
    # Postgres NUMERIC arrives as a string ("12.500"); turn it into a number.
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(n):
        return None
    n = round(n, 3)
    return int(n) if n == int(n) else n


def _compact_product(row: dict) -> dict:
    recipe = []
    for line in (row.get("recipe") or [])[:MAX_RECIPE_LINES]:
        if isinstance(line, dict):
            recipe.append(
                {
                    "material": _text(line.get("material_name")),
                    "per_unit": _num(line.get("quantity_per_unit")),
                    "unit": _text(line.get("material_unit"), 20),
                }
            )
    return {
        "id": row.get("product_id") or row.get("id"),
        "name": _text(row.get("name")),
        "unit": _text(row.get("unit"), 20),
        "finished_stock": _num(row.get("current_stock")),
        "selling_price": _num(row.get("selling_price")),
        "recipe": recipe,
    }


def _compact_material(row: dict) -> dict:
    return {
        "id": row.get("material_id") or row.get("id"),
        "name": _text(row.get("name")),
        "unit": _text(row.get("unit"), 20),
        "stock": _num(row.get("current_stock")),
        "reorder_threshold": _num(row.get("reorder_threshold")),
        "unit_cost": _num(row.get("unit_cost")),
    }


def _compact_retailer(row: dict) -> dict:
    return {
        "id": row.get("retailer_id") or row.get("id"),
        "name": _text(row.get("name")),
        "credit_terms": _text(row.get("credit_terms"), 60) or None,
    }


def _model_view(item: dict, keys: tuple[str, ...] | None = None) -> dict:
    """What the model sees: never the id."""
    return {k: v for k, v in item.items() if k != "id" and (keys is None or k in keys)}


# ---- the lookup tools ------------------------------------------------------


def _finder(*, name, description, path, compact, list_keys, modules) -> Tool:
    async def handler(user: CurrentUser, backend: BackendClient, args: dict) -> dict:
        query = _text(args.get("query"), MAX_QUERY_CHARS)
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
                "items": [_model_view(i, list_keys) for i in items[:LIST_LIMIT]],
            }

        found = resolve(query, items)
        if found.status == "resolved":
            return {"status": "resolved", "match": _model_view(found.matches[0])}
        if found.status == "ambiguous":
            return {"status": "ambiguous", "matches": [_model_view(m) for m in found.matches]}
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


ALL_TOOLS: tuple[Tool, ...] = (
    _finder(
        name="find_product",
        description="Look up a product (finished good): finished stock, selling price and the recipe it uses.",
        path="/api/products",
        compact=_compact_product,
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


def tools_for(user: CurrentUser) -> list[Tool]:
    have = set(user.modules)
    return [t for t in ALL_TOOLS if have & set(t.modules)]