"""Running a confirmed action: reserve in the audit log, execute, complete.

Order matters. The audit row is reserved BEFORE anything is executed, and its
id is the confirmation nonce, so the same confirmation can never run twice,
even after this service restarts. If the reservation fails, nothing runs.

The runner is the same for every write tool. What differs per tool lives in
one ActionSpec entry in ACTIONS: how to build the Node request from the signed
arguments, and how to word and record the result. To add a tool, add one spec.
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
class ActionSpec:
    tool: str
    page: str  # the dashboard page to check when the outcome is unclear
    build_request: Callable[[dict], tuple[str, dict]]  # signed args -> (Node path, JSON body), always POST
    summarize: Callable[[dict, dict], ActionSummary]  # (signed args, Node "data") -> summary


def _fmt(value) -> str:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return str(value)
    return str(int(n)) if n == int(n) else f"{n:g}"


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


async def run_confirmed_action(payload: dict, *, user: CurrentUser, backend: BackendClient) -> ActionOutcome:
    nonce, tool, args = payload["nonce"], payload["tool"], payload["args"]
    spec = ACTIONS.get(tool)
    if spec is None:
        return ActionOutcome(400, {"detail": "This action is not supported."})

    # Build the Node request first: a bad payload must fail before anything is recorded.
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

    # 2. Execute with the person's own token, so Node's permission checks apply.
    try:
        body = await backend.post(path, token=user.token, json=request_body)
    except BackendError as exc:
        if exc.is_client_error:
            await _complete(backend, user, nonce, "failed", {"error": exc.message[:200], "status": exc.status})
            return ActionOutcome(exc.status, {"detail": exc.message})
        # No clear answer (timeout, 5xx): the action may or may not have happened.
        log.error("%s call for %s ended unclearly: status=%s message=%s", tool, nonce, exc.status, exc.message)
        await _complete(backend, user, nonce, "failed", {"error": "no clear answer", "unknown_outcome": True})
        return ActionOutcome(502, {"detail": UNKNOWN_OUTCOME_TEMPLATE.format(page=spec.page)})

    # 3. Complete. Node said yes, so never turn this into an error.
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