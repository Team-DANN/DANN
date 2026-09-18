"""
Centralized environment config. Everything else imports from here instead
of reading os.environ directly, so there's one place to check when
something's missing or misconfigured.
"""

import os
from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


JWT_SECRET = _require("JWT_SECRET")
BACKEND_API_URL = _require("BACKEND_API_URL")

OCR_SPACE_API_KEY = _require("OCR_SPACE_API_KEY")
# Optional — has a sensible default, not required to be set
OCR_SPACE_ENDPOINT = os.environ.get("OCR_SPACE_ENDPOINT", "https://api.ocr.space/parse/image")

# Optional — has a sensible default, not required to be set
SENTENCE_TRANSFORMERS_HOME = os.environ.get("SENTENCE_TRANSFORMERS_HOME", "./model_cache")
os.environ.setdefault("SENTENCE_TRANSFORMERS_HOME", SENTENCE_TRANSFORMERS_HOME)
