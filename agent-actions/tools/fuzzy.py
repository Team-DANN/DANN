"""Fuzzy name matching against the business's own catalog.

The model passes what the person typed ("croisants", "bread flr"); this module
decides which real item that is. Three outcomes, never a silent guess:
resolved (one clear winner), ambiguous (a short list to choose from) or none.
"""

import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

HIGH_SCORE = 88  # a winner must score at least this ...
MIN_GAP = 8  # ... and beat the runner-up by at least this much
CLEAR_LEAD_SCORE = 75  # or score at least this (a typo inside a longer name) ...
CLEAR_LEAD_GAP = 25  # ... while leaving every other item far behind
LOW_SCORE = 60  # below this a candidate is not worth showing
MAX_CANDIDATES = 4

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True)
class Resolution:
    status: str  # "resolved" | "ambiguous" | "none"
    matches: list[dict] = field(default_factory=list)
    scores: list[float] = field(default_factory=list)


def normalize(text) -> str:
    """Lowercase, drop punctuation, collapse spaces, strip a plural 's'."""
    words = _NON_ALNUM.sub(" ", str(text or "").lower()).split()
    return " ".join(w[:-1] if len(w) > 3 and w.endswith("s") and not w.endswith("ss") else w for w in words)


def _score(query: str, name: str) -> float:
    if query == name:
        return 100.0
    return float(fuzz.WRatio(query, name))


def resolve(query: str, items: list[dict], *, name_key: str = "name") -> Resolution:
    q = normalize(query)
    if len(q) < 2:
        return Resolution("none")

    scored = []
    for item in items:
        name = normalize(item.get(name_key))
        if name:
            scored.append((_score(q, name), str(item.get(name_key)).lower(), item))
    scored.sort(key=lambda s: (-s[0], s[1]))  # best first, ties by name (stable)

    cands = [s for s in scored if s[0] >= LOW_SCORE][:MAX_CANDIDATES]
    if not cands:
        return Resolution("none")

    top = cands[0][0]
    gap = top - (scored[1][0] if len(scored) > 1 else 0.0)  # lead over the real runner-up
    if (top >= HIGH_SCORE and gap >= MIN_GAP) or (top >= CLEAR_LEAD_SCORE and gap >= CLEAR_LEAD_GAP):
        return Resolution("resolved", [cands[0][2]], [top])
    return Resolution("ambiguous", [c[2] for c in cands], [c[0] for c in cands])