def score_payment_risk(overdue_amount: float, days_late: int) -> float:
    """Simple 0-100 risk score. Higher overdue amount and more days
    late both push the score up. Not late -> 0."""
    if days_late <= 0:
        return 0.0
    score = min(100.0, (overdue_amount / 1000) * 10 + days_late * 2)
    return round(score, 1)
