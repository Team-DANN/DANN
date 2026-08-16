from agents.predictors.runway_predictor import predict_runway


def test_predict_runway_basic():
    assert predict_runway(stock_level=100, daily_consumption_rate=10) == 10


def test_predict_runway_zero_consumption():
    assert predict_runway(stock_level=100, daily_consumption_rate=0) == float("inf")
