def calculate_reorder_point(
    lead_time_days: float,
    daily_consumption_rate: float,
    safety_stock: float = 0,
) -> float:
    """Reorder point = (lead time * consumption rate) + safety stock."""
    return (lead_time_days * daily_consumption_rate) + safety_stock
