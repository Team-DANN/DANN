"""
Runs every rule in insights/rules.py against a snapshot, collects whatever
fires, ranks by severity, and caps how many surface — so the digest stays
readable instead of dumping every possible flag at once.
"""

from insights.rules import RULES, Insight
from insights.snapshot import BusinessSnapshot

SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}
MAX_PER_DOMAIN = 3
MAX_TOTAL = 8


def generate_insights(snapshot: BusinessSnapshot) -> list[Insight]:
    fired: list[Insight] = []
    for rule in RULES:
        insight = rule.check(snapshot)
        if insight:
            fired.append(insight)

    fired.sort(key=lambda i: SEVERITY_ORDER.get(i.severity, 99))

    capped: list[Insight] = []
    per_domain_count: dict[str, int] = {}
    for insight in fired:
        count = per_domain_count.get(insight.domain, 0)
        if count >= MAX_PER_DOMAIN:
            continue
        capped.append(insight)
        per_domain_count[insight.domain] = count + 1
        if len(capped) >= MAX_TOTAL:
            break

    return capped
