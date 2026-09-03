import statistics


def detect_anomalies(values: list[float], threshold: float = 2.0) -> list[int]:
    """Flags indices where a value is more than `threshold` standard
    deviations from the mean. Simple statistical flagging, no ML."""
    if len(values) < 2:
        return []
    mean = statistics.mean(values)
    stdev = statistics.pstdev(values)
    if stdev == 0:
        return []
    return [i for i, v in enumerate(values) if abs(v - mean) / stdev > threshold]
