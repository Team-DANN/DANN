import pytest


@pytest.fixture(autouse=True)
def rate_limiting_off_by_default():
    """Existing tests make many calls as the same person; only test_rate_limit.py turns limiting on."""
    import app as app_module
    from ratelimit import RateLimiter

    app_module.limiter = RateLimiter(enabled=False)
    yield