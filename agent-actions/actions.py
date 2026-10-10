"""Running a confirmed action: reserve in the audit log, execute, complete.

Order matters. The audit row is reserved BEFORE anything is executed, and its
id is the confirmation nonce, so the same confirmation can never run twice,
even after this service restarts. If the reservation fails, nothing runs.
"""

import logging
from dataclasses import dataclass

from auth import CurrentUser
from backend_client import BackendClient, BackendError

log = logging.getLogger("agent-actions.actions")

UNKNOWN_OUTCOME = "The DANN server did not answer clearly. Check the Production page before trying again."


@dataclass
class ActionOutcome:
    status: int
    body: dict


def _fmt(value) -> str:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return str(value)
    return str(int(n)) if n == int(n) else f"{n:g}"


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
    if tool != "log_batch":
        return ActionOutcome(400, {"detail": "This action is not supported."})

    # 1. Reserve. Fail closed: no audit row, no action.
    try:
        await backend.post(
            "/api/agent-actions",
            token=user.token,
            json={"action_id": nonce, "tool": tool, "arguments": args},
        )
    except BackendError as exc:
        if exc.status == 409:
            return ActionOutcome(
                409, {"detail": "This action was already confirmed. Check the Production page for the result."}
            )
        log.error("could not reserve action %s: status=%s message=%s", nonce, exc.status, exc.message)
        return ActionOutcome(502, {"detail": "Could not record the action, so nothing was logged. Please try again."})

    # 2. Execute with the person's own token, so Node's permission checks apply.
    batch = {
        "product_id": args["product_id"],
        "quantity_produced": args["quantity"],
        "labor_cost": args.get("labor_cost", 0),
    }
    if args.get("manual_material_cost") is not None:
        batch["manual_material_cost"] = args["manual_material_cost"]

    try:
        body = await backend.post("/api/batches", token=user.token, json=batch)
    except BackendError as exc:
        if exc.is_client_error:
            await _complete(backend, user, nonce, "failed", {"error": exc.message[:200], "status": exc.status})
            return ActionOutcome(exc.status, {"detail": exc.message})
        # No clear answer (timeout, 5xx): the batch may or may not exist.
        log.error("batch call for %s ended unclearly: status=%s message=%s", nonce, exc.status, exc.message)
        await _complete(backend, user, nonce, "failed", {"error": "no clear answer", "unknown_outcome": True})
        return ActionOutcome(502, {"detail": UNKNOWN_OUTCOME})

    # 3. Complete.
    data = body.get("data") if isinstance(body.get("data"), dict) else {}
    batch_id = data.get("production_id") or data.get("id")
    await _complete(
        backend,
        user,
        nonce,
        "executed",
        {
            "batch_id": batch_id,
            "quantity_produced": data.get("quantity_produced", args["quantity"]),
            "total_material_cost": data.get("total_material_cost"),
        },
    )

    used = [
        {"material": m.get("name"), "amount": m.get("quantity_used"), "unit": m.get("unit")}
        for m in (data.get("materials_consumed") or [])
        if isinstance(m, dict)
    ]
    name = args.get("product_name") or data.get("product_name") or "the product"
    unit = args.get("unit") or ""
    reply = f"Logged a batch of {name}: {_fmt(data.get('quantity_produced', args['quantity']))} {unit}".rstrip() + "."
    return ActionOutcome(
        200,
        {
            "ok": True,
            "reply": reply,
            "result": {
                "batch_id": batch_id,
                "product_name": name,
                "quantity_produced": data.get("quantity_produced", args["quantity"]),
                "materials_used": used,
            },
        },
    )