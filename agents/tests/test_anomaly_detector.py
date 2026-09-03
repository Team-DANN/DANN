from agents.predictors.anomaly_detector import detect_anomalies


def test_no_anomalies_in_uniform_data():
    assert detect_anomalies([10, 10, 10, 10]) == []


def test_flags_outlier():
    result = detect_anomalies([10, 10, 10, 10, 100], threshold=1.5)
    assert 4 in result
