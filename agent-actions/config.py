import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

from confirm import MIN_SECRET_CHARS

load_dotenv()


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    llm_model: str
    llm_model_fast: str
    backend_url: str
    allowed_origins: list[str]
    action_signing_secret: str = ""
    confirm_ttl_seconds: int = 300

    @property
    def writes_enabled(self) -> bool:
        """Actions are offered only when a long enough signing secret is set."""
        return len(self.action_signing_secret) >= MIN_SECRET_CHARS


def _ttl() -> int:
    try:
        value = int(os.getenv("CONFIRM_TTL_SECONDS", "300"))
    except ValueError:
        return 300
    return min(max(value, 60), 900)


@lru_cache
def get_settings() -> Settings:
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
    return Settings(
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", "openai/gpt-oss-120b"),
        llm_model_fast=os.getenv("LLM_MODEL_FAST", "openai/gpt-oss-20b"),
        backend_url=os.getenv("BACKEND_URL", "http://localhost:5000").rstrip("/"),
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
        action_signing_secret=os.getenv("ACTION_SIGNING_SECRET", "").strip(),
        confirm_ttl_seconds=_ttl(),
    )