from agents.predictors.payment_risk_scorer import score_payment_risk


def test_not_late_is_zero_risk():
    assert score_payment_risk(overdue_amount=500, days_late=0) == 0.0


def test_late_payment_has_positive_risk():
    assert score_payment_risk(overdue_amount=500, days_late=10) > 0
