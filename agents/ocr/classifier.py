"""
Classifies OCR-extracted text against a claimed category by matching
against the keyword lists in keywords.py. Handles OCR typos via fuzzy
matching (stdlib difflib — no extra dependency, avoids repeating the
"module not installed" issue from engine.py).

Pure function of (text, claimed_category) -> result. Doesn't call the
OCR engine, doesn't touch the DB.
"""

import re
from difflib import get_close_matches

from ocr.keywords import CATEGORIES

FUZZY_CUTOFF = 0.82  # 0-1, higher = stricter match required


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z]+", text.lower())


def _category_score(words: list[str], keywords: list[str]) -> int:
    score = 0
    for keyword in keywords:
        if keyword in words:
            score += 1
            continue
        close = get_close_matches(keyword, words, n=1, cutoff=FUZZY_CUTOFF)
        if close and close[0][:2] == keyword[:2]:
            score += 1
    return score

def classify(text: str, claimed_category: str) -> dict:
    if claimed_category not in CATEGORIES:
        raise ValueError(
            f"Unknown category '{claimed_category}'. Must be one of: {', '.join(CATEGORIES)}"
        )

    if not text or not text.strip():
        return {
            "status": "unclear",
            "claimed_category": claimed_category,
            "detected_category": None,
            "scores": {},
        }

    words = _tokenize(text)
    scores = {category: _category_score(words, kws) for category, kws in CATEGORIES.items()}

    claimed_score = scores[claimed_category]
    best_category = max(scores, key=scores.get)
    best_score = scores[best_category]

    if best_score == 0:
        return {
            "status": "unclear",
            "claimed_category": claimed_category,
            "detected_category": None,
            "scores": scores,
        }

    if claimed_score > 0:
        matched = [c for c, s in scores.items() if s > 0]
        return {
            "status": "match",
            "claimed_category": claimed_category,
            "detected_category": claimed_category,
            "ambiguous": len(matched) > 1,
            "scores": scores,
        }

    return {
        "status": "mismatch",
        "claimed_category": claimed_category,
        "detected_category": best_category,
        "scores": scores,
    }