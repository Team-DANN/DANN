"""Running a confirmed action: reserve in the audit log, execute, complete.

Order matters. The audit row is reserved BEFORE anything is executed, and its
id is the confirmation nonce, so the same confirmation can never run twice,
even after this service restarts. If the reservation fails, nothing runs.

The runner is the same for every write tool. What differs per tool lives in
one ActionSpec entry in ACTIONS: how to build the Node request from the signed
arguments, and how to word and record the result. To add a tool, add one spec.

A spec may also have a setup step: earlier Node calls whose results the main
request needs (an order for a retailer that does not exist yet adds the
retailer first; a product with a new ingredient adds that material first).
`setup` returns None, one SetupStep or a list of them, run in order. If a
later call fails after an earlier one worked, the person is told what was
already done.
"""

import logging
from dataclasses import dataclass
from typing import Callable
from urllib.parse import quote

from auth import CurrentUser
from backend_client import BackendClient, BackendError

log = logging.getLogger("agent-actions.actions")

UNKNOWN_OUTCOME_TEMPLATE = "The DANN server did not answer clearly. Check the {page} page before trying again."
UNKNOWN_OUTCOME = UNKNOWN_OUTCOME_TEMPLATE.format(page="Production")  # kept: existing tests import it
ALREADY_CONFIRMED_TEMPLATE = "This action was already confirmed. Check the {page} page for the result."
AFTER_SETUP_UNCLEAR_TEMPLATE = (
    "{done}. The DANN server did not answer clearly about the rest, so check the {page} page before trying again."
)


@dataclass
class ActionOutcome:
    status: int
    body: dict


@dataclass(frozen=True)
class ActionSummary:
    audit: dict  # short facts for the audit row: ids and numbers only
    reply: str  # one plain sentence for the chat
    result: dict  # what the app shows on the result card


@dataclass(frozen=True)
class SetupStep:
    path: str  # Node path, always POST
    body: dict
    apply: Callable[[dict, dict], dict]  # (signed args, Node "data") -> args for the next request
    done: str  # plain words for what the step did, e.g. "Ravi Stores was added as a new retailer"
    not_done: str  # plain words for what did not happen if a later request fails


@dataclass(frozen=True)
class ActionSpec:
    tool: str
    page: str  # the dashboard page to check when the outcome is unclear
    build_request: Callable[[dict], tuple[str, dict]]  # signed args -> (Node path, JSON body), always POST
    summarize: Callable[[dict, dict], ActionSummary]  # (signed args, Node "data") -> summary
    # Optional earlier calls: None (not needed), one SetupStep, or a list of them.
    setup: Callable[[dict], "SetupStep | list[SetupStep] | None"] | None = None


def _fmt(value) -> str:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return str(value)
    return str(int(n)) if n == int(n) else f"{n:g}"


def _and(parts) -> str:
    """'A', 'A and B', 'A, B and C'."""
    parts = list(parts)
    if len(parts) <= 1:
        return "".join(parts)
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def _steps_for(spec: "ActionSpec", args: dict) -> list[SetupStep]:
    if spec.setup is None:
        return []
    out = spec.setup(args)
    if out is None:
        return []
    if isinstance(out, SetupStep):
        return [out]
    return list(out)


# ---- log_batch -------------------------------------------------------------


def _batch_request(args: dict) -> tuple[str, dict]:
    batch = {
        "product_id": args["product_id"],
        "quantity_produced": args["quantity"],
        "labor_cost": args.get("labor_cost", 0),
    }
    if args.get("manual_material_cost") is not None:
        batch["manual_material_cost"] = args["manual_material_cost"]
    return "/api/batches", batch


def _batch_summary(args: dict, data: dict) -> ActionSummary:
    batch_id = data.get("production_id") or data.get("id")
    quantity = data.get("quantity_produced", args["quantity"])
    used = [
        {"material": m.get("name"), "amount": m.get("quantity_used"), "unit": m.get("unit")}
        for m in (data.get("materials_consumed") or [])
        if isinstance(m, dict)
    ]
    name = args.get("product_name") or data.get("product_name") or "the product"
    unit = args.get("unit") or ""
    reply = f"Logged a batch of {name}: {_fmt(quantity)} {unit}".rstrip() + "."
    return ActionSummary(
        audit={
            "batch_id": batch_id,
            "quantity_produced": quantity,
            "total_material_cost": data.get("total_material_cost"),
        },
        reply=reply,
        result={
            "batch_id": batch_id,
            "product_name": name,
            "quantity_produced": quantity,
            "materials_used": used,
        },
    )


# ---- restock ---------------------------------------------------------------


def _restock_request(args: dict) -> tuple[str, dict]:
    path = f"/api/materials/{quote(str(args['material_id']), safe='')}/restock"
    return path, {"quantity_added": args["quantity"], "cost": args.get("cost", 0)}


def _restock_summary(args: dict, data: dict) -> ActionSummary:
    name = args.get("material_name") or data.get("name") or "the material"
    unit = args.get("unit") or data.get("unit") or ""
    stock = data.get("current_stock")
    unit_cost = data.get("unit_cost")
    cost = args.get("cost", 0)
    reply = f"Restocked {name}: added {_fmt(args['quantity'])} {unit}".rstrip()
    if stock is not None:
        reply += f", stock is now {_fmt(stock)} {unit}".rstrip()
    reply += "."
    return ActionSummary(
        audit={
            "material_id": args.get("material_id"),
            "quantity_added": args["quantity"],
            "cost": cost,
            "stock_after": stock,
            "unit_cost_after": unit_cost,
        },
        reply=reply,
        result={
            "material_name": name,
            "quantity_added": args["quantity"],
            "unit": unit,
            "cost": cost,
            "stock_after": stock,
            "unit_cost_after": unit_cost,
        },
    )


# ---- adjust_stock ----------------------------------------------------------


def _adjust_request(args: dict) -> tuple[str, dict]:
    path = f"/api/materials/{quote(str(args['material_id']), safe='')}/adjust"
    return path, {"actual_stock": args["actual_stock"]}


def _adjust_summary(args: dict, data: dict) -> ActionSummary:
    name = args.get("material_name") or data.get("name") or "the material"
    unit = args.get("unit") or data.get("unit") or ""
    before = args.get("stock_before")
    stock = data.get("current_stock")
    after = stock if stock is not None else args["actual_stock"]
    reply = f"Adjusted {name}: stock is now {_fmt(after)} {unit}".rstrip() + "."
    return ActionSummary(
        audit={"material_id": args.get("material_id"), "stock_before": before, "stock_after": after},
        reply=reply,
        result={"material_name": name, "unit": unit, "stock_before": before, "stock_after": after},
    )


# ---- create_material -------------------------------------------------------


def _create_material_request(args: dict) -> tuple[str, dict]:
    body = {
        "name": args["name"],
        "unit": args["unit"],
        "unit_cost": args.get("price_per_unit", 0),
        "current_stock": args.get("opening_stock", 0),
        "reorder_threshold": args.get("reorder_level", 0),
    }
    if args.get("supplier"):
        body["supplier_name"] = args["supplier"]
    return "/api/materials", body


def _create_material_summary(args: dict, data: dict) -> ActionSummary:
    material_id = data.get("material_id") or data.get("id")
    name = data.get("name") or args["name"]
    unit = data.get("unit") or args["unit"]
    stock = data.get("current_stock")
    if stock is None:
        stock = args.get("opening_stock", 0)
    unit_cost = data.get("unit_cost")
    return ActionSummary(
        audit={
            "material_id": material_id,
            "name": name,
            "unit": unit,
            "opening_stock": stock,
            "unit_cost": unit_cost,
        },
        reply=f"Added the material {name} ({unit}).",
        result={
            "material_id": material_id,  # the app needs it for Undo (DELETE /api/materials/:id)
            "material_name": name,
            "unit": unit,
            "opening_stock": stock,
            "unit_cost": unit_cost,
        },
    )


# ---- create_order ----------------------------------------------------------


def _order_apply(args: dict, data: dict) -> dict:
    """Put the id of the retailer that was just added into the signed arguments."""
    retailer_id = data.get("retailer_id") or data.get("id")
    if not retailer_id:
        raise ValueError("the new retailer came back without an id")
    return {**args, "retailer_id": retailer_id}


def _order_setup(args: dict) -> SetupStep | None:
    """A new retailer is added first. Orders for an existing retailer need no setup."""
    new = args.get("new_retailer")
    if not isinstance(new, dict) or args.get("retailer_id"):
        return None
    body = {"name": new["name"]}
    if new.get("credit_terms"):
        body["credit_terms"] = new["credit_terms"]
    return SetupStep(
        path="/api/retailers",
        body=body,
        apply=_order_apply,
        done=f"{new['name']} was added as a new retailer",
        not_done="the order was not recorded",
    )


def _order_request(args: dict) -> tuple[str, dict]:
    return "/api/orders", {
        "retailer_id": args["retailer_id"],
        "product_id": args["product_id"],
        "quantity": args["quantity"],
        "amount_paid": args.get("amount_paid", 0),
    }


def _order_summary(args: dict, data: dict) -> ActionSummary:
    order_id = data.get("order_id") or data.get("id")
    retailer = data.get("retailer_name") or args.get("retailer_name") or "the retailer"
    product = data.get("product_name") or args.get("product_name") or "the product"
    unit = args.get("unit") or ""
    quantity = data.get("quantity", args["quantity"])
    total = data.get("total_amount")
    paid = data.get("amount_paid", args.get("amount_paid", 0))
    status = data.get("status")
    owed = None
    if isinstance(total, (int, float)) and isinstance(paid, (int, float)):
        owed = round(max(total - paid, 0.0), 2)
    reply = f"Recorded the order: {_fmt(quantity)} {unit}".rstrip() + f" of {product} for {retailer}"
    if status == "paid":
        reply += ", paid in full"
    elif owed:
        reply += f", {owed:,.2f} still owed"
    reply += "."
    audit = {
        "order_id": order_id,
        "stock_before": args.get("stock_before"),
        "total_amount": total,
        "amount_paid": paid,
        "status": status,
    }
    result = {
        "retailer_name": retailer,
        "product_name": product,
        "quantity": quantity,
        "unit": unit,
        "total_amount": total,
        "amount_paid": paid,
        "owed": owed,
        "status": status,
    }
    if args.get("new_retailer"):
        audit["retailer_created"] = args.get("retailer_id")
        result["new_retailer"] = True
        reply = f"Added {retailer} as a new retailer. {reply}"
    return ActionSummary(audit=audit, reply=reply, result=result)


# ---- create_product --------------------------------------------------------


def _material_id_into(index: int) -> Callable[[dict, dict], dict]:
    """Put the id of the material that was just added into ingredient number `index`."""

    def apply(args: dict, data: dict) -> dict:
        material_id = data.get("material_id") or data.get("id")
        if not material_id:
            raise ValueError("the new material came back without an id")
        ingredients = [dict(i) for i in args["ingredients"]]
        ingredients[index] = {**ingredients[index], "material_id": material_id}
        return {**args, "ingredients": ingredients}

    return apply


def _product_setup(args: dict) -> list[SetupStep] | None:
    """One POST /api/materials per new ingredient, in recipe order. None when every ingredient exists."""
    steps: list[SetupStep] = []
    for index, item in enumerate(args.get("ingredients") or []):
        new = item.get("new_material") if isinstance(item, dict) else None
        if not isinstance(new, dict) or item.get("material_id"):
            continue
        steps.append(
            SetupStep(
                path="/api/materials",
                body={
                    "name": new["name"],
                    "unit": new["unit"],
                    "unit_cost": new.get("price_per_unit", 0),
                    "current_stock": new.get("stock", 0),
                    "reorder_threshold": 0,
                },
                apply=_material_id_into(index),
                done=f"{new['name']} was added as a new material",
                not_done="the product was not created",
            )
        )
    return steps or None


def _product_request(args: dict) -> tuple[str, dict]:
    body = {
        "name": args["name"],
        "unit": args["unit"],
        "selling_price": args["selling_price"],
        "current_stock": args.get("opening_stock", 0),
    }
    if args.get("category"):
        body["category"] = args["category"]
    recipe = [
        {"material_id": i["material_id"], "quantity_per_unit": i["quantity_per_unit"]}
        for i in (args.get("ingredients") or [])
    ]
    if recipe:
        body["recipe"] = recipe
    return "/api/products", body


def _product_summary(args: dict, data: dict) -> ActionSummary:
    product_id = data.get("product_id") or data.get("id")
    name = data.get("name") or args["name"]
    unit = data.get("unit") or args["unit"]
    stock = data.get("current_stock")
    if stock is None:
        stock = args.get("opening_stock", 0)
    cost = data.get("cost_per_unit")
    ingredients = [i for i in (args.get("ingredients") or []) if isinstance(i, dict)]
    created = [i for i in ingredients if isinstance(i.get("new_material"), dict)]
    created_names = [i["new_material"]["name"] for i in created]
    n = len(ingredients)

    reply = f"Added the product {name} ({unit})"
    if n:
        reply += f" with {n} ingredient{'s' if n != 1 else ''}"
    reply += "."
    if created_names:
        reply = f"Added the new material{'s' if len(created_names) != 1 else ''} {_and(created_names)}. {reply}"
    return ActionSummary(
        audit={
            "product_id": product_id,
            "name": name,
            "selling_price": args.get("selling_price"),
            "opening_stock": stock,
            "ingredient_count": n,
            "materials_created": [i.get("material_id") for i in created],
            "cost_per_unit": cost,
        },
        reply=reply,
        result={
            "product_id": product_id,
            "product_name": name,
            "unit": unit,
            "selling_price": args.get("selling_price"),
            "opening_stock": stock,
            "cost_per_unit": cost,
            "ingredients": [
                {
                    "material_name": i.get("material_name"),
                    "quantity_per_unit": i.get("quantity_per_unit"),
                    "unit": i.get("unit"),
                }
                for i in ingredients
            ],
            "new_materials": created_names,
        },
    )


# ---- the table: one entry per write tool -----------------------------------

ACTIONS: dict[str, ActionSpec] = {
    "log_batch": ActionSpec(
        tool="log_batch",
        page="Production",
        build_request=_batch_request,
        summarize=_batch_summary,
    ),
    "restock": ActionSpec(
        tool="restock",
        page="Inventory",
        build_request=_restock_request,
        summarize=_restock_summary,
    ),
    "adjust_stock": ActionSpec(
        tool="adjust_stock",
        page="Inventory",
        build_request=_adjust_request,
        summarize=_adjust_summary,
    ),
    "create_material": ActionSpec(
        tool="create_material",
        page="Inventory",
        build_request=_create_material_request,
        summarize=_create_material_summary,
    ),
    "create_order": ActionSpec(
        tool="create_order",
        page="Orders",
        build_request=_order_request,
        summarize=_order_summary,
        setup=_order_setup,
    ),
    "create_product": ActionSpec(
        tool="create_product",
        page="Production",
        build_request=_product_request,
        summarize=_product_summary,
        setup=_product_setup,
    ),
}


# ---- the runner ------------------------------------------------------------


async def _complete(backend: BackendClient, user: CurrentUser, nonce: str, status: str, result: dict) -> None:
    """Close the audit row. The action already happened, so a failure here is logged, not raised."""
    try:
        await backend.patch(
            f"/api/agent-actions/{nonce}", token=user.token, json={"status": status, "result": result}
        )
    except BackendError as exc:
        log.warning("could not complete audit row %s: status=%s message=%s", nonce, exc.status, exc.message)


async def _setup_not_understood(
    backend: BackendClient, user: CurrentUser, nonce: str, spec: ActionSpec, done: list[str]
) -> ActionOutcome:
    """A setup call worked but its answer could not be used. Say what was already done."""
    await _complete(
        backend, user, nonce, "failed", {"error": "setup result not understood", "setup_done": _and(done)}
    )
    return ActionOutcome(502, {"detail": AFTER_SETUP_UNCLEAR_TEMPLATE.format(done=_and(done), page=spec.page)})


async def run_confirmed_action(payload: dict, *, user: CurrentUser, backend: BackendClient) -> ActionOutcome:
    nonce, tool, args = payload["nonce"], payload["tool"], payload["args"]
    spec = ACTIONS.get(tool)
    if spec is None:
        return ActionOutcome(400, {"detail": "This action is not supported."})

    # Work out the Node requests first: a bad payload must fail before anything is recorded.
    # With setup steps the main request needs their results, so it is built after them.
    steps = _steps_for(spec, args)
    if not steps:
        path, request_body = spec.build_request(args)

    # 1. Reserve. Fail closed: no audit row, no action.
    try:
        await backend.post(
            "/api/agent-actions",
            token=user.token,
            json={"action_id": nonce, "tool": tool, "arguments": args},
        )
    except BackendError as exc:
        if exc.status == 409:
            return ActionOutcome(409, {"detail": ALREADY_CONFIRMED_TEMPLATE.format(page=spec.page)})
        log.error("could not reserve action %s: status=%s message=%s", nonce, exc.status, exc.message)
        return ActionOutcome(502, {"detail": "Could not record the action, so nothing was logged. Please try again."})

    # 2. Setup steps (only some actions), in order. `done` is what already worked.
    done: list[str] = []
    for step in steps:
        try:
            setup_body = await backend.post(step.path, token=user.token, json=step.body)
        except BackendError as exc:
            earlier = {"setup_done": _and(done)} if done else {}
            if exc.is_client_error:
                await _complete(
                    backend,
                    user,
                    nonce,
                    "failed",
                    {"error": exc.message[:200], "status": exc.status, "step": "setup", **earlier},
                )
                detail = f"{_and(done)}, but {step.not_done}: {exc.message}" if done else exc.message
                return ActionOutcome(exc.status, {"detail": detail})
            log.error("%s setup for %s ended unclearly: status=%s message=%s", tool, nonce, exc.status, exc.message)
            await _complete(
                backend,
                user,
                nonce,
                "failed",
                {"error": "no clear answer", "unknown_outcome": True, "step": "setup", **earlier},
            )
            if done:
                detail = AFTER_SETUP_UNCLEAR_TEMPLATE.format(done=_and(done), page=spec.page)
            else:
                detail = UNKNOWN_OUTCOME_TEMPLATE.format(page=spec.page)
            return ActionOutcome(502, {"detail": detail})
        setup_data = setup_body.get("data") if isinstance(setup_body.get("data"), dict) else {}
        done.append(step.done)
        try:
            args = step.apply(args, setup_data)
        except Exception:
            log.exception("could not use the setup result of %s (%s)", nonce, tool)
            return await _setup_not_understood(backend, user, nonce, spec, done)
    if steps:
        try:
            path, request_body = spec.build_request(args)
        except Exception:
            log.exception("could not build the request of %s (%s) after setup", nonce, tool)
            return await _setup_not_understood(backend, user, nonce, spec, done)

    # 3. Execute with the person's own token, so Node's permission checks apply.
    try:
        body = await backend.post(path, token=user.token, json=request_body)
    except BackendError as exc:
        extra = {"setup_done": _and(done)} if done else {}
        if exc.is_client_error:
            await _complete(
                backend, user, nonce, "failed", {"error": exc.message[:200], "status": exc.status, **extra}
            )
            detail = f"{_and(done)}, but {steps[-1].not_done}: {exc.message}" if done else exc.message
            return ActionOutcome(exc.status, {"detail": detail})
        # No clear answer (timeout, 5xx): the action may or may not have happened.
        log.error("%s call for %s ended unclearly: status=%s message=%s", tool, nonce, exc.status, exc.message)
        await _complete(backend, user, nonce, "failed", {"error": "no clear answer", "unknown_outcome": True, **extra})
        if done:
            detail = AFTER_SETUP_UNCLEAR_TEMPLATE.format(done=_and(done), page=spec.page)
        else:
            detail = UNKNOWN_OUTCOME_TEMPLATE.format(page=spec.page)
        return ActionOutcome(502, {"detail": detail})

    # 4. Complete. Node said yes, so never turn this into an error.
    data = body.get("data") if isinstance(body.get("data"), dict) else {}
    try:
        summary = spec.summarize(args, data)
    except Exception:
        log.exception("could not word the result of %s (%s)", nonce, tool)
        summary = ActionSummary(
            audit={"note": "result not summarised"},
            reply=f"Done. Check the {spec.page} page to see it.",
            result={},
        )
    await _complete(backend, user, nonce, "executed", summary.audit)
    return ActionOutcome(200, {"ok": True, "reply": summary.reply, "result": summary.result})