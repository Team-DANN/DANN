"""
Extracts which specific material/product/retailer (if any) a chatbot
message refers to, matched against THIS business's own live data — never
hardcoded, since product/material names differ per business and business
type (bakery today, other manufacturers later).

Kept separate from intent classification on purpose: classify() decides
WHICH DOMAIN a question is about (generic across all businesses),
match_entities() decides WHICH SPECIFIC ITEM within that business's own
catalog — two different problems, built fresh per request from the
snapshot already fetched, no extra Node calls.
"""

import re

_WORD_RE = re.compile(r"[a-z0-9']+")
_MIN_WORD_LEN = 3


def _words(text: str) -> list[str]:
    return [w for w in _WORD_RE.findall(text.lower()) if len(w) >= _MIN_WORD_LEN]


def build_entity_index(snapshot) -> list[dict]:
    """One flat list of every named thing this business has — built fresh
    per request from the snapshot, so it's always current and never
    assumes any particular product/material exists."""
    index = []
    for m in snapshot.materials:
        index.append({"type": "material", "id": m.get("material_id", m.get("id")), "name": m["name"]})
    for p in snapshot.products:
        index.append({"type": "product", "id": p.get("product_id", p.get("id")), "name": p["name"]})
    for r in snapshot.retailers:
        index.append({"type": "retailer", "id": r.get("retailer_id", r.get("id")), "name": r["name"]})
    return index


def match_entities(message: str, index: list[dict], max_matches: int = 3) -> list[dict]:
    """Returns entities the message plausibly refers to, best match first.
    Exact phrase containment scores highest ('smoked paprika' mentioned
    verbatim); partial word overlap is the fallback ('flour' matching
    'All-purpose flour'). No match at all just returns an empty list —
    callers should fall back to a general answer, not guess."""
    message_lower = message.lower()
    scored: list[tuple[dict, float]] = []

    for entry in index:
        name_lower = entry["name"].lower()
        if name_lower in message_lower:
            scored.append((entry, 100.0))
            continue
        name_words = _words(name_lower)
        if not name_words:
            continue
        message_words = set(_words(message_lower))
        overlap = sum(1 for w in name_words if w in message_words)
        if overlap > 0:
            scored.append((entry, (overlap / len(name_words)) * 50))

    scored.sort(key=lambda pair: pair[1], reverse=True)

    seen = set()
    results = []
    for entry, _score in scored:
        key = (entry["type"], entry["id"])
        if key in seen:
            continue
        seen.add(key)
        results.append(entry)
        if len(results) >= max_matches:
            break
    return results
