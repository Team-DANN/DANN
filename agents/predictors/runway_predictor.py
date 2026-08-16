def predict_runway(stock_level: float, daily_consumption_rate: float) -> float:
    """Days of runway remaining = stock / daily consumption.
    Returns float('inf') if there's no consumption to divide by."""
    if daily_consumption_rate <= 0:
        return float("inf")
    return stock_level / daily_consumption_rate
