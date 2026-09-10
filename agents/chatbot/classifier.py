"""
Local, offline intent classifier using sentence-transformers embeddings —
no external API calls. Loads the model once at first use, embeds every
example phrase in INTENTS once, then matches incoming queries by cosine
similarity against the best-matching example (not an average — one
strong match should win even if other examples in that intent differ).
"""

from sentence_transformers import SentenceTransformer, util

from chatbot.intents import INTENTS

_MODEL_NAME = "all-MiniLM-L6-v2"
# Tuned against real queries: a near-verbatim paraphrase of a training
# example ("how much smoked paprika do I have left" vs "how much flour
# do I have left") scored 0.492 — 0.5 was rejecting genuinely correct
# matches. 0.45 keeps rejecting clearly off-topic queries (e.g. "what's
# the weather" scored well under this) while catching close paraphrases.
_SIMILARITY_THRESHOLD = 0.45

_model: SentenceTransformer | None = None
_intent_vectors: dict = {}


def _ensure_loaded() -> None:
    global _model, _intent_vectors
    if _model is not None:
        return
    _model = SentenceTransformer(_MODEL_NAME)
    for intent, phrases in INTENTS.items():
        _intent_vectors[intent] = _model.encode(phrases, convert_to_tensor=True)


def classify(message: str) -> tuple[str | None, float]:
    """Returns (intent, similarity). intent is None if nothing clears the threshold —
    better to admit we don't know than answer the wrong question confidently."""
    _ensure_loaded()
    query_vec = _model.encode(message, convert_to_tensor=True)

    best_intent = None
    best_score = 0.0
    for intent, vectors in _intent_vectors.items():
        scores = util.cos_sim(query_vec, vectors)
        top_score = float(scores.max())
        if top_score > best_score:
            best_score = top_score
            best_intent = intent

    if best_score < _SIMILARITY_THRESHOLD:
        return None, best_score
    return best_intent, best_score
