"""
Builds a single BusinessSnapshot per request: raw data fetched from the
Node backend, combined with Tier 1 predictor outputs computed in-process
(no HTTP hop — predictors/ lives in this same codebase).

Runway/anomalies/reorder/payment_risk come from the Python predictors,
fed with RAW data (materials, orders, batches, retailers) — NOT from
Node's /reports/runway, which is a simpler baseline the Python predictors
are meant to improve on. Profitability/receivables have no Python
predictor equivalent, so those stay as Node's computed aggregates.
"""

import asyncio
import json
from dataclasses import dataclass, field

from clients.backend_client import BackendClient

# --- Tier 1 predictors (teammate's scope) ---------------------------------
# NOT YET IMPLEMENTED — predictor files exist but are empty. Commented out
# until real functions land; insights/rules.py computes lightweight
# runway/anomaly signals from raw data in the meantime.
# from predictors.runway_predictor import predict_runway
# from predictors.anomaly_detector import detect_anomalies
# from predictors.reorder_engine import suggest_reorders
# from predictors.payment_risk_scorer import score_payment_risk


@dataclass
class BusinessSnapshot:
    business_id: str

    # Raw data (from Node) — feeds the Python predictors below
    materials: list[dict] = field(default_factory=list)
    orders: list[dict] = field(default_factory=list)
    products: list[dict] = field(default_factory=list)
    batches: list[dict] = field(default_factory=list)  # materials_consumed pre-parsed from JSON
    retailers: list[dict] = field(default_factory=list)
    business_profile: dict = field(default_factory=dict)
    overdue_orders: list[dict] = field(default_factory=list)  # from /orders/overdue

    # Node-computed aggregates — no Python predictor equivalent exists
    unpaid_by_retailer: list[dict] = field(default_factory=list)   # per-retailer, from /orders/unpaid-summary
    receivables_total: dict = field(default_factory=dict)          # business-wide, from /reports/receivables
    profit_summary: dict = field(default_factory=dict)
    weekly_margin: dict = field(default_factory=dict)
    profit_by_product: list[dict] = field(default_factory=list)

    # Tier 1 predictor outputs (computed in-process, from raw data above)
    runway: dict | None = None
    anomalies: list[dict] = field(default_factory=list)
    reorder_suggestions: list[dict] = field(default_factory=list)
    payment_risk: list[dict] = field(default_factory=list)

    @property
    def currency(self) -> str:
        # business.currency in Postgres defaults to ₹ but is set per
        # business at onboarding (country-driven) — never hardcode this
        # anywhere else, always read it off the snapshot.
        return self.business_profile.get("currency", "₹")


def _parse_batches(raw_batches: list[dict]) -> list[dict]:
    """materials_consumed comes back from Node as a JSON string column,
    not a parsed object — decode it once here so predictors/rules never
    have to think about it."""
    parsed = []
    for batch in raw_batches:
        batch = dict(batch)
        raw = batch.get("materials_consumed")
        if isinstance(raw, str) and raw:
            try:
                batch["materials_consumed"] = json.loads(raw)
            except json.JSONDecodeError:
                batch["materials_consumed"] = None
        parsed.append(batch)
    return parsed


async def build_snapshot(token: str) -> BusinessSnapshot:
    client = BackendClient(token)

    try:
        results = await asyncio.gather(
            client.get_materials(),
            client.get_orders(),
            client.get_products(),
            client.get_batches(),
            client.get_retailers(),
            client.get_business_profile(),
            client.get_unpaid_orders_summary(),
            client.get_receivables_report(),
            client.get_profit_summary(),
            client.get_weekly_margin(),
            client.get_profit_by_product(),
            client.get_overdue_orders(),
            return_exceptions=True,
        )

        defaults = [[], [], [], [], [], {}, [], {}, {}, {}, [], []]
        (
            materials,
            orders,
            products,
            raw_batches,
            retailers,
            business_profile,
            unpaid_by_retailer,
            receivables_total,
            profit_summary,
            weekly_margin,
            profit_by_product,
            overdue_orders,
        ) = [
            default if isinstance(result, Exception) else result
            for result, default in zip(results, defaults)
        ]

        batches = _parse_batches(raw_batches)

        # --- Tier 1 predictor calls -------------------------------------
        # NOT YET IMPLEMENTED — see comment above. Swap these in once the
        # real predictor functions exist.
        runway = None
        anomalies = []
        reorder_suggestions = []
        payment_risk = []

        return BusinessSnapshot(
            business_id=business_profile.get("id", business_profile.get("business_id", "")),
            materials=materials,
            orders=orders,
            products=products,
            batches=batches,
            retailers=retailers,
            business_profile=business_profile,
            overdue_orders=overdue_orders,
            unpaid_by_retailer=unpaid_by_retailer,
            receivables_total=receivables_total,
            profit_summary=profit_summary,
            weekly_margin=weekly_margin,
            profit_by_product=profit_by_product,
            runway=runway,
            anomalies=anomalies,
            reorder_suggestions=reorder_suggestions,
            payment_risk=payment_risk,
        )
    finally:
        await client.close()