"""Per-person and global rate limits on /chat and /confirm."""

import httpx
import pytest
from fastapi.testclient import TestClient

import app as app_module
from backend_client import BackendClient, get_backend_client
from config import get_settings
from confirm import ConfirmationStore
from ratelimit import RateLimiter

client = TestClient(app_module.app)
SECRET = "z" * 48
HEADERS = {"Authorization": "Bearer tok123"}
CHAT = {"messages": [{"role": "user", "content": "hello"}]}
BAD_TOKEN = {"token": "x" * 30}


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


@pytest.fixture
def clock():
    return Clock()


@pytest.fixture(autouse=True)
def state(monkeypatch, clock):
    monkeypatch.setenv("ACTION_SIGNING_SECRET", SECRET)
    get_settings.cache_clear()
    app_module.confirmations = ConfirmationStore()
    app_module.limiter = RateLimiter(clock=clock)  # switched on again for this file
    yield
    get_settings.cache_clear()
    app_module.app.dependency_overrides.clear()


class ScriptedLLM:
    def __init__(self):
        self.calls = []

    async def __call__(self, messages, **kwargs):
        self.calls.append(messages)
        return {"message": {"role": "assistant", "content": "Hi"}, "usage": {"total_tokens": 10}, "model": "m"}


@pytest.fixture
def llm(monkeypatch):
    fake = ScriptedLLM()
    monkeypatch.setattr(app_module, "chat_completion", fake)
    return fake


def use_node(user_id=1):
    seen = []

    def handler(request):
        seen.append(request)
        if request.url.path == "/api/auth/me":
            me = {"user_id": user_id, "business_id": 7, "name": "Asha", "role": "owner",
                  "modules": ["production", "orders", "inventory", "finance"],
                  "business_name": "Biz", "currency": "$"}
            return httpx.Response(200, json={"success": True, "data": me})
        return httpx.Response(200, json={"success": True, "data": []})

    app_module.app.dependency_overrides[get_backend_client] = lambda: BackendClient(
        base_url="http://node.test", transport=httpx.MockTransport(handler))
    return seen


def limits(monkeypatch, *, chat_user=100, chat_global=100, confirm_user=100):
    monkeypatch.setenv("RATE_CHAT_PER_USER", str(chat_user))
    monkeypatch.setenv("RATE_CHAT_GLOBAL", str(chat_global))
    monkeypatch.setenv("RATE_CONFIRM_PER_USER", str(confirm_user))
    get_settings.cache_clear()


def chat():
    return client.post("/chat", json=CHAT, headers=HEADERS)


def confirm():
    return client.post("/confirm", json=BAD_TOKEN, headers=HEADERS)


# ---- the limiter itself -------------------------------------------------------

def rules(user="u1", limit=2, window=60):
    return [("user", f"chat:{user}", limit, window)]


def test_it_allows_up_to_the_limit_then_names_the_wait(clock):
    limiter = RateLimiter(clock=clock)
    assert limiter.check(rules()) is None
    clock.now += 10
    assert limiter.check(rules()) is None
    assert limiter.check(rules()) == ("user", 50)


def test_a_slot_frees_when_the_oldest_hit_leaves_the_window(clock):
    limiter = RateLimiter(clock=clock)
    assert limiter.check(rules(limit=1)) is None
    clock.now += 59
    assert limiter.check(rules(limit=1)) is not None
    clock.now += 1
    assert limiter.check(rules(limit=1)) is None


def test_a_refused_request_is_not_counted_by_the_other_rules(clock):
    limiter = RateLimiter(clock=clock)
    shared = ("global", "g", 2, 60)
    assert limiter.check([("user", "u1", 1, 60), shared]) is None
    assert limiter.check([("user", "u1", 1, 60), shared])[0] == "user"
    assert limiter.check([("user", "u2", 1, 60), shared]) is None  # the refusal cost the global budget nothing
    assert limiter.check([("user", "u3", 1, 60), shared])[0] == "global"


def test_the_longest_wait_is_reported(clock):
    limiter = RateLimiter(clock=clock)
    both = [("user", "u1", 1, 60), ("global", "g", 1, 300)]
    assert limiter.check(both) is None
    clock.now += 10
    assert limiter.check(both) == ("global", 290)


def test_a_disabled_limiter_never_blocks(clock):
    limiter = RateLimiter(clock=clock, enabled=False)
    assert all(limiter.check(rules(limit=1)) is None for _ in range(5))


def test_idle_keys_are_forgotten(clock):
    limiter = RateLimiter(clock=clock, sweep_at=2)
    for user in ("a", "b", "c"):
        limiter.check(rules(user=user, window=10))
    assert len(limiter) == 3
    clock.now += 20
    limiter.check(rules(user="d", window=10))
    assert len(limiter) == 1


# ---- over HTTP ----------------------------------------------------------------

def test_over_the_chat_limit_is_a_429_and_the_model_is_not_called(monkeypatch, llm):
    use_node()
    limits(monkeypatch, chat_user=2)
    assert chat().status_code == 200
    assert chat().status_code == 200
    r = chat()
    assert r.status_code == 429
    assert r.json()["detail"] == "You are sending messages too quickly. Try again in 60 seconds."
    assert r.headers["Retry-After"] == "60"
    assert len(llm.calls) == 2


def test_the_limit_is_per_person(monkeypatch, llm):
    limits(monkeypatch, chat_user=1)
    use_node(user_id=1)
    assert chat().status_code == 200
    assert chat().status_code == 429
    use_node(user_id=2)
    assert chat().status_code == 200


def test_the_global_ceiling_protects_the_shared_quota(monkeypatch, llm):
    limits(monkeypatch, chat_user=5, chat_global=2)
    use_node(user_id=1)
    assert chat().status_code == 200
    use_node(user_id=2)
    assert chat().status_code == 200
    use_node(user_id=3)
    r = chat()
    assert r.status_code == 429
    assert r.json()["detail"] == "The assistant is busy right now. Try again in 60 seconds."
    assert len(llm.calls) == 2


def test_a_refused_request_does_not_use_up_the_global_budget(monkeypatch, llm):
    limits(monkeypatch, chat_user=1, chat_global=2)
    use_node(user_id=1)
    assert chat().status_code == 200
    assert chat().status_code == 429  # person 1 is over their own limit
    use_node(user_id=2)
    assert chat().status_code == 200  # the global budget still had room


def test_the_window_frees_up_and_retry_after_counts_down(monkeypatch, llm, clock):
    use_node()
    limits(monkeypatch, chat_user=1)
    assert chat().status_code == 200
    clock.now += 20
    r = chat()
    assert r.status_code == 429 and r.headers["Retry-After"] == "40"
    assert "Try again in 40 seconds." in r.json()["detail"]
    clock.now += 41
    assert chat().status_code == 200


def test_confirm_has_its_own_limit_and_a_blocked_one_never_reaches_node(monkeypatch, llm):
    seen = use_node()
    limits(monkeypatch, confirm_user=2)
    assert confirm().status_code == 400  # a bad token, but it counted
    assert confirm().status_code == 400
    r = confirm()
    assert r.status_code == 429
    assert r.json()["detail"] == "Too many confirmations in a short time. Try again in 60 seconds."
    assert not [q for q in seen if q.method == "POST"]


def test_chat_and_confirm_have_separate_budgets(monkeypatch, llm):
    use_node()
    limits(monkeypatch, chat_user=1, confirm_user=1)
    assert chat().status_code == 200
    assert chat().status_code == 429
    assert confirm().status_code == 400  # confirm still has its own budget
    assert confirm().status_code == 429


def test_a_request_without_a_token_is_401_not_429(monkeypatch, llm):
    use_node()
    limits(monkeypatch, chat_user=1)
    for _ in range(3):
        assert client.post("/chat", json=CHAT).status_code == 401