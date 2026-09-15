"""
Shared formatting so insight messages and chatbot responses read in one
consistent voice, instead of each file rolling its own number formatting.
"""


def format_currency(amount: float, currency: str = "₹") -> str:
    return f"{currency}{amount:,.0f}"


def format_days(days: float) -> str:
    rounded = round(days, 1)
    if rounded == int(rounded):
        rounded = int(rounded)
    return f"{rounded} day{'s' if rounded != 1 else ''}"


SEVERITY_LABELS = {
    "critical": "Urgent",
    "warning": "Needs attention",
    "info": "Worth noting",
}


def severity_label(severity: str) -> str:
    return SEVERITY_LABELS.get(severity, severity.title())


FALLBACK_RESPONSE = (
    "I can help with questions about material runway, production, "
    "dispatch/payments, and profitability. Try asking about one of those."
)
