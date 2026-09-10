"""
Local, offline intent classifier using TF-IDF + cosine similarity — no
neural network, no downloaded model weights, minimal memory footprint
(fits Render's free-tier 512MB limit, unlike sentence-transformers/torch
which OOM'd on startup).

Tradeoff vs. embeddings: this matches on shared words/word-fragments
rather than semantic meaning, so it won't catch paraphrases with zero
word overlap as well as a real embedding model would. For short,
domain-specific phrases like ours (several examples per intent already
cover common phrasings), word-overlap matching performs reasonably well
in practice — verify against real queries, same as the embedding
threshold was tuned before.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from chatbot.intents import INTENTS

_SIMILARITY_THRESHOLD = 0.3  # different scale than the old embedding threshold — tune against real queries

_vectorizer: TfidfVectorizer | None = None
_intent_vectors: dict = {}


def _ensure_loaded() -> None:
    global _vectorizer, _intent_vectors
    if _vectorizer is not None:
        return

    all_phrases = []
    phrase_intent_map = []
    for intent, phrases in INTENTS.items():
        for phrase in phrases:
            all_phrases.append(phrase)
            phrase_intent_map.append(intent)

    _vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words="english")
    phrase_matrix = _vectorizer.fit_transform(all_phrases)

    for intent in INTENTS:
        indices = [i for i, mapped in enumerate(phrase_intent_map) if mapped == intent]
        _intent_vectors[intent] = phrase_matrix[indices]


def classify(message: str) -> tuple[str | None, float]:
    """Returns (intent, similarity). intent is None if nothing clears the threshold —
    better to admit we don't know than answer the wrong question confidently."""
    _ensure_loaded()
    query_vec = _vectorizer.transform([message])

    best_intent = None
    best_score = 0.0
    for intent, vectors in _intent_vectors.items():
        scores = cosine_similarity(query_vec, vectors)
        top_score = float(scores.max())
        if top_score > best_score:
            best_score = top_score
            best_intent = intent

    if best_score < _SIMILARITY_THRESHOLD:
        return None, best_score
    return best_intent, best_score
