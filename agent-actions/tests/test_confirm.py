import base64
import json

import pytest

from confirm import ConfirmError, ConfirmationStore, sign_action, verify_action

SECRET = "s" * 40
ARGS = {"product_id": "p1", "quantity": 40}


def test_round_trip_returns_the_signed_payload():
    token, payload = sign_action(SECRET, user_id=1, business_id=7, tool="log_batch", args=ARGS, ttl_seconds=300, now=1000)
    got = verify_action(SECRET, token, user_id=1, business_id=7, now=1100)
    assert got == payload
    assert got["args"] == ARGS and got["exp"] == 1300 and len(got["nonce"]) >= 16


def test_each_token_has_its_own_nonce():
    a = sign_action(SECRET, user_id=1, business_id=7, tool="t", args={}, ttl_seconds=60)[1]["nonce"]
    b = sign_action(SECRET, user_id=1, business_id=7, tool="t", args={}, ttl_seconds=60)[1]["nonce"]
    assert a != b


def test_short_secret_cannot_sign():
    with pytest.raises(ValueError):
        sign_action("short", user_id=1, business_id=7, tool="t", args={}, ttl_seconds=60)


def test_edited_arguments_are_rejected():
    token, payload = sign_action(SECRET, user_id=1, business_id=7, tool="log_batch", args=ARGS, ttl_seconds=300, now=1000)
    body, sig = token.split(".")
    forged = dict(payload, args={"product_id": "p1", "quantity": 4000})
    forged_body = base64.urlsafe_b64encode(json.dumps(forged, separators=(",", ":"), sort_keys=True).encode()).rstrip(b"=").decode()
    with pytest.raises(ConfirmError) as err:
        verify_action(SECRET, f"{forged_body}.{sig}", user_id=1, business_id=7, now=1100)
    assert err.value.code == "invalid"


def test_edited_signature_wrong_secret_and_garbage_are_rejected():
    token, _ = sign_action(SECRET, user_id=1, business_id=7, tool="t", args={}, ttl_seconds=300, now=1000)
    body, sig = token.split(".")
    bad_signature = f"{body}.{sig[:-2]}AA"
    garbage = ["nodot", "a.b.c", "", None, 123, "x" * 5000, f"{body}."]
    for value in [bad_signature, *garbage]:
        with pytest.raises(ConfirmError) as err:
            verify_action(SECRET, value, user_id=1, business_id=7, now=1100)
        assert err.value.code == "invalid", value
    with pytest.raises(ConfirmError):
        verify_action("t" * 40, token, user_id=1, business_id=7, now=1100)
    with pytest.raises(ConfirmError):
        verify_action("", token, user_id=1, business_id=7, now=1100)


def test_other_person_or_business_is_rejected_the_same_way():
    token, _ = sign_action(SECRET, user_id=1, business_id=7, tool="t", args={}, ttl_seconds=300, now=1000)
    for uid, bid in ((2, 7), (1, 8)):
        with pytest.raises(ConfirmError) as err:
            verify_action(SECRET, token, user_id=uid, business_id=bid, now=1100)
        assert err.value.code == "invalid"


def test_expired_token_says_expired():
    token, _ = sign_action(SECRET, user_id=1, business_id=7, tool="t", args={}, ttl_seconds=300, now=1000)
    with pytest.raises(ConfirmError) as err:
        verify_action(SECRET, token, user_id=1, business_id=7, now=1300)
    assert err.value.code == "expired"


def test_ids_compare_as_text():
    token, _ = sign_action(SECRET, user_id="u_1", business_id=7, tool="t", args={}, ttl_seconds=300, now=1000)
    assert verify_action(SECRET, token, user_id="u_1", business_id="7", now=1100)


def test_store_allows_one_runner_then_returns_the_stored_result():
    store = ConfirmationStore()
    assert store.claim("n1", exp=2000, now=1000) == ("new", None)
    assert store.claim("n1", exp=2000, now=1001) == ("running", None)
    store.finish("n1", {"ok": True})
    assert store.claim("n1", exp=2000, now=1002) == ("done", {"ok": True})
    assert store.claim("n2", exp=2000, now=1002) == ("new", None)


def test_store_forgets_expired_entries():
    store = ConfirmationStore()
    store.claim("n1", exp=1500, now=1000)
    assert len(store._items) == 1
    store.claim("n2", exp=3000, now=2000)
    assert "n1" not in store._items