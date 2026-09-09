from agents.predictors.reorder_engine import calculate_reorder_point


def test_reorder_point_basic():
    assert calculate_reorder_point(lead_time_days=3, daily_consumption_rate=10) == 30


def test_reorder_point_with_safety_stock():
    assert calculate_reorder_point(3, 10, safety_stock=5) == 35
