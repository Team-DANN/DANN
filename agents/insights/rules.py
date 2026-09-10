"""
Insight rules: each rule is a (condition, severity, message-builder) triple
evaluated against a BusinessSnapshot. insights/engine.py runs all of them
and collects whichever fire.

Runway/production rules currently compute their own lightweight signals
from raw snapshot data (materials/batches/orders) because the Tier 1
Python predictors (predictors/runway_predictor.py, anomaly_detector.py)
are not yet implemented. Once they land, swap the data source in those
two rule groups from raw-data math to snapshot.runway / snapshot.anomalies
— the rule shape itself won't need to change.
"""

from dataclasses import dataclass
from typing import Callable, Literal

from insights.snapshot import BusinessSnapshot
from nlg.templates import format_currency

Severity = Literal["critical", "warning", "info"]


@dataclass
class Insight:
    id: str
    domain: str
    severity: Severity
    message: str
    data: dict


@dataclass
class Rule:
    id: str
    domain: str
    check: Callable[[BusinessSnapshot], Insight | None]


# ---------------------------------------------------------------------
# RUNWAY
# ---------------------------------------------------------------------

def _material_runway_days(material: dict) -> float | None:
    avg_daily = material.get("avgDailyConsumption") or 0
    stock = material.get("qtyOnHand", material.get("current_stock", 0))
    if avg_daily <= 0:
        return None
    return stock / avg_daily


def _check_runway_critical(snapshot: BusinessSnapshot) -> Insight | None:
    threshold = snapshot.business_profile.get("alert_settings", {}).get("runway_threshold_days", 3)
    critical = []
    for m in snapshot.materials:
        days = _material_runway_days(m)
        if days is not None and days <= threshold:
            critical.append((m["name"], round(days, 1)))
    if not critical:
        return None
    critical.sort(key=lambda x: x[1])
    worst_name, worst_days = critical[0]
    return Insight(
        id="runway_critical",
        domain="runway",
        severity="critical",
        message=f"{worst_name} will run out in about {worst_days} day(s) at current usage.",
        data={"materials": critical},
    )


def _check_runway_warning(snapshot: BusinessSnapshot) -> Insight | None:
    threshold = snapshot.business_profile.get("alert_settings", {}).get("runway_threshold_days", 3)
    warning = []
    for m in snapshot.materials:
        days = _material_runway_days(m)
        if days is not None and threshold < days <= threshold * 2:
            warning.append((m["name"], round(days, 1)))
    if not warning:
        return None
    warning.sort(key=lambda x: x[1])
    worst_name, worst_days = warning[0]
    return Insight(
        id="runway_warning",
        domain="runway",
        severity="warning",
        message=f"{worst_name} is running low — about {worst_days} days left at current usage.",
        data={"materials": warning},
    )


# ---------------------------------------------------------------------
# PRODUCTION
# ---------------------------------------------------------------------

def _check_production_material_risk(snapshot: BusinessSnapshot) -> Insight | None:
    at_risk = [
        m["name"] for m in snapshot.materials
        if m.get("qtyOnHand", m.get("current_stock", 0)) <= m.get("reorder_threshold", 0)
    ]
    if not at_risk:
        return None
    return Insight(
        id="production_material_risk",
        domain="production",
        severity="warning",
        message=(
            f"{len(at_risk)} material(s) are at or below their reorder threshold: "
            f"{', '.join(at_risk[:3])}{'…' if len(at_risk) > 3 else ''}. "
            "New batches using these may be affected."
        ),
        data={"materials": at_risk},
    )


# ---------------------------------------------------------------------
# DISPATCH / RECEIVABLES
# ---------------------------------------------------------------------

def _check_overdue_orders(snapshot: BusinessSnapshot) -> Insight | None:
    if not snapshot.overdue_orders:
        return None
    total_overdue = sum(
        o["total_amount"] - o["amount_paid"] for o in snapshot.overdue_orders
    )
    by_retailer: dict[str, float] = {}
    for o in snapshot.overdue_orders:
        name = o.get("retailer_name", "Unknown retailer")
        by_retailer[name] = by_retailer.get(name, 0) + (o["total_amount"] - o["amount_paid"])
    worst_retailer = max(by_retailer, key=by_retailer.get)
    return Insight(
        id="overdue_orders",
        domain="dispatch",
        severity="critical",
        message=(
            f"{len(snapshot.overdue_orders)} order(s) are overdue, totaling "
            f"{format_currency(total_overdue, snapshot.currency)}. {worst_retailer} owes the most "
            f"({format_currency(by_retailer[worst_retailer], snapshot.currency)})."
        ),
        data={"total_overdue": total_overdue, "by_retailer": by_retailer},
    )


def _check_receivables_building(snapshot: BusinessSnapshot) -> Insight | None:
    total = snapshot.receivables_total.get("amount", 0)
    if total <= 0:
        return None
    revenue = snapshot.profit_summary.get("total_revenue", 0)
    if revenue <= 0:
        return None
    ratio = total / revenue
    if ratio < 0.25:
        return None
    return Insight(
        id="receivables_building",
        domain="dispatch",
        severity="warning",
        message=(
            f"Outstanding receivables ({format_currency(total, snapshot.currency)}) are now "
            f"{ratio * 100:.0f}% of total revenue — worth following up before it grows further."
        ),
        data={"receivables": total, "revenue": revenue, "ratio": ratio},
    )


# ---------------------------------------------------------------------
# PROFITABILITY
# ---------------------------------------------------------------------

def _check_margin_declining(snapshot: BusinessSnapshot) -> Insight | None:
    trend = snapshot.weekly_margin.get("trend")
    if trend is None or trend >= -15:
        return None
    return Insight(
        id="margin_declining",
        domain="profitability",
        severity="warning",
        message=f"Profit margin is down {abs(trend)}% compared to last week.",
        data={"trend": trend, "weekly_margin": snapshot.weekly_margin},
    )


def _check_low_margin_product(snapshot: BusinessSnapshot) -> Insight | None:
    products = [p for p in snapshot.profit_by_product if p.get("revenue", 0) > 0]
    if not products:
        return None
    for p in products:
        p["_margin_pct"] = (p["profit"] / p["revenue"]) * 100 if p["revenue"] else 0
    worst = min(products, key=lambda p: p["_margin_pct"])
    if worst["_margin_pct"] >= 10:
        return None
    return Insight(
        id="low_margin_product",
        domain="profitability",
        severity="info",
        message=(
            f"{worst['name']} has a thin material margin ({worst['_margin_pct']:.0f}%) "
            "this period — worth reviewing its pricing or recipe cost."
        ),
        data={"product": worst["name"], "margin_percent": worst["_margin_pct"]},
    )


# ---------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------

RULES: list[Rule] = [
    Rule(id="runway_critical", domain="runway", check=_check_runway_critical),
    Rule(id="runway_warning", domain="runway", check=_check_runway_warning),
    Rule(id="production_material_risk", domain="production", check=_check_production_material_risk),
    Rule(id="overdue_orders", domain="dispatch", check=_check_overdue_orders),
    Rule(id="receivables_building", domain="dispatch", check=_check_receivables_building),
    Rule(id="margin_declining", domain="profitability", check=_check_margin_declining),
    Rule(id="low_margin_product", domain="profitability", check=_check_low_margin_product),
]