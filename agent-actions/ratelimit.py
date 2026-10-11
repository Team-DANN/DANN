"""A small in-memory sliding-window rate limiter.

One process only: after a restart the counts start again, and with more than one
instance each keeps its own counts, so the limits are approximate. Node's audit
table stays the durable guard for actions.
"""

import time
from collections import deque
from typing import Callable

# (name, key, limit, window_seconds)
Rule = tuple[str, str, int, float]


class RateLimiter:
    def __init__(
        self,
        *,
        clock: Callable[[], float] = time.monotonic,
        enabled: bool = True,
        sweep_at: int = 500,
    ):
        self._clock = clock
        self._enabled = enabled
        self._sweep_at = sweep_at
        self._hits: dict[str, deque] = {}
        self._windows: dict[str, float] = {}

    def __len__(self) -> int:
        return len(self._hits)

    def check(self, rules: list[Rule]) -> tuple[str, float] | None:
        """Count one request against every rule, unless one of them is full.

        Returns None when the request may go ahead (it is then counted in every
        rule), or (name, seconds_to_wait) for the rule that makes it wait longest.
        A refused request is not counted anywhere, so being refused by one rule
        does not use up the other budgets.
        """
        if not self._enabled:
            return None
        now = self._clock()
        blocked: tuple[str, float] | None = None
        for name, key, limit, window in rules:
            if limit < 1:
                continue
            hits = self._live(key, now, window)
            if len(hits) >= limit:
                wait = hits[0] + window - now
                if blocked is None or wait > blocked[1]:
                    blocked = (name, wait)
        if blocked is not None:
            return blocked
        for _name, key, _limit, window in rules:
            self._hits.setdefault(key, deque()).append(now)
            self._windows[key] = window
        if len(self._hits) > self._sweep_at:
            self._sweep(now)
        return None

    def _live(self, key: str, now: float, window: float) -> deque:
        hits = self._hits.get(key)
        if hits is None:
            return deque()
        while hits and hits[0] <= now - window:
            hits.popleft()
        return hits

    def _sweep(self, now: float) -> None:
        """Forget people who have been quiet for a whole window."""
        for key in list(self._hits):
            if not self._live(key, now, self._windows[key]):
                del self._hits[key]
                del self._windows[key]